# Tindak lanjut variasi ASR

V0.23 melanjutkan diagnostik v0.22 dengan hashing setelah inferensi dan kontrol alignment. [Hasil aktual](evaluation/ASR_FOLLOWUP_RESULTS.md), [JSON](evaluation/asr-followup-results.json), [registry hash](../benchmarks/asr-deferred/evidence.json).

Tujuannya menangkap tahap pertama yang berubah. Satu klip pertama dari perbandingan lama dipakai karena sudah diketahui bermasalah; ini pemilihan diagnostik pada rekaman publik FLEURS Indonesia berlisensi CC BY 4.0, **bukan test akurasi baru**. [Sumber, revisi dan atribusi](../datasets/public/fleurs/README.md) tetap sama. Tidak ada dataset atau bobot yang diunduh pada pekerjaan ini.

## Apa yang berbeda

Pada v0.22, pencatatan hash terjadi di tengah jalannya model. Pada eksperimen baru, mode plain Tiny memanggil fungsi produksi langsung tanpa wrapper model. Mode deferred memakai `sys.setprofile` untuk menyimpan referensi array pada return-frame, lalu menghitung hash setelah seluruh transkripsi selesai. Referensi ini tetap mengubah waktu/alokasi/lifetime; mode tersebut bukan bukti ekivalensi sempurna dengan produksi.

Hash mencakup PCM, waveform setelah VAD/padding, window, filter mel, STFT, magnitudes, proyeksi mel, log-mel, serta input/output encoder. Offset alamat dan stride disimpan sebagai metadata, tetapi tidak dipakai untuk menyatakan nilai tensor berubah.

64 inferensi terdiri atas Tiny/Base × baseline/OpenBLAS satu thread × plain/deferred × delapan pengulangan. Setiap inferensi proses baru, urutan model/profil dibalik antar-pengulangan, CPU int8 dan decoding tetap. Profil OpenBLAS hanya menambah `OPENBLAS_NUM_THREADS=1` sebelum impor pustaka. Mode plain Base memakai proxy kandidat riset; hasilnya bukan aktivasi Base di aplikasi.

Empat inferensi Tiny tambahan menangkap operand untuk 112 pemeriksaan alignment. Setiap copy mempertahankan isi/dtype/shape dan urutan kontigu, dengan hash operand diperiksa, lalu mengubah offset buffer. Pemeriksaan terdiri atas magnitudes dengan delapan offset STFT, proyeksi mel dengan 16 pasangan offset, dan log-mel dengan empat offset, masing-masing pada dua profil × dua capture. Ini pemeriksaan numerik pada bentuk yang sama, bukan 112 suara atau bukti universal determinisme.

## Meninjau bukti yang sudah selesai

```powershell
npm run analyze:asr-followup
npm run test:asr-followup
```

Analyzer memeriksa registry yang menunjuk run secara eksplisit, hash protokol/hasil/kode terpasang/model/audio, seluruh kombinasi pengulangan dan cakupan kernel. Hash laporan serta kegagalan v0.21/v0.22 tetap dipatok. Analyzer tidak menjalankan inferensi atau mengikuti pointer latest untuk mengganti bukti historis.

Sumber operasi yang ditelusuri tersedia di lingkungan lokal pada `.venv-voice/Lib/site-packages/faster_whisper/feature_extractor.py`, dan hash kontennya disimpan sebelum run. Operasi `self.mel_filters @ magnitudes` membentuk `mel_spec`. NumPy dapat memakai backend BLAS dengan thread tersendiri: [dokumentasi NumPy](https://numpy.org/doc/stable/reference/global_state.html), [pengaturan OpenBLAS](https://github.com/OpenMathLib/OpenBLAS#setting-the-number-of-threads-using-environment-variables). Perubahan fitur akibat mengganti pengaturan tidak membuktikan penyebab variasi historis pada pengaturan yang tetap.

## Membuat run tambahan

```powershell
npm run diagnose:asr-deferred
npm run diagnose:asr-alignment
```

Membutuhkan `.venv-voice`, Tiny/Base dan sumber perbandingan yang sudah dipatok. Folder protokol dibuat sebelum inferensi, seluruh hasil disimpan, lalu pointer eksperimen diperbarui. Registry laporan tidak otomatis diganti. Run lama tetap harus dipertahankan saat bukti baru dianalisis. Jangan mengulang sampai cocok lalu menyatakan perbaikan lulus.

Seluruh audio yang dibaca berasal dari folder dataset publik. Aplikasi tidak menerima transaksi publik, audio pengguna tidak disimpan, decoder produksi tidak diedit dan Tiny tetap model aktif. Belum ada perbaikan yang tervalidasi, training/fine-tuning atau skor akurasi baru. Tindak lanjutnya adalah penangkapan kegagalan konfigurasi tetap dan kontrol intervensi tanpa profiling; perubahan yang hendak dipromosikan memerlukan validasi mutu yang sesuai pada data yang tidak dipakai tuning.
