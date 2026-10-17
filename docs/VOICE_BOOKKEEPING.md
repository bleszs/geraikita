# Pencatatan pesanan lewat suara lokal

V0.25 menambah pilihan runtime: `npm run start:base` membuka kandidat Base di **http://localhost:4176**; `npm start` tetap Tiny pada port 4174. Periksa dengan `npm run doctor:base`. Model tetap pretrained, transkrip tetap perlu koreksi/review, dan uji HTTP menunjukkan variasi belum selesai. [Panduan runtime dan bukti](RUNTIME_SPEECH.md).
Pembaruan **v0.21**: Base multilingual sudah diunduh untuk perbandingan riset dengan validation/test baru. Satu-run WER test Base 36,36% vs Tiny 66,93%, tetapi **3/4 transkrip ulang berubah** dan kestabilan belum lulus. Model aplikasi tetap Tiny; Base tidak diaktifkan otomatis. [Hasil dan alasan belum dipromosikan](evaluation/ASR_COMPARISON_RESULTS.md).

Status implementasi **v0.19.0, 15 Oktober 2026**: Whisper Tiny multilingual sudah diunduh, checksum sumber diverifikasi, dan model berhasil dimuat di CPU int8 laptop ini. Ini model **pretrained**, bukan hasil fine-tuning tim. Belum ada dataset suara pemilik usaha berizin atau skor WER/CER pada pesanan lapangan.

Pembaruan **v0.20**: benchmark suara publik FLEURS Indonesia sudah dijalankan pada 64 rekaman nyata: WER 67,27%, CER 27,64%, exact match 0/64, enam penolakan tetap dihitung. **Pengenalan belum andal pada sampel ini**; jangan memakai keberhasilan teknis perekaman sebagai bukti mutu transkripsi. Ini suara pembacaan umum berlisensi publik, bukan pesanan/mikrofon pemilik usaha. [Hasil, metode dan keterbatasan](evaluation/FLEURS_ASR_RESULTS.md).

## Memakai fitur

1. Jalankan `npm start`, buka **http://localhost:4174**, lalu masuk ke akun.
2. Isi bahan, menu, harga dan resep yang sebenarnya di **Produk & stok**. Halaman pesanan meminta katalog terlebih dahulu jika belum ada menu.
3. Buka **Catat pesanan → Rekam pesanan**, lalu izinkan mikrofon di browser.
4. Ucapkan nama menu beserta jumlahnya. Klik **Selesai merekam**; perekaman otomatis berhenti setelah 28 detik agar padding encoder tetap di bawah batas server 30 detik.
5. Koreksi **Periksa hasil ucapan**, kemudian klik **Gunakan teks**. Hasil ditambahkan ke catatan yang sudah ada, dengan batas gabungan 2.000 karakter. Isian lama tidak ditimpa.
6. Klik **Susun rincian pesanan**, periksa menu/jumlah/harga/resep, lalu konfirmasi hanya bila benar. Hasil suara tidak otomatis mengekstrak atau mencatat penjualan.

Mikrofon memerlukan browser yang mendukung MediaRecorder/getUserMedia pada localhost. Model dan server berjalan di laptop; fitur tidak memakai layanan transkripsi cloud. Aplikasi perlu terhubung ke server lokal. Input teks/manual tetap tersedia jika mikrofon, model, atau server belum siap.

## Model dan pemasangan

