import { parseArgs } from 'node:util';
import { usageAnomalyReport } from './usage-anomaly-report.mjs';
import { writeNewJson } from './forecast-data.mjs';

const help = `Pemeriksaan pemakaian bahan (read-only, kandidat untuk ditinjau):
  npm run forecast:anomalies -- [--database PATH] [--as-of YYYY-MM-DD] [--days 1..28]
    [--workspace ID --business ID --product ID] [--out PATH]
Memerlukan 56 tanggal referensi tersimpan per hari yang diperiksa.
Tanggal kosong bukan nol; tidak ada koreksi/training otomatis.
Laporan memuat data privat. Panduan: docs/USAGE_ANOMALIES.md.`;
try {
  const { values } = parseArgs({ options: { database: { type: 'string' }, 'as-of': { type: 'string' }, days: { type: 'string' },
    workspace: { type: 'string' }, business: { type: 'string' }, product: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) console.log(help);
  else {
    if (values.days !== undefined && !/^(?:[1-9]|1[0-9]|2[0-8])$/.test(values.days)) throw new Error('--days harus bilangan bulat 1–28.');
    const report = usageAnomalyReport({ filename: values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite',
      asOf: values['as-of'], windowDays: values.days === undefined ? 28 : Number(values.days),
      workspaceId: values.workspace, businessId: values.business, productId: values.product });
    if (values.out) writeNewJson(values.out, report);
    console.log(JSON.stringify(report, null, 2));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
