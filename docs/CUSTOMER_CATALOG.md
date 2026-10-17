# Katalog pesanan pelanggan — v0.38

Menutup celah SRS **REQ-F05**: menu yang bahannya habis harus langsung nonaktif di katalog pemesanan pelanggan. Sebelumnya hanya isian internal kasir/pemilik yang menutup menu; kini ada katalog web untuk pelanggan. Node.js, SQLite dan frontend tetap. Tidak ada katalog, menu atau permintaan yang dibuat otomatis.

## Cara memakai

1. **Pengaturan akun → Layar dan katalog pelanggan.** Pilih **Jenis tautan: Katalog pesanan**, isi nama (misalnya "QR meja"), masa aktif 1 jam–3 hari, centang persetujuan, lalu **Buat tautan layar**. Simpan atau salin tautan; tautan hanya tampil sekali. Bagikan kepada pelanggan, misalnya lewat kode QR di meja.
2. **Pelanggan** membuka tautan tanpa akun, memilih menu dengan tombol + / −, mengisi nama atau nomor meja dan catatan opsional, lalu **Kirim permintaan pesanan**. Halaman menunggu konfirmasi dan diperbarui otomatis.
3. **Kasir atau pemilik** melihat **Permintaan dari katalog web** di atas antrean dapur, lalu:
   - **Terima ke antrean**: membuat pesanan dapur bersumber *Web*, mencadangkan bahan, dan mengikuti alur dapur biasa. Pelanggan melihat kode pesanan (sama dengan layar status).
   - **Tolak**: mengisi alasan opsional yang ditampilkan kepada pelanggan.
4. **Cabut akses** menutup katalog seketika, termasuk halaman yang sedang terbuka.

## Aturan yang dijaga server

- **Ketersediaan seketika:** katalog hanya memuat menu yang sudah diberi waktu/stasiun dapur. Ketersediaan dihitung dari stok dikurangi seluruh cadangan aktif, lalu dikirim lewat SSE tiap perubahan. Menu yang habis tampil **Habis** dan tidak dapat dipilih; menu yang habis saat sudah dipilih dikeluarkan dari pesanan pelanggan dengan pemberitahuan.
- **Tanpa bocoran stok:** pelanggan hanya menerima nama, harga dan status tersedia/habis, tanpa jumlah porsi, resep, bahan, pemasok atau pesanan lain.
- **Permintaan belum mencadangkan bahan.** Bahan baru dicadangkan saat diterima. Jika bahan tidak cukup atau harga berubah sejak permintaan dikirim, penerimaan ditolak dan permintaan tetap menunggu sampai ditolak atau kedaluwarsa.
- **Kedaluwarsa 30 menit** untuk permintaan yang belum diputuskan.
- **Pembatasan per tautan:** maksimal 10 permintaan per menit dan 20 permintaan menunggu. Isi dibatasi: nama 40 karakter, catatan 200 karakter, 1–10 menu, 1–20 porsi per menu.
- **Tepat sekali:** kunci idempotensi dari halaman pelanggan mencegah permintaan ganda saat koneksi putus; menerima ulang permintaan yang sama tidak membuat pesanan dapur kedua.
- Token katalog hanya membuka katalog. Token layar status tidak dapat dipakai untuk katalog, dan sebaliknya. Server hanya menyimpan hash token.

## Peran

| Tindakan | Pemilik | Kasir | Dapur |
|---|---|---|---|
| Buat/cabut tautan katalog | ✓ | – | – |
| Lihat dan putuskan permintaan | ✓ | ✓ | – |

## Data

- Kolom aditif `kind` (`display`/`catalog`) pada `display_access`; tautan lama menjadi `display`.
- Tabel baru `order_requests`. Tidak ada perubahan pada baris lama.
- `store.atomic` kini mendukung pemanggilan bersarang lewat SAVEPOINT agar penerimaan permintaan dan pembuatan pesanan dapur tersimpan bersama atau batal bersama.

## Pengujian

`npm run test:catalog` (domain + HTTP: proyeksi, isolasi token, habis seketika, idempotensi, kedaluwarsa, perubahan harga, stok kurang, batas laju, izin peran). Browser: `tests/real-catalog.spec.js` menjalankan alur pelanggan ↔ pemilik lengkap, termasuk menu habis secara langsung dan pencabutan tautan. Tangkapan layar: `data/catalog-captures/`.

## Batas

- Tautan localhost hanya bekerja di perangkat server; ponsel pelanggan memerlukan jaringan/HTTPS/deployment yang belum diselesaikan.
- Belum ada pembayaran daring; harga dibayar ke petugas.
- Integrasi otomatis aplikasi ojol masih terbuka; pesanan ojol tetap dicatat manual.
