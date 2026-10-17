import { addDays } from '../common.mjs';
import { ensure, validDate, MIN_DAYS } from './forecast-model.mjs';

const dayDifference = (from, to) => (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000;

// Presence in a usage ledger is observable. Completeness of an actual business
// day is not: no row can mean either no usage or an unrecorded transaction.
export function inspectHistory(series, asOf) {
  ensure(validDate(asOf), 'Tanggal audit histori tidak valid.');
  ensure(Array.isArray(series), 'Histori harus berupa array.');
  const points = new Map();
  for (const row of series) {
    ensure(validDate(row?.date), 'Tanggal ledger tidak valid.');
    if (row.date >= asOf) continue; // No partial-day/future information in diagnostics.
    ensure(typeof row.qty === 'number' && Number.isFinite(row.qty) && row.qty >= 0, 'Jumlah ledger harus numerik, finite dan tidak negatif.');
    ensure(!points.has(row.date), 'Tanggal ledger duplikat.');
    points.set(row.date, row.qty);
  }
  const dates = [...points.keys()].sort();
  const first = dates[0] || null, last = dates.at(-1) || null;
  const calendarDays = first ? dayDifference(first, asOf) : 0;
  const windowFrom = addDays(asOf, -14), windowTo = addDays(asOf, -1);
  let recordedDates = 0, explicitZeroDates = 0, assumedZeroDates = 0, beforeFirstRecordDates = 0;
  for (let i = 0; i < 14; i++) {
    const date = addDays(windowFrom, i);
    if (points.has(date)) {
      recordedDates++;
      if (points.get(date) === 0) explicitZeroDates++;
    } else if (first && date >= first) assumedZeroDates++;
    else beforeFirstRecordDates++;
  }
  const status = !first ? 'no_history' : recordedDates === 14 ? 'all_dates_present' : assumedZeroDates ? 'contains_assumed_zeros' : 'partial_window';
  let recentChange = null;
  if (calendarDays >= 14) {
    const mean = offset => Array.from({ length: 7 }, (_, i) => points.get(addDays(asOf, offset + i)) ?? 0).reduce((a, b) => a + b, 0) / 7;
    const meanPrevious7 = mean(-14), meanLast7 = mean(-7);
    recentChange = { meanPrevious7, meanLast7, absoluteChange: meanLast7 - meanPrevious7,
      relativeChange: meanPrevious7 === 0 ? null : (meanLast7 - meanPrevious7) / meanPrevious7,
      usesAssumedZeros: assumedZeroDates > 0, method: 'Descriptive calendar means only; absent ledger dates assumed zero, no anomaly threshold or retraining.' };
  }
  const enoughSpan = calendarDays >= MIN_DAYS;
  const candidateFrom = enoughSpan ? addDays(asOf, -MIN_DAYS) : null;
  const candidateRecordedDates = candidateFrom ? dates.filter(date => date >= candidateFrom).length : 0;
  return { asOf, firstRecorded: first, lastRecorded: last, calendarDaysSinceFirst: calendarDays,
    recordedDates: dates.length, explicitZeroDates: [...points.values()].filter(qty => qty === 0).length,
    assumedZeroDatesSinceFirst: calendarDays - dates.length,
    daysWithoutEntryAtEnd: last ? dayDifference(last, asOf) - 1 : null,
    recordingCompleteness: 'not_verified_by_ledger',
    recent14: { from: windowFrom, to: windowTo, status, recordedDates, explicitZeroDates, assumedZeroDates, beforeFirstRecordDates },
    recentChange,
    training: { minimumDays: MIN_DAYS, status: !first ? 'no_history' : enoughSpan ? 'needs_permission_and_completeness_confirmation' : 'insufficient_calendar_span',
      additionalCalendarDays: Math.max(0, MIN_DAYS - calendarDays), candidateFrom, candidateTo: enoughSpan ? windowTo : null,
      candidateRecordedDates, candidateAssumedZeroDates: enoughSpan ? MIN_DAYS - candidateRecordedDates : null,
      completenessConfirmed: false, automaticTraining: false },
    note: 'Ledger presence is not proof of complete daily recording. Explicit zeros are stored rows; absent dates are assumptions, not confirmed zero usage.' };
}
