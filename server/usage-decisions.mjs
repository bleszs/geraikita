import { randomUUID, createHash } from 'node:crypto';
import { requireValue, dayAt, addDays, quantity } from './common.mjs';
import { validDate } from './ml/forecast-model.mjs';
import { screenUsage, USAGE_SCREEN_RULE } from './ml/usage-anomalies.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createUsageDecisions(store) {
  const scope = session => [session.workspace_id, session.business_id];
  function snapshot(session, productId, date) {
    const ingredient = store.get('SELECT unit FROM ingredients WHERE workspace_id=? AND business_id=? AND id=?', ...scope(session), productId);
    requireValue(ingredient, 'Bahan tidak ditemukan pada usaha ini.', 404);
    const history = store.all('SELECT date,quantity FROM daily_usage WHERE workspace_id=? AND business_id=? AND product_id=? AND date>=? AND date<=? ORDER BY date',
      ...scope(session), productId, addDays(date, -56), date).map(row => ({ date: row.date, qty: quantity(row.quantity) }));
    return { snapshotHash: hash({ kind: 'usage-owner-review-v1', scope: [...scope(session), productId], date, unit: ingredient.unit, rule: USAGE_SCREEN_RULE, history }),
      screened: screenUsage(history, { asOf: addDays(date, 1), windowDays: 1, unit: ingredient.unit }).results[0].status === 'screened' };
  }
  const latest = (session, productId, date) => store.get('SELECT * FROM usage_review_decisions WHERE workspace_id=? AND business_id=? AND product_id=? AND date=? ORDER BY rowid DESC LIMIT 1', ...scope(session), productId, date);
  function list(session, recommendations) {
    return recommendations.map(recommendation => ({ productId: recommendation.productId,
      dates: recommendation.usageScreening.results.filter(row => row.status === 'screened' || latest(session, recommendation.productId, row.date)).map(row => {
        const current = snapshot(session, recommendation.productId, row.date), saved = latest(session, recommendation.productId, row.date);
        return { date: row.date, ...current, saved: saved ? { id: saved.id, decision: saved.decision, note: saved.note,
          savedAt: saved.created_at, needsRecheck: saved.snapshot_hash !== current.snapshotHash } : null };
      }) }));
  }
  function save(session, body) {
    requireValue(typeof body.productId === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(body.productId), 'Bahan tidak valid.');
    requireValue(validDate(body.date) && body.date >= addDays(dayAt(), -28) && body.date < dayAt(), 'Pilih tanggal dalam 28 hari pemeriksaan terakhir.');
    requireValue(['checked', 'follow_up'].includes(body.decision), 'Pilih hasil pemeriksaan.');
    requireValue(typeof body.note === 'string' && body.note.trim().length <= 500, 'Catatan maksimal 500 karakter.');
    requireValue(body.confirmed === true, 'Konfirmasikan bahwa catatan tanggal ini sudah diperiksa.');
    requireValue(typeof body.snapshotHash === 'string' && /^[a-f0-9]{64}$/.test(body.snapshotHash), 'Perbarui data sebelum menyimpan pemeriksaan.');
    requireValue(body.expectedReviewId === null || typeof body.expectedReviewId === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(body.expectedReviewId), 'Versi pemeriksaan tidak valid.');
    requireValue(typeof body.idempotencyKey === 'string' && /^[a-zA-Z0-9-]{8,100}$/.test(body.idempotencyKey), 'Kunci penyimpanan tidak valid.');
    const fingerprint = hash({ productId: body.productId, date: body.date, decision: body.decision, note: body.note.trim(), snapshotHash: body.snapshotHash, expectedReviewId: body.expectedReviewId });
    return store.atomic(() => {
      const repeated = store.get('SELECT id,fingerprint FROM usage_review_decisions WHERE workspace_id=? AND business_id=? AND idem=?', ...scope(session), body.idempotencyKey);
      if (repeated) { requireValue(repeated.fingerprint === fingerprint, 'Kunci yang sama sudah dipakai untuk pemeriksaan berbeda.', 409); return { id: repeated.id, saved: true, repeated: true }; }
      const current = snapshot(session, body.productId, body.date);
      requireValue(current.screened, 'Pembanding belum lengkap. Perbarui data dan periksa kelengkapan catatan terlebih dahulu.', 409);
      requireValue(current.snapshotHash === body.snapshotHash, 'Data pemakaian atau pembanding berubah. Perbarui data lalu buka pemeriksaan kembali.', 409);
      const previous = latest(session, body.productId, body.date);
      requireValue((previous?.id ?? null) === body.expectedReviewId, 'Hasil pemeriksaan sudah berubah di sesi lain. Perbarui data lalu buka kembali.', 409);
      const id = randomUUID();
      store.run('INSERT INTO usage_review_decisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', id, ...scope(session), body.productId, body.date,
        body.snapshotHash, body.decision, body.note.trim(), new Date().toISOString(), body.idempotencyKey, fingerprint, previous?.id ?? null);
      store.log(session.workspace_id, session.business_id, `Hasil pemeriksaan pemakaian ${body.date} disimpan: ${body.decision === 'checked' ? 'sudah diperiksa' : 'perlu tindak lanjut'}. Stok dan transaksi tetap mengikuti catatan asal.`);
      return { id, saved: true, repeated: false };
    });
  }
  return { list, save };
}
