import { parseArgs } from 'node:util';
import { backupDatabase } from './maintenance.mjs';

try {
  const { values } = parseArgs({ options: { database: { type: 'string' }, directory: { type: 'string' } } });
  const result = backupDatabase(values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite', values.directory || 'data/backups');
  console.log(`Backup tersimpan: ${result.filename}\nUkuran: ${result.bytes} byte · integritas SQLite dan relasi: OK\nDraft offline di browser dan model Ollama tidak termasuk backup ini.`);
} catch (error) {
  console.error('Backup gagal: ' + error.message);
  process.exitCode = 1;
}
