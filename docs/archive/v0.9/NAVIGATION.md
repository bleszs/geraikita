# Ringkasan dan navigasi cepat

Status 15 Oktober 2026, versi 0.9.0. Palet kedai hangat, komponen, tujuh layar dan aturan transaksi tetap mengikuti sistem desain yang ada.

## Langkah berikutnya

Ringkasan menampilkan langkah dari data usaha aktif, dengan satu prioritas terbuka dan langkah lainnya melalui **Lihat … langkah lain**. Setiap tautan membuka layar tempat pemilik dapat meninjau tindakan.

| Keadaan | Layar yang dituju |
| --- | --- |
| Pesanan belum pasti tercatat atau draft perangkat | Catat pesanan |
| Tawaran belum pasti diterbitkan | Surplus |
| Penerimaan belum pasti tercatat | Beli bersama |
| Barang masuk pribadi belum pasti | Produk & stok; rincian asal dikunci sampai status diperiksa |
| Pembatalan barang masuk pribadi belum pasti | Riwayat; alasan asal dikunci sampai status diperiksa |
| Pembatalan penerimaan belum pasti | Beli bersama; periksa status atau ulangi dengan alasan asal |
| Permintaan surplus milik penerima/pemilik yang menunggu atau expired | Surplus |
| Stok berubah setelah kebutuhan dibagikan | Saran kulakan |
| Proposal perlu ditinjau atau sudah disetujui bersama | Beli bersama |
| Bagian pemasok belum diterima atau siklus siap dilanjutkan | Beli bersama |
| Stok kosong/di bawah ambang | Produk & stok |

Daftar dihitung saat layar dirender dari bootstrap usaha dan catatan perangkat dalam scope yang sama. Data baru mengikuti pemuatan ulang, perubahan yang terkonfirmasi dan pergantian profil. Membuka tautan tidak memberi persetujuan, menerbitkan tawaran atau mencatat penerimaan. Rincian kelompok tetap mengikuti batas izin minimal tiga usaha; daftar ini tidak mengambil transaksi mentah usaha lain.

Saat memakai snapshot, judul menjadi **Langkah pada data terakhir** dengan petunjuk untuk menghubungkan server sebelum memberi keputusan. Tautan tetap bisa dipakai untuk membaca; tindakan yang memerlukan server dinonaktifkan.

## Ponsel

Pada lebar sampai 760px, navigasi bawah berisi **Ringkasan, Pesanan, Stok, Bersama, Menu**. **Menu** membuka navigasi lengkap, termasuk Saran kulakan, Surplus, Riwayat dan pemilih usaha demo. Header selalu menunjukkan nama singkat usaha aktif.

Menu yang terbuka menyembunyikan navigasi bawah sehingga target tidak berulang. **Escape** menutup menu dan mengembalikan fokus ke tombol pembuka. Perpindahan layar menjaga chat yang sedang diketik pada profil yang sama; review dan konfirmasi tetap melalui alur pesanan. Padding bawah dan safe area menjaga footer/tombol akhir halaman bisa digulir melewati bilah navigasi.

## Bukti

Suite 50 backend/operasional + 38 browser lulus. Dua tes navigasi memeriksa surplus → proposal → penerimaan melalui ringkasan, profil aktif, chat belum terkonfirmasi, fokus keyboard, target minimal 44px, footer, snapshot offline dan viewport 320/1024px. Capture desktop 1440px dan ponsel 320px diperiksa pada tema terang/gelap.

[Uji browser pada server lokal](evaluation/navigation-live.json) memakai namespace demo baru dan memastikan navigasi/profil/cache pada 320, 1024 dan 1440px, stok/penjualan tetap, modul `attention.js` tercache tanpa API, serta tindakan tetap disabled saat offline. Pemeriksaan ini memakai Chrome desktop dengan viewport simulasi, belum perangkat fisik atau audit aksesibilitas menyeluruh.
