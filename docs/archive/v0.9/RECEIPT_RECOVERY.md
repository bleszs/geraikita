# Pemulihan barang masuk pribadi

Status 15 Oktober 2026, versi 0.9.0. Penerimaan pribadi menyimpan rincian asal di perangkat sebelum dikirim ke server. Saat respons hilang, aplikasi menjaga rincian itu hingga status diperiksa, agar barang yang sama tidak menambah stok dua kali.

## Alur pengguna

1. **Produk & stok → Catat barang masuk**. Pilih bahan/satuan, jumlah fisik, harga per satuan diterima dan pemasok. Periksa preview lalu simpan.
2. Jika respons belum pasti, form menjadi **Periksa barang masuk sebelumnya**. Jumlah, satuan, harga dan pemasok dikunci. Catatan bertahan setelah reload/offline atau pergantian profil.
3. **Hubungkan & muat ulang** memeriksa riwayat server. Jika penerimaan sudah ada, catatan perangkat dibersihkan tanpa mengirim POST kedua.
4. Jika belum ditemukan, **Periksa & ulangi barang masuk** memeriksa riwayat lagi, lalu mengirim rincian/kunci asal. Server mencatat paling banyak satu penerimaan untuk kunci itu.

**Kembali** atau tombol tutup hanya menutup form. Status tetap tampil dengan **Periksa barang masuk** untuk membukanya lagi, termasuk saat offline. Ringkasan juga menampilkan **Barang masuk pribadi belum pasti**. Tidak ada pengiriman otomatis saat tersambung; penerimaan baru tetap memerlukan server.

## Keadaan yang ditangani

| Keadaan | Perilaku |
| --- | --- |
| Penyimpanan proof gagal sebelum POST | Tidak mengirim penerimaan. Isian tetap editable untuk dicoba lagi setelah penyimpanan tersedia. |
| Respons hilang / server 5xx | Payload asal tetap dikunci; jangan membuat catatan baru untuk barang yang sama. |
| Penolakan 4xx definitif | Proof dibersihkan; isian tetap ada dan bisa diperbaiki. Jika pembersihan perangkat gagal, catatan tetap terkunci sampai pemulihan berhasil. |
| POST sukses tetapi bootstrap gagal | Pesan menyatakan server telah menerima barang masuk. Proof tetap menjaga rincian sampai stok/riwayat diperbarui. |
| Receipt ditemukan, termasuk sudah dibatalkan | Proof dibersihkan; stok tidak ditambah kembali. Replay API menyebut `cancelled:true` bila receipt sudah dibatalkan. |
| Snapshot baru gagal ditulis | Pembacaan dan pencocokan proof tetap berjalan. Snapshot offline mungkin lebih lama dan ditandai dengan waktunya. |
| Profil lain / reset / sesi baru | Proof mengikuti namespace, epoch reset dan usaha. Rincian lama tidak dikirim ke scope baru. |

Satu proof penerimaan disimpan per scope usaha. Selama pending, **Catat barang masuk** membuka rincian asal, bukan membuat penerimaan kedua. Konversi kg/gram dan liter/ml tetap mengikuti [panduan satuan](RECEIPT_UNITS.md); snapshot jumlah/satuan/harga input tidak diubah ketika retry.

## Batas penyimpanan

Proof memakai IndexedDB key `stock-receipt:namespace:epoch:usaha`. Helper penyimpanan menolak penggantian payload yang belum diselesaikan. Server menentukan scope dari cookie dan tetap memeriksa CSRF/Origin, kepemilikan serta fingerprint idempotency.

Isian biasa sebelum konfirmasi belum disimpan untuk reload. Ini pemulihan pengiriman, bukan input penerimaan offline yang akan dikirim otomatis. Pembatalan barang masuk pribadi kini memiliki konfirmasi, alasan dan proof perangkat tersendiri; lihat [panduan pembatalan](STOCK_CANCELLATIONS.md). Login/membership produksi belum dibuat; pemilih profil tetap alat demo.

Proof dari scope lama tidak dibawa ke namespace baru dan dapat tetap berada di browser. IndexedDB bukan backup; backup SQLite tidak mencakupnya. Gunakan origin yang sama untuk cookie/cache/catatan yang sama. Jangan menghapus data browser sebelum memastikan status penerimaan pada server.

## Verifikasi

Suite penuh **50 backend/operasional + 38 browser = 88 lulus**. Pembatalan pribadi serta cache v18 tercakup pada suite terbaru. Enam tes `stock-receipt-recovery.spec.js` memeriksa commit dengan respons hilang, offline reload, close/reopen, retry eksplisit, payload immutable, profile-switch/reset/sesi, gagal simpan proof/snapshot, 4xx/5xx, sukses POST dengan bootstrap gagal dan receipt dibatalkan. Pengujian domain receipt memastikan replay dibatalkan mengembalikan flag tanpa memulihkan stok.

[Uji Chrome/SQLite preview](evaluation/stock-receipt-recovery-live.json) menerima 250 gram beras pada Rp13/gram, memutus respons setelah commit, memuat ulang offline, menutup/membuka form, lalu menghubungkan ulang. Hanya satu POST dan satu receipt; stok menjadi 2,75 kg dan biaya Rp3.250. Proof dibersihkan setelah cocok dengan ledger. Sesudah receipt dibatalkan, replay mengembalikan duplicate/cancelled dengan stok tetap 2,5 kg.

Data lama di 17 tabel dibandingkan dengan backup `data/backups/gerai-kita-2026-10-15T02-00-31-639Z-923252cb.sqlite` sebelum dan sesudah uji. Namespace baru khusus uji dihapus. Tidak ada migrasi SQLite pada pembaruan ini.

Capture desktop/320px diperiksa dalam satu batch dan satu konfirmasi. Ini Chrome dengan viewport simulasi, belum perangkat fisik. [Doctor](evaluation/readiness.json) memeriksa SQLite, 13 aset dan model; [latihan demo](evaluation/demo-rehearsal.json) memakai Ollama. Semua data uji sintetis lokal.
