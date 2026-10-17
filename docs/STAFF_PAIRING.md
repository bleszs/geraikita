# Kode masuk staf - v0.42

Pemilik dapat membuat staf tanpa email/kata sandi. Identitas dan hak akses tetap memakai akun, role, sesi, ledger dan audit aplikasi yang sama. Akun email/kata sandi yang sudah ada tetap berlaku; tidak ada staf atau kode yang ditambahkan otomatis ke usaha asli.

## Cara memakai

1. Masuk sebagai pemilik, buka **Pengaturan akun > Akun kasir dan dapur**.
2. Isi **Nama staf untuk kode**, pilih Kasir atau Dapur, periksa hak akses, centang konfirmasi lalu pilih **Buat staf & kode masuk**. Pembuatan hanya tersedia saat server tersambung.
3. Setelah server mengonfirmasi, bagikan **kode dan alamat masuk staf** yang muncul. Kode delapan karakter ditampilkan sebagai `XXXX-XXXX`, berlaku 15 menit dan hanya sekali pakai. Pilih **Salin kode**, atau pilih teksnya bila clipboard tidak tersedia. Alamat berasal dari server yang sedang dibuka.
4. Staf membuka alamat tersebut dalam profil browser/perangkatnya, memilih **Masuk sebagai staf**, memasukkan kode dan memilih **Masuk dengan kode**. Huruf kecil, spasi atau tanda hubung diterima. Staf masuk ke ruang kerja sesuai peran; formulir login tidak dapat memilih usaha/peran sendiri.
5. Sesi berlaku paling lama 30 hari atau sampai keluar/akses dicabut. Akun tanpa kata sandi perlu kode baru setelah keluar atau sesinya berakhir; halaman **Akun saya** menjelaskan hal ini. Akun email lama tetap memiliki formulir ganti kata sandi.
6. Untuk staf yang sudah ada, pilih **Buat kode masuk** pada daftar, periksa nama/peran, centang konfirmasi lalu buat kode. Ini juga berlaku bagi akun email lama. Kode sebelumnya yang belum dipakai dicabut; sesi yang sudah masuk tetap aktif.
7. Buka **Riwayat kode masuk** untuk melihat status. **Cabut kode** menghentikan kode yang belum digunakan. **Nonaktifkan** pada daftar staf mengakhiri sesi yang sudah masuk. Perubahan peran/status juga membatalkan kode yang belum dipakai.

**Buat akun staf dengan email** tetap tersedia di bagian yang dapat dibuka di bawah formulir kode. Batas tetap 30 staf per usaha, termasuk yang dinonaktifkan. Dua tab dalam satu profil browser berbagi cookie akun; gunakan profil/jendela privat terpisah untuk mencoba peran sekaligus. Panduan berpanah menyediakan Lanjut/Kembali/Lewati dan menjelaskan kedua pilihan masuk.

## Bila ada kendala

- **Respons pembuatan terputus:** ulangi rincian yang sama pada halaman yang sama. Browser mempertahankan kode/kunci di memori dan server mengembalikan akun yang sama. Jangan mengganti nama/peran selama hasil belum pasti. Setelah reload/perpindahan halaman, periksa daftar staf; gunakan **Buat kode masuk** untuk identitas yang sudah dibuat, bukan membuat staf yang sama lagi.
- **Kode hilang dari layar:** kode sengaja tidak bisa ditampilkan ulang setelah disembunyikan, berpindah halaman, logout, reload atau kedaluwarsa. Buat kode baru untuk staf yang sama. Hanya hasil yang masih aktif pada usaha/halaman yang sama dapat ditampilkan setelah respons terlambat.
- **Sudah dipakai/kedaluwarsa/tidak valid:** minta kode baru kepada pemilik. Server memberikan pesan umum agar tidak membocorkan identitas usaha.
- **Terlalu banyak percobaan:** setelah delapan kegagalan dari sumber koneksi yang sama, tunggu sampai jendela 10 menit berakhir. Mengganti tebakan kode atau memasukkan kode benar tidak melewati pembatasan.
- **Staf sudah masuk tetapi perlu dikeluarkan:** gunakan **Nonaktifkan**; mencabut kode atau membuat kode baru tidak mengakhiri sesi yang sudah ada.

