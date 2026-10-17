# Konteks untuk melanjutkan di Claude

Gunakan workspace **D:\INFEST_FIX**, remote **https://github.com/bleszs/rahasiagelap.git**, branch **feat/kitchen-capacity-and-waste**. Periksa `git status` sebelum menyelaraskan perubahan. Jangan mengganti pekerjaan lokal yang belum disimpan atau berasumsi `main` sudah memuat branch ini.

Salin arahan berikut ke sesi coding yang mempunyai akses proyek:

> Lanjutkan Gerai Kita dari branch feat/kitchen-capacity-and-waste. Baca README.md, docs/AI_TODO.md, docs/FNB_OPERATIONS.md, docs/BRANCH_INTEGRATION.md dan docs/evaluation/fnb-release.json terlebih dahulu. Branch ini memuat akun pemilik/kasir/dapur, kapasitas stasiun, waste sebagian, katalog pelanggan dengan konfirmasi kasir, ETA bersama, serta merge tampilan/panduan dari rahasiagelap2.0. Tambahan v0.41 mencakup status kasir tanpa angka porsi, pelaku audit dan demo tiga peran, serta pembaruan rahasiagelap2.0 fe073d0. Prioritas berikutnya adalah pairing staf dengan kode, kemudian persiapan deployment dan pengujian antarperangkat, dengan teknologi yang ada tetap dipertahankan. Periksa konfigurasi origin/host, HTTPS/cookie, volume SQLite, backup/restore dan batas SSE/layanan suara sebelum memilih perubahan. Laporkan apa yang selesai dan batas yang belum terpenuhi. Jangan memasukkan data dummy ke akun asli, mengaktifkan model publik ke bahan pengguna, mengubah protokol/hasil riset yang dibekukan, atau mengklaim suara dua detik/akurasi lapangan. Gunakan database sementara untuk tes dan database demo terpisah untuk presentasi. Pertahankan isolasi role dan ledger bahan.

## File yang perlu dikenal

| Tujuan | File |
| --- | --- |
| Progres dan antrean kerja | `docs/AI_TODO.md`, `docs/PROGRESS.md` |
| Hasil integrasi branch | `docs/BRANCH_INTEGRATION.md` |
| Dapur, kapasitas, waste | `server/kitchen.mjs`, `docs/KITCHEN_CAPACITY.md` |
| Perhitungan antrean/ETA | `server/kitchen-schedule.mjs` |
| Katalog dan permintaan pelanggan | `server/order-requests.mjs`, `docs/CUSTOMER_CATALOG.md` |
| Login, role dan proyeksi | `server/identity.mjs`, `server/roles.mjs`, `docs/STAFF_ROLES.md` |
| HTTP, penyimpanan, SSE | `server/http.mjs`, `server/store.mjs` |
| Desain/panduan | `DESIGN.md`, `PRODUCT.md`, `public/guide.js`, `public/guide-content.js` |
| Model dan batas evaluasi | `docs/evaluation/AI_MODEL_INDEX.md`, `docs/AI_TRAINING.md`, `docs/DATA_COLLECTION.md` |

Jalankan aplikasi asli dengan `npm start` (port 4174). Demo: `npm run start:demo` (4180); akses demo ada di `docs/DEMO_ACCOUNT.md`. Jangan menyalin database demo ke database usaha asli. Proses server perlu dimulai ulang sesudah perubahan backend.

Pengujian: `npm run test:backend`, `npm run test:kitchen`, `npm run test:catalog`, dan `npm test`. Untuk browser terpisah di PowerShell: `npx playwright install chromium`, lalu `$env:PLAYWRIGHT_CHANNEL='chromium'` sebelum `npm test`. Hasil lama tidak menggantikan pengujian pada perubahan baru.

Belum selesai: pairing staf, deployment publik/HTTPS dan uji lintas perangkat, pilot durasi/suara nyata, alat bersama lintas stasiun, shift, pembayaran/ojol, serta kestabilan ASR dan target suara dua detik. Prediksi/model publik bukan bukti akurasi usaha Indonesia.
