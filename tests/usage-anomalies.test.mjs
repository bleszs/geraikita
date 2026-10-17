import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { addDays } from '../server/common.mjs';
import { createStore } from '../server/store.mjs';
import { createService } from '../server/service.mjs';
import { createIdentity } from '../server/identity.mjs';
import { screenUsage, USAGE_SCREEN_RULE } from '../server/ml/usage-anomalies.mjs';
import { usageAnomalyReport } from '../scripts/usage-anomaly-report.mjs';

// Contract fixtures only; these observations never enter the live application.
const asOf = '2026-04-01', target = addDays(asOf, -1);
const options = { asOf, windowDays: 1, unit: 'kg' };
const rows = (count = 84, qty = 10) => Array.from({ length: count }, (_, i) => ({ date: addDays(asOf, i - count), qty }));
const last = result => result.results.at(-1);
function temp(t, beforeRemove = () => {}) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'gerai-usage-review-'));
  t.after(() => {
    beforeRemove();
    const resolved = realpathSync(directory);
    assert.equal(path.dirname(resolved), realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('gerai-usage-review-'));
    rmSync(resolved, { recursive: true, force: true });
  });
  return directory;
}
function fixture(t) {
  let store;
  const directory = temp(t, () => store?.close()), filename = path.join(directory, 'source.sqlite');
  store = createStore(filename);
  const service = createService(store), identity = createIdentity(store);
  const owner = identity.register({ businessName: 'Contract audit', communityName: 'Contract group', email: randomUUID() + '@example.test', password: 'Contract-password-456' });
  const ingredient = service.saveIngredient(owner, null, { name: 'Contract ingredient', unit: 'kg', min: 0, storageNote: '', catalogRevision: 1 });
  const insert = (date, qty) => store.run('INSERT INTO daily_usage VALUES(?,?,?,?,?)', owner.workspace_id, owner.business_id, ingredient.id, date, Math.round(qty * 10000));
  const snapshot = () => {
    const db = new DatabaseSync(filename, { readOnly: true });
    try { return db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({ name }) => [name, db.prepare('SELECT * FROM "' + name + '"').all()]); }
    finally { db.close(); }
  };
  return { directory, filename, store, service, identity, owner, ingredient, insert, snapshot };
}

test('empty/partial-only usage is unknown and never produces a normal or anomaly classification', () => {
  const report = screenUsage([], options);
  assert.equal(report.status, 'no_history'); assert.equal(report.summary.screened, 0);
  assert.equal(last(report).status, 'missing_observation'); assert.equal(last(report).review, null);
  assert.deepEqual(screenUsage([{ date: asOf, qty: 99 }, { date: addDays(asOf, 1), qty: 9 }], options), report);
  assert.equal(report.recordingCompleteness, 'not_verified_by_ledger');
});

test('reference follows the same weekday instead of flagging ordinary weekly seasonality', () => {
  const history = rows().map(r => ({ ...r, qty: new Date(r.date + 'T12:00:00Z').getUTCDay() === 2 ? 100 : 10 }));
  const result = last(screenUsage(history, options));
  assert.equal(result.status, 'screened'); assert.equal(result.review, false); assert.equal(result.median, 100);
  assert.equal(result.reference.length, 8); assert.ok(result.reference.every(r => r.date < target));
  assert.equal(result.reference.at(-1).date, addDays(target, -56));
});

test('high and explicitly stored zero usage are review candidates, with auditable reference and bounds', () => {
  for (const [qty, direction] of [[50, 'higher'], [0, 'lower']]) {
    const history = rows(); history.at(-1).qty = qty;
    const result = last(screenUsage(history, options));
    assert.equal(result.review, true); assert.equal(result.direction, direction);
    assert.equal(result.median, 10); assert.equal(result.mad, 0); assert.equal(result.modifiedZ, null);
    assert.equal(result.lower, 5); assert.equal(result.upper, 15); assert.equal(result.quantity, qty);
  }
});

