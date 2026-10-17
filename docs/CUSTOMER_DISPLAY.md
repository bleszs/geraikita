# Layar pelanggan dengan akses terbatas — v0.35

Verifikasi akhir: **261 tes lulus melalui `npm test`** (220 Node + 41 browser), runner selesai normal. [Bukti rilis dan health](evaluation/display-release.json), [review dua perbaikan](evaluation/CUSTOMER_DISPLAY_UI_REVIEW.md), [konsistensi desain](evaluation/CUSTOMER_DISPLAY_DESIGN_CHECK.md).

Langkah lanjutan SRS setelah modul dapur v0.34: memisahkan layar pelanggan dari akun pemilik. Ini satu fitur lengkap; peran kasir/staf dapur, suara dua detik, kapasitas alat dan deployment masih menjadi pekerjaan berikutnya.

## Cara memakai

1. Masuk sebagai pemilik, buka **Pengaturan akun → Layar pelanggan**. Layar layanan operasional juga menyediakan tautan menuju pengaturan ini.
2. Isi nama perangkat, pilih masa aktif 1/8/24/72 jam dan setujui bahwa pemegang tautan dapat melihat kode/status selama aktif. Maksimal 10 tautan aktif per usaha; API membatasi durasi 1–168 jam.
3. Pilih **Buat tautan layar**, lalu **Salin tautan layar** atau **Buka layar pelanggan**. Tautan lengkap hanya tersedia di memori halaman pembuatan. Pindah halaman, logout, pergantian scope atau reload menghapusnya; daftar akses tidak dapat mengambil kembali tautan lama. Buat tautan baru dan cabut yang lama bila hilang.
4. Buka tautan pada browser perangkat pelanggan. Tidak perlu login pemilik. Cocokkan kode delapan karakter yang juga tertera pada kartu pesanan dapur. Kode adalah penanda pesanan, bukan nomor urut harian; staf perlu memberikannya kepada pelanggan.
5. Pesanan antre/dikerjakan masuk **Sedang disiapkan**; pesanan siap masuk **Siap disajikan**. Setelah selesai atau dibatalkan, pesanan keluar dari layar. Tidak ada menu, harga, jumlah porsi, resep, stok, nama/label pelanggan atau catatan variasi pada API/tampilan ini.
6. Untuk menghentikan akses, pilih **Cabut akses**, periksa nama perangkat lalu **Ya, cabut akses layar**. Saat tersambung, layar menerima pencabutan pada pemeriksaan berikutnya sekitar satu detik dan menyembunyikan kode. Tautan yang berakhir juga ditolak. Layar offline/gagal koneksi menyembunyikan kode, lalu memeriksa ulang otorisasi ketika tersambung.

Tautan lokal `localhost`/`127.0.0.1` hanya menjangkau server pada perangkat yang sama. Memakai TV/ponsel lain memerlukan konfigurasi jaringan/server dan HTTPS yang sesuai; rilis ini **belum deployment publik**. Jangan menganggap tautan lokal dapat diakses dari perangkat lain secara otomatis.

## Privasi dan batas akses

- Kunci akses acak 256 bit dibuat oleh Web Crypto pada browser pemilik, dikirim hanya ke endpoint pemilik dengan sesi, origin dan CSRF. SQLite menyimpan SHA-256, bukan kunci asli. Kunci/idempotensi yang menunggu kepastian hanya ada di memori, tidak di draft IndexedDB/snapshot/localStorage.
- Tautan membawa kunci pada URL fragment. Fragment tidak menjadi query/path HTTP. Halaman/API memakai `no-store`, halaman memakai `no-referrer`, dan viewer mengirim bearer melalui header dengan `credentials: omit`. Tidak ada login cookie, bootstrap akun atau service worker baru pada layar pelanggan.
- Rute HTML berada di `/api/display/screen` agar worker PWA lama yang hanya melayani shell navigasi tetap melewati halaman ini. Ini menghindari layar pelanggan berubah menjadi shell pemilik yang tersimpan.
- Endpoint baca hanya memproyeksikan `{orders:[{code,status}],hasMore,updatedAt}` dari usaha yang terkait token. Pemegang token dapat membaca kode/status seluruh antrean usaha selama masa aktif, bukan hanya satu pesanan. Salin tautan hanya untuk perangkat yang diizinkan; HTTPS tetap diperlukan saat dipasang di jaringan publik.
- Token bukan sesi akun dan tidak memberi akses API pemilik atau mutasi pesanan. Mengubah ID usaha pada permintaan tidak mengubah scope token. Ini bukan pengganti audit keamanan produksi atau RBAC staf.
- Maksimal 200 pesanan aktif ditampilkan, dengan penjelasan jika ada lebih banyak. SSE memeriksa token setiap detik, mengirim perubahan atau heartbeat minimal tiap lima detik. Watchdog 12 detik menyembunyikan data dan mencoba tersambung kembali dengan jeda maksimal 15 detik. Tab tersembunyi menghentikan koneksi; kembali ke tab memeriksa otorisasi lagi. Tidak ada mutasi bisnis dari viewer.
- Jika koneksi putus tepat setelah pembuatan, formulir mempertahankan payload/kunci yang sama di memori. Pengulangan eksplisit tidak membuat akses ganda. Setelah reload, periksa daftar metadata dan cabut akses yang tidak dikenali sebelum membuat yang baru.

## Implementasi dan data

`server/display-access.mjs` mengelola tabel aditif `display_access`, metadata, kedaluwarsa, pencabutan dan proyeksi minimal. `server/http.mjs` memisahkan endpoint bearer dari endpoint sesi pemilik. Pengaturan owner memakai `public/display-management.js`; layar mandiri memakai `public/display-screen.html/css/js` dan token hanya di memori/fragment pengguna.

Schema menjadi **25 tabel**. Migrasi tidak menambah token contoh, akun, pesanan atau stok. Data usaha dan demo tetap terpisah. Model AI, bobot, benchmark dan scheduler tidak diubah untuk fitur ini. Panduan versi 4 menambah tiga langkah pengelolaan layar; total 15 topik/76 langkah. Tema viewer mengikuti sistem saat dibuka dan dapat diubah pada perangkat itu tanpa penyimpanan token/tema.

## Verifikasi

Lima tes Node memeriksa hash/token, durasi/limit, idempotensi, scope, proyeksi data, lifecycle pesanan, migrasi, sesi/CSRF, penolakan hak owner dan pencabutan stream. Tes browser memeriksa anonymous display tanpa cookie, pembaruan live, offline/hide/reconnect, token berakhir, cache PWA lama, fokus keyboard, data yang tidak tersimpan dan respons pembuatan hilang. Data pengujian hanya di database sementara; tidak menjadi dataset akurasi AI.

Bukti migrasi: [data asli](evaluation/display-data-preservation.json), [demo](evaluation/display-demo-preservation.json). Pemeriksaan UI dan konsistensi desain dicatat terpisah di direktori evaluasi. Rilis penuh tersedia pada `evaluation/display-release.json`.

## Berikutnya

- [ ] Peran pemilik/kasir/dapur dengan sesi dan daftar tindakan yang benar-benar dibatasi server.
- [ ] Pengaturan server HTTPS/host deployment, distribusi tautan ke perangkat lain dan pembatasan koneksi produksi.
- [ ] Uji keterbacaan TV dan pemahaman kode dengan pengguna/kasir nyata.
- [ ] Streaming suara dan pengukuran ≤2 detik; stabilitas ASR dan validasi lapangan tetap belum selesai.
