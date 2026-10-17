# Pemeriksaan pemakaian di Saran kulakan

Sejak v0.27, buka **Saran kulakan → Periksa pemakaian bahan**. Panel membaca pemakaian akun yang sedang masuk melalui `GET /api/bootstrap`; tidak memerlukan ekspor atau terminal.

Setiap bahan menampilkan periode 28 hari sebelum tanggal usaha, berapa hari yang dapat diperiksa dan berapa tanggal yang perlu ditinjau. Ringkasan membedakan **Belum ada histori**, **Data belum cukup**, ada tanda, dan tidak ada tanda pada hari yang benar-benar diperiksa. Nol kandidat dari nol hari diperiksa tidak disebut hasil normal.

1. Buka **Rincian pemeriksaan [nama bahan]**.
2. Tanggal yang perlu ditinjau ditampilkan lebih dahulu, terbaru di atas. Lihat pemakaian tercatat, median hari sejenis dan batas pemeriksaannya.
3. Buka **Delapan pembanding untuk [tanggal]** untuk melihat tanggal/jumlah yang benar-benar tersimpan.
4. Buka **Lihat seluruh 28 tanggal** untuk meninjau tanggal lain, termasuk tanggal tanpa baris dan referensi yang belum lengkap.
5. **Buka riwayat pencatatan** menuju riwayat akun. Tinjau transaksi dan bukti yang sebenarnya sebelum memakai fitur koreksi yang sudah ada. Membuka rincian tidak mengubah transaksi atau menyimpan hasil otomatis.

Sejak v0.32, pilih **Catat hasil pemeriksaan** untuk menyimpan Sudah diperiksa/Perlu tindak lanjut, catatan opsional dan konfirmasi. Hasil tampil lagi setelah reload dan ditandai **Data berubah — periksa lagi** ketika target/referensi berubah. Tanda statistik tetap terpisah. [Cara menyimpan, konflik dan offline](USAGE_DECISIONS.md).

Tabel rincian menjadi baris berlabel pada ponsel agar tanggal, jumlah dan hasil terbaca tanpa menggulir menyamping. Disclosure memakai elemen `details/summary` native yang dapat dioperasikan dengan keyboard. Nama bahan di-escape sebagai teks.

## Data dan batas hasil

Aturan v1 tetap sama dengan CLI: delapan hari sejenis sebelumnya, seluruh 56 tanggal kalender referensi mempunyai baris, median/MAD dengan batas heuristik. Tanggal kosong bukan nol; nol eksplisit tetap observasi. Baris tersimpan belum membuktikan satu hari tercatat lengkap. Hari berjalan dan masa depan dikeluarkan. [Rumus, alasan dan keterbatasan](USAGE_ANOMALIES.md).

API menyertakan `recommendations[].usageScreening` dari query ledger usaha/bahan yang sama dengan forecast. Identitas sesi menentukan scope; parameter query tidak bisa memilih usaha lain. Respons bootstrap memerlukan login dan `Cache-Control: no-store`. Tidak ada endpoint lintas usaha atau ekspor publik. Tidak ada training, aktivasi, notifikasi otomatis atau perubahan hasil forecast.

Bootstrap v0.32 juga menyertakan `usageReviews`; `POST /api/usage-reviews` menyimpan hanya hasil pemilik setelah konfirmasi, login dan origin/CSRF. Tanggal dengan referensi belum lengkap tidak dapat menerima tinjauan baru. Penyimpanan memakai fingerprint data dan revisi, serta retry idempoten. Akun aktif tanpa histori tidak diberi review contoh.

Saat offline, panel menyatakan **Hasil dari data tersimpan**, dengan periode pemeriksaan. Gunakan **Hubungkan & muat ulang** atau **Perbarui data** setelah server tersedia. Snapshot lama yang belum mempunyai `usageScreening` menampilkan **Pemeriksaan belum tersedia pada data ini**, bukan hasil lolos pemeriksaan. Tidak ada pengiriman otomatis dari panel.

Jika server sudah berjalan sejak sebelum pembaruan ini, mulai ulang agar kode backend baru dimuat:

```powershell
# Hentikan npm start yang lama dengan Ctrl+C, lalu:
npm start
```

Jika ada pemberitahuan versi aplikasi baru, simpan isian lalu pilih **Muat ulang aplikasi**. Untuk shell lama yang macet gunakan [pemulihan cache](http://localhost:4174/api/recovery); data usaha tetap di SQLite.

## Verifikasi

`npm run test:usage-review` menjalankan empat tes integrasi backend: kesamaan dengan aturan CLI, hasil forecast tetap sama, pembacaan tanpa mutasi, koreksi/gap, login dan isolasi usaha. `npx playwright test tests/real-usage-review.spec.js` menguji empat skenario browser pada server/database memory sendiri: keadaan kosong, rincian/keyboard/referensi dan escaping, gap/offline, serta snapshot lama. Data fixture bukan data evaluasi lapangan dan tidak masuk database aktif.

Belum ada label anomali usaha nyata atau skor precision/recall. Panel ini membantu meninjau catatan; tanda bukan kepastian kesalahan atau diagnosis penyebab. Hari libur/cuaca dan notifikasi masih dalam [TODO](AI_TODO.md).

Rilis v0.27 lulus 168 tes backend dan 20 browser. Review tampilan berdisposisi `ship` pada lingkup panel baru; drift metadata desain yang sudah ada dicatat terpisah tanpa mengubah sistem. [Bukti rilis](evaluation/usage-review-release.json), [preservasi 19 tabel](evaluation/usage-review-data-preservation.json), [review UI](evaluation/USAGE_REVIEW_UI_REVIEW.md), [pemeriksaan desain](evaluation/USAGE_REVIEW_DESIGN_CHECK.md).