## Penyimpanan dan API

`server/staff-invites.mjs` menyimpan hash SHA-256 kode, scope usaha, identitas/revisi role, waktu berlaku/pakai/cabut, pembuat serta kunci/fingerprint idempotensi. Kode mentah hanya di memori browser pemilik selama hasil ditampilkan dan dalam permintaan HTTPS saat nanti dideploy; tidak disimpan pada snapshot/draft/URL/log/database. Metadata histori tidak mengembalikan kode/hash. Riwayat UI mengambil 50 entri terbaru. Raw code yang sudah disalin ke clipboard atau dibagikan berada di luar penghapusan otomatis aplikasi.

| Endpoint | Akses dan perilaku |
| --- | --- |
| POST `/api/auth/staff-code` | Tanpa sesi; origin yang sama, pembatas percobaan per alamat koneksi; exchange atomik sekali pakai menghasilkan cookie sesi |
| GET `/api/staff-invites` | Hanya pemilik, metadata scope usahanya |
| POST `/api/staff-invites` | Pemilik, CSRF, konfirmasi, idempotensi; nama/peran baru atau ID/revisi staf yang ada |
| POST `/api/staff-invites/:id/revoke` | Pemilik, CSRF, konfirmasi; tidak memutus sesi yang sudah masuk |

Kasir/dapur tidak menerima histori kode atau endpoint pengelolaan. Identitas aktor tetap dari database. Perubahan kata sandi membatalkan kode tertunda akun tersebut. Pembatas percobaan disimpan dalam memori proses, dihitung per alamat koneksi langsung dan reset saat restart; ini bukan rancangan pembatas terdistribusi atau konfigurasi reverse proxy produksi.

## Migrasi dan bukti

Schema menjadi **30 tabel**, menambah `staff_invites` kosong. Tiga kolom kredensial `accounts` dapat NULL secara bersamaan agar akun staf tidak membutuhkan email/kata sandi fiktif. Akun email lama tetap memiliki nilai yang sama. Pada SQLite 3.50 runtime lokal, tabel akun disalin dan diganti dalam transaksi mengikuti [prosedur ALTER TABLE SQLite](https://www.sqlite.org/lang_altertable.html), dengan pemulihan foreign keys, pemeriksaan relasi dan rollback bila gagal. Nilai semua kolom, ID, hash kata sandi, sesi dan baris 29 tabel sebelumnya dipertahankan. Schema akun atau view/trigger eksternal yang tidak dikenali ditolak agar perlu ditinjau terlebih dahulu.

Sebelum migrasi dibuat backup database asli, demo F&B dan demo lama. [Data asli](evaluation/pairing-data-preservation.json), [demo F&B](evaluation/pairing-fnb-demo-preservation.json), [demo lama](evaluation/pairing-legacy-demo-preservation.json) mencatat perbandingan hash seluruh tabel/kolom dan integritas. `scripts/verify-pairing-migration.mjs <backup-v041> <target> <laporan-baru>` ditujukan untuk migrasi baseline v0.41 pada file yang telah dibackup, bukan seeder.

`npm run test:pairing` memeriksa domain/API/migrasi pada database sementara; `tests/real-pairing.spec.js` memeriksa alur browser, kompatibilitas email, retry, pembatas peran, kode yang sudah dipakai, respons terlambat dan kedaluwarsa tanpa menghapus isian lain. [Bukti rilis](evaluation/pairing-release.json), [review UI](evaluation/PAIRING_UI_REVIEW.md), [pemeriksaan desain](evaluation/PAIRING_DESIGN_CHECK.md).

## Batas pekerjaan

Server masih lokal/loopback. `localhost` atau `127.0.0.1` pada ponsel menunjuk ponsel itu sendiri; alamat staf belum menjadi tautan publik. HTTPS, cookie aman, origin/host, volume SQLite persisten, backup/restore terjadwal dan uji antarperangkat menjadi tahap berikutnya. Model, bobot, protokol riset dan dataset bisnis tidak berubah. Tidak ada klaim suara dua detik, akurasi lapangan atau kode demonstrasi tetap. Demo sintetis tetap pada database terpisah dan tidak boleh dipakai melatih model.
