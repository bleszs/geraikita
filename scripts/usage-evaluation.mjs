import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { addDays, dayAt } from '../server/common.mjs';
import { ensure, validDate } from '../server/ml/forecast-model.mjs';
import { screenUsage, USAGE_SCREEN_RULE } from '../server/ml/usage-anomalies.mjs';

export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const text = value => typeof value === 'string' && value.trim().length >= 3 && value.length <= 500;
const units = ['kg', 'gram', 'liter', 'ml', 'butir', 'buah'];
const labels = ['review_needed', 'expected', 'uncertain'];

export function evaluationSources() {
  return Object.fromEntries(['scripts/usage-evaluation.mjs', 'scripts/usage-evaluation-data.mjs', 'scripts/evaluate-usage.mjs',
    'server/ml/usage-anomalies.mjs', 'server/ml/forecast-model.mjs', 'server/common.mjs'].map(file =>
    [file, digest(readFileSync(new URL('../' + file, import.meta.url)))]));
}

export function targetDates(periods, asOf = dayAt()) {
  ensure(periods && ['validationFrom', 'validationTo', 'testFrom', 'testTo'].every(key =>
    validDate(periods[key]) && periods[key] >= '0001-04-01' && periods[key] < asOf), 'Isi empat batas periode valid sebelum hari berjalan.');
  const p = periods;
  ensure(p.validationFrom <= p.validationTo && p.validationTo < p.testFrom && p.testFrom <= p.testTo,
    'Periode validation harus mendahului test, tanpa overlap.');
  const dates = [];
  for (const [split, from, to] of [['validation', p.validationFrom, p.validationTo], ['test', p.testFrom, p.testTo]]) {
    let count = 0;
    for (let date = from; date <= to; date = addDays(date, 1)) {
      ensure(++count <= 366, 'Setiap split maksimal 366 tanggal.'); dates.push({ date, split });
    }
  }
  ensure((Date.parse(p.testTo) - Date.parse(p.validationFrom)) / 86400000 <= 3660, 'Rentang total maksimal 3660 hari.');
  return dates;
}

export function validateUsageDraft(data, asOf = dayAt()) {
  ensure(data?.schemaVersion === 1 && data.kind === 'usage-review-labels-v1', 'Schema anotasi pemakaian harus versi 1.');
  ensure(typeof data.datasetId === 'string' && /^[a-f0-9-]{36}$/.test(data.datasetId), 'Identitas dataset tidak valid.');
  ensure(units.includes(data.unit), 'Satuan bahan tidak didukung.');
  const provenance = data.provenance;
  ensure(provenance?.source === 'consented_business_usage' && provenance.permissionConfirmed === true && text(provenance.permissionReference),
    'Dataset memerlukan catatan usaha asli dan referensi izin yang dikonfirmasi.');
  const targets = targetDates(data.periods, asOf), from = addDays(data.periods.validationFrom, -56), to = data.periods.testTo;
  ensure(Array.isArray(data.observations) && data.observations.length > 0 && data.observations.length <= 3717,
    'Belum ada histori asli; tidak membuat histori pengganti.');
  let previous = '';
  for (const row of data.observations) {
    ensure(row && Object.keys(row).sort().join(',') === 'date,qty' && validDate(row.date) && row.date >= from && row.date <= to && row.date > previous,
      'Observasi harus berurutan, unik, dalam rentang referensi/target dan hanya berisi date/qty.');
    ensure(typeof row.qty === 'number' && Number.isFinite(row.qty) && row.qty >= 0 && row.qty <= Number.MAX_SAFE_INTEGER / 10000 &&
      Math.abs(row.qty * 10000 - Math.round(row.qty * 10000)) < 0.00001, 'Jumlah ledger harus finite, tidak negatif dan maksimal empat desimal.');
    previous = row.date;
  }
  ensure(Array.isArray(data.annotations) && data.annotations.length === targets.length, 'Anotasi harus mencakup semua tanggal target, bukan hanya kandidat aturan.');
  for (let i = 0; i < targets.length; i++) {
    const row = data.annotations[i], target = targets[i];
    ensure(row?.date === target.date && row.split === target.split, 'Tanggal/split anotasi hilang, duplikat atau tidak sesuai periode.');
    ensure(Object.keys(row).sort().join(',') === 'annotator,context,date,evidenceReference,label,recordingComplete,split',
      'Lembar anotasi hanya boleh memuat kolom review manusia, tanpa prediksi aturan.');
    ensure(row.label === null || labels.includes(row.label), 'Label harus review_needed, expected, uncertain atau null.');
    ensure(row.recordingComplete === null || typeof row.recordingComplete === 'boolean', 'Kelengkapan harian harus boolean atau null.');
    ensure(typeof row.annotator === 'string' && row.annotator.length <= 100 && typeof row.evidenceReference === 'string' && row.evidenceReference.length <= 500,
      'Annotator dan evidenceReference harus teks dengan panjang terbatas.');
    ensure(row.context === null || ['weekly_pattern', 'holiday', 'weather', 'promotion', 'recording_issue', 'other', 'unknown'].includes(row.context),
      'Context anotasi tidak didukung.');
  }
  return data;
}

