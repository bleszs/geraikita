# Akun pemilik, kasir dan dapur — v0.36

Akun staf terhubung ke usaha pemilik yang membuatnya. Mendaftar usaha baru tetap menghasilkan akun pemilik untuk usaha baru, bukan akses staf ke usaha orang lain. Akun lama menjadi pemilik pada migrasi pertama; tidak ada akun staf yang dibuat otomatis.

## Cara menggunakan

1. Masuk sebagai pemilik, buka **Pengaturan akun → Akun kasir dan dapur** di bagian bawah halaman.
2. Isi nama, email unik, peran Kasir/Dapur dan kata sandi awal 10–128 karakter. Periksa hak akses, centang konfirmasi dan pilih **Buat akun staf**.
3. Berikan email, kata sandi awal dan alamat **Buka halaman masuk staf** secara langsung kepada staf. Gunakan profil browser/jendela privat terpisah untuk mencoba dua peran sekaligus. Dua tab dalam satu profil berbagi cookie akun.
4. Staf masuk melalui **http://localhost:4174/api/staff/screen#dapur**, lalu dapat mengganti kata sandi melalui **Akun saya**. Panduan berpanah dengan Lanjut/Kembali/Lewati mengenalkan tugas perannya.
5. Kasir memilih **Pesanan baru** untuk langsung ke isian, lalu memasukkan pesanan. **Kembali ke antrean** mengembalikan fokus ke judul antrean. Pembaruan dari perangkat lain mempertahankan fokus kontrol yang masih ada; pesanan yang hilang mengembalikan fokus ke antrean. Dapur memulai giliran, memakai tahap pasif jika tersedia, lalu menandai setiap item siap. Kasir memilih **Serahkan & catat penjualan** setelah penyerahan. Satu pesanan hanya menjadi satu penjualan; jangan mencatatnya lagi melalui formulir penjualan langsung milik pemilik.
6. Pemilik dapat membuka **Ubah peran**, **Nonaktifkan**, atau **Aktifkan**, memeriksa dampaknya, lalu mengonfirmasi. Semua sesi staf tersebut dikeluarkan; staf harus masuk lagi bila akses masih aktif.

Untuk demo gunakan server `npm run start:demo` dan port **4180** dengan database demo terpisah. Buat akun staf presentasi secara eksplisit di sana; generator tidak menambah staf. Alamat localhost/127.0.0.1 hanya menunjuk perangkat yang membuka alamat itu. Akses perangkat lain dan HTTPS masih memerlukan pekerjaan deployment.

## Pembagian akses

| Tindakan/data | Pemilik | Kasir | Dapur |
| --- | --- | --- | --- |
| Menu dan harga untuk menerima pesanan | Ya | Ya, beserta porsi tersedia | Nama/porsi dalam pesanan saja, tanpa harga |
| Membuat pesanan antrean | Ya | Ya | Tidak |
| Membatalkan pesanan yang belum dikerjakan | Ya | Ya | Tidak |
| Mulai, tahap pasif, lanjutkan, tandai siap | Ya | Tidak | Ya |
| Menyerahkan dan mencatat penjualan | Ya | Ya, setelah seluruh item siap | Tidak |
| Menutup bahan terpakai setelah pesanan dimulai | Ya, dengan konfirmasi | Tidak; minta pemilik | Tidak; minta pemilik |
| Perintah tahap lewat teks/suara | Ya | Tidak | Ya, jika layanan suara tersedia |
| Stok bahan, resep, pemasok, laporan, forecasting, kelompok, surplus | Ya | Tidak | Tidak |
| Mengelola staf, layar pelanggan dan usaha | Ya | Tidak | Tidak |
| Mengubah kata sandi sendiri/keluar | Ya | Ya | Ya |

Staf dapat melihat antrean aktif seluruh usahanya, bukan hanya pesanan yang ia buat. Label pesanan dan catatan yang diperlukan untuk menyiapkan makanan memang dibagikan kepada kasir/dapur. Kode/status pelanggan tetap melalui akses layar terpisah. Kasir tidak dapat membatalkan penjualan yang sudah diserahkan; minta pemilik memeriksa melalui Riwayat.

## Aturan server dan sesi

`server/roles.mjs` memakai daftar endpoint/tindakan yang diizinkan. Permintaan staf ke endpoint lain mendapat HTTP 403 walaupun tombol/URL diketik sendiri. Identitas, usaha dan peran diambil dari sesi/database, bukan `role` atau business ID dari input. Kasir dan dapur mendapat proyeksi bootstrap eksplisit, bukan bootstrap pemilik yang disembunyikan dengan CSS. Dapur tidak menerima total/harga/resep/ledger atau metadata staf lain. GET `/api/kitchen` juga memakai proyeksi ini.

Endpoint baru: POST `/api/staff` dan POST `/api/staff/:id`, hanya pemilik dengan CSRF. Pembuatan perlu konfirmasi, peran cashier/kitchen, email global unik dan idempotencyKey; batas versi ini **30 akun staf per usaha**, termasuk yang nonaktif. Perubahan perlu revisi akun terakhir, action role/disable/enable, konfirmasi dan idempotencyKey. Target pemilik/akun usaha lain ditolak. Password disimpan dengan scrypt dan salt seperti akun sebelumnya; password awal tidak dikembalikan atau disimpan di draft frontend.

