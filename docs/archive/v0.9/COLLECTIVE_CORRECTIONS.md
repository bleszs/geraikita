# Koreksi penerimaan kulakan bersama

Status 15 Oktober 2026, versi 0.7.0. Pembatalan memperbaiki pencatatan barang fisik, dengan stok, biaya aktif dan sisa penerimaan diperbarui dalam satu transaksi SQLite. Ini tidak mengirim retur atau refund kepada pemasok.

## Cara mencoba

1. Simpan rencana yang telah disetujui semua peserta. Pada fixture surplus 10 butir, bagian pemasok Bu Sari adalah 12 butir.
2. Catat penerimaan 5 lalu 7 butir dari profil Bu Sari.
3. Buka **Beli bersama → Catatan batch usahamu → Batalkan batch 7 butir**.
4. Periksa jumlah, biaya dan ongkir. Isi alasan 5–240 karakter dan centang konfirmasi bahwa stok serta biaya penerimaan akan dikurangi.
5. Pilih **Batalkan batch & koreksi stok**. Sisa penerimaan menjadi 7; biaya aktif menjadi Rp7.800, yaitu 5 × Rp1.200 + Rp1.800 ongkir. Stok berkurang 7.
6. Riwayat barang masuk dan CSV menjaga catatan asal, waktu pembatalan serta alasannya. Bila barang kemudian diterima, catat sebagai penerimaan baru sesuai jumlah fisiknya.

## Aturan

| Kondisi | Perilaku |
| --- | --- |
| Ada beberapa batch sendiri | Batalkan dari batch aktif paling akhir. Urutan pencatatan tetap deterministik meski waktunya sama. |
| Stok sudah terpakai atau dicadangkan | Ditolak bila stok tersedia tidak cukup. Alasan tetap di form; **Muat ulang data penerimaan** memperbarui status. |
| Batch pertama memuat ongkir | Batalkan batch berikutnya dahulu. Jika seluruh batch sendiri dibatalkan, penerimaan aktif pertama yang baru membukukan ongkir kembali. |
| Semua peserta sudah lengkap | Pembatalan membuka kembali status penerimaan. Siklus berikutnya menunggu bagian tersebut lengkap kembali. |
| Siklus berikutnya sudah dibuka | Penerimaan aktif dari siklus lama tidak dapat dibatalkan. |
| Seluruh penerimaan semua anggota sudah dibatalkan | Rencana boleh dibatalkan; proposal perlu persetujuan baru. Histori pembatalan tetap ada. |
| Profil lain | Hanya receipt milik usaha aktif yang dapat dibatalkan; alasan rinci dan biaya juga terlingkup usaha tersebut. |

Snapshot jumlah, harga, ongkir dan persetujuan rencana tidak ditulis ulang. Jumlah/biaya aktif hanya menghitung receipt yang belum dibatalkan. Pembatalan menggunakan saldo agregat; barang belum dilacak menurut lot. Kondisi stok dan siklus selalu diperiksa kembali oleh server saat konfirmasi.

## Jika respons terputus

Sebelum POST, browser menyimpan rencana, receipt dan alasan di IndexedDB menurut namespace, epoch reset dan usaha. Penyimpanan gagal tidak mengirim pembatalan. Saat hasil belum pasti, alasan/konfirmasi dikunci dan bertahan setelah reload, offline atau pergantian profil. Ringkasan memberi **Pembatalan penerimaan belum pasti → Periksa pembatalan**.

Setelah terhubung, bootstrap memeriksa apakah receipt sudah dibatalkan. Jika belum, **Periksa & ulangi pembatalan** menggunakan receipt serta alasan asal. Retry identik mengembalikan hasil sebelumnya; alasan berbeda ditolak dan tidak menimpa audit. Tidak ada pengiriman otomatis saat tersambung kembali. Receipt lama yang sudah dibatalkan tetap bisa dikenali saat retry setelah pergantian siklus, tanpa mengubah stok lagi.

Isian alasan biasa belum disimpan sebelum konfirmasi. Simpan pekerjaan lain sebelum memperbarui aplikasi. IndexedDB bukan backup; menghapus data browser dapat menghilangkan proof. Barang masuk pribadi memakai form alasan/konfirmasi serta proof terpisah dari Riwayat; lihat [panduan pembatalan pribadi](STOCK_CANCELLATIONS.md).

## Implementasi dan bukti

- Endpoint: POST `/api/collective-orders/:orderId/receipts/:receiptId/cancel`, JSON `{reason, csrf}` dan cookie sesi; validasi CSRF/Origin serta kepemilikan tetap berlaku.
- Migrasi aditif menambahkan `stock_receipts.cancel_reason` nullable. Catatan lama dan saldo tidak diubah. Backup sebelum migrasi: `data/backups/gerai-kita-2026-10-15T00-05-05-830Z-f4922a48.sqlite`.
- Suite penuh: **42 backend/operasional + 24 browser = 66 lulus**. Enam tes backend dan empat tes browser baru mencakup urutan, ongkir, stok kurang, audit/CSV, scope/CSRF, persaingan dengan siklus baru, migrasi/reopen, respons hilang, offline, input markup dan gagal simpan proof.
- [Uji SQLite preview](evaluation/collective-cancellation-live.json) membandingkan seluruh kolom lama pada 17 tabel dengan backup. Skenario baru terisolasi membuktikan stok 30 → 23 → 18, biaya aktif Rp16.200 → Rp7.800 → Rp0, lalu penerimaan baru 12 butir mengembalikan stok 30 dan biaya Rp16.200 dengan ongkir Rp1.800. Alasan tetap ada setelah koneksi database dibuka ulang. Namespace uji dibersihkan dan data lama dibandingkan lagi.
- Capture desktop/320px diperiksa dalam satu batch. [Catatan review](DESIGN_REVIEW.md) menyebut lingkupnya. [Pemeriksaan laptop](evaluation/readiness.json) dan [latihan demo dengan Ollama](evaluation/demo-rehearsal.json) lulus; pengujian ini memakai data sintetis lokal.

Cache shell terbaru `gerai-kita-shell-v18` menyertakan `receipt-cancellation.js`. Bila aplikasi lama masih terbuka, simpan isian lalu pilih **Muat ulang aplikasi** pada pemberitahuan versi baru.
