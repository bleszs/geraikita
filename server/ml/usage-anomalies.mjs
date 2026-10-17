import { addDays } from '../common.mjs';
import { ensure, validDate } from './forecast-model.mjs';

// A review rule, not a trained classifier or a calibrated confidence interval.
export const USAGE_SCREEN_RULE = Object.freeze({
  kind: 'weekday-median-mad-review-v1', referenceDays: 56, weekdaySamples: 8,
  modifiedZLimit: 3.5, madMultiplier: 0.6745, relativeFloor: 0.5,
  minimumLedgerSteps: 2, ledgerResolution: 0.0001, defaultWindowDays: 28,
  source: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm'
});
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = sorted.length / 2;
  return Number.isInteger(middle) ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[Math.floor(middle)];
};

export function screenUsage(series, { asOf, windowDays = USAGE_SCREEN_RULE.defaultWindowDays, unit } = {}) {
  ensure(validDate(asOf) && asOf >= '0001-04-01', 'Tanggal pemeriksaan tidak valid.');
  ensure(Number.isInteger(windowDays) && windowDays >= 1 && windowDays <= 28, 'Jendela pemeriksaan harus 1–28 hari.');
  ensure(['kg', 'gram', 'liter', 'ml', 'butir', 'buah'].includes(unit), 'Satuan bahan tidak didukung.');
  ensure(Array.isArray(series), 'Histori harus berupa array.');
  const points = new Map();
  for (const row of series) {
    ensure(validDate(row?.date), 'Tanggal ledger tidak valid.');
    if (row.date >= asOf) continue; // Partial/future quantities cannot enter any reference.
    ensure(typeof row.qty === 'number' && Number.isFinite(row.qty) && row.qty >= 0 && row.qty <= Number.MAX_SAFE_INTEGER / 10000,
      'Jumlah ledger harus numerik, finite, tidak negatif dan dalam batas penyimpanan.');
    ensure(!points.has(row.date), 'Tanggal ledger duplikat.');
    points.set(row.date, row.qty);
  }
  const first = [...points.keys()].sort()[0] || null;
  const from = addDays(asOf, -windowDays), to = addDays(asOf, -1), results = [];
  for (let i = 0; i < windowDays; i++) {
    const date = addDays(from, i), referenceFrom = addDays(date, -USAGE_SCREEN_RULE.referenceDays), referenceTo = addDays(date, -1);
    const base = { date, quantity: points.get(date) ?? null, referenceFrom, referenceTo };
    if (!points.has(date)) {
      results.push({ ...base, status: 'missing_observation', review: null }); continue;
    }
    if (!first || first > referenceFrom) {
      results.push({ ...base, status: 'insufficient_reference_span', review: null }); continue;
    }
    const missingDates = Array.from({ length: USAGE_SCREEN_RULE.referenceDays }, (_, d) => addDays(referenceFrom, d)).filter(d => !points.has(d));
    if (missingDates.length) {
      results.push({ ...base, status: 'reference_has_gaps', review: null, missingDates }); continue;
    }
    const reference = Array.from({ length: USAGE_SCREEN_RULE.weekdaySamples }, (_, week) => {
      const date = addDays(base.date, -7 * (week + 1)); return { date, quantity: points.get(date) };
    });
    const center = median(reference.map(r => r.quantity));
    const mad = median(reference.map(r => Math.abs(r.quantity - center)));
    // Integer storage steps, not display rounding: recipes may consume fractions of count units.
    const threshold = Math.max(USAGE_SCREEN_RULE.modifiedZLimit * mad / USAGE_SCREEN_RULE.madMultiplier,
      USAGE_SCREEN_RULE.relativeFloor * center, USAGE_SCREEN_RULE.minimumLedgerSteps * USAGE_SCREEN_RULE.ledgerResolution);
    const deviation = base.quantity - center;
    // Avoid boundary flips caused only by floating-point subtraction at ledger precision.
    const tolerance = Math.max(1, center, base.quantity, threshold) * Number.EPSILON * 16;
    const review = Math.abs(deviation) - threshold > tolerance;
    results.push({ ...base, status: 'screened', reference, median: center, mad, threshold,
      lower: Math.max(0, center - threshold), upper: center + threshold,
      deviation, modifiedZ: mad === 0 ? null : USAGE_SCREEN_RULE.madMultiplier * deviation / mad,
      review, direction: review ? (deviation > 0 ? 'higher' : 'lower') : null });
  }
  const screened = results.filter(r => r.status === 'screened').length;
  return { asOf, from, to, unit, rule: USAGE_SCREEN_RULE,
    status: points.size === 0 ? 'no_history' : screened ? 'screened' : 'insufficient_data',
    recordingCompleteness: 'not_verified_by_ledger',
    summary: { days: windowDays, screened, reviewCandidates: results.filter(r => r.review === true).length,
      missingObservations: results.filter(r => r.status === 'missing_observation').length,
      insufficientReferenceSpan: results.filter(r => r.status === 'insufficient_reference_span').length,
      referenceHasGaps: results.filter(r => r.status === 'reference_has_gaps').length },
    results, limitations: 'Heuristic review candidates only. No field accuracy, anomaly labels, drift diagnosis, holiday/weather attribution, automatic corrections or retraining. Missing dates never become zero. Current corrected ledger, not a historical snapshot.' };
}