Pengulangan pembuatan dengan kunci, email, nama dan peran yang sama mengembalikan ID akun yang sudah dibuat. Password **tidak diganti** oleh pengulangan itu; masukkan kembali password awal untuk retry, lalu periksa daftar. Identitas berbeda dengan kunci sama ditolak. Kunci dan rincian perubahan staf hanya di memori halaman; setelah reload/perpindahan halaman, periksa daftar sebelum membuat lagi. Pengulangan perubahan akses memakai `staff_actions`, sehingga respons hilang tidak menambah revisi/menonaktifkan dua kali.

Role/status berubah → revisi bertambah dan seluruh sesi akun target dihapus. Resolve sesi memeriksa role/status pada setiap request, setelah body selesai diterima sebelum dispatch, serta pada tick SSE. Pencabutan ketika body masih dikirim tidak dapat dilewati dengan sesi yang dibaca lebih awal. Stream staf yang sesinya dicabut ditutup; frontend memeriksa bootstrap lalu menampilkan login. Pengaktifan ulang tidak menghidupkan token lama. Perubahan password mengeluarkan sesi lain milik akun tersebut, tanpa mengeluarkan akun rekan kerja/pemilik. Pembatas percobaan password dihitung per akun.

## Koneksi, cache dan pemulihan

Halaman `/api/staff/screen` memuat modul melalui `/api/staff-client/*.js` dengan no-store. Prefiks API melewati service worker lama, sehingga shell lama tidak menggantikan aplikasi staf. Login di halaman utama juga didukung setelah shell diperbarui. Ini bukan URL rahasia: data tetap memerlukan sesi staf yang sah.

Staf tidak menyimpan snapshot usaha untuk dibuka ulang offline. Snapshot akun terakhir di perangkat dibersihkan saat mengadopsi akun staf. Jika koneksi putus, layar yang masih terbuka menandai data mungkin lama dan menonaktifkan mutasi; reload offline tidak membuka data pemilik. Akun staf perlu koneksi untuk mulai bekerja. Kredensial tidak dimasukkan ke IndexedDB.

Bukti kirim antrean/tahap yang responsnya hilang tetap tersimpan untuk pemeriksaan eksplisit. Scope staf menambahkan ID akun, peran dan revisi peran pada scope usaha; kunci tindakan wajib berawalan `accountId:roleRevision:`. API hanya mengirim bukti penyelesaian milik namespace akun saat ini. Draft/bukti lama pemilik tidak ditampilkan kepada staf, tidak dikirim otomatis dan tidak dihapus untuk membuat seolah selesai. Pergantian peran meninggalkan bukti namespace lama untuk pemeriksaan pemilik melalui antrean/ledger; tidak ada retry otomatis lintas peran.

## Migrasi dan verifikasi

Schema menjadi **27 tabel**. `account_roles` menyimpan kepemilikan/role/revisi/status dan metadata pembuatan; `staff_actions` menyimpan deduplikasi perubahan. Migrasi pertama menurunkan role owner dari akun yang benar-benar sudah ada, dalam transaksi. Startup selanjutnya tidak pernah mengubah role hilang menjadi owner: akun tersebut gagal autentikasi sampai data diperiksa.

[Preservasi usaha asli](evaluation/staff-data-preservation.json) dan [preservasi demo](evaluation/staff-demo-preservation.json) membuktikan seluruh **25 tabel lama identik** dengan backup sebelum migrasi. Role owner cocok dengan akun lama; nol staf baru dan nol tindakan staf otomatis. Tidak mengubah model, bobot, benchmark AI atau data bisnis.

Untuk browser pengujian terpisah, jalankan `npx playwright install chromium`, lalu di PowerShell set `$env:PLAYWRIGHT_CHANNEL='chromium'` sebelum `npm test`. Tanpa variabel itu pengujian memakai Chrome terpasang. Ini hanya pilihan browser pengujian, tidak mengubah browser/aplikasi pengguna.

`npm run test:staff` menguji migrasi/reopen, hash password, scope pemilik, idempotensi, sesi, matriks API dan satu pesanan bersama pada database sementara. `npx playwright test tests/real-staff.spec.js` menguji alur dua browser, pengelolaan staf, pencabutan aktif, panduan, cache lama dan isolasi offline. Regresi akhir selesai normal dengan **227 Node + 44 browser = 271 lulus**, exit 0 pada Chromium terpisah. Kasus browser juga memeriksa fokus setelah pembaruan jarak jauh/refresh, fallback saat pesanan hilang dan akses cepat saat tiga pesanan aktif di ponsel. Fixture pengujian sintetis tidak dimasukkan ke akun asli. [Bukti rilis akhir](evaluation/staff-release.json).

Belum termasuk reset password/email staf oleh pemilik, transfer kepemilikan, beberapa pemilik dalam satu usaha, penghapusan permanen staf, pengaturan izin bebas, atribusi aktor terstruktur untuk seluruh histori, pilot staf nyata, HTTPS/deployment atau audit keamanan produksi. Penjadwalan tetap per stasiun, belum kapasitas alat/staf otomatis. Rekaman suara tetap empat detik; target dua detik dan kestabilan Whisper belum terselesaikan.
