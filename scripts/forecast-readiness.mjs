import { DatabaseSync } from 'node:sqlite';
import { statSync } from 'node:fs';
import { dayAt, quantity } from '../server/common.mjs';
import { ensure, validDate } from '../server/ml/forecast-model.mjs';
import { inspectHistory } from '../server/ml/history-quality.mjs';
import { createForecastRegistry } from '../server/forecast-registry.mjs';

export function forecastReadiness({ filename, asOf = dayAt(), workspaceId, businessId, productId, models } = {}) {
  ensure(validDate(asOf) && asOf <= dayAt(), 'Tanggal audit tidak boleh melewati hari ini.');
  ensure(statSync(filename).isFile(), 'Database belum tersedia.');
  ensure((!workspaceId && !businessId && !productId) || (workspaceId && businessId), 'Filter bahan/usaha memerlukan --workspace dan --business.');
  const filters = [], parameters = [];
  for (const [column, value] of [['workspace_id', workspaceId], ['business_id', businessId], ['id', productId]]) {
    if (value !== undefined) {
      ensure(typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value), 'Identitas filter tidak valid.');
      filters.push('i.' + column + '=?'); parameters.push(value);
    }
  }
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    db.exec('BEGIN');
    const ingredients = db.prepare('SELECT i.workspace_id,i.business_id,i.id,i.name,i.unit FROM ingredients i' + (filters.length ? ' WHERE ' + filters.join(' AND ') : '') + ' ORDER BY i.workspace_id,i.business_id,i.id').all(...parameters);
    if (workspaceId) ensure(ingredients.length > 0, 'Tidak ada bahan pada scope yang dipilih.');
    const registry = createForecastRegistry(models);
    const sources = ingredients.map(row => {
      const scope = { workspaceId: row.workspace_id, businessId: row.business_id, productId: row.id, unit: row.unit };
      const raw = db.prepare('SELECT date,quantity FROM daily_usage WHERE workspace_id=? AND business_id=? AND product_id=? ORDER BY date').all(scope.workspaceId, scope.businessId, scope.productId);
      const history = inspectHistory(raw.map(r => ({ date: r.date, qty: quantity(r.quantity) })), asOf);
      const model = registry.get(scope);
      return { scope, product: row.name, history, excludedPartialOrFutureRows: raw.filter(r => r.date >= asOf).length,
        baseline: { status: history.calendarDaysSinceFirst < 7 ? 'insufficient_history' : history.assumedZeroDatesSinceFirst ? 'available_with_zero_assumption' : 'available', minimumDays: 7 },
        model: { registryStatus: model.status, reason: model.reason, kind: model.artifact?.kind || null,
          datasetThrough: model.artifact?.dataset.to || null, trainingThrough: model.artifact?.training.to || null,
          recentInputDatesPresent: history.recent14.recordedDates === 14, recentRecordingCompletenessVerified: false },
        nextSteps: history.training.status === 'no_history' ? ['Catat penerimaan, resep dan penjualan sebenarnya agar ledger pemakaian terbentuk.'] : history.training.status === 'insufficient_calendar_span' ?
          ['Lanjutkan pencatatan nyata atau gunakan arsip berizin yang lengkap; jangan membuat histori pengganti.', 'Tinjau tanggal tanpa baris pemakaian sebelum menyatakan pencatatan lengkap.'] :
          ['Periksa izin dan kelengkapan periode kandidat sebelum ekspor --confirm-records.', 'Latih dan evaluasi dataset terverifikasi; panjang rentang kalender saja belum membuktikan kesiapan model.'] };
    });
    db.exec('COMMIT');
    return { checkedAt: new Date().toISOString(), asOf, readOnly: true, source: filename,
      summary: { ingredients: sources.length, withoutHistory: sources.filter(s => s.history.training.status === 'no_history').length,
        insufficientCalendarSpan: sources.filter(s => s.history.training.status === 'insufficient_calendar_span').length,
        awaitingPermissionAndCompleteness: sources.filter(s => s.history.training.status === 'needs_permission_and_completeness_confirmation').length,
        activeRegistryModels: sources.filter(s => s.model.registryStatus === 'active').length,
        recentWindowsWithAssumedZeros: sources.filter(s => s.history.recent14.assumedZeroDates > 0).length },
      sources, limitations: 'Read-only ledger/model audit. No proof of field completeness, no synthetic observations, no model training/activation, no drift classification or automatic retraining.' };
  } finally { db.close(); }
}
