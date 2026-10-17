import { addDays } from '../common.mjs';
import { ensure, validDate } from './forecast-model.mjs';

// A review rule for a sustained level shift between a recent window and the
// baseline before it. Window medians ignore single-day spikes, so this is
// distinct from the per-date outlier screen. Not a trained model or a
// calibrated test, and it never attributes a cause or changes any record.
export const DRIFT_RULE = Object.freeze({
  kind: 'median-level-shift-review-v1', recentDays: 14, baselineDays: 28,
  modifiedZLimit: 3.5, madMultiplier: 0.6745, relativeFloor: 0.25,
  minimumShiftSteps: 2, ledgerResolution: 0.0001,
  source: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm'
});
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = sorted.length / 2;
  return Number.isInteger(middle) ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[Math.floor(middle)];
};
const windowValues = (points, from, days) => {
  const values = [], missing = [];
  for (let i = 0; i < days; i++) { const date = addDays(from, i); if (points.has(date)) values.push(points.get(date)); else missing.push(date); }
  return { values, missing };
};
export function screenDrift(series, { asOf, unit } = {}) {
  ensure(validDate(asOf) && asOf >= '0001-04-01', 'Tanggal pemeriksaan tidak valid.');
  ensure(['kg', 'gram', 'liter', 'ml', 'butir', 'buah'].includes(unit), 'Satuan bahan tidak didukung.');
  ensure(Array.isArray(series), 'Histori harus berupa array.');
  const points = new Map();
  for (const row of series) {
    ensure(validDate(row?.date), 'Tanggal ledger tidak valid.');
    if (row.date >= asOf) continue; // Partial/future quantities cannot enter any window.
    ensure(typeof row.qty === 'number' && Number.isFinite(row.qty) && row.qty >= 0 && row.qty <= Number.MAX_SAFE_INTEGER / 10000,
      'Jumlah ledger harus numerik, finite, tidak negatif dan dalam batas penyimpanan.');
    ensure(!points.has(row.date), 'Tanggal ledger duplikat.');
    points.set(row.date, row.qty);
  }
  const rule = DRIFT_RULE;
  const recentFrom = addDays(asOf, -rule.recentDays), recentTo = addDays(asOf, -1);
  const baselineFrom = addDays(asOf, -rule.recentDays - rule.baselineDays), baselineTo = addDays(recentFrom, -1);
  const base = { asOf, unit, rule, recent: { from: recentFrom, to: recentTo }, baseline: { from: baselineFrom, to: baselineTo },
    recordingCompleteness: 'not_verified_by_ledger',
    limitations: 'Heuristic level-shift review only. No trained model, calibrated test, field accuracy, anomaly labels, cause attribution (holiday/weather), automatic corrections or retraining. Missing dates never become zero. Current corrected ledger, not a historical snapshot.' };
  if (points.size === 0) return { ...base, status: 'no_history', changed: null };
  const first = [...points.keys()].sort()[0];
  if (first > baselineFrom) return { ...base, status: 'insufficient_history', changed: null };
  const baseWindow = windowValues(points, baselineFrom, rule.baselineDays), recentWindow = windowValues(points, recentFrom, rule.recentDays);
  if (baseWindow.missing.length) return { ...base, status: 'baseline_has_gaps', changed: null, missingDates: baseWindow.missing };
  if (recentWindow.missing.length) return { ...base, status: 'recent_has_gaps', changed: null, missingDates: recentWindow.missing };
  const baselineMedian = median(baseWindow.values), recentMedian = median(recentWindow.values);
  const mad = median(baseWindow.values.map(v => Math.abs(v - baselineMedian)));
  const threshold = Math.max(rule.modifiedZLimit * mad / rule.madMultiplier, rule.relativeFloor * baselineMedian, rule.minimumShiftSteps * rule.ledgerResolution);
  const shift = recentMedian - baselineMedian;
  // Avoid boundary flips caused only by floating-point subtraction at ledger precision.
  const tolerance = Math.max(1, baselineMedian, recentMedian, threshold) * Number.EPSILON * 16;
  const changed = Math.abs(shift) - threshold > tolerance;
  return { ...base, status: 'screened',
    baseline: { from: baselineFrom, to: baselineTo, days: rule.baselineDays, median: baselineMedian, mad },
    recent: { from: recentFrom, to: recentTo, days: rule.recentDays, median: recentMedian },
    shift, relativeShift: baselineMedian === 0 ? null : shift / baselineMedian,
    modifiedZ: mad === 0 ? null : rule.madMultiplier * shift / mad, threshold,
    changed, direction: changed ? (shift > 0 ? 'higher' : 'lower') : null };
}
