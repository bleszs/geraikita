import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
import {verifyCandidate} from './asr-comparison-runner.mjs';
import {summarizeDeferred,summarizeAlignment} from './asr-followup-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const registryFile='benchmarks/asr-deferred/evidence.json',registry=read(registryFile);
assert.equal(registry.schemaVersion,1);
for(const [file,hash] of Object.entries(registry.previousEvidenceSha256))assert.equal(sha256(readFileSync(file)),hash,'Changed historical evidence: '+file);
const previous=read('benchmarks/asr-stability/evidence.json'),frozen=read(path.join(previous.previousRun,'protocol.json'));
assert.equal(sha256(readFileSync(frozen.manifestFile)),frozen.manifestSha256);
for(const [file,hash] of Object.entries(frozen.sourceSha256))assert.equal(sha256(readFileSync(file)),hash,'Changed production/comparison source: '+file);
for(const candidate of frozen.protocol.candidates)verifyCandidate(candidate);
const sample=read(frozen.manifestFile).splits.test.records[0];assert.equal(sha256(readFileSync(path.join(path.dirname(frozen.manifestFile),sample.audioPath))),sample.audioSha256);
const experiments={};
assert.deepEqual(registry.experiments.map(e=>e.id).sort(),['alignment','deferred']);
for(const item of registry.experiments){
  const protocolFile=path.join(item.directory,'protocol.json'),resultsFile=path.join(item.directory,'traces.json');
  assert.equal(sha256(readFileSync(protocolFile)),item.protocolSha256,'Changed follow-up protocol.');
  assert.equal(sha256(readFileSync(resultsFile)),item.tracesSha256,'Changed follow-up results.');
  const protocol=read(protocolFile),rows=read(resultsFile);
  assert.equal(protocol.sample.filename,sample.filename);assert.equal(protocol.sample.audioSha256,sample.audioSha256);
  for(const [file,hash] of Object.entries(protocol.sourceSha256))assert.equal(sha256(readFileSync(file)),hash,'Changed follow-up source: '+file);
  for(const row of rows)assert.equal(row.exitCode,0,'Worker exit error.');
  const summary=item.id==='deferred'?summarizeDeferred(rows,protocol):summarizeAlignment(rows,protocol);
  experiments[item.id]={directory:item.directory,protocolSha256:item.protocolSha256,tracesSha256:item.tracesSha256,...summary};
}
const history=read('docs/evaluation/asr-comparison-reproducibility.json'),stageResults=read('docs/evaluation/asr-stability-results.json');
const report={version:'0.23.0',checkedAt:new Date().toISOString(),auditPassed:true,registrySha256:sha256(readFileSync(registryFile)),analysisSourceSha256:Object.fromEntries(['scripts/analyze-asr-followup.mjs','scripts/asr-followup-evaluation.mjs','scripts/asr-stability-evaluation.mjs'].map(f=>[f,sha256(readFileSync(f))])),newInferenceCount:experiments.deferred.inferences+experiments.alignment.captureInferences,newKernelChecks:experiments.alignment.kernelChecks,experiments,historical:{comparisonChanged:history.repeatInferences.filter(r=>!r.transcriptIdentical).length,comparisonRepeated:history.repeatInferences.length,previousDiagnosticChangedGroups:stageResults.experiments.find(e=>e.id==='import_order').groupsWithTextVariation},withinConfigurationFailureLocalized:experiments.deferred.withinConfigurationFailureLocalized,causeEstablished:false,fixValidated:false,readyForPromotion:false,runtimeChanged:false,activeModel:'whisper-tiny',trainingPerformed:false,newAccuracyBenchmark:false,limitations:['Already-seen first comparison test clip, not a new accuracy sample.','Deferred profiling changes timing and object lifetime even though hashing is postponed.','Matching new repetitions do not erase previous failures or validate a fix.','The first differing stage under a changed BLAS setting is distinct from historical variation with an unchanged setting.']};
writeFileSync('docs/evaluation/asr-followup-results.json',JSON.stringify(report,null,2)+'\n');
const groups=experiments.deferred.groups,paired=experiments.deferred.crossProfiles;
const text=`# Tindak lanjut diagnostik ASR — v0.23

**Operasi pertama yang berbeda pada intervensi OpenBLAS terlokalisasi di proyeksi mel. Kegagalan historis konfigurasi tetap belum terlokalisasi dan belum ada perbaikan yang tervalidasi.** Model aktif tetap Tiny.

Dilakukan **${report.newInferenceCount} inferensi tambahan**: 64 pengulangan plain/deferred dan empat inferensi Tiny untuk menangkap input pemeriksaan alignment, seluruhnya pada satu klip FLEURS publik yang sudah dilihat. Ada **${report.newKernelChecks} pemeriksaan kernel numerik**, bukan 112 rekaman suara atau tes akurasi. [JSON](asr-followup-results.json), [protokol/artefak](../../benchmarks/asr-deferred/evidence.json), [metode](../ASR_FOLLOWUP.md).

## Pengulangan tanpa hashing di tengah inferensi

Mode plain Tiny memanggil fungsi transcribe produksi langsung. Mode deferred memakai profiler return-frame dan baru menghitung hash setelah transkripsi selesai. Base tetap pembanding riset. Dua model × dua profil OpenBLAS × dua mode × delapan pengulangan = 64 inferensi. Urutan model dan profil dibalik antar-pengulangan.

| Profil / mode | Model | Pengulangan | Varian teks | Tahap pertama berbeda dalam kelompok |
|---|---|---:|---:|---|
${groups.map(g=>`| ${g.profile} | ${g.model} | ${g.repeats} | ${g.transcriptVariants} | ${g.firstChangedStage??'tidak teramati'} |`).join('\n')}

Delapan kelompok cocok pada pengulangan yang diamati. Tidak ada pasangan kegagalan konfigurasi tetap yang tertangkap kali ini. Hash isi tidak memasukkan alamat/stride buffer; perbedaan metadata penyimpanan tidak dianggap perubahan nilai tensor. Mode deferred tetap memengaruhi waktu/alokasi/lifetime, sehingga kecocokan ini belum membuktikan jalur produksi selalu stabil.

## Operasi pertama pada intervensi satu faktor

Pada **${paired.filter(p=>p.firstChangedStage==='mel_spec').length}/${paired.length} pasangan deferred baseline vs OpenBLAS satu thread**, PCM, waveform setelah VAD/padding, window, filter mel, STFT dan magnitudes memiliki hash isi yang sama. Perubahan pertama adalah **mel_spec**, keluaran perkalian matriks filter mel dengan magnitudes di feature_extractor.py. Log-mel dan encoder kemudian berubah. Teks Tiny berubah antar-profil, teks Base tetap sama; ini perbandingan pengaturan berbeda, bukan variasi di dalam pengaturan yang sama.

Ini mempersempit sensitivitas numerik yang diamati ke operasi proyeksi mel pada input yang cocok. Belum membuktikan operasi itu menyebabkan tiga kegagalan repeat v0.21, karena pada kegagalan lama tensor internal belum direkam. Tidak ada konfigurasi yang dipilih berdasarkan WER atau skor lama yang diganti.

## Pemeriksaan alignment

Empat capture Tiny × 28 kombinasi = **${experiments.alignment.kernelChecks} pemeriksaan**, dengan **${experiments.alignment.differentKernels} perbedaan** dari hasil referensi profil masing-masing. Isi, dtype, shape dan urutan kontigu operand dipertahankan sambil menggeser offset buffer. Yang diuji: magnitudes pada delapan offset STFT, proyeksi mel pada 16 pasangan offset, dan log-mel pada empat offset.

Hasil negatif hanya berlaku untuk operand, bentuk, offset dan runtime yang dibekukan. Ini tidak menyingkirkan seluruh kemungkinan efek alignment atau alokasi pada FFT, encoder maupun decoder. Semua percobaan dipertahankan.

## Status berikutnya

Kegagalan historis tetap **${report.historical.comparisonChanged}/${report.historical.comparisonRepeated} transkrip berbeda**, ditambah empat kelompok berubah pada diagnostik v0.22. Audit hash/kohort sekarang lulus; **causeEstablished=false, fixValidated=false, readyForPromotion=false**. Tidak ada perubahan runtime/model/database usaha, training atau klaim akurasi baru.

Pekerjaan berikutnya memerlukan penangkapan kegagalan konfigurasi tetap beserta tensor/env yang sama, lalu intervensi tunggal dengan kontrol tanpa profiling. Jangan menambah pengulangan sampai kebetulan cocok lalu menyebut perbaikan selesai. Jika kandidat konfigurasi/implementasi dibuat, tetapkan protokol sebelum run dan validasi mutu pada data yang tidak dipakai tuning.
`;
writeFileSync('docs/evaluation/ASR_FOLLOWUP_RESULTS.md',text);
console.log(JSON.stringify({auditPassed:true,newInferenceCount:report.newInferenceCount,newKernelChecks:report.newKernelChecks,matchingRepeatGroups:groups.filter(g=>g.transcriptVariants===1).length,interventionProjectionFirstChanged:paired.filter(p=>p.firstChangedStage==='mel_spec').length,interventionPairs:paired.length,alignmentDifferences:experiments.alignment.differentKernels,causeEstablished:false,fixValidated:false,readyForPromotion:false},null,2));
