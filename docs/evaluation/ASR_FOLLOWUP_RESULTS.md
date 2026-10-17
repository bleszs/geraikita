# Tindak lanjut diagnostik ASR — v0.23

**Operasi pertama yang berbeda pada intervensi OpenBLAS terlokalisasi di proyeksi mel. Kegagalan historis konfigurasi tetap belum terlokalisasi dan belum ada perbaikan yang tervalidasi.** Model aktif tetap Tiny.

Dilakukan **68 inferensi tambahan**: 64 pengulangan plain/deferred dan empat inferensi Tiny untuk menangkap input pemeriksaan alignment, seluruhnya pada satu klip FLEURS publik yang sudah dilihat. Ada **112 pemeriksaan kernel numerik**, bukan 112 rekaman suara atau tes akurasi. [JSON](asr-followup-results.json), [protokol/artefak](../../benchmarks/asr-deferred/evidence.json), [metode](../ASR_FOLLOWUP.md).

## Pengulangan tanpa hashing di tengah inferensi

Mode plain Tiny memanggil fungsi transcribe produksi langsung. Mode deferred memakai profiler return-frame dan baru menghitung hash setelah transkripsi selesai. Base tetap pembanding riset. Dua model × dua profil OpenBLAS × dua mode × delapan pengulangan = 64 inferensi. Urutan model dan profil dibalik antar-pengulangan.

| Profil / mode | Model | Pengulangan | Varian teks | Tahap pertama berbeda dalam kelompok |
|---|---|---:|---:|---|
| baseline:plain | tiny | 8 | 1 | tidak teramati |
| baseline:plain | base | 8 | 1 | tidak teramati |
| baseline:deferred | tiny | 8 | 1 | tidak teramati |
| baseline:deferred | base | 8 | 1 | tidak teramati |
| openblas_one:plain | tiny | 8 | 1 | tidak teramati |
| openblas_one:plain | base | 8 | 1 | tidak teramati |
| openblas_one:deferred | tiny | 8 | 1 | tidak teramati |
| openblas_one:deferred | base | 8 | 1 | tidak teramati |

Delapan kelompok cocok pada pengulangan yang diamati. Tidak ada pasangan kegagalan konfigurasi tetap yang tertangkap kali ini. Hash isi tidak memasukkan alamat/stride buffer; perbedaan metadata penyimpanan tidak dianggap perubahan nilai tensor. Mode deferred tetap memengaruhi waktu/alokasi/lifetime, sehingga kecocokan ini belum membuktikan jalur produksi selalu stabil.

## Operasi pertama pada intervensi satu faktor

Pada **16/16 pasangan deferred baseline vs OpenBLAS satu thread**, PCM, waveform setelah VAD/padding, window, filter mel, STFT dan magnitudes memiliki hash isi yang sama. Perubahan pertama adalah **mel_spec**, keluaran perkalian matriks filter mel dengan magnitudes di feature_extractor.py. Log-mel dan encoder kemudian berubah. Teks Tiny berubah antar-profil, teks Base tetap sama; ini perbandingan pengaturan berbeda, bukan variasi di dalam pengaturan yang sama.

Ini mempersempit sensitivitas numerik yang diamati ke operasi proyeksi mel pada input yang cocok. Belum membuktikan operasi itu menyebabkan tiga kegagalan repeat v0.21, karena pada kegagalan lama tensor internal belum direkam. Tidak ada konfigurasi yang dipilih berdasarkan WER atau skor lama yang diganti.

## Pemeriksaan alignment

Empat capture Tiny × 28 kombinasi = **112 pemeriksaan**, dengan **0 perbedaan** dari hasil referensi profil masing-masing. Isi, dtype, shape dan urutan kontigu operand dipertahankan sambil menggeser offset buffer. Yang diuji: magnitudes pada delapan offset STFT, proyeksi mel pada 16 pasangan offset, dan log-mel pada empat offset.

Hasil negatif hanya berlaku untuk operand, bentuk, offset dan runtime yang dibekukan. Ini tidak menyingkirkan seluruh kemungkinan efek alignment atau alokasi pada FFT, encoder maupun decoder. Semua percobaan dipertahankan.

## Status berikutnya

Kegagalan historis tetap **3/4 transkrip berbeda**, ditambah empat kelompok berubah pada diagnostik v0.22. Audit hash/kohort sekarang lulus; **causeEstablished=false, fixValidated=false, readyForPromotion=false**. Tidak ada perubahan runtime/model/database usaha, training atau klaim akurasi baru.

Pekerjaan berikutnya memerlukan penangkapan kegagalan konfigurasi tetap beserta tensor/env yang sama, lalu intervensi tunggal dengan kontrol tanpa profiling. Jangan menambah pengulangan sampai kebetulan cocok lalu menyebut perbaikan selesai. Jika kandidat konfigurasi/implementasi dibuat, tetapkan protokol sebelum run dan validasi mutu pada data yang tidak dipakai tuning.
