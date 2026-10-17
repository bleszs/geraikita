# Rencana MVP Gerai Kita

Dokumen ini menerjemahkan proposal menjadi pekerjaan yang dapat diperiksa. Ini bukan laporan fitur yang sudah selesai.

Pembaruan 15 Oktober 2026: SQLite, ekstraksi Ollama + validator/fallback, transaksi/reversal, forecast tiga baseline, izin ≥3 usaha, proposal/anggaran/versi, reservasi/transfer, editor bahan/menu/resep, penerimaan stok serta PWA/draft offline telah berjalan. Siklus kulakan kini mencakup snapshot rencana disetujui, penerimaan bertahap per usaha, ongkir sekali, pemulihan respons hilang, histori dan kebutuhan baru tanpa menghitung surplus lama. Koreksi batch penerimaan terakhir sendiri pada siklus aktif sudah mendukung alasan audit, pengecekan stok, koreksi ongkir/progres dan pemulihan respons hilang. Penerimaan barang mendukung kg/gram dan liter/ml dengan preview serta snapshot jumlah/harga asal; satuan stok/resep tetap. Penerimaan pribadi menyimpan proof sebelum POST dan memulihkan respons hilang dengan rincian asal; scope profil/reset/sesi dan snapshot gagal ditulis sudah diuji. Pembatalan pribadi kini memakai alasan/konfirmasi, menjaga riwayat dan memulihkan respons hilang dengan receipt/alasan asal. README dan ARCHITECTURE mencatat API aktual. Perintah doctor/backup/rehearse dan FINAL_DEMO melengkapi persiapan laptop serta latihan narasi; suite saat ini 88 pengujian lulus. Ringkasan tindakan usaha aktif dan navigasi bawah ponsel mempermudah alur yang sudah ada. Tawaran surplus sendiri, permintaan parsial, penarikan sisa dan proof penerbitan telah berjalan; hanya telur dalam butir dan maksimal 10 tawaran per usaha per siklus. Berikutnya: login/membership/peran koordinator nyata, konversi kemasan khusus, lot, dataset lapangan berizin, PostgreSQL/Supabase dan deployment. Background sync dan voice menyusul setelah alur inti diuji calon pengguna.

## Alur yang harus berhasil

Chat pesanan → review pengguna → transaksi → stok → restock → kebutuhan yang disetujui dari tiga UMKM → surplus → proposal kolektif → persetujuan.

## Urutan implementasi

| Tahap | Pekerjaan | Kriteria selesai |
| --- | --- | --- |
| 1. Fondasi | Katalog, satuan, resep bila menjual menu jadi, stok, transaksi, seed | Transaksi mengurangi bahan yang benar secara atomik; stok tidak bisa negatif; audit tercatat |
| 2. Input | Ekstraksi chat, validasi katalog, review editable, fallback manual | Tidak ada transaksi/stok berubah sebelum konfirmasi; item tidak dikenal dan jumlah ambigu ditahan |
| 3. Restock | Histori penggunaan bahan, baseline, horizon, safety stock | Rekomendasi menampilkan rentang, alasan, periode data, confidence, dan data terakhir |
| 4. Kebutuhan | Persetujuan berbagi, satuan dasar, agregasi | Minimal tiga usaha menyetujui kebutuhan kompatibel; API tidak membocorkan histori anggota |
| 5. Proposal | Harga pemasok, MOQ, pembagian biaya, versioning | Perubahan jumlah menghitung ulang biaya dan membatalkan persetujuan versi lama |
| 6. Surplus | Kondisi, masa simpan, reservasi, persetujuan dua pihak | Tidak dihitung sebagai stok penerima sebelum transfer selesai; transaksi transfer atomik dan auditabel |
| 7. Ketahanan demo | Reset, error, offline, aksesibilitas, pengujian | Alur normal, negatif, dan edge case lulus; ponsel dan keyboard dapat menjalankan tugas utama |

Voice input menyusul setelah alur inti stabil. Cuaca, kalender eksternal, pembayaran, marketplace pemasok, dan optimasi rute tidak menghambat penyelesaian MVP.

## Keputusan domain yang perlu dijaga

### Menu dan bahan adalah entitas berbeda

Pesanan "ayam geprek 3" menjual tiga porsi menu. Telur, beras, minyak, dan bahan lain berkurang melalui resep yang dikonfigurasi, bukan tebakan model. Jika belum ada resep, pengguna harus memilih bahan yang digunakan atau pencatatan berhenti pada transaksi penjualan tanpa mengarang pengurangan bahan.

### Harga tidak boleh dikarang

Harga diambil dari katalog atau dinyatakan pengguna. Harga yang belum tersedia harus diisi saat review. Nilai omzet berasal dari transaksi terkonfirmasi, bukan hasil parsing mentah.

### Normalisasi harus spesifik produk

"1 papan telur" memerlukan konversi yang disepakati untuk produk tersebut. "Papan" tidak memiliki faktor universal untuk semua barang. Kg/liter/butir hanya digabungkan jika dimensinya kompatibel.

