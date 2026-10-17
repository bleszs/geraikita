# Pembatalan barang masuk pribadi

Status 15 Oktober 2026, versi 0.9.0. Pembatalan memperbaiki catatan penerimaan dengan mengurangi stok dan biaya aktif. Catatan asal, jumlah/satuan/harga saat diterima, waktu pembatalan serta alasannya tetap ada di riwayat/CSV. Ini tidak membuat retur atau refund kepada pemasok.

## Cara menggunakan

1. Buka **Riwayat → Barang masuk → Batalkan barang masuk** pada catatan sendiri.
2. Periksa bahan, jumlah stok pada catatan dan biaya. Pada penerimaan 250 gram beras dengan stok dalam kg, jumlah koreksinya 0,25 kg.
3. Isi **Alasan pembatalan barang masuk**, 5–240 karakter, lalu centang konfirmasi bahwa stok dan biaya akan dikurangi.
4. Pilih **Batalkan barang & koreksi stok**. Catatan tetap di riwayat dengan status dibatalkan dan alasan; CSV memakai kolom alasan pembatalan yang sudah ada.

Sebelum mengirim, **Kembali** menutup formulir tanpa mengubah stok. Isian alasan biasa belum disimpan untuk reload. Tombol pembatalan tidak langsung menulis data.

## Batas domain

| Keadaan | Perilaku |
| --- | --- |
| Stok sudah terpakai atau dicadangkan | Ditolak jika saldo tersedia kurang dari jumlah pada receipt. Seluruh perubahan dibatalkan secara atomik. |
| Stok berubah ketika form terbuka | Alasan tetap ada saat ditolak. **Muat ulang data barang masuk** memperbarui saldo dan menonaktifkan konfirmasi bila belum cukup. |
| Receipt memakai konversi satuan | Pembatalan mengurangi kuantitas dalam satuan stok, bukan angka jumlah input mentah. Rincian penerimaan asal tidak diubah. |
| Receipt sudah dibatalkan | Tidak mengurangi stok lagi. Retry dengan alasan sama mengembalikan duplicate; alasan berbeda ditolak dan tidak menimpa audit. |
| Usaha lain | API menolak receipt yang bukan milik usaha aktif. |
| Penerimaan kulakan bersama | Tetap memakai pembatalan batch dari rencana pada siklus aktif; lihat [panduan koreksi kolektif](COLLECTIVE_CORRECTIONS.md). |

Pembatalan pribadi berlaku untuk seluruh receipt yang dipilih, tanpa batas siklus kolektif. Stok belum dilacak menurut lot; pemeriksaan menggunakan saldo agregat setelah reservasi. Tidak ada pembatalan sebagian atau penulisan ulang jumlah receipt.

## Respons terputus

Sebelum POST, aplikasi menyimpan receipt, alasan, jumlah stok dan biaya asal ke IndexedDB. Gagal menyimpan proof tidak mengirim pembatalan. Jika respons hilang/5xx, alasan dikunci dan tetap ada setelah offline reload atau pergantian profil. Ringkasan memberi **Pembatalan barang masuk belum pasti → Periksa pembatalan barang**.

**Hubungkan & muat ulang** mencocokkan status receipt pada server. Jika sudah dibatalkan, proof dibersihkan tanpa POST kedua, termasuk ketika pembatalan sebenarnya dilakukan dari perangkat lain dengan alasan berbeda. Riwayat tetap menampilkan alasan yang benar-benar disimpan server. Jika belum dibatalkan, **Periksa & ulangi pembatalan barang** memakai receipt dan alasan asal setelah pemeriksaan ulang.

POST yang berhasil dengan bootstrap gagal dinyatakan diterima server dan menunggu pembaruan data. Penolakan 4xx definitif membersihkan proof dan mempertahankan alasan editable; jika pembersihan perangkat gagal, rincian tetap terkunci. Tidak ada pengiriman otomatis ketika tersambung kembali.

Penerimaan yang belum pasti perlu diperiksa dahulu sebelum pembatalan. Selama pembatalan belum pasti, aplikasi menahan penerimaan pribadi baru dan menyediakan tautan kembali ke Riwayat. Jika dua perangkat meninggalkan proof penerimaan dan pembatalan sekaligus, pemeriksaan penerimaan lebih dahulu tetap tersedia agar kedua catatan dapat diselesaikan.

## Penyimpanan dan kompatibilitas

Proof disimpan satu per namespace, epoch reset dan usaha dengan key `stock-cancel:namespace:epoch:usaha`. Helper menolak penggantian receipt/alasan selama pending. Pergantian profil, reset atau sesi baru tidak membawa proof lama ke scope baru. Data browser bukan backup; backup SQLite tidak mencakup proof. Pemilih profil tetap alat demo, belum login produksi.

Endpoint POST `/api/stock-receipts/:id/cancel` kini menerima `{reason, csrf}`. Alasan wajib melalui UI. Untuk kompatibilitas klien demo lama, API masih menerima reason yang tidak dikirim dan menyimpan null; alasan yang dikirim harus valid. Retry tanpa reason tidak menimpa alasan yang sudah tersimpan. Receipt dibatalkan sebelumnya tanpa alasan tidak diberi alasan baru secara retroaktif.

Pembaruan ini memakai kolom `cancel_reason` yang sudah tersedia; tidak ada migrasi SQLite baru. Backup sebelum pembaruan: `data/backups/gerai-kita-2026-10-15T02-48-32-941Z-2b94d5af.sqlite`.

## Bukti

Suite penuh **50 backend/operasional + 38 browser = 88 lulus** pada cache v18. Capture desktop 1440px dan ponsel 320px diperiksa dalam satu batch; tidak ada perubahan arah visual atau audit perangkat fisik.

Tiga tes backend baru menguji alasan/replay, persistensi, jumlah konversi, stok terpakai/reservasi, scope/CSRF, retry bersamaan dan kompatibilitas klien lama. Lima browser baru menguji alasan/konfirmasi, riwayat/CSV, ponsel 320px, escaping, konflik stok/refresh, storage gagal, respons hilang/offline, profil/reset, bootstrap gagal serta pembatalan dari perangkat lain.

[Uji Chrome/SQLite preview](evaluation/stock-cancellation-live.json) membatalkan receipt 250 gram beras: stok 2,75 → 2,5 kg dan biaya asal Rp3.250 tetap dalam audit. Respons diputus setelah commit, lalu aplikasi dimuat ulang offline dan dihubungkan. Hanya satu POST pembatalan dan satu movement reversal. Alasan bertahan setelah database dibuka ulang; retry dengan alasan berbeda ditolak.

Data lama di 17 tabel dibandingkan sebelum/sesudah pengujian; namespace khusus uji dibersihkan. Pemeriksaan laptop mencakup 14 aset, SQLite dan Ollama. Semua skenario sintetis lokal; perangkat fisik belum diuji.
