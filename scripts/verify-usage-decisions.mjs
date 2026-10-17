import { DatabaseSync } from 'node:sqlite';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { writeNewJson } from './forecast-data.mjs';
import { usageAnomalyReport } from './usage-anomaly-report.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
function snapshot(filename) {
  assert(statSync(filename).isFile(), 'File SQLite harus sudah tersedia.');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    db.exec('BEGIN'); assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    const tables = db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({ name, sql }) => {
      const rows = db.prepare('SELECT * FROM "' + name.replaceAll('"', '""') + '"').all();
      return { name, rows: rows.length, sha256: hash(JSON.stringify({ sql, rows: rows.map(row => JSON.stringify(row)).sort() })) };
    }); db.exec('COMMIT'); return tables;
  } finally { db.close(); }
}
try {
  const { values } = parseArgs({ options: { database: { type: 'string' }, backup: { type: 'string' }, out: { type: 'string' } } });
  assert(values.backup && values.out, 'Isi --backup PATH dan --out FILE_BARU.');
  const filename = values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite';
  const baseline = snapshot(values.backup), before = snapshot(filename), names = new Set(baseline.map(table => table.name));
  assert([19, 20].includes(baseline.length), 'Schema backup tidak sesuai migrasi tinjauan.');
  const added = before.filter(table => !names.has(table.name));
  assert.deepEqual(before.filter(table => names.has(table.name)), baseline, 'Isi/schema tabel lama berbeda dari backup.');
  if (baseline.length === 19) {
    assert.deepEqual(added.map(table => table.name), ['usage_review_decisions']); assert.equal(added[0].rows, 0, 'Tabel baru harus kosong untuk bukti migrasi awal.');
  } else assert.deepEqual(added, []);
  assert.equal(before.length, 20);
  const audit = usageAnomalyReport({ filename }), after = snapshot(filename); assert.deepEqual(after, before, 'Database berubah selama audit.');
  const report = { version: JSON.parse(readFileSync('package.json', 'utf8')).version, checkedAt: new Date().toISOString(), readOnly: true,
    userData: { backup: values.backup, preserved: true, tablesCompared: baseline.length, totalTablesAfterMigration: after.length, changedOriginalTables: [],
      addedTables: added.map(table => ({ name: table.name, rows: table.rows })), tableCounts: Object.fromEntries(after.map(table => [table.name, table.rows])) },
    liveSummary: audit.summary, fieldValidated: false, newTraining: false,
    note: 'Original table schemas and rows match the backup exactly. Only an empty owner-review table may be added on the initial migration. Read-only audit, no example review or usage inserted.' };
  writeNewJson(values.out, report); console.log(JSON.stringify(report, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
