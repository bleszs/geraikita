import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { addDays, dayAt } from '../server/common.mjs';
import { inspectHistory } from '../server/ml/history-quality.mjs';
import { forecastReadiness } from '../scripts/forecast-readiness.mjs';
import { forecast } from '../server/forecast.mjs';
import { createStore } from '../server/store.mjs';
import { createService } from '../server/service.mjs';
import { createIdentity } from '../server/identity.mjs';
import { train } from '../server/ml/forecast-model.mjs';
import { createForecastRegistry } from '../server/forecast-registry.mjs';

// Contract data only in memory/files under an OS-created temporary directory.
function fixture(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'gerai-readiness-'));
  const filename = path.join(directory, 'source.sqlite');
  const store = createStore(filename), service = createService(store), identity = createIdentity(store);
  const owner = identity.register({ businessName: 'Isolated audit owner', communityName: 'Isolated audit group', email: randomUUID()+'@example.test', password: 'Only-contract-password-456' });
  const ingredient = service.saveIngredient(owner, null, { name: 'Isolated audit material', unit: 'gram', min: 0, storageNote: '', catalogRevision: 1 });
  t.after(() => {
    store.close();
    const resolved = realpathSync(directory);
    assert.equal(path.dirname(resolved), realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('gerai-readiness-'));
    rmSync(resolved, { recursive: true, force: true });
  });
  const insert = (date, qty) => store.run('INSERT INTO daily_usage VALUES(?,?,?,?,?)', owner.workspace_id, owner.business_id, ingredient.id, date, Math.round(qty*10000));
  return { directory, filename, store, service, identity, owner, ingredient, insert };
}

test('empty and partial/future-only history remains unknown, not confirmed zero history', () => {
  const empty = inspectHistory([], '2026-01-20');
  assert.equal(empty.training.status, 'no_history'); assert.equal(empty.recordedDates, 0);
  assert.equal(empty.recent14.status, 'no_history'); assert.equal(empty.recentChange, null);
  assert.equal(empty.training.completenessConfirmed, false);
  assert.deepEqual(inspectHistory([{ date: '2026-01-20', qty: 10 }, { date: '2026-01-21', qty: 99 }], '2026-01-20'), empty);
});

test('ledger audit separates explicitly stored zero, missing dates and dates before first record', () => {
  const result = inspectHistory([{ date: '2026-01-01', qty: 10 }, { date: '2026-01-07', qty: 0 }, { date: '2026-01-19', qty: 10 }], '2026-01-20');
  assert.equal(result.calendarDaysSinceFirst, 19); assert.equal(result.recordedDates, 3);
  assert.equal(result.explicitZeroDates, 1); assert.equal(result.assumedZeroDatesSinceFirst, 16);
  assert.equal(result.recent14.recordedDates, 2); assert.equal(result.recent14.assumedZeroDates, 12);
  assert.equal(result.recent14.status, 'contains_assumed_zeros'); assert.equal(result.recentChange.usesAssumedZeros, true);
  assert.equal(result.daysWithoutEntryAtEnd, 0);
  const short = inspectHistory([{ date: '2026-01-18', qty: 1 }, { date: '2026-01-19', qty: 1 }], '2026-01-20');
  assert.equal(short.recent14.beforeFirstRecordDates, 12); assert.equal(short.recent14.assumedZeroDates, 0);
  assert.equal(short.recent14.status, 'partial_window');
});

test('descriptive weekly change requires fourteen calendar days, preserves explicit zero and undefined ratios', () => {
  const rows = Array.from({ length: 14 }, (_, i) => ({ date: addDays('2026-01-01', i), qty: i < 7 ? 4 : 8 }));
  const result = inspectHistory(rows, '2026-01-15');
  assert.equal(result.recent14.status, 'all_dates_present'); assert.equal(result.recentChange.relativeChange, 1);
  assert.equal(result.recentChange.meanPrevious7, 4); assert.equal(result.recentChange.meanLast7, 8);
  assert.equal(result.recordingCompleteness, 'not_verified_by_ledger');
  const zeros = inspectHistory(rows.map(r => ({ ...r, qty: 0 })), '2026-01-15');
  assert.equal(zeros.recent14.explicitZeroDates, 14); assert.equal(zeros.recentChange.relativeChange, null);
  assert.equal(zeros.recentChange.absoluteChange, 0); assert.equal(zeros.recentChange.usesAssumedZeros, false);
});

test('history rejects invalid dates, duplicate completed dates and invalid quantities; leap days are counted correctly', () => {
  for (const rows of [[{ date: '2026-02-30', qty: 1 }], [{ date: '2026-01-01', qty: -1 }], [{ date: '2026-01-01', qty: Infinity }], [{ date: '2026-01-01', qty: '1' }], [{ date: '2026-01-01', qty: 1 }, { date: '2026-01-01', qty: 2 }]]) {
    assert.throws(() => inspectHistory(rows, '2026-03-01'));
  }
  assert.throws(() => inspectHistory([], 'invalid'));
  assert.equal(inspectHistory([{ date: '2024-02-28', qty: 1 }], '2024-03-01').calendarDaysSinceFirst, 2);
});

