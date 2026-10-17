# Panduan v0.41

Guide versi **7**, tetap **18 topik / 89 langkah**. Petunjuk kasir menjelaskan status Hampir habis dan Habis; tur tetap berpanah dengan Lanjut/Kembali/Lewati. Pembaruan tombol/keadaan kosong fe073d0 tidak menghilangkan dukungan role atau perlindungan tur manual. Bagian berikut mencatat versi sebelumnya.

# Pembaruan panduan v0.40

Panduan versi 6 memuat **18 topik/89 langkah**. Pendaftaran melalui formulir UI mengaktifkan tur pertama tiap halaman; login tidak dinilai sebagai pendaftaran baru hanya karena umur akun singkat. Tur manual dapat melintasi halaman tanpa diganti otomatis. Navigasi pengguna ke halaman lain menjeda tur sebelumnya; Lewati melewati tur halaman saat ini. Bantuan tetap di navigasi atas, dengan topik kasir/dapur sesuai peran. Target antrean kosong memakai judul antrean yang selalu ada. Progress tetap terpisah per scope akun/peran; versi lama tidak dianggap punya indeks sama.

[Integrasi, pengujian dan batas](BRANCH_INTEGRATION.md). Tidak ada pengiriman data bisnis otomatis oleh panduan. Catatan berikut merupakan riwayat.

# Tambahan panduan v0.36

Panduan versi **5** berjumlah **18 topik/87 langkah**. Tiga topik baru: pemilik mengelola staf (3 langkah), kasir menerima/menyerahkan pesanan (4), dapur mengatur tahap memasak (4). Tombol Panduan/Panduan halaman ini pada akun staf langsung membuka tur perannya, dengan Lanjut/Kembali/Lewati; langkah terakhir membuka Akun saya untuk password. Tur utama pemilik tetap 11 langkah. Tur tidak membuat staf, mengirim pesanan, mengganti password atau menyetujui izin otomatis. Progress mengikuti scope akun/peran/revisi. [Pembagian akses](STAFF_ROLES.md).

Catatan versi sebelumnya di bawah adalah riwayat.

# Tambahan panduan v0.35

Panduan versi 4 menambah tiga langkah dalam topik Pengaturan: pembuatan akses layar, penyimpanan tautan sementara, dan pencabutan. Total menjadi **15 topik/76 langkah**, tur utama tetap 11. Panduan tidak membuat tautan atau menyetujui akses secara otomatis. Viewer pelanggan adalah layar mandiri dengan petunjuk langsung, tanpa bootstrap pemilik atau kebutuhan login.

# Tambahan panduan v0.34

Panduan versi 3 menambah topik **Operasional dapur dan layar layanan**, enam langkah tentang pemasukan multi-item, giliran stasiun, tahap pasif, penyelesaian/cadangan/waste, kendali suara dan layar kedua. **Panduan halaman ini** pada Dapur/Layanan membuka topik tersebut. Total menjadi 15 topik/73 langkah; tur umum tetap 11 langkah. Progress versi lama dipisahkan agar indeks tidak disalahartikan. Bukti browser terbaru memeriksa seluruh 73 langkah tanpa POST bisnis.

Bagian berikut mencatat desain panduan versi sebelumnya.

# Panduan interaktif Gerai Kita

V0.29 menyediakan **tur visual berpanah** di atas aplikasi. Bagian lain diredupkan, fitur yang sedang dijelaskan disorot dan dihubungkan dengan panah ke kotak penjelasan. Tombol **Lanjut** berpindah ke fitur berikutnya; **Kembali** mengulang penjelasan, dan **Lewati panduan** menutup tur. Buka **Panduan** pada bagian atas, **Panduan penggunaan** di navigasi, atau **Panduan halaman ini**. Petunjuk tersedia sebelum masuk dan setelah masuk, tanpa data latihan pada akun usaha.

Pada kunjungan pertama muncul tawaran **Mulai panduan** atau **Lewati**. Sebelum masuk, lima langkah dimulai dengan pengenalan aplikasi lalu pendaftaran/akun. Setelah masuk, **11 langkah** memperkenalkan aplikasi → Ringkasan → Produk & stok → Catat pesanan → Saran kulakan → Beli bersama → Surplus → Riwayat → Pengaturan → Perbarui data → akses Panduan. Rincian tombol dan isian tetap tersedia dalam topik terpisah.

## Tombol panduan

