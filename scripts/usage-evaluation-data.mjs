import { DatabaseSync } from 'node:sqlite';
import { statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { addDays, quantity } from '../server/common.mjs';
import { ensure } from '../server/ml/forecast-model.mjs';
import { targetDates, validateUsageDraft } from './usage-evaluation.mjs';

export function exportUsageAnnotations({ filename, workspaceId, businessId, productId, periods, reference, confirmed }) {
  const targets = targetDates(periods);
  ensure(confirmed === true && typeof reference === 'string' && reference.trim().length >= 3 && reference.length <= 500,
    'Ekspor memerlukan --confirm-permission dan --reference izin pemilik.');
  ensure([workspaceId, businessId, productId].every(value => typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value)),
    'Pilih tepat satu --workspace, --business dan --product.');
  ensure(statSync(filename).isFile(), 'Database harus sudah tersedia.');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    db.exec('BEGIN');
    const ingredient = db.prepare('SELECT unit FROM ingredients WHERE workspace_id=? AND business_id=? AND id=?').get(workspaceId, businessId, productId);
    ensure(ingredient, 'Bahan tidak ditemukan pada scope usaha tersebut.');
    const observations = db.prepare('SELECT date,quantity FROM daily_usage WHERE workspace_id=? AND business_id=? AND product_id=? AND date>=? AND date<=? ORDER BY date')
      .all(workspaceId, businessId, productId, addDays(periods.validationFrom, -56), periods.testTo)
      .map(row => ({ date: row.date, qty: quantity(row.quantity) }));
    ensure(observations.length > 0, 'Belum ada histori asli pada periode terpilih; tidak membuat lembar atau data pengganti.');
    const data = validateUsageDraft({ schemaVersion: 1, kind: 'usage-review-labels-v1', datasetId: randomUUID(), unit: ingredient.unit,
      exportedAt: new Date().toISOString(), periods,
      provenance: { source: 'consented_business_usage', permissionConfirmed: true, permissionReference: reference.trim(),
        humanAnnotated: false, blindReviewConfirmed: false, completenessReviewed: false, completenessReference: '' },
      observations, annotations: targets.map(row => ({ ...row, label: null, recordingComplete: null, annotator: '', evidenceReference: '', context: null })) });
    db.exec('COMMIT'); return data;
  } finally { db.close(); }
}
