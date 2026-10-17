# Demo F&B terbaru — pemilik, kasir dan dapur

Demo v0.41 tersedia di **http://127.0.0.1:4180**. Jalankan `npm run demo:setup`, lalu `npm run start:demo`. Untuk staf gunakan **http://127.0.0.1:4180/api/staff/screen#dapur**. Pada halaman awal pilih **Masuk ke akun**.

| Peran | Email | Kata sandi khusus demo |
| --- | --- | --- |
| Pemilik | `demo@geraikita.test` | `GeraiKitaDemo2026!` |
| Kasir | `kasir.demo@geraikita.test` | `KasirDemo2026!` |
| Dapur | `dapur.demo@geraikita.test` | `DapurDemo2026!` |

Ketiganya berada pada usaha **[DEMO] Kedai Bu Sari**. Gunakan profil browser berbeda untuk tiap peran, misalnya Chrome biasa, satu jendela Samaran dan browser lain. Tab dalam satu profil berbagi akun login.

Demo ini melengkapi histori/kelompok/surplus sebelumnya dengan 9 bahan, 7 menu berwaktu/stasiun, kapasitas kompor, empat pesanan aktif (menunggu, pasif, siap, satu item terbuang), satu contoh penyerahan selesai dan status menu Tersedia/Hampir habis/Habis. Kasir melihat status saja; pemilik melihat angka dan identitas tindakan di Riwayat. Data simulasi ini memang dibuat untuk presentasi, tidak dimasukkan ke database usaha asli atau dipakai melatih model.