| Tombol | Perilaku |
|---|---|
| Mulai panduan / Mulai | Buka topik dari langkah pertama |
| Lanjut | Baca langkah berikutnya; membuka halaman terkait jika sudah masuk |
| Kembali | Baca langkah sebelumnya; bukan pembatalan transaksi |
| Petunjuk tombol dan isian | Buka penjelasan kontrol pada langkah tersebut |
| Lewati / Lewati panduan | Hentikan panduan; aplikasi tetap bisa digunakan dan topik bisa diulang |
| Tutup sementara / Escape | Jeda tur pada posisi saat ini |
| Lanjutkan panduan terakhir | Lanjutkan topik yang dijeda dari halaman Panduan |
| Selesai | Tandai topik selesai pada perangkat ini, lalu tutup tur |
| Cari fitur atau tombol | Cari judul, penjelasan, nama tombol atau isian, termasuk kontrol bersyarat |

Panah menunjuk posisi fitur yang nyata, bukan gambar layar contoh. Letak penjelasan dipilih di sisi yang cukup ruang dan dihitung ulang saat scroll, resize atau perubahan ukuran isi. Panah tidak dibuat untuk target yang belum tampil atau berbeda halaman. Panel menjelaskan syarat kontrol yang belum tersedia; pengguna bisa tetap Lanjut tanpa membuat data pengganti. Jika layar terlalu sempit untuk target dan panel, penjelasan tetap terbaca dan tombol **Tampilkan bagian yang ditunjuk** membantu menggulir kembali ke target.

Panel tidak mengunci aplikasi. Tombol aplikasi tetap perlu dipilih sendiri. Tidak ada simulasi klik, permintaan mikrofon otomatis, pengisian nilai, pengiriman transaksi atau persetujuan kelompok dari tombol panduan. Pengguna bisa menutup panel sementara untuk mengerjakan formulir.

## Cakupan

Ada **14 topik / 67 langkah**. Tur pengenalan utama memiliki 11 langkah sesuai permintaan pengenalan seluruh fitur; topik terperinci lain terdiri dari 3–7 langkah, dengan penjelasan tombol tambahan yang dapat dibuka:

| Topik | Langkah | Isi |
|---|---:|---|
| Kenali aplikasi dari awal | 11 | Pengenalan aplikasi dan semua fitur utama dengan panah |
| Daftar, masuk dan bergabung | 5 | Pengenalan aplikasi, identitas, kelompok/kode undangan, masuk, akun sendiri |
| Menu, tampilan dan bantuan | 4 | Navigasi desktop/ponsel, refresh, tema, panduan |
| Bahan dan saldo stok | 4 | Identitas, satuan, ambang, saldo/tersedia, perubahan bahan |
| Barang masuk dan konversi satuan | 4 | Penerimaan fisik, jumlah/harga, konversi dan koreksi |
| Menu, harga dan resep | 3 | Harga, alias, resep per porsi dan perubahan ke depan |
| Catat dan periksa pesanan | 5 | Ekstraksi/manual, baris review, konfirmasi, draft dan pembatalan |
| Pesanan lewat suara | 4 | Mikrofon, stop/batal, koreksi dan penggunaan teks |
| Saran kulakan dan kebutuhan | 4 | Histori, pemeriksaan pemakaian, izin 24 jam dan penarikan |
| Beli bersama dan penerimaan | 7 | Penawaran pengelola, anggota, keputusan, rencana, batch, koreksi dan siklus |
| Tawarkan dan terima surplus | 4 | Tawaran, reservasi, permintaan, persetujuan dan penarikan sisa |
| Riwayat, pembatalan dan ekspor | 4 | Catatan asal, koreksi penjualan/penerimaan dan CSV |
| Akun, nama dan undangan | 4 | Identitas, kata sandi, kode undangan dan keluar akun |
| Offline, tindakan tertunda dan pembaruan | 4 | Snapshot, reconnect, status tidak pasti, update dan pemulihan |

Kontrol yang belum tersedia tetap dijelaskan dengan syaratnya. Contohnya, penerimaan kolektif memerlukan rencana tersimpan dan bagian yang belum diterima; pengaturan pemasok hanya tersedia untuk pengelola. Panduan tidak membuka hak akses, membuat kelompok/anggota buatan atau memaksa tombol nonaktif menjadi aktif. Sebelum masuk, fitur usaha dapat dibaca tanpa membuka catatan akun.

## Posisi tersimpan dan keamanan

