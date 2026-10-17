# Katalog bahan pribadi

Status 15 Oktober 2026, versi 0.5.0: setiap usaha memiliki katalog bahan SQLite sendiri. Lima bahan awal tetap tersedia; maksimal 25 bahan termasuk bahan awal, dengan maksimal 20 menu per usaha.

## Coba alurnya

1. Buka **Produk & stok → Tambah bahan**. Isi nama, satuan, ambang stok menipis dan catatan penyimpanan opsional.
2. Simpan. Bahan mulai dengan stok nol, tanpa transaksi atau histori pemakaian sintetis.
3. Pilih **Catat barang masuk**, isi jumlah fisik dan harga per satuan bahan tersebut.
4. Tambah/ubah menu dan isi jumlah bahan per porsi. Chat atau input manual menjual menu; bahan berkurang sesuai resep setelah konfirmasi.
5. **Ubah bahan** mengubah nama, ambang dan catatan. Pembatalan penjualan mengembalikan jumlah dari resep saat penjualan, meski resep kemudian diubah.

Saran untuk bahan tanpa cukup histori menyatakan **Belum cukup histori**. Ambang stok menipis merupakan pengaturan pemilik; saldo nol tetap ditandai **Stok kosong**.

## Satuan dan identitas

| Satuan | Jumlah penerimaan |
| --- | --- |
| kg, gram, liter, ml | Positif, maksimal empat desimal |
| butir, buah | Bilangan bulat |

Ambang boleh nol dengan presisi yang sama. Pemakaian resep per porsi dapat berupa pecahan hingga empat desimal, termasuk penggunaan sebagian butir.

Satuan tetap setelah bahan dibuat. Penerimaan barang kini mendukung kg/gram dan liter/ml yang dikonversi ke satuan stok bahan; resep tetap memakai satuan katalog. Konversi kemasan khusus belum didukung. Nama **Telur ayam** dalam **butir** tetap karena identitas ini digunakan kulakan dan surplus antarusaha. Ambang/catatan telur tetap bisa diedit. Bahan pribadi lain belum masuk kulakan bersama.

Nama 2–60 karakter, catatan maksimal 120 karakter, ambang 0–10.000. Nama yang sama setelah normalisasi NFKC/lowercase ditolak dalam usaha yang sama. Bahan tidak bisa dihapus atau diarsipkan pada versi ini. Catatan penyimpanan bukan inventaris per lot atau tanggal kedaluwarsa; catatan bawaan masih ilustrasi.

## Histori, scope dan pemulihan

Penerimaan menyimpan nama dan satuan saat pencatatan. Perubahan nama tidak menulis ulang histori/CSV penerimaan. Identitas bahan tetap sama dalam resep dan stok; snapshot jumlah pemakaian penjualan menjaga reversal. Perubahan bahan menaikkan revision katalog yang juga digunakan menu dan draft pesanan. Isian yang mendapat konflik dipertahankan untuk dikoreksi dan ditinjau ulang.

Server mengambil usaha dari sesi, tanpa menerima pilihan usaha lewat payload. Pergantian profil adalah kontrol demo. Katalog usaha lain tidak dikirim sebagai katalog pribadi. Snapshot offline membawa katalog terakhir, tetapi penambahan/perubahan bahan memerlukan server.

## Migrasi dan bukti

Migrasi menambahkan tabel `ingredients` dan snapshot `product_name`/`product_unit` pada penerimaan. Katalog seed diisi untuk usaha lama tanpa mengubah saldo, transaksi atau sesi. Backup konsisten dibuat sebelum migrasi lokal di `data/backups/before-ingredients-1792009572956.sqlite`; backup rutin belum otomatis.

29 tes backend dan 14 tes browser lulus. [Uji database lokal](evaluation/ingredients-live.json) membandingkan inventory, sales, movements dan sessions sebelum/sesudah migrasi, lalu menjalankan bahan → 250 gram diterima → resep 25 gram → dua porsi → stok 200 gram → rename → reversal → stok 250 gram. Ollama mengenali menu baru; nama/satuan penerimaan lama tetap dan profil lain tidak memiliki bahan tersebut. Namespace uji tersendiri direset setelah pemeriksaan. Uji persistensi juga menutup/membuka SQLite dan memeriksa katalog, resep serta saldo.

Ini bukti regresi pada data sintetis lokal, belum pengujian usaha nyata atau produksi.

Pembaruan versi 0.8.0: [panduan satuan](RECEIPT_UNITS.md) menjelaskan harga input, presisi dan histori. Suite penuh terbaru 47 backend/operasional + 27 browser lulus.
