# Menyimpan hasil pemeriksaan pemakaian

V0.32 menambahkan tinjauan pemilik pada **Saran kulakan → Periksa pemakaian bahan**. Buka rincian bahan dan tanggal, periksa catatan serta pembanding, lalu pilih **Catat hasil pemeriksaan**. Tanggal lain yang dapat diperiksa tersedia melalui **Lihat seluruh 28 tanggal**.

Pilih **Sudah diperiksa** atau **Perlu tindak lanjut**, isi catatan opsional maksimal 500 karakter, lalu centang **Saya sudah memeriksa catatan tanggal ini** dan pilih **Simpan hasil pemeriksaan**. **Tutup tanpa menyimpan** membuang isian formulir. Status, waktu dan catatan disimpan di akun usaha dan tersedia setelah reload. Ringkasan per bahan menghitung hasil yang berlaku, tindak lanjut, dan hasil yang perlu diperiksa ulang.

Status pemilik tidak menghapus tanda statistik dan tidak membuktikan bahwa pemakaian normal atau salah. Tidak ada perubahan transaksi, stok, forecast, keputusan kelompok atau pelatihan AI dari tindakan ini. Catatan operasional yang dibuat sesudah melihat tanda statistik bukan label evaluasi buta; tidak otomatis masuk dataset pada [alat evaluasi](USAGE_EVALUATION.md).

## Data berubah dan sesi lain

Pemeriksaan disimpan bersama fingerprint tanggal target, satuan, aturan serta seluruh observasi tersimpan pada target dan 56 hari referensinya. Perubahan jumlah target/referensi atau hilangnya baris membuat status **Data berubah — periksa lagi** pada pembacaan berikutnya. Tanggal tanpa observasi/pembanding lengkap tidak dapat menerima tinjauan baru. Hasil lama tetap terlihat ketika referensinya menjadi tidak lengkap.

Formulir mengikat data dan revisi saat dibuka. Jika input berubah atau sesi lain lebih dahulu menyimpan hasil tanggal tersebut, server menolak penyimpanan dengan konflik; isian tetap ada. Tutup formulir setelah menyalin catatan yang masih diperlukan, pilih **Perbarui data**, kemudian buka **Periksa kembali**. Setiap hasil baru menyimpan event terpisah dengan tautan ke revisi sebelumnya; formulir menampilkan hasil terbaru, sementara event lama tetap berada di database.

## Koneksi terputus

Hasil tersimpan dapat dibaca dari snapshot offline setelah aplikasi pernah dibuka online. Formulir simpan dinonaktifkan ketika offline; catatan yang sudah diketik tetap berada di sesi halaman. Koneksi kembali tidak mengirim hasil otomatis. Pilih **Hubungkan & muat ulang**, periksa status dan lakukan simpan secara eksplisit jika masih diperlukan. Snapshot lama tanpa data tinjauan menyatakan fitur belum tersedia dan meminta pembaruan.

Jika server menerima simpan tetapi respons hilang, retry formulir yang sama memakai kunci yang sama sehingga hanya satu event/audit dibuat. Bila halaman di-reload, isian yang belum tersimpan tidak dipulihkan; baca status server melalui Perbarui data sebelum membuat tinjauan baru. Catatan bisnis lain yang tertunda tetap mengikuti mekanisme konfirmasi aplikasi yang sudah ada.

## Implementasi dan verifikasi

`POST /api/usage-reviews` memerlukan login, pemeriksaan origin/CSRF, konfirmasi eksplisit, tanggal 28 hari terakhir sebelum hari berjalan, fingerprint dan revisi yang sesuai. Scope ditentukan sesi; body tidak dapat memilih usaha lain. `GET /api/bootstrap` menambah `usageReviews` terpisah dari `recommendations[].usageScreening`, sehingga angka/rule statistik tidak berubah. Tidak ada endpoint publik atau mutasi saat membaca bootstrap.

Migrasi menambah tabel kosong `usage_review_decisions` dengan foreign key bahan dan idempotensi per usaha. Seluruh 19 tabel lama dipertahankan; schema baru mempunyai 20 tabel. Simpan eksplisit hanya menambah event tinjauan dan jejak aktivitas. Aplikasi aktif tidak diisi hasil review contoh.

Delapan tes backend menguji persistensi, migrasi, revisi, idempotensi, validasi, login/scope/CSRF/origin dan kesamaan ledger/forecast/stok. Empat browser menguji simpan/reload, escaping, data berubah/konflik, offline dan respons hilang. Semua fixture memakai database sementara/memory. Tes software belum membuktikan pemahaman pengguna atau akurasi anomali lapangan.

```powershell
npm run test:usage-decisions
npx playwright test tests/real-usage-decisions.spec.js
```

Server harus memuat kode backend baru melalui restart. Setelah pembaruan shell, pilih **Muat ulang aplikasi** jika ditawarkan. Panduan topik Saran kulakan turut menjelaskan tombol baru; jumlah tur tetap 14 topik/67 langkah.
