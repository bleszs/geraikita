# Alur pengguna MVP lokal

Tujuh layar menggunakan navigasi hash desain awal. Data bisnis berasal dari backend; draft chat/tema tersimpan di browser.

## Ringkasan dan navigasi

Ringkasan → Langkah berikutnya → buka layar review yang sesuai. Daftar memakai data usaha aktif serta catatan perangkat scope sendiri; tidak menjalankan transaksi atau persetujuan. Langkah lain dibuka melalui disclosure. Snapshot mengubah judul menjadi Langkah pada data terakhir. Navigasi bawah ponsel menjangkau Ringkasan/Pesanan/Stok/Bersama dan Menu; menu lengkap memuat tiga layar lainnya serta profil demo. Escape menutup menu dan mengembalikan fokus. Nama usaha aktif tetap terlihat di header. [Panduan navigasi](NAVIGATION.md) mencatat perilaku.

## Pesanan

Chat → AI lokal → review menu/jumlah/variasi → konfirmasi → validasi stok → sale dan resep tersimpan atomik. Harga/pemakaian bahan berasal dari katalog. Label hasil menyatakan AI atau parser cadangan. Input ambigu, negasi, produk asing dan instruksi yang bukan pesanan ditahan; formulir manual tersedia. Kekurangan stok mempertahankan review. Retry dalam review yang sama memakai kunci transaksi sama.

Riwayat → batalkan transaksi baru → stok kembali sekali sesuai resep saat transaksi dibuat. Riwayat tetap memakai nama/harga saat penjualan, meski menu sudah diubah. Seed histori tidak dibatalkan. Omzet hanya transaksi aktif hari ini. Draft memakai revision katalog; bila katalog berubah, pengguna memuat ulang dan memeriksa harga/resep sebelum konfirmasi.

## Bahan, menu dan barang masuk

Produk & stok → tambah bahan → nama, satuan, ambang stok menipis dan catatan opsional → simpan. Stok mulai nol; terima bahan, lalu gunakan pada resep. Maksimal 25 bahan per usaha termasuk lima bawaan. Nama/ambang/catatan dapat diubah; satuan tetap. Telur ayam mempertahankan nama/butir untuk kulakan bersama. Bahan baru tanpa histori ditandai belum cukup histori pada saran. Barang masuk mendukung kg/gram dan liter/ml; satuan katalog/resep tetap. Konversi kemasan khusus, hapus/arsip bahan dan edit katalog offline belum tersedia.

Produk & stok → tambah/ubah menu → nama, harga, alias dan bahan per porsi → simpan. Resep memakai katalog bahan usaha aktif; minimal satu bahan, maksimal 20 menu per usaha. Nama/alias tidak boleh sama dengan menu lain. Konflik mempertahankan isian agar dapat diperbaiki. Katalog baru berlaku pada input manual, ekstraksi, harga dan pemakaian bahan berikutnya.

Produk & stok → catat barang masuk → bahan, satuan diterima, jumlah fisik yang diterima, harga per satuan diterima, pemasok opsional → preview konversi/saldo/biaya → simpan. Jumlah/harga asal tetap di riwayat/CSV. Perubahan bahan atau satuan mengosongkan jumlah/harga agar diisi ulang. [Panduan satuan](RECEIPT_UNITS.md) merinci batas presisi. Stok, movement, biaya dan audit tersimpan atomik; retry tidak menggandakan penerimaan. Butir/buah bilangan bulat, kg/gram/liter/ml dapat memakai empat desimal. Tidak membuat pembayaran atau pesanan pemasok. Sebelum POST, rincian asal disimpan di perangkat. Respons hilang/5xx mengunci form setelah reload, termasuk ketika offline. Hubungkan lalu periksa riwayat atau ulangi secara eksplisit; tidak ada pengiriman otomatis. Menutup form tidak menghapus proof, dan Ringkasan → Periksa barang masuk membuka langkah pemulihan. [Panduan pemulihan](RECEIPT_RECOVERY.md).

Riwayat → barang masuk → ekspor CSV atau batalkan catatan → periksa jumlah/biaya → alasan 5–240 karakter dan konfirmasi → batalkan. Alasan tetap di riwayat/CSV. Proof disimpan sebelum POST; respons hilang dikunci dan dipulihkan tanpa pembatalan ganda. [Panduan pembatalan](STOCK_CANCELLATIONS.md). Pembatalan hanya sekali, memerlukan saldo tersedia yang cukup setelah reservasi. Stok belum dilacak per lot; pembatalan memeriksa saldo agregat. Biaya kulakan ditampilkan terpisah dari omzet. Nama/satuan penerimaan tetap sesuai saat dicatat, termasuk pada CSV, meski nama bahan saat ini berubah.

## Saran dan kelompok

