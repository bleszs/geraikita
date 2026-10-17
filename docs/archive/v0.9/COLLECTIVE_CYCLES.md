# Siklus kulakan bersama

Status 15 Oktober 2026: persetujuan → rencana penerimaan → penerimaan tiap usaha → siklus baru berjalan pada SQLite lokal. Pemasok/harga tetap sintetis; menyimpan rencana tidak membuat pesanan eksternal atau pembayaran.

## Coba alurnya

1. Bu Sari membagikan kebutuhan 22 butir; Pak Budi dan Bu Rina memiliki kebutuhan demo 18 dan 10.
2. Opsional: minta 10 butir surplus Bu Dewi dan setujui dari profil Bu Dewi. Surplus masuk stok penerima sekali; bagian pemasok Bu Sari menjadi 12.
3. Tinjau kebutuhan bila stok berubah, lalu ketiga usaha menyetujui versi terbaru. Selesaikan/batalkan semua surplus pending.
4. **Beli bersama → Simpan rencana penerimaan**. Peserta yang setuju dapat menyimpan rencana jumlah/biaya; stok pemasok belum bertambah.
5. Tiap usaha mencatat **Jumlah diterima sekarang → Catat penerimaan bagianku**, boleh sebagian, misalnya Bu Sari 5 lalu 7. Hanya stok usaha aktif bertambah. Bagian yang seluruhnya dipenuhi surplus tidak memerlukan penerimaan pemasok.
6. Setelah seluruh bagian pemasok diterima, peserta memilih **Mulai siklus baru**. Stok, penjualan, menu dan histori tetap ada. Semua kebutuhan/anggaran/izin/approval dikosongkan dan minimal tiga usaha membagikan kebutuhan baru.

Rencana bisa dibatalkan bila tidak ada penerimaan pemasok aktif pada seluruh anggota, termasuk setelah semua batch dibatalkan; histori pembatalan tetap tersimpan. Proposal kembali ke review dan seluruh persetujuan gugur. Penerimaan kelompok dapat dikoreksi dari batch aktif terakhir sendiri pada siklus aktif, dengan alasan wajib dan saldo tersedia cukup. Pembatalan membuka kembali sisa penerimaan dan status receiving; rencana/harga yang disetujui tetap. [Panduan koreksi](COLLECTIVE_CORRECTIONS.md) menjelaskan urutan, ongkir dan pemulihan. Barang masuk pribadi tetap memiliki pembatalan jika saldo tersedia cukup.

## Perhitungan

Surplus terikat siklus saat permintaan dibuat. Hanya transfer selesai pada siklus aktif mengurangi kebutuhan. Siklus berikutnya tidak menghapus transfer dari histori, memotong kebutuhan dengan surplus lama, atau menambahkan ulang stok.

Contoh: kebutuhan 50, surplus 10, bagian pemasok 40. Bu Sari menerima 12 butir pemasok dan ongkir Rp1.800: batch 5 mencatat Rp7.800, batch 7 Rp8.400, total Rp16.200. Ongkir dicatat sekali pada batch aktif pertama. Batch yang dibatalkan tetap memiliki angka asal untuk audit, tetapi dikeluarkan dari biaya/progres aktif; setelah semua batch sendiri dibatalkan, penerimaan baru pertama mencatat ongkir kembali. Biaya surplus Rp10.000 tetap terpisah dari biaya penerimaan pemasok. Biaya barang masuk bukan omzet atau bukti pembayaran. Riwayat/CSV menyebut asal kulakan bersama dan ongkir.

| Keadaan | Perilaku |
| --- | --- |
| Perencanaan | Perubahan kebutuhan/anggaran/izin mengubah versi dan menggugurkan approval. |
| Rencana tersimpan | Jumlah/biaya/approval memakai snapshot; stok harian tidak mengubah rencana. |
| Penerimaan sebagian | Maksimum sisa bagian sendiri; stok, biaya, ongkir dan audit tersimpan atomik. |
| Batch terakhir sendiri dibatalkan | Stok/biaya aktif dikurangi, alasan disimpan, sisa penerimaan dibuka; siklus baru menunggu lengkap kembali. |
| Semua bagian diterima | Siklus berikutnya dibuka dengan kebutuhan dan persetujuan baru. |
| Quote perencanaan expired | Siklus baru tersedia setelah surplus pending selesai/dibatalkan, tanpa reset stok. |

Quote expired tidak dapat dikunci menjadi rencana baru. Rencana yang sudah disetujui menjaga harga/jumlah ketika diterima kemudian; ini catatan simulasi, bukan jaminan harga pemasok nyata. Belum ada lot, tanggal kedatangan, status pengiriman pemasok atau pembayaran.

## Pemulihan dan scope

Retry identik mengembalikan penerimaan sebelumnya, termasuk sesudah siklus selesai; receipt yang sudah dibatalkan diberi cancelled:true dan tidak menambah stok kembali. Kunci sama dengan jumlah/rencana berbeda ditolak. Browser menyimpan jumlah/kunci di IndexedDB sebelum POST menurut namespace, epoch, usaha dan rencana. Jika respons hilang, jumlah dikunci; bootstrap mencocokkan kunci dengan histori atau retry memakai rincian asal. Penerimaan memerlukan server, tanpa pengiriman otomatis.

Rencana tersimpan hanya tampil kepada peserta; histori biaya hanya bagian usaha aktif. Pergantian profil tetap alat demo. Login/membership dan peran koordinator perlu dibuat sebelum pilot nyata.

## Migrasi dan bukti

Migrasi aditif menambah siklus workspace/transfer, tabel siklus/rencana, sumber rencana dan ongkir receipt. Data lama dipetakan ke siklus 1, tanpa mengubah saldo, sesi, menu atau penjualan. Backup konsisten sebelum migrasi: `data/backups/before-collective-cycle-1792006225312.sqlite`.

Pada tahap siklus awal, 25 backend + 12 browser lulus, termasuk retry serentak, CSRF/scope, overdelivery, ongkir sekali, bagian seluruhnya surplus, pembatalan, expiry, migrasi dan reopen database. Capture desktop/320px diperiksa dalam satu pass dan satu ronde konfirmasi; tidak ada audit lintas browser/perangkat fisik baru.

[Uji langsung SQLite preview](evaluation/collective-live.json): siklus 1 menerima 40 butir pemasok, retry tidak menggandakan stok; siklus 2 mempertahankan stok Bu Sari 30 dan satu histori, lalu menghitung kebutuhan pemasok baru 30 tanpa memotong surplus lama.

Pembaruan koreksi versi 0.7.0: suite penuh 42 backend/operasional + 24 browser lulus. [Uji koreksi pada preview SQLite](evaluation/collective-cancellation-live.json) menjaga data lama di 17 tabel dan memeriksa reopen, ongkir, retry serta perlindungan siklus lama.