- Sumber konversi resmi: [Systran/faster-whisper-tiny](https://huggingface.co/Systran/faster-whisper-tiny/tree/d90ca5fe260221311c53c58e660288d3deb8d356), revisi `d90ca5fe260221311c53c58e660288d3deb8d356`.
- [Whisper upstream dan lisensi MIT](https://github.com/openai/whisper), [dokumentasi faster-whisper](https://github.com/SYSTRAN/faster-whisper). Engine yang terpasang `faster-whisper==1.2.1`, CTranslate2 CPU int8, bahasa inferensi `id`.
- Bobot lokal: [model.bin](../models/speech/whisper-tiny/model.bin), ukuran 75.538.270 byte. Model beserta tokenizer/config sekitar 78,2 MB desimal; terpisah dari Qwen/Ollama dan model forecasting.
- [Source lock](../models/speech-source.json) mematok revisi, ukuran, SHA256 LFS bobot dan Git blob SHA1 file kecil dari repositori sumber. [Manifest lokal](../models/speech/whisper-tiny/manifest.json) juga menyimpan SHA256 semua file yang diunduh.
- [requirements-voice.txt](../requirements-voice.txt) mematok versi lingkungan `.venv-voice`, terpisah dari `.venv-ml`. Laptop ini diuji dengan Python 3.13.7 pada Windows.

Untuk laptop baru, pasang Python yang sesuai, lalu jalankan:

```powershell
npm run voice:setup
npm run voice:check
npm start
```

`voice:setup` memasang dependensi dan mengunduh model terpatok. `voice:check` memverifikasi berkas sumber dan memuat model CPU. Unduhan hanya dilakukan lewat langkah pemasangan eksplisit. Inferensi menggunakan berkas lokal dengan `local_files_only=True` dan `HF_HUB_OFFLINE=1`. Setelah memperbaiki pemasangan, mulai ulang server karena status kesiapan dicache selama proses server berjalan. `SPEECH_PROVIDER=disabled` menonaktifkan fitur pada server, termasuk konfigurasi tes browser.

## Alur dan batas pemrosesan

[public/voice.js](../public/voice.js) mengelola izin mikrofon, rekam/stop/batal, timer, dan pembatalan hasil terlambat. Browser mengirim audio dalam JSON base64 ke `POST /api/transcriptions`. Endpoint memerlukan sesi, origin sesuai dan CSRF; data tidak masuk ke outbox offline.

[server/transcriber.mjs](../server/transcriber.mjs) memvalidasi MIME/base64 dan maksimum **1 MiB** audio, membatasi satu inferensi CPU sekaligus per proses server, serta menghentikan subprocess ketika klien membatalkan atau setelah **90 detik**. Batas JSON 64 KiB pada endpoint lain tetap berlaku. Tidak ada URL/path audio yang dapat dipilih pengguna.

[server/ml/transcribe.py](../server/ml/transcribe.py) membaca audio dari stdin/BytesIO, mendekode hanya satu stream audio, membatasi durasi hasil dekode 30 detik, lalu menjalankan model dengan bahasa Indonesia, VAD dan penyaringan segmen. Format transport yang diterima WebM/Opus, Ogg/Opus, MP4 dan WAV; format yang dipakai browser dipilih dari kemampuan MediaRecorder. Sinyal kosong, terlalu singkat/panjang atau tak terbaca menghasilkan pesan untuk merekam ulang/mengetik, tanpa transkrip pengganti.

Rekaman dan transkrip draft berada dalam memori. Audio tidak ditulis ke disk, SQLite, IndexedDB, localStorage atau log aplikasi. Setelah **Gunakan teks**, teks menjadi isian pesanan biasa dan mengikuti alur penyimpanan draft yang memang dipilih pengguna. Navigasi, logout, offline, pergantian akun, tab disembunyikan saat proses aktif, dan pembatalan menghentikan rekaman serta mengabaikan hasil yang terlambat. Model yang sama digunakan semua akun tanpa histori percakapan atau adaptasi akun.

VAD/penyaringan tidak menjamin bebas salah dengar atau halusinasi. Nama menu, jumlah, aksen, kebisingan dan negasi tetap perlu diperiksa manusia. Parser katalog yang sudah ada tetap menjadi gate setelah pengguna meminta ekstraksi; hasil suara tidak melewati gate tersebut.

## Bukti pengujian dan yang belum selesai

```powershell
npm run test:voice
npm run test:ui -- tests/real-voice.spec.js
npm run voice:smoke
```

- **7 tes Node**: validasi audio/ukuran, status model, batas konkurensi, timeout/abort/output subprocess, kegagalan aman, autentikasi/origin/CSRF, batas body terpisah, dan snapshot seluruh tabel memory yang tidak berubah setelah transkripsi.
- **7 tes Python**: payload rusak/oversize, hening, batas durasi PCM, resampling stereo, pemuatan model/VAD offline, serta encode/decode WebM Opus nyata. Audio fixture teknis dibuat dalam memori; bukan data usaha, dataset pelatihan, atau bukti akurasi pengenalan kata.
- **4 tes browser**: review dan koreksi eksplisit, pemeliharaan teks lama, pembatalan/izin terlambat/navigasi/offline, penolakan mikrofon, layout 320 px, fokus, dan kontras tema terang/gelap. Tes transport menggunakan stub audio/transkrip pada database memory; **bukan** benchmark ASR.
- Smoke HTTP dengan subprocess Python sebenarnya menolak hening, WAV 31 detik dan container rusak tanpa transkrip: [voice-smoke.json](evaluation/voice-smoke.json). Fixture dibuat dalam memori dan tidak dihitung ulang sebagai tes unik tambahan. [Review UI dan batas verdict](evaluation/VOICE_UI_REVIEW.md).
- Pemeriksaan rilis/data aktif: [voice-release.json](evaluation/voice-release.json), pemeriksaan operasional [voice-health.json](evaluation/voice-health.json). Data usaha aktif tidak ditambah untuk memperagakan fitur.

Belum selesai: pengujian mikrofon dengan pemilik usaha, pengumpulan suara berizin dan anotasi manusia, pembekuan split pembicara, WER/CER serta exact match menu/jumlah/negasi, latensi nyata menurut durasi, dan analisis kesalahan sebelum memilih model/fine-tuning. Tidak ada angka akurasi yang dibuat untuk mengisi kekosongan ini. Deteksi anomali serta eksperimen libur/cuaca tetap TODO tersendiri.