// Labels and completeness decisions may change after the blind worksheet is frozen.
// Observation values, target selection, permission, unit and date boundaries may not.
function inputIdentity(data) {
  return { schemaVersion: data.schemaVersion, kind: data.kind, datasetId: data.datasetId, unit: data.unit,
    periods: data.periods, provenance: { source: data.provenance.source, permissionConfirmed: data.provenance.permissionConfirmed,
      permissionReference: data.provenance.permissionReference }, observations: data.observations,
    targets: data.annotations.map(({ date, split }) => ({ date, split })) };
}

export function freezeUsageProtocol(data) {
  validateUsageDraft(data);
  ensure(data.provenance.humanAnnotated === false && data.provenance.blindReviewConfirmed === false && data.provenance.completenessReviewed === false &&
    data.provenance.completenessReference === '' && data.annotations.every(row => row.label === null && row.recordingComplete === null &&
    row.annotator === '' && row.evidenceReference === '' && row.context === null), 'Bekukan lembar kosong sebelum anotasi, tanpa label atau konteks hasil review.');
  return { schemaVersion: 1, kind: 'usage-review-protocol-v1', frozenAt: new Date().toISOString(), datasetId: data.datasetId,
    inputSha256: digest(inputIdentity(data)), sourceSha256: evaluationSources(), rule: USAGE_SCREEN_RULE, periods: data.periods,
    targetCounts: Object.fromEntries(['validation', 'test'].map(split => [split, data.annotations.filter(row => row.split === split).length])),
    policy: 'Fixed causal rule; all target dates retained. Human labels blind to rule outputs. No tuning on test, automatic corrections, training or activation. Current corrected ledger snapshot, not a reconstruction of historical knowledge.' };
}

const ratio = (n, d) => d ? n / d : null;
export function summarizeUsage(rows) {
  const eligible = rows.filter(row => row.recordingComplete && row.label !== 'uncertain');
  const screened = eligible.filter(row => row.status === 'screened'), abstained = eligible.filter(row => row.status !== 'screened');
  const tp = screened.filter(row => row.review && row.label === 'review_needed').length;
  const fp = screened.filter(row => row.review && row.label === 'expected').length;
  const fn = screened.filter(row => !row.review && row.label === 'review_needed').length;
  const tn = screened.filter(row => !row.review && row.label === 'expected').length;
  const missedByAbstention = abstained.filter(row => row.label === 'review_needed').length;
  return { status: screened.length ? 'evaluated' : 'not_estimable', targetDays: rows.length, eligibleDays: eligible.length,
    uncertainLabels: rows.filter(row => row.label === 'uncertain').length,
    incompleteRecording: rows.filter(row => !row.recordingComplete).length,
    screenedDays: screened.length, abstainedDays: abstained.length, coverage: ratio(screened.length, eligible.length),
    confusionOnScreened: { truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn },
    precision: ratio(tp, tp + fp), recallOnScreened: ratio(tp, tp + fn),
    f1OnScreened: ratio(2 * tp, 2 * tp + fp + fn),
    reviewNeededDuringAbstention: missedByAbstention,
    endToEndRecall: ratio(tp, tp + fn + missedByAbstention),
    actualReviewCandidates: rows.filter(row => row.review === true).length,
    reviewBurdenPer100TargetDays: ratio(rows.filter(row => row.review === true).length * 100, rows.length),
    statusCounts: Object.fromEntries([...new Set(rows.map(row => row.status))].sort().map(status => [status, rows.filter(row => row.status === status).length])) };
}

