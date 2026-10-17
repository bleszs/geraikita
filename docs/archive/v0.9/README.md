# Gerai Kita — MVP lokal

Chat → review → transaksi → stok → saran kulakan → kebutuhan bersama → persetujuan anggota → surplus. Bahan, satuan, ambang stok, menu, harga, resep dan barang masuk bisa dicatat per usaha. PWA menyimpan shell/data terakhir dan draft pesanan saat server terputus. Tampilan kedai hangat dipertahankan; data bisnis disimpan di SQLite dengan ekstraksi Ollama lokal.

## Jalankan

Gunakan **Node.js 24.9+** dan Ollama. Model `qwen2.5:1.5b` sudah terpasang di laptop ini. Dari folder proyek:

```powershell
npm start
```

Buka **http://localhost:4173**. Server hanya menerima koneksi lokal. Modul runtime bawaan Node, font lokal, dan model lokal memungkinkan demo tanpa internet; Ollama dan server aplikasi tetap harus berjalan.

Preview MVP pada sesi pengerjaan ini berjalan di **http://localhost:4174**, karena port 4173 masih digunakan preview lama. Untuk memulai ulang pada port ini: `$env:PORT='4174'; npm start`.

Untuk laptop lain, pasang Ollama dan jalankan `ollama pull qwen2.5:1.5b`. AI yang tidak merespons digantikan parser dengan label yang jelas. Input manual selalu tersedia. AI tidak langsung mengubah stok.

## Persiapan demo final

Dengan server pada port 4174 aktif, jalankan perintah berikut di terminal kedua:

```powershell
npm run doctor
npm run backup
npm run rehearse
```

Pemeriksaan laptop mengecek SQLite, aset lokal dan model. Backup konsisten masuk ke `data/backups/`, termasuk WAL yang sudah commit; draft browser/model Ollama tidak termasuk. Latihan memakai database memory tersendiri tanpa mengubah data demo yang sedang dibuka. [Panduan demo final](docs/FINAL_DEMO.md) memuat urutan klik tiga menit, angka dan langkah ketika terjadi kendala. Bukti: [kesiapan laptop](docs/evaluation/readiness.json) dan [latihan alur](docs/evaluation/demo-rehearsal.json).

Ringkasan kini memberi **Langkah berikutnya** dari data usaha aktif: permintaan surplus, proposal, penerimaan, draft dan stok. Pada ponsel, navigasi bawah mempercepat pencatatan, stok dan kulakan; **Menu** membuka layar lain dan pemilih profil. [Panduan navigasi](docs/NAVIGATION.md) memuat perilaku dan bukti.

## Coba alur demo

1. **Catat pesanan**: gunakan contoh, susun rincian, koreksi, konfirmasi. Empat butir telur terpakai; harga/resep berasal dari katalog.
2. **Saran kulakan**: lihat histori, estimasi dan perbandingan MAE/WAPE. Bagikan 22 butir dengan izin berbagi.
3. **Beli bersama**: tiga usaha membutuhkan 50 butir. Biaya individual Rp90.000 dibanding kolektif Rp66.000 pada fixture ini. Setujui bagian Bu Sari.
4. Pilih **Usaha demo** di sidebar, ganti ke Pak Budi dan Bu Rina; masing-masing meninjau dan menyetujui bagiannya. Proposal siap ketika semua setuju versi sama.
5. Kembali ke Bu Sari, **Surplus** → minta 10 butir. Ganti ke Bu Dewi dan setujui transfer. Stok kedua usaha berubah, persetujuan proposal lama direset.
6. **Riwayat**: audit, ekspor CSV, atau batalkan transaksi baru untuk mengembalikan stok. Histori sintetis awal tidak dapat dibatalkan.
7. **Penerimaan bersama**: tinjau kebutuhan bila stok berubah, lalu tiga usaha menyetujui versi terbaru. Pilih **Simpan rencana penerimaan** dan catat barang diterima dari tiap profil, boleh bertahap. Sesudah lengkap, **Mulai siklus baru** mempertahankan stok/histori dan meminta kebutuhan serta persetujuan baru.

Alur operasional tambahan:

- **Surplus → Buat tawaran surplus**: tentukan jumlah telur, harga per butir, kondisi dan batas pengambilan. Penerima boleh meminta sebagian; pemilik menyetujui atau menolak, lalu dapat menarik sisa tawaran. Cadangan diperiksa bersama untuk seluruh tawaran. [Panduan surplus](docs/SURPLUS.md) menjelaskan batas serta pemulihan respons hilang.

- **Produk & stok → Tambah bahan**: pilih nama, satuan (kg/gram/liter/ml/butir/buah), ambang stok menipis dan catatan penyimpanan. Stok awal nol; catat barang masuk, lalu tambahkan bahan pada resep menu. **Ubah bahan** mengedit nama, ambang dan catatan; satuan tetap. Telur ayam menjaga identitas kulakan bersama. [Panduan bahan](docs/INGREDIENTS.md) menjelaskan batas.

