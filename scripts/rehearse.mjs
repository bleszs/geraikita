import {liveReport} from './live-report.mjs';
try{
  const report=liveReport(process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite');
  console.log(JSON.stringify(report,null,2));
  console.log('Panduan klik berdasarkan data sendiri: docs/FINAL_DEMO.md. Perintah ini hanya membaca kesiapan data; uji alur terisolasi tersedia melalui npm test.');
}catch(error){console.error(error.message);process.exitCode=1;}
