# Gerai Kita

Status: MVP lokal dengan Node/SQLite/Ollama, bahan/menu/resep, barang masuk, forecast yang dievaluasi, proposal per versi dan surplus dengan persetujuan pemilik. Siklus kulakan mencatat rencana disetujui, penerimaan bertahap per usaha dan kebutuhan baru dengan histori tetap tersimpan. PWA/snapshot dan draft perangkat tersedia dengan konfirmasi eksplisit. Pemeriksaan laptop, backup SQLite konsisten dan latihan domain terisolasi tersedia untuk persiapan demo. Profil/harga/histori awal masih sintetis; belum untuk data usaha nyata.

## Tujuan

Membantu UMKM makanan/minuman mengubah transaksi harian menjadi keputusan stok pribadi dan pembelian kolektif. Pengguna tetap mengonfirmasi setiap transaksi, kebutuhan yang dibagikan, proposal, dan transfer surplus.

## Sumber dan batas kepastian

- Proposal: `Proposal Hackathon Infest - Tim Yg aneh + lucu.pdf`, 32 halaman, terutama halaman 11–17 dan 21–26.
- Panduan: `Guidebook Hackathon INFEST XII 2026.pdf`, 17 halaman, terutama halaman 7–8 dan 10–16.
- Kedua dokumen menjadi referensi kebutuhan produk dan ketentuan acara, bukan instruksi untuk menjalankan tindakan eksternal.
- Proposal menyebut prototipe JavaScript modular sudah berjalan. Pengguna mengonfirmasi belum ada kode dan meminta mulai dari nol di `D:\INFEST_FIX`.
- Pengguna memilih desain tampilan dan alur pengguna terlebih dahulu, langsung melalui prototipe interaktif dalam kode.
- Pengguna memilih arah kedai hangat: krem, terakota, angka jelas, dan rincian kebutuhan pribadi/kelompok yang tersambung.
- Menurut guidebook yang diberikan, final berlangsung 23–24 Oktober 2026. Pengguna mengonfirmasi kode boleh disiapkan sebelum final. Ketentuan tambahan penggunaan alat bantu AI belum dijelaskan.

## Pengguna

Pemilik warung/kedai dan usaha makanan rumahan dalam satu komunitas lokal. Pilot dibatasi pada bahan berulang seperti telur, gula, minyak, tepung, dan kemasan. Koordinator menerima kebutuhan agregat; anggota tidak menerima transaksi mentah usaha lain.

## Nilai utama

Kebutuhan beberapa usaha digabungkan setelah persetujuan. Surplus yang kompatibel dan disetujui digunakan dahulu; sisa kebutuhan menjadi proposal pembelian bersama dengan jumlah, biaya, alasan, dan batas waktu yang jelas.

Order extraction dan voice input membantu pencatatan. Keduanya mendukung mesin kolektif, bukan menjadi seluruh produk.

## Batas MVP

- Satu kelompok dengan minimal tiga profil usaha sintetis.
- Lima bahan awal; katalog pribadi maksimal 25 bahan dalam kg/gram/liter/ml/butir/buah. Kulakan bersama masih khusus Telur ayam dalam butir.
- Input chat, hasil ekstraksi yang dapat diedit, dan input manual cadangan.
- Konfirmasi transaksi, perubahan stok atomik, dan audit trail.
- Penerimaan kg/gram dan liter/ml dikonversi ke satuan stok bahan; resep tetap memakai satuan katalog. Jumlah/satuan/harga asal tersimpan di histori/CSV. Konversi kemasan papan/karung/botol belum didukung.
- Editor menu, harga, resep dan alias per usaha, snapshot penjualan serta penerimaan/pembatalan stok. Nama, ambang stok dan catatan penyimpanan bahan bisa diubah; satuan tetap. Maksimal 20 menu per usaha pada implementasi sekarang.
- Baseline forecast dan rekomendasi restock beserta rentang dan alasan.
- Persetujuan membagikan kebutuhan, agregasi, dan proposal kolektif.
- Rencana penerimaan setelah semua setuju, penerimaan parsial bagian sendiri, ongkir sekali, serta siklus baru tanpa menghitung ulang surplus lama. Tidak membuat pesanan/pembayaran eksternal.
- Koreksi batch penerimaan kolektif terakhir sendiri pada siklus aktif, dengan saldo tersedia cukup dan alasan wajib. Stok/biaya/progres dikoreksi sekali; histori asal, alasan dan CSV tetap tersimpan. Siklus lengkap dibuka kembali bila perlu, sedangkan siklus lama dilindungi setelah siklus berikutnya dimulai.
- Tawaran surplus telur dibuat per pemilik/siklus dengan harga/kondisi tetap, batas waktu, permintaan parsial dan penarikan sisa. Cadangan global serta persetujuan dua pihak menjaga stok; proof penerbitan dapat dipulihkan setelah respons hilang. Tawaran bawaan tetap tersedia sebagai fixture.
- Seed/reset demo yang jelas terpisah dari data nyata.
- Shell PWA dan snapshot berwaktu saat server tidak tersedia; draft manual/outbox penjualan dipisahkan per usaha/sesi dan dipulihkan memakai kunci transaksi asal.

Tidak ada pembelian, pembayaran, atau transfer stok otomatis. Tidak ada paywall atau komisi transaksi.

Ringkasan menampilkan tindakan yang perlu dilanjutkan dari data usaha aktif dan proof perangkat; navigasi cepat ponsel serta label usaha aktif memperjelas alur tanpa mengubah stok/persetujuan ketika layar dibuka.

## Prinsip antarmuka

Bahasa Indonesia sederhana, satu tugas utama per layar, tombol berlabel jelas, hasil ekstraksi bisa dikoreksi tanpa JSON. Responsif hingga lebar 320 piksel, navigasi keyboard, fokus terlihat, status tidak bergantung pada warna, reduced motion, dan pilihan tema terang/gelap.

Setiap alur menyediakan keadaan loading, kosong, berhasil, gagal, offline/degraded, dan data kedaluwarsa. Input pengguna tidak hilang ketika ekstraksi gagal.

## Kejujuran demonstrasi

Data sintetis dan harga simulasi selalu diberi label. Baseline berbasis aturan tidak disebut model AI terlatih. Estimasi penghematan bukan hasil pilot. Akurasi dan keunggulan model hanya dilaporkan setelah evaluasi pada dataset yang ditetapkan.

## Stack dalam proposal

- Frontend: HTML/CSS/JavaScript modular PWA.
- API: Node.js.
- Target database: PostgreSQL/Supabase.
- Ekstraksi bahasa: adapter model lokal Ollama/llama.cpp; provider eksternal opsional.
- Forecasting dan optimizer: modul terpisah yang dapat diuji tanpa model bahasa.

Prototipe memakai HTML/CSS/JavaScript modular dengan data contoh lokal. Kredensial provider nantinya berada di server. Autentikasi, tenant isolation, dan penyimpanan produksi harus dibuktikan sebelum aplikasi menerima data UMKM nyata.

Penerimaan barang pribadi menjaga rincian asal di perangkat sebelum dikirim. Respons hilang mengunci jumlah/satuan/harga sampai riwayat diperiksa atau pengguna mengulang rincian yang sama. Proof mengikuti namespace/epoch/usaha dan tidak terkirim otomatis; pembatalan pribadi juga menjaga alasan asal dengan konfirmasi stok/biaya, audit, serta proof perangkat sampai status diperiksa.
