# Latihan demo final Gerai Kita

Panduan operasional versi 0.9.0, 15 Oktober 2026. Durasi tiga menit di bawah adalah target latihan, belum hasil pengukuran presentasi. Angka berasal dari fixture sintetis dan [latihan domain](evaluation/demo-rehearsal.json), bukan penghematan UMKM nyata. Untuk ketentuan acara gunakan guidebook yang diberikan dan informasi technical meeting terbaru.

## Siapkan laptop

Dari `D:\INFEST_FIX`, jika server belum berjalan:

```powershell
$env:PORT='4174'
npm start
```

Biarkan terminal server berjalan; buka terminal kedua untuk pemeriksaan. Gunakan alamat yang sama, **http://localhost:4174**, setiap latihan.

```powershell
npm run doctor
npm run backup
npm run rehearse
```

`doctor` memeriksa Node, integritas/schema file SQLite, empat belas aset aplikasi termasuk font/ikon, serta ketersediaan model. Tidak membuat sesi atau transaksi. Model yang tidak tersedia menghasilkan WARN karena parser/manual masih bisa digunakan; server/file database gagal menghasilkan exit code 1. Ini pemeriksaan dasar, bukan bukti alur browser lengkap. File SQLite yang diperiksa terpisah dari pemeriksaan URL; pastikan `DATABASE_PATH` sama dengan server bila memakai database khusus.

`backup` membuat SQLite konsisten ke `data/backups/` dan memeriksa integritas/relasinya. Boleh saat server lokal berjalan; SQLite memasukkan data WAL yang sudah commit. Jangan menyalin file `.sqlite` utama saja ketika server berjalan. Backup ini mencakup seluruh namespace demo, tanpa model Ollama atau draft offline di browser. Ekspor catatan tertunda dari aplikasi sebelum membersihkan data browser.

`rehearse` menjalankan contoh chat → penjualan → kebutuhan → surplus → persetujuan → penerimaan → siklus baru pada database memory baru. Model aktual digunakan bila tersedia, mode fallback dilaporkan. Perintah ini tidak mereset atau mengubah data browser/server yang sedang dipakai. Hasil ditulis ke `docs/evaluation/demo-rehearsal.json`.

Untuk menyimpan pemeriksaan atau memilih port/database:

```powershell
npm run doctor -- --url http://localhost:4174 --report docs/evaluation/readiness.json
npm run backup -- --database data/gerai-kita.sqlite
```

## Mulai dari keadaan yang diketahui

Buka aplikasi dan simpan/ekspor pekerjaan yang perlu dipertahankan. Untuk latihan gunakan sesi browser khusus demo, lalu **Reset data contoh** melalui dialog aplikasi. Reset berlaku bagi empat profil pada namespace browser tersebut; jangan reset sesi yang berisi pencatatan yang ingin dipertahankan. Ini langkah operator, bukan bagian dari `doctor` atau `rehearse`.

Pilih **Warung Bu Sari**. Stok telur awal 8 butir. Pak Budi dan Bu Rina sudah memiliki izin/kebutuhan sintetis masing-masing 18 dan 10 butir pada fixture. Agregat disembunyikan sampai Bu Sari bergabung. Jelaskan profil-switch sebagai alat demonstrasi; belum login anggota nyata. Bila ada banner versi baru, simpan isian dahulu lalu **Muat ulang aplikasi**. Buka contoh pesanan sekali sebelum tampil agar model/font/cache siap.

Ringkasan menyediakan Langkah berikutnya untuk membuka permintaan, proposal dan penerimaan yang perlu ditinjau. Pada ponsel, gunakan navigasi bawah; Menu membuka Surplus, Saran dan Riwayat. Nama usaha aktif terlihat di header agar pergantian profil saat demo jelas.

## Demo tiga menit

| Target waktu | Tindakan di aplikasi | Kalimat inti / angka |
| --- | --- | --- |
| 0:00–0:40 | **Catat pesanan**, gunakan contoh bawaan, **Susun rincian pesanan**, periksa jumlah/variasi lalu **Konfirmasi & catat** | “Chat menjadi rincian yang diperiksa pemilik. Harga dan resep berasal dari katalog.” Rp82.000; AI tidak mengubah stok sebelum konfirmasi. |
| 0:40–1:00 | **Produk & stok**, lalu **Saran kulakan** | “Empat butir terpakai, stok turun dari 8 menjadi 4. Saran memakai histori dan menampilkan batas datanya.” |
| 1:00–1:25 | Isi kebutuhan **22**, centang izin berbagi, **Bagikan kebutuhan & lihat proposal** | “Pemilik menentukan jumlah yang dibagikan.” 22 + 18 + 10 = 50 butir; biaya kelompok awal Rp66.000. Angka 22 adalah pilihan skenario, bukan jaminan rekomendasi selalu 22. |
| 1:25–2:00 | **Surplus**, **Minta transfer 10 butir**; ganti profil Bu Dewi dan **Setujui transfer 10 butir**; kembali Bu Sari | “Stok berubah setelah persetujuan kedua pihak.” Sari menjadi 14 butir; kebutuhan 50 dikurangi surplus 10 menghasilkan sisa kulakan 40. |
| 2:00–2:45 | **Beli bersama**, tinjau bagian Bu Sari dan **Setujui bagianku**. Ganti Pak Budi dan Bu Rina, masing-masing meninjau lalu menyetujui. Kembali Bu Sari | “Setiap anggota menyetujui versi yang sama.” Total simulasi Rp64.000 dibanding individual Rp90.000; selisih Rp26.000. |
| 2:45–3:00 | Tunjukkan **Semua anggota setuju** dan rincian jumlah/biaya | “Proposal siap. Barang pemasok baru menambah stok ketika benar-benar diterima dan dicatat.” Jangan mencatat penerimaan hanya untuk membuat proposal tampak selesai. |