Folder **data/demo/fnb-YYYY-MM-DD/** dipilih menurut tanggal Jakarta. Database ada di `history/gerai-kita-demo.sqlite`, manifest tiga peran di `fnb-account.json`. Menjalankan ulang pada tanggal yang sama mempertahankan pesanan/perubahan, tanpa reset atau perubahan kata sandi. Jika akun diubah sehingga kredensial demo tidak berlaku, setup melaporkan kegagalan; tidak menimpa akun diam-diam. Tanggal berbeda memakai folder baru, folder sebelumnya tetap ada.

Demo lama satu akun tetap ada di folder presentation-YYYY-MM-DD, dengan perintah `npm run demo:setup:legacy` dan `npm run start:demo:legacy`; keduanya memakai port 4180 juga, jadi cukup jalankan salah satunya. Bagian berikut adalah dokumentasi demo satu akun sebelumnya; perintah standar di atas kini memilih demo F&B tiga peran.

# Akun usaha untuk demo presentasi

Atas permintaan pengguna, v0.33 menyediakan **satu akun login berisi data simulasi lengkap** pada database demo terpisah. Akun usaha asli tetap memakai database sebelumnya; registrasi biasa tetap dimulai kosong. Data contoh ini tidak dipasang sebagai fallback atau bawaan pada aplikasi utama.

| Akses | Nilai |
| --- | --- |
| Alamat demo | **http://127.0.0.1:4180** |
| Nama usaha | **[DEMO] Kedai Bu Sari** |
| Email | **demo@geraikita.test** |
| Kata sandi demo | **GeraiKitaDemo2026!** |
| Menyiapkan data | `npm run demo:setup` |
| Menyalakan demo | `npm run start:demo` |

Gunakan alamat **127.0.0.1:4180** tersebut. Aplikasi usaha asli memakai localhost:4174; hostname yang berbeda juga memisahkan cookie login. Pada halaman awal pilih **Sudah punya akun / Masuk**, lalu masukkan kredensial demo. Panduan berpanah tetap bisa dimulai atau dilewati.

Database berada di `data/demo/presentation-YYYY-MM-DD/gerai-kita-demo.sqlite`, mengikuti tanggal aplikasi di Asia/Jakarta. `account.json` pada folder yang sama menyimpan akun, penanda simulasi dan ringkasan awal. Folder `data/` diabaikan Git. Menyiapkan/menyalakan demo lagi pada tanggal yang sama **mempertahankan data dan perubahanmu**. Pembuatan langsung ke folder yang sudah ada ditolak; tidak ada reset otomatis. Pada hari berbeda dipilih folder demo baru agar masa berlaku penawaran dan histori sesuai tanggal presentasi, sementara folder lama dipertahankan.

## Isi akun awal

- **8 bahan:** beras, ayam, telur, minyak goreng, tepung terigu, gula pasir, kopi bubuk, susu UHT. Ada satuan, batas stok dan catatan penyimpanan.
- **6 menu dengan harga, alias dan resep:** nasi ayam, nasi telur, ayam krispi, kopi susu, telur dadar, kopi hitam.
- **84 hari histori lengkap sebelum hari berjalan**, dengan variasi penjualan, satu hari tutup yang secara eksplisit dicatat nol dan contoh lonjakan. Hari berjalan berisi enam transaksi aktif.
- **173 catatan penjualan awal:** 172 aktif dan satu contoh pembatalan. Pemakaian bahan dihitung dari resep; pembatalan mengembalikan stok melalui fungsi aplikasi.
- **106 penerimaan awal**, termasuk belanja mingguan, bagian kulakan bersama dan satu contoh penerimaan yang dibatalkan.
- **Dua tinjauan pemilik:** satu sudah diperiksa dan satu perlu tindak lanjut, berikut catatan. Tanda statistik tetap terpisah dari status manusia.
- **Satu siklus kulakan selesai** dan siklus berikutnya dengan kebutuhan tiga usaha, penawaran pemasok, biaya/ongkir dan persetujuan awal dua anggota simulasi.
- **Dua tawaran surplus aktif**, satu transfer selesai dan satu permintaan menunggu keputusan pemilik.

Hanya Kedai Bu Sari mempunyai akun login. **[SIMULASI] Warung Pak Budi** dan **[SIMULASI] Dapur Mbak Rina** adalah dua bisnis pendukung tanpa akun/kata sandi. Data persetujuan mereka adalah skenario presentasi, bukan izin usaha nyata. Tidak ada bypass batas tiga usaha, stok, anggaran, versi persetujuan atau konfirmasi manusia pada runtime.

## Urutan penjelasan yang disarankan

1. **Ringkasan:** tunjukkan transaksi hari ini, stok yang perlu perhatian dan tindakan berikutnya. Jelaskan penanda `[DEMO]`.
2. **Produk & stok:** buka bahan dan menu. Tunjukkan hubungan harga/resep dengan jumlah bahan yang dikonsumsi. Ayam dan telur sengaja mempunyai saldo di bawah ambang perhatian.
3. **Catat pesanan:** masukkan `2 nasi ayam dan 1 kopi susu`, pilih **Susun rincian pesanan**, periksa menu/jumlah/harga/resep, lalu konfirmasikan bila ingin menambah transaksi demo. Input manual dan suara tetap memakai fitur biasa.
4. **Saran kulakan:** jelaskan stok, estimasi dua hari dan dasar histori. Buka rincian pemakaian untuk membedakan tanda statistik, gap/nol dan tinjauan pemilik. Tunjukkan catatan yang sudah tersimpan.
5. **Surplus:** tunjukkan tawaran milik sendiri/anggota, contoh transfer selesai dan permintaan yang menunggu. Tidak ada perpindahan stok hanya dari membuka tawaran.
6. **Beli bersama:** tunjukkan kebutuhan pribadi → surplus diterima → sisa pembelian pemasok, ongkir serta status persetujuan. Untuk melanjutkan rencana dari snapshot awal, batalkan permintaan surplus yang masih tertunda dahulu, setujui bagianmu, lalu simpan rencana dan catat penerimaan milikmu. Menyetujui transfer atau mengubah kebutuhan/harga akan mengubah versi dan meminta persetujuan anggota lagi; dua anggota simulasi tidak berinteraksi otomatis.
7. **Riwayat:** tunjukkan transaksi aktif/dibatalkan, penerimaan, pembatalan dan audit. Buka histori siklus kulakan pada Beli bersama untuk contoh penerimaan yang telah selesai.
8. **Pengaturan dan Panduan:** jelaskan identitas usaha, kelompok, undangan dan cara mengulang tutorial.

Ini snapshot untuk penjelasan dengan satu akun. Seluruh interaksi multi-pihak tetap memerlukan pihak yang berwenang; generator tidak menambahkan bot persetujuan atau mengirim pesanan/pembayaran ke pemasok. Untuk latihan dengan peserta sungguhan, mereka perlu mendaftar sendiri dengan undangan demo.

## Data simulasi dan AI

Harga, pemasok, anggota, transaksi dan kejadian adalah **contoh buatan untuk demo**, bukan catatan UMKM atau informasi pasar. Generator memanggil fungsi katalog, resep, penerimaan, penjualan, pembatalan, surplus, persetujuan dan review aplikasi dengan clock simulasi di proses pembuat data saja. Saldo diverifikasi terhadap ledger; histori harian diverifikasi terhadap pemakaian resep transaksi aktif. Clock dan data aplikasi utama tidak diubah.

Saran kulakan pada akun ini memakai baseline dari histori simulasi. **Tidak melatih atau mengaktifkan model pribadi dari data demo**, tidak menambahkan data ke dataset publik/privat riset, dan tidak menghasilkan klaim akurasi lapangan. Qwen/Whisper tetap model lokal yang sama jika tersedia. Catatan review pada demo bukan label penelitian independen.

## Verifikasi

`npm run test:demo` memeriksa satu akun login, bisnis simulasi tanpa login, konsistensi saldo/pemakaian, skenario kelompok, persistensi tanpa overwrite, login/extraksi/transaksi HTTP dan registrasi normal yang tetap kosong. Fixture berada pada folder sementara. Pemeriksaan browser membuka seluruh delapan halaman kerja pada server demo tanpa mutasi data bisnis; login hanya menambah sesi demo.

[Hasil pemeriksaan browser](evaluation/presentation-demo-browser.json), [preservasi database usaha asli](evaluation/presentation-demo-live-preservation.json). Screenshot untuk presentasi tersimpan pada subfolder `screenshots/` di folder demo harian.
