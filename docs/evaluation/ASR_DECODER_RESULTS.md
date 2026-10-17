# Diagnostik decoder — v0.31

**Variasi pada konfigurasi tetap kembali tertangkap di jalur plain. Penyebab/perbaikan belum terbukti; model aktif tetap Tiny.** Audit artefak lulus, berbeda dari klaim kestabilan. [Metode dan batas](../ASR_DECODER.md), [hasil JSON](asr-decoder-results.json).

Run `2026-10-15T22-09-19-911Z-29fe892c` menjalankan 24 transkripsi proses baru pada dua rekaman publik yang sudah pernah dinilai. Base CPU int8/two threads, decoding temperature nol dan enam pengulangan per kasus/mode dibekukan sebelum inferensi. Urutan kasus/mode dibalik pada pengulangan genap. Semua 24 diterima, tanpa penolakan atau error; seluruh checkpoint dan keluaran dipertahankan.

| Kasus | Mode | Diterima / upaya | Varian teks | Tahap pertama berbeda |
| --- | --- | --- | --- | --- |
| Base legacy, rekaman lama yang pernah gagal repeat | Plain | 6 / 6 | 1 | Tidak diinstrumentasi |
| Base legacy, rekaman yang sama | Deferred | 6 / 6 | 1 | Tidak ada pada capture ini |
| Base pinned, rekaman ketidakcocokan HTTP awal | Plain | 6 / 6 | **2** | Tidak diinstrumentasi |
| Base pinned, rekaman yang sama | Deferred | 6 / 6 | 1 | Tidak ada pada capture ini |

Semua tahap yang tertangkap pada dua kelompok deferred cocok di dalam kelompoknya: PCM, waveform, window, filter mel, STFT, magnitudes, mel/log-mel, input/output encoder, input decoder, token/skor decoder, segmen dan teks. Hash konten mengabaikan alignment buffer; metadata alignment tetap disimpan. Teks berbeda pada plain tidak dapat dilokalisasi dengan hash dari inferensi deferred lain.

## Replay decoder dengan input ditahan

Ada 12 pemanggilan decoder yang tertangkap pada 12 transkripsi deferred; masing-masing diulang tiga kali setelah inferensi awal selesai. Seluruh **36/36 replay** diterima, tanpa error, perubahan token, perubahan skor/no-speech probability atau perubahan hash input sebelum/sesudah replay. Tidak ada kelompok replay yang memiliki lebih dari satu urutan token.

Ini pemeriksaan pada buffer encoder, prompt, opsi dan instance model yang ditahan. Replay dilakukan setelah transkripsi selesai dan profiler dimatikan. Riwayat proses/model berbeda dari keadaan panggilan pertama; kesamaan ini tidak membuktikan decoder selalu deterministik atau bahwa semua variasi plain berasal dari frontend audio. Capture menahan referensi dan mengubah timing/lifetime; efek observasi tetap belum dijelaskan.

## Keputusan

- `withinConfigurationTextFailureLocalized=false`: perbedaan teks terjadi pada plain, bukan pada capture yang mempunyai hash tahap.
- `allObservedTextRepeatsMatch=false`: kelompok plain Base pinned memiliki dua varian, walaupun kelompok lain cocok.
- `causeEstablished=false`, `fixValidated=false`, `readyForPromotion=false`: belum ada intervensi atau perbaikan yang diuji.
- Tidak ada training/fine-tuning, pergantian model default, retuning threshold, penghitungan ulang WER lama atau skor akurasi test baru.

Kedua kasus berbeda klip sekaligus profil, sehingga tabel bukan pembanding kausal efek OpenBLAS lintas kasus. Lingkungan numerik dicatat dan diperiksa tetap di dalam kasus sekarang; tidak mengklaim seluruh keadaan proses/beban laptop sama dengan run historis. Variasi baru pada Base pinned menunjukkan penguncian thread saja belum menjamin hasil teks yang sama pada lingkup ini.

Langkah berikutnya adalah penangkapan dengan gangguan pengamatan lebih kecil atau mekanisme replay yang dapat mempertahankan input dari jalur plain yang benar-benar berubah. Protokol berikutnya harus mengakui klip ini telah dipakai diagnostik, menahan jumlah upaya sebelum run dan mempertahankan semua hasil negatif. Jangan menempelkan hash dari transkripsi lain sebagai penjelasan terhadap plain atau mengulang sampai semua cocok.

## Bukti yang dipatok

[Protokol](../../models/benchmarks/asr-decoder/2026-10-15T22-09-19-911Z-29fe892c/protocol.json), [seluruh transkripsi dan replay](../../models/benchmarks/asr-decoder/2026-10-15T22-09-19-911Z-29fe892c/traces.json), [ringkasan](../../models/benchmarks/asr-decoder/2026-10-15T22-09-19-911Z-29fe892c/summary.json). Setiap upaya juga memiliki `attempt-01.json` hingga `attempt-24.json` di direktori yang sama. JSON audit menyimpan hash protokol, traces dan summary; analyzer menghitung ulang ringkasan serta memeriksa semua checkpoint, sumber, bukti lama, audio, lingkungan dan berkas model.

Audio berasal dari FLEURS Indonesia CC BY 4.0, telah dipilih dan dikonversi pada pekerjaan sebelumnya. [Atribusi dan perubahan sumber](../../datasets/public/fleurs/README.md). Tidak ada unduhan, rekaman pengguna atau transaksi yang masuk dataset diagnostik ini. Data usaha aktif diverifikasi terpisah terhadap backup; 24 transkripsi publik tidak menyentuh SQLite.
