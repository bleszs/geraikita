import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
import {verifyCandidate} from './asr-comparison-runner.mjs';
import {summarizeRepeats,compareStageProfiles} from './asr-stability-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const registryFile='benchmarks/asr-stability/evidence.json',registry=read(registryFile),previous=read(path.join(registry.previousRun,'protocol.json'));
assert.equal(registry.schemaVersion,1);
assert.equal(new Set(registry.experiments.map(e=>e.id)).size,registry.experiments.length,'Duplicate experiment id.');
for(const id of ['stage_trace','import_order','single_factor'])assert(registry.experiments.some(e=>e.id===id),'Missing retained experiment: '+id);
for(const [file,hash] of Object.entries(previous.sourceSha256))assert.equal(sha256(readFileSync(file)),hash,'Changed comparison source: '+file);
assert.equal(sha256(readFileSync(previous.manifestFile)),previous.manifestSha256);
const manifest=read(previous.manifestFile),sampleRows=manifest.splits.test.records.slice(0,2);
for(const sample of sampleRows)assert.equal(sha256(readFileSync(path.join(path.dirname(previous.manifestFile),sample.audioPath))),sample.audioSha256);
for(const candidate of previous.protocol.candidates)verifyCandidate(candidate);
const experiments=[];
let numericsRows;
for(const item of registry.experiments){
  const protocolFile=path.join(item.directory,'protocol.json'),resultsFile=path.join(item.directory,item.resultsFile);
  assert.equal(sha256(readFileSync(protocolFile)),item.protocolSha256,'Changed diagnostic protocol.');
  assert.equal(sha256(readFileSync(resultsFile)),item.resultsSha256,'Changed diagnostic evidence.');
  const frozen=read(protocolFile),raw=read(resultsFile);
  for(const [file,hash] of Object.entries(frozen.sourceSha256))assert.equal(sha256(readFileSync(file)),hash,'Changed diagnostic source: '+file);
  const config=frozen.protocol??frozen;
  const filenames=(frozen.samples??frozen.files).map(row=>row.filename??row[0]);
  const samples=sampleRows.filter(row=>filenames.includes(row.filename)).map(row=>({filename:row.filename,audioSha256:row.audioSha256}));
  assert.equal(samples.length,filenames.length);
  const rows=raw.map(row=>row.trace?{...row.trace,filename:row.filename,repeat:row.repeat}:{...row,profile:row.order,inputSha256:row.audioSha256});
  const cohort={models:config.models,profiles:config.profiles??config.orders,samples,repeats:config.repeats};
  const summary=summarizeRepeats(rows,cohort,{traced:item.traced});
  experiments.push({id:item.id,directory:item.directory,protocolSha256:item.protocolSha256,resultsSha256:item.resultsSha256,traced:item.traced,...summary});
  if(item.id==='single_factor')numericsRows=rows;
}
assert(numericsRows);
const historical=read(registry.previousRepeatReport);
assert.equal(sha256(readFileSync(registry.previousRepeatReport)),registry.previousRepeatSha256,'Changed historical repeat report.');
assert.equal(historical.runId,read(path.join(registry.previousRun,'report.json')).runId,'Historical run mismatch.');
const report={checkedAt:new Date().toISOString(),version:'0.22.0',registrySha256:sha256(readFileSync(registryFile)),auditPassed:true,inferences:experiments.reduce((n,e)=>n+e.inferences,0),experiments,singleFactorComparisons:['openblas_one','unpacked_gemm'].flatMap(p=>compareStageProfiles(numericsRows,'baseline',p)),historicalRepeat:{auditPassed:historical.auditPassed,inferenceRepeatPassed:historical.inferenceRepeatPassed,changed:historical.repeatInferences.filter(r=>!r.transcriptIdentical).length,total:historical.repeatInferences.length},causeEstablished:false,fixValidated:false,readyForPromotion:false,activeModel:'whisper-tiny',runtimeChanged:false,trainingPerformed:false,newAccuracyBenchmark:false,limitations:['Already-seen diagnostic clips; no new test accuracy or owner-microphone validation.','Instrumentation changes import/allocation/copy timing; stable instrumented groups do not establish stability of uninstrumented production.','A single-factor BLAS setting changes features on the known clip. This does not prove the cause of historical within-configuration variation.','All attempts and historical failures are retained; there is no retry-until-pass promotion rule.']};
writeFileSync('docs/evaluation/asr-stability-results.json',JSON.stringify(report,null,2)+'\n');
const varied=experiments.flatMap(e=>e.groups.filter(g=>g.transcriptVariants>1).map(g=>`| ${e.id} | ${g.profile} | ${g.model} | ${g.filename} | ${g.transcriptVariants}/${g.repeats} |`));
const markdown=`# Diagnostik kestabilan ASR — v0.22

**Audit artefak lulus; penyebab variasi dan perbaikan belum terbukti. Model aktif tetap Tiny.** Pemeriksaan ini bukan training, promosi Base, atau benchmark akurasi test baru.

Total **${report.inferences} inferensi proses baru**, memakai dua rekaman FLEURS Indonesia yang sudah terlihat dan dipilih karena pernah gagal repeat. Seluruh percobaan dipertahankan. [JSON lengkap](asr-stability-results.json), [registry hash](../../benchmarks/asr-stability/evidence.json), [metode/perintah](../ASR_STABILITY.md).

| Eksperimen | Inferensi | Kelompok model/profil/klip | Kelompok dengan teks berubah |
|---|---:|---:|---:|
${experiments.map(e=>`| ${e.id} | ${e.inferences} | ${e.groups.length} | ${e.groupsWithTextVariation} |`).join('\n')}

Kelompok dengan teks berubah pada pengulangan dalam konfigurasi yang sama:

| Eksperimen | Profil | Model | Rekaman | Varian teks / pengulangan |
|---|---|---|---|---:|
${varied.join('\n')}

Semua 136 inferensi menghasilkan transkrip. Kelompok instrumentasi mencatat PCM, hasil VAD, fitur mel dan encoder: semuanya identik di dalam setiap kelompok yang diuji. **Ini tidak menghapus variasi pada jalur tanpa instrumentasi**, termasuk profil production Base. Pencatatan hash mengubah urutan impor/alokasi/salinan dan timing; tidak ada bukti bahwa efek observasi ini adalah penyebab variasi.

## Kontrol satu faktor

Pada klip pertama, hanya mengubah \\OPENBLAS_NUM_THREADS=1\\ sebelum impor pustaka mempertahankan PCM, hasil VAD dan filter mel, tetapi mengubah fitur mel dan encoder untuk Tiny maupun Base. Teks Tiny berubah, teks Base sama. Setiap profil/model diulang delapan kali; semua pengulangan di dalam profil tersebut cocok. Mengubah hanya \\CT2_PACKED_GEMM=0\\ tidak mengubah fitur, encoder maupun teks dibanding baseline pada klip itu.

Hash fitur baseline: \\5055aa95879275b98bbe450940d41099dcb1ce5593fbadc7fd8fb97f0e5bea9f\\. Hash fitur OpenBLAS satu thread: \\7321958bba93991631409df436b820948fd7d9b64847b627668ca1f3116fed26\\. Ini membuktikan sensitivitas pada intervensi pengaturan backend di eksperimen ini, **belum membuktikan penyebab variasi historis dalam konfigurasi yang sama**. Tidak ada pemilihan konfigurasi berdasarkan WER atau klaim akurasi membaik.

## Batas dan langkah berikutnya

Kegagalan historis v0.21 tetap **${report.historicalRepeat.changed}/${report.historicalRepeat.total} transkrip ulang berubah**, dengan sumber/skor utuh. \\causeEstablished=false\\, \\fixValidated=false\\, \\readyForPromotion=false\\. Tidak ada perubahan decoder, bobot, runtime akun atau skor eksperimen lama.

Berikutnya: tangkap tahap pertama yang berubah pada reproduksi kegagalan dengan konfigurasi tetap; uji intervensi tunggal pada jalur tanpa instrumentasi dengan protokol yang dibekukan sebelum run. Jika implementasi/config diubah, butuh evaluasi yang sesuai pada data belum dipakai tuning sebelum klaim peningkatan. Data pembicara/pesanan dan mikrofon pemilik usaha tetap belum tersedia.
`.replaceAll('\\','`');
writeFileSync('docs/evaluation/ASR_STABILITY_RESULTS.md',markdown);
console.log(JSON.stringify({auditPassed:report.auditPassed,inferences:report.inferences,experiments:experiments.map(e=>({id:e.id,inferences:e.inferences,groups:e.groups.length,groupsWithTextVariation:e.groupsWithTextVariation})),singleFactorComparisons:report.singleFactorComparisons,causeEstablished:false,fixValidated:false,readyForPromotion:false},null,2));
