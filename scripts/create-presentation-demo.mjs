import { preparePresentationDemo } from './presentation-demo.mjs';
try {
  if (process.argv.length > 2) throw new Error('Perintah ini memilih folder demo harian secara otomatis; tidak menerima path database usaha.');
  const demo = preparePresentationDemo();
  console.log(JSON.stringify({ url: 'http://127.0.0.1:4180', account: demo.account, database: demo.filename, asOf: demo.asOf, counts: demo.counts,
    note: 'Data simulasi presentasi terpisah; database usaha asli tidak diubah.' }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
