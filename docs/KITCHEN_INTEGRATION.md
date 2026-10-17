# Pembaruan integrasi v0.36

Akun kasir/dapur dan token layar pelanggan minimum kini tersedia. [Pembagian tugas, cara masuk dan batas](STAFF_ROLES.md), [layar pelanggan](CUSTOMER_DISPLAY.md). Kasir memasukkan/menyerahkan pesanan; dapur mengoperasikan tahap, dengan pembatasan di server. Layar layanan lama tetap untuk sesi pemilik; gunakan akun staf atau token pelanggan sesuai kebutuhan. Bagian v0.34 berikut merupakan riwayat implementasi awal.

# Integrasi Smart Kitchen Command Center — v0.34

Validasi akhir `npm test`: **215 Node + 35 browser = 250 lulus**, proses berakhir normal. Delapan tes domain/API dapur dan tiga browser dapur termasuk total tersebut. Tes suara memakai transkripsi/mikrofon tiruan untuk memeriksa alur dan pelepasan sumber daya; bukan pengukuran akurasi atau dua detik. [Bukti rilis](evaluation/kitchen-release.json), [preservasi data asli](evaluation/kitchen-data-preservation.json), [preservasi demo](evaluation/kitchen-demo-preservation.json), [review UI](evaluation/KITCHEN_UI_REVIEW.md), [konsistensi desain](evaluation/KITCHEN_DESIGN_CHECK.md).

Sumber kebutuhan: `SRS_Smart_Kitchen_Command_Center (1).pdf`, tiga halaman. Pengguna meminta menggabungkan fungsinya dan memprioritaskan SRS ini. Pada 17 Oktober 2026 pengguna memilih **prioritaskan fungsi, pertahankan teknologi sekarang**. Backend tetap Node.js, frontend tetap ES modules, penyimpanan tetap SQLite; bukan implementasi literal persyaratan Java/C++/React.

## Cara menggunakan

1. Jalankan aplikasi seperti biasa (`npm start`, atau `npm run start:demo` untuk database demo terpisah).
2. Di **Produk & stok**, tambahkan bahan dan penerimaan fisik. Buat/ubah menu beserta resep, estimasi total per porsi 1–240 menit, waktu pasif 0 hingga kurang dari total, dan nama stasiun. Tidak ada waktu/stasiun yang dibuatkan otomatis untuk menu lama.
3. Buka **Operasional dapur**. Isi label pesanan/meja dan sumber. Tambahkan satu atau beberapa item menu, porsi dan catatan. Ketersediaan menu dihitung dari resep dan stok setelah seluruh cadangan aktif.
4. **Masukkan ke antrean** menyimpan snapshot harga/resep/tahap, mencadangkan seluruh bahan, dan belum menghasilkan penjualan atau pemakaian ledger. Penjualan langsung, surplus dan pembatalan penerimaan tidak boleh mengambil cadangan tersebut.
5. **Mulai giliran ini** mengikuti prioritas stasiun. Perkiraan durasi total dikalikan porsi digunakan untuk SJF; pesanan menunggu 15 menit mendapat prioritas usia. Satu tugas aktif per stasiun; stasiun berbeda dapat berjalan bersamaan.
6. **Mulai tahap pasif** membebaskan giliran staf. Giliran berikutnya muncul otomatis; koki tetap memilih Mulai. **Lanjutkan pengerjaan** membutuhkan stasiun bebas. Waktu mulai pasif ditampilkan; timer tidak menyatakan makanan matang secara otomatis. Kapasitas oven/kompor belum dimodelkan.
7. **Tandai siap** menandai satu item. Setelah seluruh item siap, **Selesaikan & catat penjualan** mengurangi stok dan menambah pemakaian/penjualan sekali berdasarkan snapshot asli. Retry memakai kunci tindakan sama. Perubahan menu berikutnya tidak mengubah kebutuhan pesanan yang sudah masuk.
8. **Batalkan & lepas cadangan** hanya sebelum tugas pertama dimulai. Setelah ada pengerjaan, **Tutup sebagai bahan terpakai** meminta konfirmasi bahwa *seluruh* bahan pesanan memang terpakai. Ini mengurangi stok dan mencatat `kitchen_waste` tanpa pendapatan; belum ada pencatatan waste sebagian. Jangan gunakan untuk bahan yang masih utuh.
9. **Layar layanan** pada perangkat/tab lain mengikuti status melalui SSE. Perangkat harus masuk ke akun usaha yang sama. Tampilan tidak merender harga, resep, atau catatan variasi, tetapi sesi tetap sesi pemilik penuh; belum cocok dijadikan perangkat pelanggan tanpa pengawasan.

## Kendali suara dan teks

Pola yang diterima: `mulai|pasif|lanjutkan|siap|selesai` + nama menu persis + label pesanan lengkap. Angka satu hingga sepuluh dinormalisasi. Contoh hanya ilustrasi pola: `siap kopi susu meja dua`; menu dan label tersebut tidak ditambahkan ke akun.

