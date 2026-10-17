import { DatabaseSync } from 'node:sqlite';
import { statSync } from 'node:fs';
import { dayAt, quantity } from '../server/common.mjs';
import { ensure, validDate } from '../server/ml/forecast-model.mjs';
import { screenUsage } from '../server/ml/usage-anomalies.mjs';

export function usageAnomalyReport({ filename, asOf = dayAt(), windowDays = 28, workspaceId, businessId, productId } = {}) {
  ensure(validDate(asOf) && asOf >= '0001-04-01' && asOf <= dayAt(), 'Tanggal audit harus valid dan tidak boleh melewati hari ini.');
  ensure(Number.isInteger(windowDays) && windowDays >= 1 && windowDays <= 28, 'Jendela pemeriksaan harus 1–28 hari.');
  ensure((workspaceId === undefined && businessId === undefined && productId === undefined) ||
    (workspaceId !== undefined && businessId !== undefined), 'Filter bahan/usaha memerlukan --workspace dan --business.');
  const clauses = [], params = [];
  for (const [column, value] of [['workspace_id', workspaceId], ['business_id', businessId], ['id', productId]]) {
    if (value === undefined) continue;
    ensure(typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value), 'Identitas filter tidak valid.');
    clauses.push(column + '=?'); params.push(value);
  }
  ensure(statSync(filename).isFile(), 'Database belum tersedia.');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    db.exec('BEGIN');
    const ingredients = db.prepare('SELECT workspace_id,business_id,id,name,unit FROM ingredients' +
      (clauses.length ? ' WHERE ' + clauses.join(' AND ') : '') + ' ORDER BY workspace_id,business_id,id').all(...params);
    if (workspaceId !== undefined) ensure(ingredients.length > 0, 'Tidak ada bahan pada scope yang dipilih.');
    const sources = ingredients.map(row => {
      const raw = db.prepare('SELECT date,quantity FROM daily_usage WHERE workspace_id=? AND business_id=? AND product_id=? ORDER BY date')
        .all(row.workspace_id, row.business_id, row.id);
      return { scope: { workspaceId: row.workspace_id, businessId: row.business_id, productId: row.id, unit: row.unit },
        product: row.name, excludedPartialOrFutureRows: raw.filter(r => r.date >= asOf).length,
        screening: screenUsage(raw.map(r => ({ date: r.date, qty: quantity(r.quantity) })), { asOf, windowDays, unit: row.unit }) };
    });
    db.exec('COMMIT');
    return { schemaVersion: 1, checkedAt: new Date().toISOString(), asOf, readOnly: true, source: filename,
      summary: { ingredients: sources.length, withoutHistory: sources.filter(s => s.screening.status === 'no_history').length,
        screenedDays: sources.reduce((sum, s) => sum + s.screening.summary.screened, 0),
        reviewCandidates: sources.reduce((sum, s) => sum + s.screening.summary.reviewCandidates, 0) },
      sources, fieldValidated: false, automaticActions: false,
      note: 'Operator-local read-only audit; includes private scope and usage details. No new ledger rows, training, activation or anomaly accuracy claim.' };
  } finally { db.close(); }
}