- **Produk & stok → Catat barang masuk**: pilih bahan, jumlah yang diterima, harga per satuan dan pemasok. Pilih satuan diterima; kg/gram dan liter/ml dikonversi ke satuan stok bahan. Harga diisi untuk satu satuan diterima. Preview menampilkan konversi, saldo baru dan biaya; riwayat/CSV menjaga jumlah, satuan dan harga asal. [Panduan satuan](docs/RECEIPT_UNITS.md) memberi contoh serta batas. Simpan, lalu muat ulang untuk melihat persistensi; riwayat dan CSV barang masuk terpisah dari omzet.
- **Barang masuk saat respons terputus**: rincian asal disimpan sebelum dikirim, lalu dikunci sampai status diperiksa. **Hubungkan & muat ulang** mencocokkan riwayat; jika belum tercatat, **Periksa & ulangi barang masuk** memakai rincian asal. Stok tidak bertambah dua kali. Menutup formulir tetap menjaga catatan; [panduan pemulihan](docs/RECEIPT_RECOVERY.md) menjelaskan scope dan batas.
- **Produk & stok → Tambah menu / Ubah**: atur harga, alias chat dan bahan per porsi. Coba menu “Nasi goreng spesial”, alias “nasgor spesial”, harga Rp22.000, resep 1 butir telur dan 0,15 kg beras. Chat “nasgor spesial 2” menghasilkan total Rp44.000 untuk diperiksa. Model atau parser cadangan memakai katalog usaha aktif.
- Perubahan harga/resep berlaku untuk transaksi berikutnya. Riwayat menjaga nama/harga lama; pembatalan penjualan mengembalikan bahan sesuai resep saat transaksi dibuat.
- Stok yang berubah setelah kebutuhan dibagikan meminta pemilik meninjau jumlah kembali. Persetujuan proposal lama gugur; jumlah yang dibagikan tidak ditimpa otomatis.
- Rencana penerimaan menjaga jumlah/biaya yang disetujui. Ongkir sekali pada batch aktif pertama per usaha; surplus lama tidak mengurangi kebutuhan siklus baru. Rencana dapat dibatalkan jika tidak ada penerimaan aktif. [Panduan siklus](docs/COLLECTIVE_CYCLES.md) mencatat batas dan pemulihan.

**Salah mencatat barang masuk pribadi?** Buka **Riwayat → Batalkan barang masuk**, isi alasan dan konfirmasi dampak stok/biaya. Pembatalan memerlukan saldo tersedia cukup; catatan asal/alasan tetap di riwayat/CSV. Respons hilang dipulihkan memakai receipt dan alasan asal. [Panduan pembatalan](docs/STOCK_CANCELLATIONS.md).

**Salah mencatat penerimaan bersama?** Buka **Beli bersama → Catatan batch usahamu → Batalkan batch …**, isi alasan dan konfirmasi koreksi stok/biaya. Hanya batch aktif terakhir milikmu pada siklus aktif yang dapat dibatalkan, jika stok tersedia cukup. Catatan asal dan alasan tetap ada di riwayat/CSV; respons hilang dipulihkan tanpa koreksi dua kali. [Panduan koreksi](docs/COLLECTIVE_CORRECTIONS.md) memuat contoh dan batas.

Pergantian profil adalah kontrol demo, **bukan autentikasi produksi**. Sesi browser memiliki namespace empat usaha sintetis sendiri. SQLite di `data/gerai-kita.sqlite` dan cookie mempertahankan data setelah restart. Browser/origin baru membuat namespace baru; `localhost` dan `127.0.0.1` memiliki cookie berbeda. Draft dan tema disimpan di browser; review belum terkonfirmasi perlu disusun ulang setelah reload.

Reset lewat dialog mengembalikan keempat usaha dalam namespace aktif. Tidak ada pemesanan pemasok, pembayaran, atau pesan ke usaha nyata.

## PWA dan saat server terputus

Buka aplikasi sekali saat server aktif untuk menyiapkan cache. Chrome dapat menawarkan **Pasang Gerai Kita**, atau gunakan opsi pemasangan aplikasi di menu browser. Pemeriksaan manifest/ikon pada Chrome lolos; dialog pemasangan OS dan perangkat fisik belum diuji.

Saat API terputus, aplikasi menampilkan data terakhir beserta waktunya. **Catat pesanan → Isi menu secara manual → Simpan di perangkat** menjaga draft tanpa mengubah stok. Setelah tersambung, klik **Hubungkan & muat ulang → Tinjau draft → Konfirmasi & catat**. Katalog yang berubah harus ditinjau ulang. Pengiriman tidak berjalan otomatis. Respons penjualan yang hilang dipulihkan dengan kunci transaksi yang sama agar stok tidak dikurangi dua kali.

Draft dipisahkan menurut usaha dan sesi; reset/sesi baru tidak mengirim draft lama ke namespace baru. **Ekspor catatan tertunda** membantu memindahkan catatan secara manual. Maksimal 50 catatan per origin; data browser bukan backup. Rincian dan batas ada di [panduan offline](docs/OFFLINE.md).