### Surplus bukan stok bebas

Jumlah yang ditawarkan harus tersedia, belum terreservasi, dan masih dalam batas waktu yang dinyatakan pemilik. Usulan kecocokan tidak menjamin keamanan pangan. Tidak boleh ada penghitungan ganda antara stok sendiri, surplus yang belum disetujui, dan barang dalam perjalanan.

## Data demo yang disarankan

Tiga usaha pembeli: Warung Bu Sari, Kedai Pak Budi, dan Dapur Bu Rina. Usaha keempat opsional sebagai pemasok surplus agar demo tetap memperlihatkan tiga pembeli setelah surplus digunakan.

- 5–10 item katalog dan beberapa menu dengan resep eksplisit.
- Histori harian sintetis yang ditandai, dengan periode tetap agar hasil dapat direproduksi.
- Satu penawaran pemasok simulasi: harga individual, harga kelompok, MOQ, ongkir, serta kedaluwarsa penawaran.
- Satu surplus telur simulasi dengan jumlah, kondisi, batas waktu, dan harga transfer.
- Satu input ambigu dan satu input jelas untuk menunjukkan kontrol pengguna.

Angka demo ditetapkan dalam seed dan diuji; bukan disajikan sebagai dampak lapangan.

## Acceptance test minimum

| Skenario | Hasil yang diharapkan |
| --- | --- |
| Pesanan jelas, dikoreksi lalu dikonfirmasi | Satu transaksi tersimpan; stok mengikuti item/resep terkonfirmasi |
| Input kosong atau item tidak dikenal | Pesan yang dapat ditindaklanjuti; tidak ada perubahan stok |
| Provider model timeout | Draft tetap tersedia; formulir manual dapat dipakai |
| Klik konfirmasi dua kali / retry jaringan | Hanya satu transaksi melalui idempotency key |
| Stok tidak cukup | Seluruh transaksi ditolak; tidak ada sebagian pengurangan stok |
| Pembatalan pesanan | Pembalikan stok hanya sekali dan audit mengacu transaksi asal |
| Satuan tidak kompatibel | Agregasi ditolak dengan penjelasan |
| Usaha A meminta transaksi usaha B | Akses ditolak dari server; payload B tidak dikirim |
| Anggota belum mengizinkan berbagi | Kebutuhannya tidak masuk agregat |
| Anggota menolak / mengubah proposal | Total dan MOQ dihitung ulang; persetujuan versi lama gugur |
| MOQ gagal atau anggaran terlampaui | Konflik dijelaskan; tidak ada proposal berstatus siap |
| Surplus kedaluwarsa atau diklaim serentak | Transfer ditolak; tidak ada stok negatif atau alokasi ganda |
| Muat ulang aplikasi | Data terkonfirmasi tetap tersimpan sesuai mode penyimpanan |
| Reset demo | Hanya data demo terisolasi yang direset |

## Demo tiga menit

| Waktu | Adegan | Bukti |
| --- | --- | --- |
| 0:00–0:35 | Tempel chat, tampilkan hasil dan ambiguitas | Ekstraksi membantu, pemilik tetap mengontrol |
| 0:35–1:00 | Koreksi dan konfirmasi | Histori serta stok berubah setelah persetujuan |
| 1:00–1:30 | Buka rekomendasi telur | Jumlah, alasan, ketidakpastian, dan dasar data terlihat |
| 1:30–2:10 | Setujui kebutuhan dan tampilkan agregat | Minimal tiga UMKM; tidak ada histori mentah anggota lain |
| 2:10–2:40 | Tampilkan kecocokan surplus dan sisa kulakan | Status persetujuan dan jumlah tidak dihitung ganda |
| 2:40–3:00 | Review proposal dan setujui bagian sendiri | Biaya, potensi penghematan, asumsi, MOQ, dan versi terlihat |

Jika surplus belum disetujui kedua pihak, jelaskan sebagai usulan dan jangan menandainya sebagai transfer selesai.

## Persiapan final menurut guidebook yang diberikan

Final dijadwalkan 23–24 Oktober 2026, sekitar 20 jam. Presentasi 7 menit dan demo 3 menit, dilanjutkan tanya jawab. Pitch deck berbahasa Inggris, maksimal 10 slide di luar judul/lampiran, format PPTX. Output mencakup aplikasi deployed, repository GitHub dengan dokumentasi, presentasi, dan video demo.

Bobot final: teknologi 30%, desain 25%, bisnis 30%, presentasi 15%. Karena itu, rencana bisnis gratis untuk UMKM, bukti masalah dari wawancara, dan penjelasan pembeda kolektif perlu berjalan bersama implementasi teknis.

Guidebook menekankan kontribusi pengembangan AI selama kompetisi. Simpan riwayat perubahan, dataset card, hasil evaluasi, dan catatan kontribusi tim secara jujur. Batas kode pra-final, framework, dan alat bantu yang diizinkan harus mengikuti informasi technical meeting terbaru; dokumen yang tersedia belum menjawab semuanya.