export function evaluateUsage(data, protocol, { split = 'test' } = {}) {
  validateUsageDraft(data);
  ensure(['validation', 'test'].includes(split), 'Split harus validation atau test.');
  ensure(protocol?.schemaVersion === 1 && protocol.kind === 'usage-review-protocol-v1' && protocol.datasetId === data.datasetId &&
    typeof protocol.frozenAt === 'string' && Number.isFinite(Date.parse(protocol.frozenAt)) && Date.parse(protocol.frozenAt) <= Date.now(), 'Protokol beku tidak valid.');
  ensure(protocol.inputSha256 === digest(inputIdentity(data)) && digest(protocol.periods) === digest(data.periods),
    'Observasi, scope dataset atau periode berubah setelah protokol dibekukan.');
  ensure(digest(protocol.rule) === digest(USAGE_SCREEN_RULE) && digest(protocol.sourceSha256) === digest(evaluationSources()),
    'Aturan atau sumber evaluasi berubah; protokol ini tidak boleh dipakai untuk retuning.');
  const p = data.provenance;
  ensure(p.humanAnnotated === true && p.blindReviewConfirmed === true && p.completenessReviewed === true && text(p.completenessReference),
    'Konfirmasi anotasi manusia tanpa melihat keluaran aturan dan pemeriksaan kelengkapan bersama pemilik.');
  ensure(data.annotations.every(row => labels.includes(row.label) && typeof row.recordingComplete === 'boolean' &&
    text(row.annotator) && row.annotator.length <= 100 && text(row.evidenceReference) && row.context !== null),
    'Semua tanggal di kedua split harus dianotasi dengan label, kelengkapan, annotator, bukti dan context; belum membuat skor.');
  const rows = data.annotations.filter(row => row.split === split).map(row => {
    const result = screenUsage(data.observations, { asOf: addDays(row.date, 1), windowDays: 1, unit: data.unit }).results[0];
    return { date: row.date, label: row.label, recordingComplete: row.recordingComplete, context: row.context,
      status: result.status, review: result.review, direction: result.direction ?? null };
  });
  return { schemaVersion: 1, evaluatedAt: new Date().toISOString(), datasetId: data.datasetId, split, rule: USAGE_SCREEN_RULE,
    metrics: summarizeUsage(rows), rows, sourceSha256: protocol.sourceSha256,
    newTraining: false, automaticActions: false, fieldValidated: false,
    limitations: [
      'Labels, permissions and blind review are provider attestations, not independently verified truth or operational validation.',
      'Positive means a human says follow-up is needed, not proven fraud, waste or a causal diagnosis.',
      'Precision/recall on screened days exclude uncertain/incomplete labels; abstention and end-to-end recall remain visible.',
      'Actual review burden counts all flags, including uncertain or incomplete target dates. Exclusion counts may overlap.',
      'Reference dates may overlap preceding validation and test observations, as in causal online use. No future quantity enters a target reference.',
      'Current corrected ledger snapshot, not the ledger available at a historical date. Context tags do not establish holiday/weather effects.',
      'No fitting, threshold selection, retraining or public-model activation. Test results may not be reused for tuning and called independent.' ] };
}
