# Diagnostik variasi transkrip

V0.22 menindaklanjuti kegagalan repeat v0.21. Pekerjaan ini menguji asal variasi dan menyimpan bukti, tanpa melatih model atau mengubah model aplikasi. [Hasil aktual](evaluation/ASR_STABILITY_RESULTS.md) dan [JSON terverifikasi](evaluation/asr-stability-results.json).

Ketiga eksperimen menggunakan rekaman nyata publik FLEURS Indonesia, CC BY 4.0, dari [sumber yang dipatok sebelumnya](../datasets/public/fleurs/README.md). Rekaman dipilih karena sudah diketahui bermasalah, bukan sampel test baru atau data akun. Dua klip pertama run perbandingan dipakai pada eksperimen tahap dan urutan impor; kontrol satu faktor memakai klip pertama saja. Tidak ada referensi yang dijadikan prompt, WER untuk memilih konfigurasi, atau klip yang dihapus setelah hasil terlihat.

## Eksperimen yang dijalankan

1. **48 inferensi dengan hash tahap:** dua model × dua klip × empat profil × tiga pengulangan. Profil: baseline, satu thread Whisper saja, seed CT2 nol saja, dan gabungan AVX2/thread tunggal/packed GEMM nonaktif. Baseline instrumentasi mengimpor NumPy/CT2 lebih awal serta mengaktifkan log CT2. Hash PCM, hasil VAD, fitur mel dan encoder disimpan beserta token dan teks. Profil gabungan tidak menentukan penyebab tunggal.
2. **40 inferensi urutan impor:** dua model × dua klip × lima urutan × dua pengulangan. Tidak menyalin/hash tensor internal. Profil production mempertahankan impor lazy setelah dekode audio; empat profil lain memindahkan impor NumPy, CT2 atau PyAV. Ada variasi di dalam urutan yang sama, termasuk production Base; mengganti urutan impor belum menjadi solusi yang terbukti.
3. **48 inferensi kontrol satu faktor:** dua model × satu klip × tiga profil × delapan pengulangan. Import lazy produksi dipertahankan hingga audio didekode. Bandingkan baseline dengan hanya `OPENBLAS_NUM_THREADS=1` atau hanya `CT2_PACKED_GEMM=0`. Hash filter mel juga dicatat. Instrumentasi tetap dapat memengaruhi alokasi/timing.

Semua inferensi memakai CPU int8 dan bobot lokal Tiny/Base yang sudah dipatok. Tidak ada unduhan tambahan atau akses data usaha. Audio publik hanya dibaca dari folder dataset. Artefak lama, prediksi asli, ketidakcocokan repeat dan sumber inferensi produksi dipertahankan.

NumPy dapat memakai backend BLAS dengan thread tersendiri; jumlah thread Whisper bukan satu-satunya pengaturan komputasi. [Dokumentasi NumPy](https://numpy.org/doc/stable/reference/global_state.html) dan [pengaturan thread OpenBLAS](https://github.com/OpenMathLib/OpenBLAS#setting-the-number-of-threads-using-environment-variables). Variabel CT2 harus disiapkan sebelum impor; `CT2_FORCE_CPU_ISA` tidak mengendalikan ISA MKL. [Dokumentasi CT2](https://opennmt.net/CTranslate2/environment_variables.html). Pernyataan sebab-akibat pada laporan terbatas pada intervensi yang benar-benar diuji, bukan jaminan pustaka atau dugaan tentang bug tertentu.

## Memeriksa bukti yang ada

```powershell
npm run analyze:asr-stability
npm run test:asr-stability
```

Analyzer membaca [registry bukti](../benchmarks/asr-stability/evidence.json), memeriksa hash protokol/hasil/kode/model/audio dan kelengkapan seluruh kombinasi pengulangan. Hasil gagal, pasangan duplikat, audio berbeda atau bukti tahap yang hilang tidak boleh dianggap pengulangan sukses. `auditPassed=true` berarti bukti konsisten; `fixValidated=false` dan `readyForPromotion=false` tetap terpisah.

Registry menunjuk tiga run yang sudah selesai secara eksplisit. Analyzer tidak mengikuti pointer `latest.json` yang bisa berubah dan tidak menjalankan ulang inferensi. Hash laporan repeat v0.21 ikut dipatok agar kegagalan awal tidak hilang dari analisis.

## Membuat run diagnostik tambahan

```powershell
npm run diagnose:asr-stages
npm run diagnose:asr-imports
npm run diagnose:asr-numerics
```

Setiap perintah membuat folder run baru di `models/benchmarks/`, membekukan protokol/hash sebelum inferensi, menyimpan semua hasil dan memperbarui pointer eksperimennya. Jangan mengulang sampai kebetulan cocok lalu menyebut masalah selesai. Run tambahan tidak otomatis mengganti registry laporan; seluruh run lama harus tetap dipertahankan saat bukti baru dianalisis. Ketergantungan tetap `.venv-voice` dan model lokal yang telah terpasang; tidak ada dependency atau bobot baru pada v0.22.

## Belum selesai

Belum tertangkap pasangan kegagalan yang sekaligus memiliki hash semua tahap; penyebab variasi konfigurasi tetap belum dilokalisasi. Kecocokan tiga/delapan pengulangan instrumentasi belum membuktikan jalur produksi stabil. Tidak ada perbaikan yang diaktifkan, fine-tuning, promosi Base atau skor akurasi baru. Setelah perubahan yang beralasan, perlu protokol pengulangan tanpa instrumentasi dan evaluasi pada data yang tidak dipakai tuning. Uji suara pesanan berizin dan mikrofon usaha tetap pekerjaan terpisah.
