# Perbaikan F&B v0.41

Melanjutkan [pemeriksaan masukan teman](FNB_FEEDBACK_REVIEW.md). Branch kerja tetap `feat/kitchen-capacity-and-waste`; perubahan terbaru `origin/rahasiagelap2.0` sampai **fe073d0** digabung dengan akun staf, kapasitas/waste, katalog dan ETA v0.40. `main` tidak diganti.

## Ketersediaan untuk kasir

Server menghitung ketersediaan dari stok yang benar-benar tersedia setelah cadangan pesanan dan surplus. **Habis** berarti tidak cukup bahan untuk satu porsi. **Hampir habis** berarti menu masih bisa dibuat, tetapi salah satu bahannya mencapai atau melewati ambang minimum yang diisi pemilik pada Produk & stok. Ambang nol tidak menimbulkan peringatan hampir habis. Sisanya **Tersedia**. Pengaturan waktu/stasiun tetap diperlukan untuk menerima pesanan dapur.

Kasir menerima `ok/low/out` dan status konfigurasi. Jumlah porsi yang masih bisa dibuat, resep, ambang bahan, stok bahan dan harga beli tidak ikut dikirim. Pemilik tetap melihat angka lengkap. Menu hampir habis bisa dipilih; penjelasan di bawah pilihan meminta konfirmasi ke dapur. Menu habis tidak dapat dipilih. Server tetap memeriksa jumlah dan cadangan ketika pesanan disimpan, sehingga perubahan dari perangkat lain tidak dilampaui hanya karena pilihan sebelumnya tersedia. Ketersediaan bukan jaminan dapur telah mengecek kondisi fisik bahan.

Tidak ditambahkan ambang lima porsi atau data contoh pada akun usaha. Status mengikuti nilai minimum bahan yang sudah diisi pemilik.

## Pelaku tindakan

Tindakan baru melalui layanan aplikasi menangkap ID, nama, peran dan revisi peran dari akun di database. Identitas pelaku dari payload tidak dipakai. Audit dan aksi dapur menyimpan snapshot ini pada kolom aditif; nama/peran historis tetap sama setelah akses staf berubah. Pengulangan tindakan yang sama tidak menambah catatan aktor atau penjualan baru.

Riwayat pemilik menampilkan nama dan peran pelaku di **Jejak aktivitas**. Catatan lama tanpa informasi pelaku tetap **Pelaku belum tercatat**. Aksi anonim pada katalog dan aktivitas simulasi tanpa akun juga tidak ditebak sebagai pemilik. Konteks pelaku dibatasi pada usaha asal; catatan ke usaha lain tidak mengungkap identitas staf asal. Ini atribusi operasional pada layanan aplikasi, bukan jaminan setiap penulisan SQL eksternal telah diaudit.

Schema tetap **29 tabel**, dengan delapan kolom nullable tambahan pada `audit` dan `kitchen_actions`. [Preservasi usaha asli](evaluation/fnb-data-preservation.json) dan [demo lama](evaluation/fnb-legacy-demo-preservation.json) membandingkan semua kolom/baris asal dengan backup. Model, bobot dan evaluasi AI tidak berubah.

## Pembaruan branch tampilan

Pembaruan `fe073d0` menambah tombol tindakan yang lebih jelas, pilihan masuk/daftar, ikon keluar, penataan langkah berikutnya, tindakan saat katalog kosong, dan catatan layar layanan. Konflik `live-views.js` diselesaikan dengan mempertahankan modul staf, kapasitas/waste/ETA serta penjelasan pendaftaran yang dimulai kosong. Guide versi 7 tetap mempunyai 18 topik/89 langkah dan memperbarui petunjuk kasir. Cache shell dinaikkan ke v41.

## Demo

`npm run demo:setup` dan `npm run start:demo` sekarang memakai demo F&B tiga peran pada folder terpisah `data/demo/fnb-YYYY-MM-DD/`. Database ada pada subfolder `history`, dengan manifest akhir `fnb-account.json`. Manifest `history/account.json` adalah catatan seed tahap awal satu pemilik, bukan manifest akhir tiga akun. Menjalankan ulang pada tanggal yang sama mempertahankan data; folder yang sudah dipakai tidak direset. Tanggal berbeda memakai folder baru. Demo satu akun sebelumnya tetap tersedia melalui `demo:setup:legacy` / `start:demo:legacy`.

Demo berisi pemilik, kasir dan dapur pada satu usaha; 9 bahan, 7 menu, histori awal 84 hari, empat pesanan aktif, contoh pasif/siap/terbuang, satu penyerahan selesai, serta menu tersedia/hampir habis/habis. Semua diberi penanda demo/simulasi. Pembuatan menggunakan fungsi aplikasi, lalu memeriksa ledger stok, pemakaian, relasi dan role. Data ini tidak boleh dianggap histori usaha nyata, data pelatihan atau evaluasi lapangan. [Akun dan langkah presentasi](DEMO_ACCOUNT.md).

## Verifikasi dan kelanjutan

Tes baru menguji status/cadangan, proyeksi kasir, snapshot pelaku, pemalsuan payload, pengulangan tindakan, isolasi konteks, migrasi lama dan demo tanpa overwrite. Browser menguji peringatan yang tidak mengganggu fokus, menu habis, penyerahan lintas peran, identitas pada riwayat dan tombol dari branch tampilan. Regresi akhir selesai normal: **253 Node + 51 browser = 304 lulus**, `npm test` exit 0 pada Chromium terpisah. Hasil, percobaan gagal sebelumnya dan pemeriksaan runtime dicatat pada [bukti rilis](evaluation/fnb-release.json).

Belum termasuk pairing staf dengan kode, input suara/penjualan langsung kasir, deployment/HTTPS, aging yang bisa diatur, indikator hari stok tersisa, fuzzy matching dan pilot dapur nyata. Alur `ready` tetap tugas dapur; `complete` menyerahkan dan mencatat penjualan tetap tugas kasir/pemilik. Langkah berikutnya yang disarankan adalah pairing staf, kemudian deployment dan uji antarperangkat.