test('eighty-four elapsed days never automatically confirm recording completeness or authorize training', () => {
  const result = inspectHistory([{ date: '2026-01-01', qty: 1 }], addDays('2026-01-01', 84));
  assert.equal(result.training.status, 'needs_permission_and_completeness_confirmation');
  assert.equal(result.training.candidateRecordedDates, 1); assert.equal(result.training.candidateAssumedZeroDates, 83);
  assert.equal(result.training.completenessConfirmed, false); assert.equal(result.training.automaticTraining, false);
  assert.equal(result.training.additionalCalendarDays, 0); assert.equal(result.daysWithoutEntryAtEnd, 83);
  assert.equal(inspectHistory([{ date: '2026-01-01', qty: 1 }], addDays('2026-01-01', 83)).training.status, 'insufficient_calendar_span');
});

test('runtime exposes real coverage on both insufficient history and baseline without changing zero assumption predictions', () => {
  const sparse = [{ date: '2026-01-01', qty: 7 }, { date: '2026-01-14', qty: 7 }];
  const filled = Array.from({ length: 14 }, (_, i) => ({ date: addDays('2026-01-01', i), qty: i === 0 || i === 13 ? 7 : 0 }));
  const first = forecast(sparse, 0, '2026-01-15'), second = forecast(filled, 0, '2026-01-15');
  assert.equal(first.predicted, second.predicted); assert.equal(first.amount, second.amount);
  assert.equal(first.historyQuality.recent14.assumedZeroDates, 12); assert.equal(second.historyQuality.recent14.explicitZeroDates, 12);
  assert.deepEqual(forecast([...sparse, { date: '2026-01-15', qty: 999 }], 0, '2026-01-15'), first);
  assert.equal(forecast([], 0, '2026-01-15').historyQuality.training.status, 'no_history');
});

test('database readiness is scoped, excludes today/future and leaves every SQLite table unchanged', t => {
  const f = fixture(t); f.insert('2026-01-01', 5); f.insert('2026-01-03', 0); f.insert('2026-01-05', 99); f.insert('2026-01-06', 99);
  const other = f.identity.register({ businessName: 'Other isolated audit', inviteCode: f.service.bootstrap(f.owner).community.inviteCode, email: randomUUID()+'@example.test', password: 'Only-contract-password-456' });
  f.service.saveIngredient(other, null, { name: 'Different isolated material', unit: 'kg', min: 0, storageNote: '', catalogRevision: 1 });
  const snapshot = () => { const db = new DatabaseSync(f.filename, { readOnly: true }); try { return db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({ name }) => [name, db.prepare('SELECT * FROM "'+name+'"').all()]); } finally { db.close(); } };
  const before = snapshot();
  const report = forecastReadiness({ filename: f.filename, asOf: '2026-01-05', workspaceId: f.owner.workspace_id, businessId: f.owner.business_id, models: path.join(f.directory, 'absent-models') });
  assert.equal(report.readOnly, true); assert.equal(report.sources.length, 1); assert.equal(report.sources[0].scope.productId, f.ingredient.id);
  assert.equal(report.sources[0].history.recordedDates, 2); assert.equal(report.sources[0].excludedPartialOrFutureRows, 2);
  assert.equal(report.sources[0].model.registryStatus, 'not_trained'); assert.deepEqual(snapshot(), before);
  assert.throws(() => forecastReadiness({ filename: f.filename, productId: f.ingredient.id }), /workspace/);
  assert.throws(() => forecastReadiness({ filename: f.filename, workspaceId: f.owner.workspace_id, businessId: randomUUID() }), /Tidak ada bahan/);
});

test('readiness reports a private active model without returning its learned coefficients or activating other scopes', t => {
  const f = fixture(t), scope = { workspaceId: f.owner.workspace_id, businessId: f.owner.business_id, productId: f.ingredient.id, unit: 'gram' };
  const observations = Array.from({ length: 112 }, (_, i) => ({ date: addDays(dayAt(), i-112), quantity: 10+i*.5 }));
  observations.forEach(r => f.insert(r.date, r.quantity));
  const artifact = train({ schemaVersion: 1, scope, provenance: { source: 'user_records', reference: 'Isolated training contract only', permissionConfirmed: true, completeDailyRecords: true }, observations });
  const modelFile = path.join(f.directory, 'model.json'); writeFileSync(modelFile, JSON.stringify(artifact));
  createForecastRegistry(f.directory).activate(modelFile);
  const report = forecastReadiness({ filename: f.filename, models: f.directory });
  assert.equal(report.summary.activeRegistryModels, 1); assert.equal(report.sources[0].model.kind, artifact.kind);
  assert.equal(report.sources[0].model.recentInputDatesPresent, true); assert.equal(report.sources[0].model.recentRecordingCompletenessVerified, false);
  assert.equal(JSON.stringify(report).includes('weights'), false);
  assert.equal(report.sources[0].history.training.status, 'needs_permission_and_completeness_confirmation');
});

test('readiness CLI handles empty real scopes, refuses future audit dates and preserves saved reports', t => {
  const f = fixture(t), destination = path.join(f.directory, 'audit.json');
  const emptyPath = path.join(f.directory, 'empty.sqlite');
  createStore(emptyPath).close();
  assert.equal(forecastReadiness({ filename: emptyPath }).summary.ingredients, 0);
  const run = args => spawnSync(process.execPath, ['scripts/forecast.mjs', 'readiness', '--database', f.filename, ...args], { encoding: 'utf8' });
  const result = run(['--out', destination]);
  assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).summary.withoutHistory, 1);
  const before = readFileSync(destination, 'utf8');
  assert.equal(run(['--out', destination]).status, 1); assert.equal(readFileSync(destination, 'utf8'), before);
  assert.equal(run(['--as-of', addDays(dayAt(), 1)]).status, 1);
});
