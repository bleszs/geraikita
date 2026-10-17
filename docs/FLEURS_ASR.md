# Evaluasi suara Indonesia pada data nyata publik

Eksperimen v0.20 menggunakan FLEURS `id_id` dari Google untuk mengukur transkripsi yang sebenarnya pada model suara aplikasi. Sumber, atribusi dan perubahan representasi dicatat pada [README dataset](../datasets/public/fleurs/README.md). Model tetap **Whisper Tiny pretrained**, CPU int8; tidak ada training, fine-tuning, prompt khusus referensi, atau pemilihan model berdasarkan hasil test.

Hasil run, seluruh kegagalan dan batas interpretasi: [FLEURS_ASR_RESULTS.md](evaluation/FLEURS_ASR_RESULTS.md).

## Protokol sebelum inferensi

[protocol.json](../benchmarks/fleurs/protocol.json) dibekukan sebelum model menerima audio evaluasi. Unduhan hanya shard test bahasa Indonesia, bukan seluruh dataset multilingual. Revisi Parquet `168de341b3db6859a9bac1c50a2ef5e3b47647e0`, SHA256 sumber `910017ff324772fdd6fac9c859255b867d90066f098d2b5db6dbab6c530dd7d8`, ukuran 542.857.871 byte. Dataset card memiliki revisi berbeda karena data adalah konversi Parquet Hugging Face; keduanya dicatat terpisah.

64 rekaman pertama dalam urutan SHA256 seed dan basename audio dipilih dari seluruh split test penerbit. Pemilihan tidak memakai teks, durasi, label kesulitan, atau prediksi. Jika rekaman terpilih gagal diproses, rekaman tetap dihitung sebagai hipotesis kosong. Tidak ada penggantian sampel yang gagal. Konversi PCM 16 bit/mono/16 kHz dilakukan untuk semua rekaman terpilih tanpa cropping atau pengubahan volume; file sumber/hash tetap tersedia.

Inferensi memanggil **adapter produksi `server/transcriber.mjs`** dan subprocess Python yang sama dengan aplikasi, termasuk batas ukuran/durasi, VAD dan penyaringan segmen. Model dimuat ulang di setiap subprocess sebagaimana request sebenarnya. Evaluator tidak menghubungi endpoint transaksi, membuat akun aplikasi, atau membuka database pengguna.

## Metrik

Normalisasi dibekukan: Unicode NFKC, huruf kecil, tanda baca/simbol menjadi spasi, spasi berulang diringkas. Huruf, aksen dan digit dipertahankan; angka tidak diperluas menjadi kata. Referensi memakai `transcription` penerbit, tanpa koreksi berdasarkan prediksi.

- **WER**: total substitusi + penghapusan + penyisipan kata dibagi total kata referensi seluruh sampel. Ini agregat micro, bukan rerata WER kalimat. Nilai tidak dipotong pada 100%.
- **CER**: total jarak edit karakter dibagi total karakter referensi setelah spasi dihapus. Karakter dihitung sebagai Unicode code point.
- **Exact match**: persentase rekaman dengan teks normalisasi identik.
- **Latensi p50/p95 dan real-time factor**: pemanggilan adapter berurutan, termasuk startup Python, pemuatan model dan inferensi. Persiapan audio, pemeriksaan ketersediaan pertama, mikrofon, browser dan HTTP tidak termasuk. Kegagalan tetap masuk statistik latensi.

[Dokumentasi primer jiwer](https://jitsi.github.io/jiwer/usage/) menjelaskan keluarga metrik jarak edit; implementasi repo ini tidak memerlukan dependensi jiwer dan menuliskan normalisasinya secara eksplisit. Angka dari protokol normalisasi berbeda tidak menjadi perbandingan langsung. WER bukan persentase keberhasilan mencatat pesanan; tidak ada label menu/jumlah/negasi pada benchmark ini.

## Menjalankan dan memeriksa

Lingkungan `.venv-speech-data` memakai PyArrow untuk membaca audio dalam batch kecil; audio dikonversi dan diinferensikan di `.venv-voice`. Dependensi forecasting `.venv-ml` tidak diubah. Pembacaan batch menghindari alokasi kolom BLOB besar yang ditemukan ketika mencoba DuckDB pada shard ini.

```powershell
npm run setup:speech-data
npm run fetch:speech
npm run prepare:speech
npm run benchmark:speech
npm run verify:speech
npm run analyze:speech
npm run test:speech
```

`benchmark:speech` menyimpan protocol/hash kode, model, manifest pilihan dan versi paket aktual sebelum inferensi. Seluruh prediksi/kegagalan dan skor per rekaman berada di `models/benchmarks/fleurs/<run>/`, dengan pointer `latest.json`. Tidak ada checkpoint forecasting atau transaksi yang diperbarui.

`verify:speech` mempersiapkan ulang dari Parquet asli, membandingkan seluruh hash audio dan referensi, menghitung ulang semua metrik dan kelompok durasi, lalu mengulang inferensi pada **delapan rekaman pertama sesuai aturan yang telah dibekukan**. Klaim transkrip identik hanya berlaku untuk delapan rekaman yang diulang, bukan seluruh 64. Latensi tidak diharapkan identik.

Tes kontrak memakai fixture teks teknis terisolasi. Nilai ASR yang dilaporkan harus berasal dari run audio publik di atas, bukan dari tes tersebut. Uji pesanan, negasi, nama menu lokal, pemilik usaha, speaker split baru dan kebisingan kedai tetap pekerjaan terpisah pada [AI_TODO.md](AI_TODO.md).
