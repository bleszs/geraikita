# Pembanding ASR dengan validation dan test baru

Tindak lanjut v0.22: [diagnostik 136 inferensi](ASR_STABILITY.md) dan [hasil](evaluation/ASR_STABILITY_RESULTS.md). Bukti sensitivitas backend ditemukan; penyebab variasi konfigurasi tetap dan perbaikan belum terbukti. Skor/artefak v0.21 di bawah dipertahankan.

Eksperimen v0.21 membandingkan Whisper Tiny dengan [Whisper Base multilingual](https://huggingface.co/Systran/faster-whisper-base), keduanya pretrained. Base dipasang terpisah dengan revisi/checksum pada [speech-base-source.json](../models/speech-base-source.json); model aktif aplikasi tetap Tiny. Tidak ada training/fine-tuning, perubahan decoding berdasarkan test, atau transaksi buatan.

[Protokol](../benchmarks/asr-comparison/protocol.json) ditetapkan sebelum inferensi. Hasil: [ASR_COMPARISON_RESULTS.md](evaluation/ASR_COMPARISON_RESULTS.md).

## Sumber dan pemilihan

Memakai FLEURS `id_id` dari [Google/Conneau dkk. 2022](https://huggingface.co/datasets/google/fleurs), CC BY 4.0, revisi Parquet yang dipatok. [Atribusi dan batas dataset](../datasets/public/fleurs/README.md) tetap berlaku. Shard test lama hanya dipakai untuk mengambil **kelompok yang belum dinilai**, bukan mengulang 64 rekaman hasil v0.20.

- Unduh shard validation 265.875.871 byte, SHA256 `d5fe4ac4679cf2687917adc235db89ae82df815c53a23850f6ba8e159bb4df77`. Shard test yang sudah diunduh diverifikasi ulang, tanpa unduhan seluruh corpus.
- Kecualikan semua ID kalimat, nama audio dan referensi normalisasi dari 64 rekaman/61 kalimat yang sebelumnya dinilai pada kedua split.
- Test juga mengecualikan seluruh ID/referensi metadata validation penerbit, bukan hanya sampel yang dipilih.
- Satu rekaman per kalimat dipilih lewat hash, lalu kelompok kalimat diurutkan lewat hash seed dan split. Ambil **16 validation dan 48 test**, tanpa melihat durasi atau hasil. Duplikasi teks/hash audio atau sampel kurang menyebabkan gagal, bukan penggantian selektif.
- Konversi PCM s16 mono 16 kHz memakai converter lama yang tidak diubah. Tidak ada crop, denoise, augmentasi, atau normalisasi volume. Semua penolakan tetap dihitung sebagai hipotesis kosong.

Pemisahan ini membuktikan kelompok kalimat dan audio tidak dipakai ulang dari run lama. Dataset sama dan identitas pembicara individual tidak diaudit; jangan menyebutnya dataset baru atau speaker holdout independen. Overlap dengan pretraining model tidak dapat disangkal dari metadata yang tersedia.

## Jalur dan keputusan

Runner riset `comparison-transcribe.py` mengimpor fungsi `transcribe` produksi tanpa mengubahnya. Model diberikan melalui objek pemuat lokal yang baru dibuat setelah dekode/validasi audio. Node memakai validator payload, timeout, parser hasil dan subprocess produksi yang sama, dengan script/model tujuan eksplisit pada eksperimen. Ini bukan endpoint baru untuk akun aplikasi.

Kedua kandidat memakai bahasa `id`, CPU int8/two threads, beam size 3, temperatur 0, VAD dan gate segmen yang sama. Proses baru untuk setiap klip; urutan Tiny/Base dibalik pada rekaman berikutnya untuk mengurangi bias urutan. Latensi mencakup startup Python/model tetapi tidak mencakup browser/HTTP. Beban laptop tetap tidak dikendalikan.

**Pemilihan hanya melalui validation:** Base dipilih jika WER micro validasi turun sedikitnya 10% relatif, tanpa error infrastruktur, penolakan tidak lebih banyak, dan p95 paling lama 15 detik. Selain itu tetap pilih Tiny. Aturan ini tidak diubah setelah hasil.

`decision.json` menyimpan metrik validation, keputusan dan checksum prediksi validasi. `test-start.json` mencatat hash keputusan sebelum satu pun inferensi test. Kedua model tetap dinilai pada test yang sama untuk perbandingan berpasangan; keputusan validation tidak ditulis ulang jika hasil test berlawanan.

## Perintah dan audit

```powershell
npm run fetch:asr-model
npm run fetch:asr-validation
npm run prepare:asr-comparison
npm run benchmark:asr-comparison
npm run verify:asr-comparison
npm run analyze:asr-comparison
npm run test:asr-comparison
```

Prasyarat lingkungan sama dengan evaluasi suara sebelumnya: `.venv-speech-data` untuk Parquet/download dan `.venv-voice` untuk PCM/model. Model Base ada di `models/speech/whisper-base`, terpisah dari Tiny dan registry forecasting. Inferensi tidak mengunduh model.

Artefak `models/benchmarks/asr-comparison/<run>/` menyimpan protocol/hash kode/model/lingkungan, keputusan sebelum test, seluruh prediksi/referensi/status/latensi dan perbandingan galat berpasangan. Semua hasil, termasuk kasus Base memburuk, disimpan. Sumber/artefak evaluasi v0.20 dipertahankan.

Verifier mempersiapkan ulang dari kedua shard asli, menghitung ulang skor, pemilihan, hash keputusan dan pairing, lalu mengulang **dua klip test per model**. Pemeriksaan kesetaraan teknis tambahan memanggil adapter Tiny produksi pada dua klip yang sama; ini pemeriksaan setelah scoring, bukan pemilihan atau perbaikan skor. Tidak ada klaim inferensi ulang seluruh test atau kesamaan timing. Laporan memisahkan `auditPassed` dari `inferenceRepeatPassed`; verifier menghasilkan exit gagal bila prediksi tidak identik, meskipun audit data/skor lulus. Ketidakcocokan awal tidak dihapus jika pengulangan lain kelak cocok.

Pada run v0.21, **tiga dari empat transkrip ulang berubah**. Keuntungan WER Base pada run awal belum menjadi bukti kestabilan hasil. Audio/bobot/konfigurasi sama dan audit skor lulus; penyebab variasi belum terbukti. Runtime Tiny tetap dipertahankan dan status promosi `false`. [Bukti lengkap](evaluation/asr-comparison-reproducibility.json).

Eksperimen tidak membuktikan akurasi menu/jumlah/negasi, kebisingan kedai, atau mikrofon pemilik usaha. Pemilihan model di sini bukan aktivasi otomatis di aplikasi. Tahap berikutnya memerlukan uji yang sesuai tugas pesanan serta data berizin; kedua sampel yang sudah dinilai tidak boleh dipakai tuning lalu disebut test baru.
