import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8')),pointer=read('models/benchmarks/asr-profiles/latest.json'),report=read(path.join(pointer.directory,'report.json')),audit=read('docs/evaluation/asr-profile-audit.json');
assert.equal(sha256(readFileSync(path.join(pointer.directory,'report.json'))),pointer.reportSha256);assert.equal(audit.runId,report.runId);assert.equal(audit.auditPassed,true);
const percent=x=>(100*x).toFixed(2).replace('.',','),selectedProfile=report.decision.selectedProfile,profiles=Object.keys(report.metrics.test),baseline=report.metrics.test['tiny-current'],selected=report.metrics.test[selectedProfile];
const comparison=profiles.map(profile=>({profile,validation:report.metrics.validation[profile],test:report.metrics.test[profile],repeat:report.repeatSummary[profile]}));
const predictions=read(path.join(pointer.directory,'predictions.json')),test=predictions.filter(r=>r.split==='test'),paired={};
for(const profile of profiles){
  const rows=test.filter(r=>r.profile===profile).map(row=>{const old=test.find(r=>r.filename===row.filename&&r.profile==='tiny-current');assert(old&&old.reference===row.reference);return {filename:row.filename,sentenceId:row.sentenceId,currentWordErrors:old.score.errors,candidateWordErrors:row.score.errors,difference:row.score.errors-old.score.errors};});
  paired[profile]={lowerErrors:rows.filter(r=>r.difference<0).length,higherErrors:rows.filter(r=>r.difference>0).length,ties:rows.filter(r=>r.difference===0).length,rows};
}
const exported={...report,directory:pointer.directory,audit,comparison,pairedTest:paired,selectedTestRelativeWerReduction:baseline.wer>0?(baseline.wer-selected.wer)/baseline.wer:null};
writeFileSync('docs/evaluation/asr-profile-results.json',JSON.stringify(exported,null,2)+'\n');
const artifact=name=>path.relative('docs/evaluation',path.join(pointer.directory,name)).replaceAll('\\','/');
const lines=[
  '# Evaluasi profil ASR terpatok — v0.24','',
  `**Kandidat dipilih lewat validation: ${selectedProfile}. Model aplikasi tetap Tiny pada konfigurasi semula.** Tidak ada training/fine-tuning atau aktivasi otomatis. Penyebab kegagalan historis belum dinyatakan selesai.`,'',
  '16 kelompok kalimat validation dan 24 test baru dipilih sebelum inferensi, mengeluarkan seluruh 128 rekaman unik yang sudah dinilai pada v0.20/v0.21 beserta identitas/teksnya. Klip diagnostik lama adalah subset run sebelumnya. Test juga tidak memakai identitas/teks dari seluruh metadata validation penerbit. Sumber FLEURS Indonesia CC BY 4.0 yang sama; bukan dataset/speaker/domain independen. [Metode](../ASR_PROFILES.md), [JSON](asr-profile-results.json), [audit](asr-profile-audit.json).','',
  '| Profil | WER validation | WER test | CER test | Diterima / 24 | Tolak / error | p95 test |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...comparison.map(r=>`| ${r.profile} | ${percent(r.validation.wer)}% | ${percent(r.test.wer)}% | ${percent(r.test.cer)}% | ${r.test.accepted} | ${r.test.rejected} / ${r.test.errors} | ${r.test.latencyMs.p95} ms |`),'',
  'tiny-current memakai Tiny dengan lingkungan numerik warisan yang dicatat. tiny-pinned hanya menetapkan OPENBLAS_NUM_THREADS=1; base-pinned memakai Base dengan thread BLAS tetap yang sama. CPU int8/two threads Whisper, decoder, VAD dan gate segmen tetap. Proses baru per klip mencakup startup Python/model dan beban laptop; p95 bukan jaminan latensi umum.','',
  'Aturan validation dibekukan sebelum inferensi: pilih base-pinned bila WER sedikitnya 10% relatif lebih rendah dari tiny-current, tanpa error infrastruktur/penolakan tambahan dan p95 ≤15 detik. Jika gagal, tiny-pinned dipilih hanya bila WER tidak lebih buruk dan lolos gate lain; selain itu tiny-current. Hash keputusan ditulis sebelum test. Aturan ini pragmatis, bukan uji signifikansi atau bukti noninferioritas statistik.','',
  '## Perbandingan berpasangan terhadap tiny-current','',
  '| Profil | Galat lebih sedikit | Galat lebih banyak | Seri |','|---|---:|---:|---:|',
  ...profiles.map(profile=>`| ${profile} | ${paired[profile].lowerErrors} | ${paired[profile].higherErrors} | ${paired[profile].ties} |`),'',
  '## Pengulangan dan capture otomatis','',
  `Inferensi utama **${report.counts.mainInferences}**, pengulangan tambahan **${report.counts.repeatedInferences}**, capture bersyarat **${report.counts.triggeredCaptures}**. Dua klip test pertama per profil diulang empat kali; dibandingkan selalu dengan inferensi utama. Seluruh upaya dipertahankan.`,'',
  '| Profil | Pengulangan | Berbeda dari hasil utama | Semua diterima | Cocok pada lingkup ini |','|---|---:|---:|---|---|',
  ...comparison.map(r=>`| ${r.profile} | ${r.repeat.repeated} | ${r.repeat.changed} | ${r.repeat.allAccepted} | ${r.repeat.observedRepeatMatch} |`),'',
  'Baseline tiny-current juga cocok pada pengulangan ini. Karena itu, cek terbatas ini tidak membuktikan bahwa penguncian thread menghilangkan variasi. Bandingkan tiga profil pada sampel yang sama; Tiny pinned yang lebih buruk tidak disembunyikan.','',
  'Ketidakcocokan pertama per profil disimpan sebelum empat capture deferred yang sudah ditetapkan protokol. Capture tidak mengganti hipotesis/skor utama dan tidak membuktikan jalur profiling identik dengan jalur tanpa profiling. Hasil belakangan yang cocok tidak menghapus kegagalan awal. Analisis tahap capture ada pada JSON audit.','',
  '## Batas dan tindak lanjut','',
  '**causeEstablished=false, fixValidated=false, readyForPromotion=false** tetap terpisah dari audit yang lulus dan pengulangan terbatas. Tidak ada klaim ketepatan menu/jumlah/negasi, mikrofon pemilik, kedai bising, generalisasi pembicara atau determinisme universal. Sampel ini sekarang sudah dinilai; jangan tuning lalu menyebutnya test baru.','',
  'Adapter profil merupakan factory opt-in yang memeriksa checksum serta identitas model/profil. HTTP/default worker tetap sebelumnya. Kandidat belum dipromosikan; perlu peninjauan kegagalan, protokol kestabilan yang memadai dan validasi tugas pesanan dengan data berizin.','',
  `[Protokol](${artifact('protocol.json')}), [prediksi](${artifact('predictions.json')}), [keputusan](${artifact('decision.json')}), [pengulangan](${artifact('repeats.json')}), [capture](${artifact('captures.json')}).`,''
];
writeFileSync('docs/evaluation/ASR_PROFILE_RESULTS.md',lines.join('\n'));
console.log(JSON.stringify({selectedProfile,comparison,pairedTest:Object.fromEntries(profiles.map(p=>[p,{lowerErrors:paired[p].lowerErrors,higherErrors:paired[p].higherErrors,ties:paired[p].ties}])),captureAnalysis:audit.captureAnalysis,readyForPromotion:false},null,2));
