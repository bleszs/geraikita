# Pemeriksaan masukan teman: fokus F&B

Dokumen yang diperiksa: **Daftar_Perubahan_Gerai_Kita_FnB (1).pdf**, empat halaman, tertanggal 17 Oktober 2026. SHA-256: `0f1f1455b867403fc4a54d309779edb7b2775f6406fcdb9d6ec60695b863d5af`.

PDF mengulas paket v0.34.0. Pembanding pemeriksaan ini adalah **v0.40.0**, branch `feat/kitchen-capacity-and-waste`, commit `69a6f03`, sesudah integrasi Claude dan `rahasiagelap2.0`. Usulan PDF diperlakukan sebagai masukan, bukan instruksi untuk langsung mengganti izin atau skema aplikasi. Hasil ini adalah penilaian kode dan rencana, bukan implementasi fitur PDF.

## Kesimpulan

Arah F&B cocok dengan aplikasi: pertahankan resep, bahan, dapur, kapasitas, waste, kolektif, surplus dan forecasting. Pemilik tetap dapat mengerjakan tugas kasir/dapur tanpa wajib membuat staf. Prioritas pemisahan peran yang dianggap belum ada dalam PDF sudah dikerjakan pada v0.36 dan dipertahankan sampai v0.40. Kebutuhan yang tersisa terutama kemudahan masuk staf, status ketersediaan kasir, atribusi tindakan dan penggunaan antarperangkat.

## Perbandingan dengan kode sekarang

| Masukan PDF | Kondisi v0.40 | Tindak lanjut yang masuk akal |
| --- | --- | --- |
| Pemilik/kasir/dapur dan izin endpoint, hlm. 1–3 | Sudah ada. `server/roles.mjs` membatasi endpoint dan tindakan di server; pendaftaran biasa menghasilkan pemilik. | Pertahankan; tidak membangun ulang RBAC. |
| Bootstrap staf tidak membawa data pemilik, hlm. 1–3 | Sudah ada proyeksi staf. Dapur tidak menerima harga/resep/ledger; kasir tidak menerima stok bahan dan harga beli. | Pertahankan dan perluas tes proyeksi bila menambah fitur kasir. |
| Cabut akses dan cek SSE, hlm. 2–3 | Sudah ada. Nonaktifkan/ubah peran menghapus sesi; request dan SSE memeriksa ulang. | Pertahankan. Pengaktifan kembali tidak menghidupkan sesi lama. |
| Staf masuk memakai kode sekali pakai, hlm. 2 | Belum ada. Sekarang pemilik membuat akun staf dengan email dan kata sandi. | Tambahkan pairing sebagai jalur tambahan yang menaut ke akun/peran saat ini; akun lama tetap dapat masuk. |
| Status menu `ok/low/out` tanpa jumlah porsi, hlm. 3 | Sebagian. Server menghitung porsi tersedia dan menu habis dinonaktifkan, tetapi porsi mentah masih dikirim dan ditampilkan ke kasir. Belum ada status hampir habis. | Hitung status di server dari bahan tersedia setelah cadangan. Kirim hanya status ke kasir dan ubah label UI. Ambang lima porsi dalam PDF masih usulan, bukan konfigurasi yang sudah disepakati. |
| Identitas pelaku dalam audit dan tindakan dapur, hlm. 2–3 | Belum lengkap. Kunci idempotensi staf memuat ID akun/revisi, tetapi audit dan `kitchen_actions` tidak memiliki aktor terstruktur. | Tambahkan atribusi saat tindakan terjadi. Jangan menebak pelaku pada histori lama. |
| Akses HP/tablet, host dan HTTPS, hlm. 1, 3–4 | Belum siap untuk jaringan. Listener mengikat `127.0.0.1`, Host dibatasi localhost/127.0.0.1, pemeriksaan Origin memakai skema HTTP dan cookie belum Secure. | Kerjakan listener, origin publik, host, proxy terpercaya dan cookie bersama; sertakan volume SQLite/backup dan uji perangkat nyata. Mengganti Host saja belum cukup. |
| Layar layanan tanpa sesi pemilik, hlm. 1 | Sudah ada alternatif layar pelanggan dengan token baca terbatas, serta workspace dapur memakai akun dapur. Halaman layanan pemilik tetap tersedia. | Gunakan alamat yang sesuai fungsi. Jangan memberikan sesi pemilik kepada layar pelanggan. |
| Aging antrean bisa diatur, hlm. 1, 3 | Belum ada; 15 menit sekarang berada di `server/kitchen-schedule.mjs`, bukan lagi perhitungan lokal `kitchen.mjs`. | Jadikan pengaturan usaha; pakai pengaturan yang sama untuk urutan tugas dan estimasi semua layar. |
| Hari stok tersisa, hlm. 1, 3 | Belum ada indikator khusus. Saran kulakan saat ini memakai kebutuhan dua hari dan menjelaskan keterbatasan histori. | Tambahkan perkiraan terpisah tanpa mengubah horizon/model dua hari. Histori kurang atau laju nol tidak menghasilkan angka hari buatan. |
| Toleransi salah ketik/alias, hlm. 1, 3 | Alias milik usaha sudah tersedia; fuzzy matching belum ada. Ekstraksi juga mempunyai Ollama lokal, dengan parser deterministik sebagai gerbang bukti. | Mulai dari alias katalog; fuzzy menghasilkan calon yang perlu diperiksa saat ambigu. Hindari pencatatan otomatis dari tebakan nama/jumlah. |
| Pilot warung nyata dan pengukuran suara, hlm. 4 | Masih terbuka. Tes otomatis dan demo bukan uji pengguna nyata. | Uji satu usaha dengan kasir/dapur, durasi masak, jaringan dan suara bising; ukur hasilnya sebelum klaim lapangan. |