test('screening is causal and invariant to input order and all observations after a target', () => {
  const history = rows(); history.at(-3).qty = 80;
  const before = screenUsage(history, { ...options, windowDays: 3 }).results[0];
  const changed = history.map(r => r.date > before.date ? { ...r, qty: 99999 } : r).reverse();
  changed.push({ date: asOf, qty: 0 }, { date: addDays(asOf, 2), qty: 500 });
  const after = screenUsage(changed, { ...options, windowDays: 3 }).results[0];
  assert.deepEqual(after, before); assert.equal(before.review, true);
});

test('any missing date in the reference window blocks classification, even on another weekday', () => {
  const gap = addDays(target, -1), result = last(screenUsage(rows().filter(r => r.date !== gap), options));
  assert.equal(result.status, 'reference_has_gaps'); assert.deepEqual(result.missingDates, [gap]);
  assert.equal(result.review, null); assert.equal(result.median, undefined);
  const missingTarget = last(screenUsage(rows().filter(r => r.date !== target), options));
  assert.equal(missingTarget.status, 'missing_observation'); assert.equal(missingTarget.quantity, null);
});

test('calendar span and stored zeros remain separate; fifty-six prior dates are required', () => {
  assert.equal(last(screenUsage(rows(56), options)).status, 'insufficient_reference_span');
  assert.equal(last(screenUsage(rows(57), options)).status, 'screened');
  const zero = last(screenUsage(rows(57, 0), options));
  assert.equal(zero.status, 'screened'); assert.equal(zero.review, false); assert.equal(zero.median, 0);
  assert.equal(last(screenUsage([rows()[0], rows().at(-1)], options)).status, 'reference_has_gaps');
});

test('MAD threshold resists one historical spike and exposes the actual modified z score', () => {
  const history = rows();
  const values = [6, 8, 10, 10, 10, 10, 12, 1000];
  values.forEach((qty, i) => { history.find(r => r.date === addDays(target, -7 * (i + 1))).qty = qty; });
  history.at(-1).qty = 30;
  const result = last(screenUsage(history, options));
  assert.equal(result.median, 10); assert.equal(result.mad, 1);
  assert.equal(result.threshold, 3.5 / 0.6745); assert.equal(result.modifiedZ, 0.6745 * 20);
  assert.equal(result.review, true);
});

test('zero MAD uses ledger precision floors, including fractional recipe usage of count units', () => {
  const history = rows(57, 0); history.at(-1).qty = 0.0002;
  assert.equal(last(screenUsage(history, { ...options, unit: 'butir' })).review, false);
  history.at(-1).qty = 0.0003;
  assert.equal(last(screenUsage(history, { ...options, unit: 'butir' })).review, true);
  assert.equal(last(screenUsage(history, options)).threshold, 0.0002);
});

test('exact threshold is not flagged and floating subtraction does not flip a ledger boundary', () => {
  for (const [base, qty] of [[10, 15], [10, 5], [0.1, 0.15]]) {
    const history = rows(57, base); history.at(-1).qty = qty;
    assert.equal(last(screenUsage(history, options)).review, false);
    history.at(-1).qty = qty + (qty > base ? 0.0001 : -0.0001);
    assert.equal(last(screenUsage(history, options)).review, true);
  }
});

test('invalid dates, duplicate days, numeric corruption, units and windows fail explicitly', () => {
  for (const history of [[{ date: '2026-02-30', qty: 1 }], [{ date: target, qty: -1 }], [{ date: target, qty: NaN }],
    [{ date: target, qty: Infinity }], [{ date: target, qty: '1' }], [{ date: target, qty: Number.MAX_VALUE }],
    [{ date: target, qty: 1 }, { date: target, qty: 2 }]]) assert.throws(() => screenUsage(history, options));
  for (const change of [{ asOf: 'bad' }, { asOf: '0001-01-01' }, { windowDays: 0 }, { windowDays: 29 }, { windowDays: 1.5 }, { unit: 'normalized_sales' }])
    assert.throws(() => screenUsage([], { ...options, ...change }));
  assert.throws(() => screenUsage(null, options));
  assert.ok(Object.isFrozen(USAGE_SCREEN_RULE));
});