`selesai` dalam perintah suara berarti **item siap**, bukan penutupan penjualan. Penyelesaian seluruh pesanan dan pembatalan tetap lewat tombol. Perintah negasi/pembatalan, banyak item yang cocok, dan revisi yang berubah ditolak. Parser perintah deterministik; tidak ada training/fine-tuning model baru dan tidak mengklaim pemahaman bahasa bebas.

**Aktifkan kendali suara** meminta izin mikrofon dan merekam berulang per empat detik melalui adapter Whisper lokal yang sudah tersedia. Setelah transkripsi, server memetakan perintah, lalu klien mengirim perubahan terstruktur dengan revisi awal dan kunci idempotensi. Audio/transkrip tidak disimpan ke SQLite atau penyimpanan perangkat; bukti tindakan hanya memuat ID/action/revisi. Mikrofon berhenti pada navigasi, logout, halaman tersembunyi, offline atau kegagalan perintah. Kontrol teks memakai aturan yang sama tanpa mikrofon. Tidak ada pengunduhan model otomatis.

**Target suara sampai layar ≤2 detik belum terpenuhi atau tervalidasi.** Jendela rekaman empat detik sendiri sudah melampaui target tersebut. Masalah kestabilan ASR yang tercatat sebelumnya masih terbuka; tes alur teknis bukan bukti akurasi suara dapur nyata.

## Pemetaan SRS

| Kebutuhan | Hasil integrasi | Batas |
|---|---|---|
| F01 Menu/BOM | Katalog kosong, resep dan pengaturan waktu/stasiun dari pemilik | Menu lama harus dikonfigurasi sebelum masuk dapur |
| F02 SJF | Prioritas per stasiun, durasi × porsi, aging 15 menit | Heuristik durasi dari pemilik, belum optimasi kapasitas alat |
| F03 Paralel/pasif | Tahap pasif membebaskan giliran; stasiun lain independen | Mulai pekerjaan tetap eksplisit; kapasitas alat dan staf belum dimodelkan |
| F04 Voice controller | Opt-in rekaman lokal, parser perintah, perubahan status server | Bahasa terbatas; akurasi/latensi lapangan belum diuji |
| F05 Dynamic BOM | Cadangan saat masuk, konsumsi saat selesai, menu tak cukup bahan tidak dapat dipilih | Katalog pemesanan publik dan sinkronisasi ojol belum ada |
| NF01 ≤2 detik | Belum terpenuhi | Memerlukan desain streaming/latensi dan evaluasi terpisah |
| NF02 UI/tema | Memakai sistem desain lama, tema manual dan mengikuti tema OS jika belum ada pilihan tersimpan | Tidak mengganti frontend ke React, sesuai keputusan pengguna |
| NF03 Isolasi | Semua operasi dapur scoped `workspace_id` + `business_id`, sesi/CSRF, revisi dan idempotensi | Bukan jaminan audit keamanan produksi; role staf dan token layar publik ditambahkan pada v0.35–0.36 |

## Data dan kompatibilitas

Empat tabel aditif: `kitchen_menus`, `kitchen_orders`, `kitchen_tasks`, `kitchen_actions`. Tidak menambahkan pesanan, stok, waktu masak, atau menu contoh ke database usaha. Histori penjualan lama tetap final; tidak dipindahkan menjadi pesanan dapur. **Catat pesanan** lama tetap penjualan langsung, mengurangi stok saat konfirmasi; jangan mencatat pesanan dapur yang sama lagi di sana. Pembatalan penjualan lama menolak penjualan dari dapur karena bahan sudah terpakai.

Forecasting, kulakan bersama, surplus, audit pemakaian, offline draft, dan evaluasi model dipertahankan. Antrean dapur hanya menerima perubahan online; snapshot offline dapat dibaca, tidak mengirim tindakan otomatis. SSE mengirim fingerprint scope tiap detik; klien membaca ulang data pada perubahan, tanpa menimpa isian aktif. SSE memeriksa ulang sesi dan ditutup saat aplikasi/server berhenti.

## Sisa pekerjaan prioritas SRS

- [ ] Uji tugas dapur dengan staf nyata, waktu masak aktual, suara bising dan mikrofon berizin.
- [ ] Streaming/end-of-utterance serta pengukuran latency end-to-end terhadap target dua detik, sambil menyelesaikan kestabilan ASR.
- [x] Peran kasir/dapur dan token layar pelanggan dengan akses minimum (v0.35–0.36).
- [ ] Model kapasitas alat/staf, perubahan tahapan yang lebih rinci, pembatalan/waste sebagian.
- [ ] Adaptor katalog/pemesanan kanal eksternal; label sumber saat ini masih input manual.
- [ ] Hosting/HTTPS, kapasitas transaksi/layanan suara, backup produksi, pemantauan dan uji beban.

Tidak ada model forecasting publik yang diaktifkan ke bahan pengguna atau hasil benchmark yang diubah oleh integrasi ini.
