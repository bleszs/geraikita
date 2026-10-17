# Pengaturan akun — v0.11.0

Buka **Pengaturan akun** dari sidebar atau Menu pada ponsel. Data ditampilkan dari akun yang masuk; email akun lain tidak dibagikan. Formulir memerlukan koneksi dan tidak dapat dikirim selama ada tindakan stok yang belum dipastikan statusnya.

**Identitas usaha:** ubah nama usaha 2–60 karakter. ID usaha, katalog, stok dan transaksi tetap. Nama baru muncul setelah disimpan; snapshot pada rencana pembelian yang sudah dibekukan tetap merekam nama saat persetujuan.

**Kata sandi:** masukkan kata sandi saat ini, kata sandi baru 10–128 karakter yang berbeda, dan ulangi kata sandi baru. Ulangan harus cocok sebelum permintaan dikirim. Kata sandi salah tidak mengeluarkan sesi aktif; percobaan verifikasi dibatasi delapan kegagalan per akun dalam sepuluh menit. Setelah berhasil, sesi lain pada akun ini dikeluarkan. Sesi anggota lain tetap aktif. Kata sandi tidak disimpan dalam snapshot/draft/jejak aktivitas. Bila respons terputus dan hasil belum pasti, coba masuk memakai kata sandi baru sebelum mencoba mengganti lagi.

**Kelompok:** hanya pengelola dapat mengubah nama kelompok atau mengganti kode undangan. Centang dampak pergantian kode sebelum menyimpan. Anggota yang sudah bergabung tetap ada; bagikan kode terbaru kepada calon anggota. Pengiriman ulang kode asal yang sudah diganti ditolak sehingga tidak mengganti kode dua kali karena respons hilang. Perbarui data untuk melihat kode terbaru.

Perubahan identitas/kode/kata sandi disimpan di SQLite dan tetap ada setelah restart. Histori mencatat tindakan tanpa menyimpan kata sandi atau kode undangan. Fitur mengganti kata sandi ini memerlukan akses akun; pemulihan ketika lupa kata sandi dan verifikasi/pergantian email belum tersedia.

Pembaruan aplikasi kini ditawarkan di halaman daftar/masuk dan tidak mengosongkan isian hanya karena versi baru terdeteksi. Tombol Muat ulang aplikasi mengaktifkan pembaruan atas tindakan pengguna; simpan isian sebelum menekannya. Data stok/draft/proof tidak dihapus oleh pembaruan shell.

Pengujian terisolasi mencakup hak pengelola, privasi akun, pembatasan percobaan, pemutusan sesi lain, pergantian kode, persistensi setelah restart, formulir desktop/ponsel, offline, dan pembaruan sebelum login. Pengujian tidak mengisi data bisnis pada database aktif. [Laporan validasi](evaluation/account-settings-validation.json): 59 backend dan 10 browser lulus; isi 19 tabel aktif sama dengan backup sebelum restart.
