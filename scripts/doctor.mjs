import { parseArgs } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { inspectDatabase, inspectServer } from './maintenance.mjs';
import { createExtractor } from '../server/extractor.mjs';
import {inspectRuntimeSpeech} from './runtime-speech-health.mjs';
import {resolveSpeechSelection} from '../server/runtime-speech.mjs';

try {
  const { values } = parseArgs({ options: { url: { type: 'string' }, database: { type: 'string' }, report: { type: 'string' },'speech-profile':{type:'string'} } });
  const expectedProfile=resolveSpeechSelection({profile:values['speech-profile']})??undefined;
  const address=values.url || `http://localhost:${process.env.PORT || 4174}`;
  const checks = [];
  const [major, minor] = process.versions.node.split('.').map(Number);
  checks.push({ name: 'Node.js', status: major > 24 || (major === 24 && minor >= 9) ? 'pass' : 'fail', detail: process.versions.node });
  const results = await Promise.allSettled([
    Promise.resolve().then(() => inspectDatabase(values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite')),
    inspectServer(address),
    createExtractor().status(),
    inspectRuntimeSpeech(address,{expectedProfile})
  ]);
  for (const [index, name] of ['SQLite', 'Aplikasi lokal', 'AI lokal', 'Suara lokal'].entries()) {
    const result = results[index];
    if (result.status === 'rejected') checks.push({ name, status: 'fail', detail: result.reason.message });
    else if (index === 2 && !result.value.available) checks.push({ name, status: 'warn', detail: result.value, action: 'Parser/manual tersedia. Jalankan Ollama dan periksa model jika ingin mendemonstrasikan AI lokal.' });
    else if (index === 3 && !result.value.available) checks.push({name,status:expectedProfile?'fail':'warn',detail:result.value,action:'Input teks tersedia. '+(result.value.model==='whisper-base'?'Jalankan npm run fetch:asr-model untuk bobot Base. ':'Jalankan npm run voice:setup untuk bobot Tiny. ')+'Lalu mulai ulang server dengan profil yang dipilih.'});
    else checks.push({ name, status: 'pass', detail: result.value });
  }
  const report = { checkedAt: new Date().toISOString(), ready: !checks.some(c => c.status === 'fail'), checks, scope: 'Pemeriksaan read-only file SQLite, aset aplikasi dan ketersediaan model. Tidak membuat sesi atau transaksi; bukan pengujian alur penuh atau pemasangan OS.' };
  for (const check of checks) console.log(`${check.status.toUpperCase()} · ${check.name}: ${typeof check.detail === 'string' ? check.detail : JSON.stringify(check.detail)}${check.action ? '\n  ' + check.action : ''}`);
  console.log(report.ready ? 'Pemeriksaan dasar lulus. Lanjutkan latihan alur demo.' : 'Ada pemeriksaan gagal. Perbaiki sebelum latihan demo.');
  if (values.report) await writeFile(values.report, JSON.stringify(report, null, 2) + '\n');
  if (!report.ready) process.exitCode = 1;
} catch (error) {
  console.error('Pemeriksaan gagal: ' + error.message);
  process.exitCode = 1;
}