Progress disimpan di localStorage perangkat dengan namespace `gerai-kita-guide-v2`, terpisah untuk tamu dan scope workspace/epoch/usaha. Versi baru membedakan urutan tur berpanah dari panduan v1; record lama tidak dihapus atau dipakai sebagai nomor langkah baru. Hanya versi, penanda tawaran awal, status, ID topik dan nomor langkah yang disimpan. Tidak ada nama usaha, email, kata sandi, audio atau isi formulir pada progress. Tidak ada pengiriman progress ke server, analitik, sinkronisasi antarperangkat atau perubahan schema SQLite.

Panduan yang selesai/dilewati tidak dipaksakan muncul lagi pada scope/perangkat yang sama. Tur yang dijeda tersedia melalui **Lanjutkan panduan terakhir**; tidak otomatis dibuka ketika reload. Jika penyimpanan ditolak, panduan tetap berfungsi selama sesi dan memberi pesan bahwa posisi belum dapat disimpan. Data progress tidak valid/versi lain diabaikan dengan aman.

Input biasa yang sudah ditangkap aplikasi tetap berada pada editor ketika tur kontekstual dibuka. Navigasi panduan memakai perilaku halaman biasa; kata sandi tidak dipersistenkan dan dapat dikosongkan ketika formulir akun dirender ulang. Navigasi dari perekaman suara mengikuti pembatalan mikrofon yang sudah berlaku pada aplikasi. Simpan pekerjaan yang diperlukan sebelum memuat ulang aplikasi/perangkat.

Modul panduan masuk cache shell agar tersedia ketika aplikasi sudah disiapkan untuk offline. Header dan footer panel tetap terjangkau; isi penjelasan panjang dapat digulir. Fokus judul mengikuti perpindahan langkah melalui tombol, Escape menjeda dan mengembalikan fokus ke akses Panduan. Panel bukan modal dan tidak menjebak navigasi keyboard.

## Implementasi dan pemeriksaan

- `public/guide-content.js`: sumber tunggal topik/langkah/nama kontrol, juga dipakai katalog pencarian.
- `public/guide-state.js`: validasi dan penyimpanan progress yang dipisahkan menurut scope.
- `public/guide.js`: panel, sorotan/panah SVG, navigasi, skip/pause/resume, posisi aktual DOM dan pencarian.
- `public/guide-layout.js`: geometri penempatan panel dan titik panah, tanpa akses data usaha atau DOM.
- `public/app.js` dan `public/live-views.js`: integrasi halaman publik/akun dan siklus render yang sudah ada.
- `public/sw.js`: cache shell v29 beserta empat modul panduan.

`npm run test:guide` menjalankan delapan tes kontrak struktur/cakupan aksi, progress, scope, penyimpanan, cache dan geometri panah. `npx playwright test tests/real-guide.spec.js` menguji delapan skenario browser, termasuk seluruh 67 langkah dengan nol POST bisnis, target nyata, resize/scroll dan pembersihan sorotan setelah skip. Fixture hanya ada pada server/database pengujian terpisah.

Panduan ini belum diuji dalam studi kegunaan dengan pemilik usaha awam. Kelulusan tes perangkat lunak tidak mengukur pemahaman pengguna atau membuktikan kualitas model AI. Pengujian pemahaman dan perbaikan bahasa bersama pengguna nyata masih menjadi pekerjaan berikutnya.

Pemeriksaan rilis v0.29: **176 tes Node dan 28 browser lulus (204 total)**. Seluruh 67 langkah berjalan tanpa POST bisnis pada server pengujian, termasuk panah pada 11 langkah tur utama dan pelacakan target saat scroll/resize. Seluruh 19 tabel aktif sama dengan backup sebelum pekerjaan. Review UI memberi disposisi `ship` untuk koreksi tur berpanah; pemahaman pengguna awam belum diuji. [Bukti rilis](evaluation/guide-arrow-release.json), [data tetap](evaluation/guide-arrow-data-preservation.json), [health](evaluation/guide-arrow-health.json), [review UI](evaluation/GUIDE_ARROW_UI_REVIEW.md), [pemeriksaan desain](evaluation/GUIDE_ARROW_DESIGN_CHECK.md).

Pemeriksaan historis v0.28: **174 tes Node dan 27 browser lulus (201 total)**. Seluruh 61 langkah berjalan pada server pengujian tanpa POST bisnis; seluruh 19 tabel aktif sama dengan backup sebelum pekerjaan. Review desain memberi disposisi `ship` untuk lingkup panduan saat itu. [Bukti rilis](evaluation/guide-release.json), [data tetap](evaluation/guide-data-preservation.json), [health](evaluation/guide-health.json), [review UI](evaluation/GUIDE_UI_REVIEW.md), [pemeriksaan desain](evaluation/GUIDE_DESIGN_CHECK.md).