## Perbedaan izin yang perlu dipahami

PDF tidak dapat disalin sebagai matriks izin tanpa penyesuaian:

- **Kasir dan penjualan:** saat ini kasir memasukkan pesanan dapur, lalu menyerahkan dan mencatat penjualan setelah semua item siap. Kasir tidak boleh POST `/api/transactions` atau `/api/extractions` dan tidak mempunyai input pesanan lewat suara. PDF mengusulkan ketiganya. Ini penambahan alur, bukan perbaikan kecil pada tombol; perlu mencegah satu pesanan tercatat lewat dua jalur dan menguji data yang dikirim ke kasir.
- **Arti `complete`:** pada kode sekarang, `ready` menandai masakan siap dan menjadi tugas dapur; `complete` menyerahkan pesanan sekaligus membuat penjualan dan menjadi tugas kasir/pemilik. Tabel PDF memakai istilah menyelesaikan masakan dengan `complete`; jangan memakai nama aksi itu secara literal untuk memberi dapur hak mencatat penjualan.
- **Kata sandi sendiri:** staf saat ini boleh mengganti kata sandi sendiri, tetapi tidak mengelola usaha atau akun orang lain. Saya menyarankan mempertahankan perilaku ini; larangan seluruh pengaturan akun dalam tabel PDF terlalu luas untuk alur berbasis kata sandi yang sekarang.
- **Item terbuang:** fitur v0.37 mengizinkan dapur mengeluarkan satu item dengan aturan terbatas dan tanpa mengirim rincian resep; pemilik bisa memeriksa jumlah bahan terpakai sebagian. Matriks dari v0.34 belum mencakup fitur ini. Pertahankan pembatasan tersebut saat menambah pairing atau merapikan matriks akses.

## Skema yang disarankan

Jangan membuat sistem staf kedua hanya agar nama tabel sama dengan PDF. `accounts`, `account_roles`, `account_sessions` dan `staff_actions` sudah menangani identitas/peran. Tabel undangan pairing baru dapat menunjuk akun staf yang ada, dengan hash kode, usaha, masa berlaku dan status pemakaian. Penukaran kode perlu atomik, sekali pakai, pembatasan percobaan, serta penolakan untuk akun nonaktif atau undangan yang dibatalkan. Pembuatan ulang kode tidak boleh menghidupkan akses yang dicabut.

Semua penambahan harus aditif, didahului backup, dan tidak mengubah usaha lama menjadi akun lain. Atribusi aktor lama yang tidak diketahui tetap tidak diketahui; jangan mengisi seluruh histori sebagai tindakan pemilik. Detail skema ini masih rencana implementasi, bukan migrasi yang sudah dijalankan.

## Urutan lanjutan yang disarankan

1. Status ketersediaan kasir `ok/low/out` dengan proyeksi server tanpa angka porsi, lalu atribusi pelaku untuk tindakan baru.
2. Pairing staf dengan kode tanpa menghapus jalur masuk email/kata sandi.
3. Deployment/HTTPS dan penyimpanan persisten, kemudian uji lintas perangkat untuk alur pemilik, kasir, dapur dan pelanggan.
4. Aging yang dapat diatur dan indikator hari stok tersisa. Input suara/penjualan langsung kasir menjadi pekerjaan tersendiri jika alur itu dipilih.
5. Pilot warung nyata; fuzzy matching diprioritaskan berdasarkan kegagalan input yang ditemukan.

Prioritas ini adalah rekomendasi setelah membandingkan PDF, bukan perubahan pada backlog yang sudah disetujui. Roadmap ritel universal tidak perlu diterapkan untuk menutup kekurangan F&B ini.

## Verifikasi pemeriksaan

Membaca PDF empat halaman, implementasi identity/roles/http/store/kitchen/scheduler/forecast/extractor, tampilan staf, dan dokumentasi terkait. Menjalankan kembali `node --test tests/staff.test.mjs`: **7 lulus, 0 gagal, exit 0**, pada database pengujian sementara. Tes mencakup migrasi/peran, pembatasan API, proyeksi staf, pencabutan sesi dan pencabutan saat body request masih dikirim.

Hasil suite integrasi sebelumnya tetap **295 lulus** menurut [bukti rilis v0.40](evaluation/integration-release.json); suite penuh tidak dijalankan ulang untuk pemeriksaan dokumen ini. Tujuh tes yang diulang tidak ditambahkan ke jumlah tersebut. Belum mengubah kode aplikasi, skema, database asli/demo, model atau bobot. Belum mengimplementasikan pairing/status low/deployment. [Konteks branch dan batas integrasi](BRANCH_INTEGRATION.md).