test('leap-day references remain contiguous and use the correct weekday', () => {
  const history = Array.from({ length: 57 }, (_, i) => ({ date: addDays('2024-03-01', i - 57), qty: 10 }));
  const result = last(screenUsage(history, { ...options, asOf: '2024-03-01' }));
  assert.equal(result.date, '2024-02-29'); assert.equal(result.reference[0].date, '2024-02-22');
  assert.equal(result.status, 'screened');
});

test('SQLite report enforces scope, excludes partial/future rows and preserves every table', t => {
  const f = fixture(t); for (const row of rows(57)) f.insert(row.date, row.qty);
  f.insert(asOf, 999); f.insert(addDays(asOf, 1), 999);
  const other = f.identity.register({ businessName: 'Other contract', inviteCode: f.service.bootstrap(f.owner).community.inviteCode, email: randomUUID() + '@example.test', password: 'Contract-password-456' });
  f.service.saveIngredient(other, null, { name: 'Other ingredient', unit: 'kg', min: 0, storageNote: '', catalogRevision: 1 });
  const before = f.snapshot();
  const report = usageAnomalyReport({ filename: f.filename, asOf, windowDays: 1, workspaceId: f.owner.workspace_id, businessId: f.owner.business_id, productId: f.ingredient.id });
  assert.equal(report.sources.length, 1); assert.equal(report.summary.screenedDays, 1); assert.equal(report.summary.reviewCandidates, 0);
  assert.equal(report.sources[0].excludedPartialOrFutureRows, 2); assert.equal(report.fieldValidated, false); assert.equal(report.automaticActions, false);
  assert.throws(() => usageAnomalyReport({ filename: f.filename, workspaceId: f.owner.workspace_id, businessId: other.business_id, productId: f.ingredient.id }), /Tidak ada bahan/);
  for (const filter of [{ productId: f.ingredient.id }, { workspaceId: '' }, { workspaceId: '', businessId: '' }, { workspaceId: 'x OR 1=1', businessId: 'y' }])
    assert.throws(() => usageAnomalyReport({ filename: f.filename, ...filter }));
  assert.throws(() => usageAnomalyReport({ filename: f.filename, asOf: '9999-01-01' }));
  assert.deepEqual(f.snapshot(), before);
});

test('empty real-ledger report creates no observations and missing databases are not created', t => {
  const f = fixture(t), before = f.snapshot();
  const report = usageAnomalyReport({ filename: f.filename, asOf });
  assert.equal(report.summary.withoutHistory, 1); assert.equal(report.summary.screenedDays, 0);
  assert.equal(report.sources[0].screening.status, 'no_history'); assert.deepEqual(f.snapshot(), before);
  const missing = path.join(f.directory, 'missing.sqlite');
  assert.throws(() => usageAnomalyReport({ filename: missing })); assert.equal(existsSync(missing), false);
});

test('CLI validates arguments, exports actual report and refuses to overwrite prior evidence', t => {
  const f = fixture(t), output = path.join(f.directory, 'report.json');
  const run = args => spawnSync(process.execPath, ['scripts/usage-anomalies.mjs', ...args], { encoding: 'utf8' });
  assert.equal(run(['--help']).status, 0);
  for (const args of [['--days', '0'], ['--days', '1.5'], ['--days', '29'], ['--unknown'], ['extra']]) assert.notEqual(run(args).status, 0);
  const command = ['--database', f.filename, '--as-of', asOf, '--days', '1', '--out', output];
  assert.equal(run(command).status, 0);
  assert.equal(JSON.parse(readFileSync(output, 'utf8')).summary.withoutHistory, 1);
  writeFileSync(output, 'preserved evidence');
  assert.notEqual(run(command).status, 0); assert.equal(readFileSync(output, 'utf8'), 'preserved evidence');
});
