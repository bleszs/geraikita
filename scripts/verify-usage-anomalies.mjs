import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { usageAnomalyReport } from './usage-anomaly-report.mjs';
import { writeNewJson } from './forecast-data.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
function snapshot(filename) {
  assert.ok(statSync(filename).isFile(), 'Database harus sudah tersedia.');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    db.exec('BEGIN');
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    const tables = db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({ name, sql }) => {
      const rows = db.prepare('SELECT * FROM "' + name.replaceAll('"', '""') + '"').all();
      return { name, rows: rows.length, sha256: hash(JSON.stringify({ sql, rows: rows.map(r => JSON.stringify(r)).sort() })) };
    });
    db.exec('COMMIT'); return tables;
  } finally { db.close(); }
}

try {
  const { values } = parseArgs({ options: { database: { type: 'string' }, backup: { type: 'string' }, out: { type: 'string' } } });
  assert.ok(values.backup && values.out, 'Isi --backup PATH dan --out PATH baru; bukti lama tidak ditimpa.');
  const filename = values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite';
  const backup = snapshot(values.backup), before = snapshot(filename);
  assert.deepEqual(before, backup, 'Data sekarang berbeda dari backup; periksa perubahan sebelum menyatakan preservasi.');
  const report = usageAnomalyReport({ filename });
  const after = snapshot(filename);
  assert.deepEqual(after, before, 'Data berubah selama pemeriksaan; bukti preservasi tidak dibuat.');
  const sourceFiles = ['server/ml/usage-anomalies.mjs', 'scripts/usage-anomaly-report.mjs', 'scripts/usage-anomalies.mjs',
    'scripts/verify-usage-anomalies.mjs', 'tests/usage-anomalies.test.mjs'];
  const result = { version: JSON.parse(readFileSync('package.json', 'utf8')).version, checkedAt: new Date().toISOString(), asOf: report.asOf,
    readOnly: true, liveSummary: report.summary,
    userData: { backup: values.backup, tablesCompared: after.length, changedTables: [], preserved: true,
      tableCounts: Object.fromEntries(after.map(t => [t.name, t.rows])) },
    sourceHashes: Object.fromEntries(sourceFiles.map(file => [file, hash(readFileSync(file))])),
    fieldValidated: false, accuracyMetrics: null, newTraining: false, automaticActions: false,
    note: 'Actual ledger audit and backup comparison only. Zero screened days means no evidence of anomaly accuracy; it does not mean the business has no anomalies.' };
  writeNewJson(values.out, result);
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