## Uji dan evaluasi

```powershell
npm ci
npm test
npm run evaluate
```

`npm test`: 50 pengujian backend/operasional dan 38 pengujian browser di Chrome terpasang. Browser memakai port 4175, database memory, dan parser deterministik. Uji mencakup atomisitas, retry, reversal, scope, reservasi, MOQ/anggaran, expiry, versi, migrasi, katalog, stok masuk, siklus/penerimaan bersama, PWA/offline, responsif 320px, dan ekspor. Verifikasi: `npm test -- --workers=1` (88 lulus). Dua tes navigasi memeriksa panduan ringkasan, profil, chat, fokus, footer dan offline. Dua tes operasional memeriksa backup WAL konsisten dan pemeriksaan aset/URL lokal. Lima tes surplus domain/HTTP dan empat browser baru memeriksa multi-tawaran, permintaan parsial, penarikan, migrasi/persistensi, expiry/siklus, proof respons hilang dan scope. Enam tes backend dan empat browser pembatalan penerimaan kelompok menguji urutan batch, ongkir, stok terpakai, scope/CSRF, siklus, audit/CSV, migrasi serta pemulihan respons hilang. Lima tes backend dan tiga browser satuan penerimaan memeriksa konversi dua arah, presisi, biaya, resep/reversal, retry, migrasi, CSV, scope, ponsel dan pembacaan offline. Enam browser pemulihan barang masuk menguji respons hilang, penyimpanan gagal, server error, payload immutable, snapshot gagal ditulis, scope profil/reset/sesi dan receipt yang sudah dibatalkan. Tiga backend dan lima browser pembatalan pribadi memeriksa alasan/konfirmasi, audit/CSV, retry serentak, scope/CSRF, stok terpakai/reservasi, receipt konversi, offline, proof gagal disimpan, bootstrap gagal, reset serta koreksi perangkat lain. Pengujian bahan mencakup persistensi, migrasi, scope, resep, histori penerimaan, validasi satuan, input berbahaya dan larangan edit saat offline.

Evaluasi memakai model aktual dan menulis [hasil JSON](docs/evaluation/results.json). Fixture sintetis kecil merupakan uji regresi, bukan ukuran akurasi UMKM nyata. Fallback dihitung terpisah dari hasil AI. Screenshot tersedia di `.impeccable/review/`.

Untuk membuat ulang screenshot setelah perubahan tampilan: `$env:CAPTURE_REVIEW='1'; npm run test:ui`.

Konfigurasi opsional: `PORT`, `DATABASE_PATH`, `AI_PROVIDER=rules`, `OLLAMA_MODEL`, `OLLAMA_URL`. Contoh port alternatif di PowerShell: `$env:PORT='4174'; npm start`. Hindari dua server menggunakan database demo yang sama.

## Dokumentasi dan batas

- [Ringkasan dan navigasi cepat](docs/NAVIGATION.md)
- [Panduan latihan demo final](docs/FINAL_DEMO.md)
- [Arsitektur aktual/API](docs/ARCHITECTURE.md)
- [Alur pengguna](docs/USER_FLOWS.md)
- [Model/pipeline](docs/MODEL_CARD.md)
- [Dataset/evaluasi](docs/DATASET_CARD.md)
- [Pekerjaan lanjutan](docs/MVP_PLAN.md)
- [PWA/offline dan pemulihan](docs/OFFLINE.md)
- [Siklus/penerimaan kulakan bersama](docs/COLLECTIVE_CYCLES.md)
- [Koreksi penerimaan bersama](docs/COLLECTIVE_CORRECTIONS.md)
- [Satuan penerimaan barang](docs/RECEIPT_UNITS.md)
- [Pemulihan barang masuk pribadi](docs/RECEIPT_RECOVERY.md)
- [Pembatalan barang masuk pribadi](docs/STOCK_CANCELLATIONS.md)
- [Katalog bahan pribadi](docs/INGREDIENTS.md)
- [Tawaran surplus dan permintaan parsial](docs/SURPLUS.md)
- [Sistem desain](DESIGN.md)

Belum ada login produksi, PostgreSQL/Supabase, konversi kemasan khusus, inventaris per lot, suara, background sync, atau deployment publik. Lima bahan awal; maksimal 25 bahan dan 20 menu per usaha. Bahan tidak dapat dihapus/diarsipkan, satuan tetap setelah dibuat, dan kulakan bersama masih khusus Telur ayam dalam butir. Barang masuk mencatat penerimaan fisik dan biaya, tanpa membuat pesanan pemasok atau pembayaran. Data awal katalog, harga, resep, histori dan tawaran awal masih sintetis. Gunakan data contoh untuk demo ini. PDF sumber tidak disalin dari Downloads. Font Nunito Sans berlisensi SIL OFL di `public/assets/FONT-LICENSE.txt`; ikon berupa SVG geometris dan PNG pemasangan yang dirender dari logo yang sama.
