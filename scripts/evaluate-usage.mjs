import { parseArgs } from 'node:util';
import { readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { exportUsageAnnotations } from './usage-evaluation-data.mjs';
import { digest, freezeUsageProtocol, evaluateUsage } from './usage-evaluation.mjs';

const help = `Evaluasi kandidat review pemakaian, tanpa mutasi database:
  npm run usage:evaluation -- export --workspace ID --business ID --product ID
    --validation-from YYYY-MM-DD --validation-to YYYY-MM-DD --test-from YYYY-MM-DD --test-to YYYY-MM-DD
    --confirm-permission --reference REFERENSI_IZIN --out datasets/private/usage-labels.json [--database PATH]
  npm run usage:evaluation -- freeze --dataset PATH [--out DIRECTORY_BARU]
  npm run usage:evaluation -- evaluate --dataset PATH_BERLABEL --protocol PATH_PROTOCOL [--split validation|test] [--out DIRECTORY_BARU]
Ekspor mencakup semua tanggal, tanpa hasil aturan atau label buatan. Bekukan sebelum anotasi.
Tanpa histori/label/izin, tidak ada skor. Panduan: docs/USAGE_EVALUATION.md.`;
const read = filename => {
  if (!filename) throw new Error('Isi path file yang diperlukan.');
  if (statSync(filename).size > 5_000_000) throw new Error('File maksimal 5 MB.');
  return readFileSync(filename, 'utf8').replace(/^\uFEFF/, '');
};
const write = (filename, value) => writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const { values: v, positionals } = parseArgs({ allowPositionals: true, options: Object.fromEntries([
    'database', 'workspace', 'business', 'product', 'validation-from', 'validation-to', 'test-from', 'test-to', 'reference', 'dataset', 'protocol', 'split', 'out'
  ].map(name => [name, { type: 'string' }]).concat([['confirm-permission', { type: 'boolean' }], ['help', { type: 'boolean' }]])) });
  const [command] = positionals;
  if (v.help || !command) console.log(help);
  else {
    if (positionals.length !== 1 || !['export', 'freeze', 'evaluate'].includes(command)) throw new Error('Perintah harus export, freeze atau evaluate.');
    if (command === 'export') {
      if (!v.out) throw new Error('Isi --out untuk lembar privat baru.');
      const data = exportUsageAnnotations({ filename: v.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite',
        workspaceId: v.workspace, businessId: v.business, productId: v.product, reference: v.reference, confirmed: v['confirm-permission'],
        periods: { validationFrom: v['validation-from'], validationTo: v['validation-to'], testFrom: v['test-from'], testTo: v['test-to'] } });
      mkdirSync(path.dirname(path.resolve(v.out)), { recursive: true }); write(v.out, data);
      console.log(JSON.stringify({ file: v.out, observedDates: data.observations.length, targetDates: data.annotations.length, predictionsIncluded: false, databaseChanged: false }));
    } else {
      const raw = read(v.dataset), data = JSON.parse(raw);
      let result;
      if (command === 'freeze') result = freezeUsageProtocol(data);
      else {
        const protocolRaw = read(v.protocol);
        result = { ...evaluateUsage(data, JSON.parse(protocolRaw), { split: v.split || 'test' }),
          datasetSha256: digest(raw), protocolSha256: digest(protocolRaw) };
      }
      const directory = v.out || path.join('data/evaluation/usage', command + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8));
      mkdirSync(path.dirname(path.resolve(directory)), { recursive: true }); mkdirSync(directory);
      write(path.join(directory, command === 'freeze' ? 'protocol.json' : 'report.json'), result);
      console.log(JSON.stringify({ directory, command, metrics: result.metrics ?? null, databaseChanged: false, newTraining: false }, null, 2));
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
