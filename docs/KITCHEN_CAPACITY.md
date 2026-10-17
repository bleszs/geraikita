# Kapasitas stasiun dan bahan terbuang sebagian — v0.37

Lanjutan SRS REQ-F02/F03/F05. Node.js, SQLite dan frontend tetap. Tidak ada kapasitas, pesanan atau catatan terbuang yang dibuat otomatis.

## Kapasitas stasiun

Buka **Operasional dapur → Kapasitas stasiun** (hanya pemilik). Setiap stasiun yang dipakai menu tampil dengan dua isian:

- **Staf aktif** (1–20): jumlah item yang boleh berstatus *Dikerjakan* bersamaan di stasiun itu. Setiap staf yang bebas mendapat satu giliran berikutnya dari urutan SJF + aging 15 menit, sehingga daftar giliran dapat memuat lebih dari satu tombol **Mulai giliran ini**.
- **Alat tahap pasif** (1–50, kosong = tidak dibatasi): jumlah item yang boleh berada di tahap pasif (dipanggang/direbus) sekaligus. Jika penuh, tombol **Mulai tahap pasif** disembunyikan dan server menolak tindakan itu, termasuk dari perintah suara.

Bawaan untuk stasiun yang belum diatur sama dengan perilaku v0.34–0.36: satu staf aktif, alat pasif tidak dibatasi. Penyimpanan memakai revisi; perubahan bersamaan dari perangkat lain ditolak dengan pesan untuk memperbarui data. Kapasitas berlaku per stasiun; alat yang dipakai bersama beberapa stasiun belum dimodelkan.

## Bahan terbuang sebagian

**Per item** (pesanan berisi lebih dari satu item):

- Item yang belum dikerjakan: **Batalkan item** melepas cadangan bahan item itu saja, mengurangi total pesanan, tanpa catatan terbuang.
- Item yang sudah dimulai: **Catat item terbuang** membuka formulir. Pemilik mengisi jumlah tiap bahan yang benar-benar terpakai (bawaan = seluruh cadangan item, maksimal sebesar cadangan). Jumlah itu mengurangi stok dan tercatat `kitchen_waste`; sisa cadangan kembali ke stok tersedia.
- Item terakhir tidak dapat dikeluarkan; gunakan pembatalan atau penutupan pesanan.

**Seluruh pesanan**: **Tutup sebagai bahan terpakai** kini meminta jumlah per bahan, bukan selalu seluruh resep. Bahan yang tidak diisi terpakai dikembalikan ke stok tersedia.

Saat pesanan diselesaikan, penjualan hanya memuat item yang tidak dibatalkan, dengan total dan pemakaian bahan yang sudah dikurangi.

## Peran

| Tindakan | Pemilik | Dapur | Kasir |
|---|---|---|---|
| Atur kapasitas stasiun | ✓ | – | – |
| Batalkan item belum dikerjakan | ✓ | ✓ | – |
| Catat item terbuang | ✓ jumlah per bahan | ✓ seluruh resep item | – |
| Tutup pesanan sebagai bahan terpakai | ✓ jumlah per bahan | – | – |

Akun dapur tidak menerima resep, sehingga hanya dapat mencatat seluruh resep item sebagai terbuang; server menolak permintaan staf yang mengirim jumlah per bahan. Koreksi sebagian dilakukan pemilik sebelum item dikeluarkan.

## Data dan kompatibilitas

- Tabel baru `kitchen_stations`; kolom aditif `item_index`, `usage_json`, `waste_json` pada `kitchen_tasks`. Baris lama tetap, kolom baru `NULL`.
- Pesanan lama berisi satu item memakai cadangan pesanan sebagai cadangan item. Pesanan lama multi-item tidak menyimpan bahan per item; pengeluaran item ditolak dan pemilik menutup seluruh pesanan seperti sebelumnya.
- Layar pelanggan tetap hanya menerima kode dan status pesanan.

## Pengujian

`npm run test:kitchen` kini menyertakan `tests/kitchen-capacity.test.mjs`: slot giliran per staf, batas alat pasif, revisi kapasitas, pembatalan item belum dikerjakan, terbuang sebagian per item dan per pesanan, penolakan pesanan lama multi-item, migrasi aditif, serta matriks izin HTTP. Browser: `tests/real-kitchen.spec.js` menguji alur kapasitas dan pencatatan terbuang sebagian lewat UI.

## Belum selesai

- Alat yang dipakai bersama lintas stasiun, jadwal shift staf, dan perkiraan waktu tunggu berdasarkan kapasitas.
- Pencatatan terbuang di luar pesanan dapur (misalnya bahan rusak di gudang) tetap melalui fitur stok yang ada.
- Target suara dua detik, pilot lapangan, integrasi ojol, deployment/HTTPS.