Penghematan sesudah surplus: 40 × Rp1.200 + Rp10.000 surplus + Rp6.000 ongkir = Rp64.000. Pembanding memakai kebutuhan yang sama: 50 × Rp1.500 + 3 × Rp5.000 ongkir = Rp90.000. Harga, pemasok dan ongkir semuanya simulasi.

| Usaha | Bagian pemasok | Surplus | Ongkir | Total bagian termasuk surplus |
| --- | --- | --- | --- | --- |
| Bu Sari | 12 butir | 10 butir | Rp1.800 | Rp26.200 |
| Pak Budi | 18 butir | 0 | Rp2.700 | Rp24.300 |
| Bu Rina | 10 butir | 0 | Rp1.500 | Rp13.500 |

## Alur tambahan untuk tanya jawab

Sesudah semua setuju, **Simpan rencana penerimaan**. Stok belum bertambah dari pemasok. Per profil, catat hanya barang yang sudah diterima, boleh sebagian; ongkir dibukukan sekali pada penerimaan pertama. Pada skenario penuh, Sari menerima 12 butir sehingga stok 14 → 26. Budi menerima 18 dan Rina 10. Sesudah lengkap, **Mulai siklus baru** menjaga stok/histori dan meminta izin/kebutuhan baru; surplus lama tidak dipotong lagi.

Bila ditanya cara memperbaiki salah catat, terima bagian Sari dalam dua batch 5 dan 7, lalu **Catatan batch usahamu → Batalkan batch 7 butir**. Isi alasan dan konfirmasi. Sisa 7 dibuka kembali dan biaya aktif menjadi Rp7.800 (5 × Rp1.200 + Rp1.800 ongkir). Hanya batch terakhir sendiri pada siklus aktif dan stok tersedia cukup; catatan asal tetap di riwayat/CSV. Ini alur tambahan, bukan bagian target demo tiga menit.

Pemilik juga dapat membuat tawaran baru dari **Surplus → Buat tawaran surplus**, dengan jumlah/harga/kondisi/batas pengambilan. Penerima boleh meminta sebagian. Menarik sisa tawaran memerlukan pending diselesaikan dahulu; transfer selesai tetap tercatat. Untuk demo tiga menit tetap gunakan tawaran bawaan 10 butir agar angka di tabel konsisten.

Untuk menunjukkan satuan, buka **Produk & stok → Catat barang masuk → Beras → gram**, isi 250 dan harga Rp13/gram. Preview menampilkan 0,25 kg masuk serta biaya Rp3.250. Riwayat/CSV menjaga jumlah/harga asal. Ini alur tambahan; jangan mencatat contoh ini pada demo tiga menit karena stok skenario utama akan berubah.

Untuk katalog pribadi, **Produk & stok → Tambah bahan → Catat barang masuk → Tambah menu**. Bahan baru mulai nol dan belum punya histori; unit tetap sesudah dibuat. Kulakan bersama masih khusus Telur ayam dalam butir. Untuk offline, tunjukkan data terakhir dan draft manual yang disimpan di perangkat, lalu review/konfirmasi setelah server kembali; draft tidak menambah omzet atau mengurangi stok.

## Jika demo tersendat

| Keadaan | Langkah operator |
| --- | --- |
| AI belum merespons / parser cadangan | Jelaskan label mode, periksa rincian atau gunakan **Isi menu secara manual**. Jangan menyebut hasil fallback sebagai keluaran AI. |
| Katalog berubah setelah draft | Perbarui katalog, periksa harga/resep lalu konfirmasi ulang. |
| Kebutuhan perlu ditinjau karena sale/barang masuk setelah berbagi | Kembali ke Saran, periksa jumlah lalu **Perbarui kebutuhan bersama**. Semua pihak meninjau versi baru. |
| Penawaran sudah kedaluwarsa | Selesaikan/batalkan surplus pending, lalu mulai siklus baru; untuk latihan dari awal gunakan reset sesi demo melalui dialog. |
| Respons pembatalan barang masuk hilang | Hubungkan dan periksa riwayat; jika belum dibatalkan, **Periksa & ulangi pembatalan barang** memakai alasan asal. Jangan mengoreksi stok kedua kali secara manual. |
| Respons barang masuk pribadi hilang | **Hubungkan & muat ulang** mencocokkan riwayat; jika belum tercatat, **Periksa & ulangi barang masuk** memakai rincian asal. Jangan membuat catatan baru untuk pengiriman yang belum pasti. |
| Respons transaksi/penerimaan hilang | Hubungkan kembali dan periksa histori/status memakai kunci yang sama. Jangan membuat pencatatan baru untuk menggantikan pengiriman belum pasti. |
| Stok tidak cukup | Koreksi jumlah pesanan atau catat penerimaan fisik yang benar. Jangan mengarang barang masuk. |

## Batas bukti final

Pemeriksaan laptop, backup konsisten dan latihan domain sudah dijalankan. Suite regresi mencakup 50 tes backend/operasional dan 38 tes browser. Waktu bicara tiga menit, pemasangan OS, perangkat fisik, pengguna nyata dan hosting publik belum diverifikasi. Repository GitHub, deployment, deck PPTX dan video demo tetap menjadi pekerjaan final tersendiri; panduan ini tidak menyatakan seluruh keluaran acara selesai.