Saran → kebutuhan dua hari, saldo, rentang, histori, hasil uji → edit kebutuhan/anggaran → izinkan berbagi 24 jam → proposal. Di bawah tiga usaha berizin, total dan rincian anggota lain disembunyikan. Setelah tiga ikut, terlihat kebutuhan, surplus selesai, sisa order, biaya sendiri dan keputusan anggota. MOQ/expiry/anggaran dapat menahan persetujuan.

Setujui bagianmu → ganti usaha demo → tiap anggota meninjau dan menyetujui → siap ketika semua setuju versi sama. Perubahan kebutuhan, anggaran, izin atau transfer membuat versi baru. Izin bisa ditarik lewat Saran atau Beli bersama.

Semua setuju → selesaikan/batalkan surplus pending → simpan rencana penerimaan → tiap usaha mencatat barang fisik, boleh sebagian → stok/biaya terbarui → semua bagian diterima → mulai siklus baru → kebutuhan dan izin baru dari minimal tiga usaha. Rencana menjaga jumlah/biaya yang disetujui; ongkir sekali pada batch pertama per usaha. Surplus lama tidak dipotong lagi pada siklus baru.

Cancel rencana jika tidak ada penerimaan aktif → proposal terbuka dan seluruh approval gugur. Salah catat batch sendiri → Beli bersama → Catatan batch usahamu → Batalkan batch terakhir → alasan dan konfirmasi → stok/biaya aktif berkurang serta sisa penerimaan bertambah; catatan asal tetap di riwayat/CSV. Hanya siklus aktif dan saldo tersedia cukup. [Panduan koreksi](COLLECTIVE_CORRECTIONS.md) menjelaskan pemulihan respons hilang. Quote perencanaan expired → siklus baru setelah surplus pending selesai, tanpa reset data. [Panduan siklus](COLLECTIVE_CYCLES.md) merinci batas.

Penjualan, pembatalan atau barang masuk memperbarui saran stok. Jika kebutuhan sudah dibagikan, banner meminta meninjau ulang jumlah; proposal ditahan sampai pemilik menegaskannya, termasuk bila memilih jumlah yang sama. Semua approval versi lama gugur. Sistem tidak mengubah jumlah yang dibagikan secara otomatis.

## Surplus

Pemilik → Buat tawaran surplus → jumlah/harga/kondisi/batas pengambilan → terbitkan. Stok belum pindah atau dicadangkan sampai ada permintaan. Hanya telur dalam butir; harga/kondisi tetap, maksimum 10 tawaran per usaha per siklus. Tarik sisa tawaran setelah seluruh pending diselesaikan/ditolak. Transfer selesai dan harga asal tetap tercatat. Tawaran siklus lama tidak diminta lagi pada siklus baru.

Penerima meninjau harga/kondisi/expiry → isi jumlah sebagian/semua → meminta → stok pemilik dicadangkan → ganti profil pemilik → pemilik meninjau penerima/jumlah/biaya → setujui → dua stok, audit dan proposal diperbarui atomik. Penerima tidak dapat menyetujui sebagai pemilik. Pending bisa dibatalkan; jalur ini tidak membalik transfer selesai. Kondisi bahan perlu diperiksa saat serah terima. Cadangan seluruh tawaran memakai saldo yang sama; pending dari tawaran lain juga dihitung terhadap kebutuhan aktif. Respons penerbitan belum pasti menyimpan rincian/kunci scope sendiri, mengunci isian dan dipulihkan setelah reload melalui daftar tawaran atau retry kunci sama. Penerbitan tetap memerlukan server. [Panduan surplus](SURPLUS.md) menjelaskan expiry, withdrawal dan proof.

## Persistensi dan batas

SQLite/cookie menjaga data setelah reload/restart pada origin sama. Namespace browser baru terpisah. Dialog reset mengembalikan empat usaha namespace sendiri. Pergantian profil adalah alat demo, bukan login produksi.

Tidak ada pembelian pemasok, pembayaran, chat keluar, suara atau transfer nyata. Tanpa internet demo tetap berjalan jika server/Ollama lokal aktif. PWA dapat menampilkan shell dan snapshot setelah pernah dibuka online. Server tidak terjangkau → input manual → simpan draft perangkat → saat terhubung, muat ulang data → tinjau draft → periksa versi harga/resep → konfirmasi.

Draft offline tidak mengubah stok atau omzet. Pengiriman belum pasti menahan edit/hapus; aplikasi mencocokkan kunci di histori atau mengirim ulang payload asli. Tidak ada pengiriman otomatis. Draft profil/sesi lain disimpan terpisah dan dapat diekspor; reset/sesi baru tidak meneruskan draft lama ke namespace baru. [Panduan offline](OFFLINE.md) mencatat batas penyimpanan dan pemasangan.
