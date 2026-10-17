# Integrasi Claude dan rahasiagelap2.0 — v0.40

Pengguna meminta memeriksa kesesuaian branch Claude dan menarik perubahan tampilan dari `rahasiagelap2.0`. Penggabungan dilakukan pada **feat/kitchen-capacity-and-waste**; `main` tidak diganti. Histori kedua branch dipertahankan melalui merge.

## Sumber yang digabung

| Sumber | Isi | Keputusan |
| --- | --- | --- |
| `e4c21e8` | Kapasitas stasiun dan bahan terbuang sebagian | Dipertahankan; sesuai lanjutan SRS dan ledger stok |
| `e37b3f3` | Katalog publik, permintaan pelanggan, konfirmasi kasir/pemilik | Dipertahankan; pesanan baru mencadangkan bahan setelah diterima |
| `5318dfd` | Estimasi waktu tunggu | Dipertahankan dengan koreksi perhitungan dan proyeksi |
| `origin/rahasiagelap2.0` — `b6bae4d` | Tampilan, tema saat login, panduan otomatis, geometri panah dan pembaruan cache | Digabung dengan fitur terbaru; basisnya masih sebelum akun staf v0.36 |

Teknologi tetap Node.js/ES modules, SQLite, dan frontend JavaScript. Model, bobot, protokol evaluasi dan hasil riset AI tidak diganti atau dilatih ulang.

## Koreksi dalam integrasi

- Konflik `app.js`, `guide.js`, `guide-content.js`, `styles.css` dan `sw.js` diselesaikan sambil mempertahankan role, namespace bukti kirim, menu kapasitas, pencatatan terbuang, inbox katalog dan CSS-nya. Mengambil seluruh file lama dari branch tampilan akan menghilangkan sebagian fungsi baru.
- Panduan versi 6 mengenali pemilik/kasir/dapur. Pendaftaran melalui formulir aplikasi mengaktifkan pengenalan tiap halaman. Login akun yang dibuat melalui API tidak dianggap sebagai pendaftaran UI hanya karena timestamp-nya baru. Tur manual yang berpindah halaman tidak ditimpa tur otomatis; navigasi pengguna ke halaman lain menjeda tur lama. **Lewati panduan** melewati tur halaman tersebut; halaman lain yang belum dikenalkan tetap dapat mempunyai tur otomatis. Bantuan dapat dibuka dari navigasi atas.
- Cache shell menjadi v40, tetap mencakup modul staf/inbox. Network-first dari branch tampilan dipertahankan dengan fallback offline; dokumen selain shell tidak boleh menimpa kunci `/index.html`. Halaman API untuk pemulihan/staf/pelanggan tetap melewati service worker.
- `minutes` pada resep berarti **durasi total**, sudah termasuk waktu pasif. Estimasi lama menjumlahkan pasif lagi. Perhitungan sekarang memisahkan aktif = total − pasif, menahan slot staf bila alat pasif penuh, serta memperhitungkan pekerjaan yang sudah berjalan ketika kapasitas diturunkan.
- Pemilik, kasir, dapur dan layar pelanggan memakai perencana yang sama melalui `server/kitchen-schedule.mjs`. Proyeksi staf mendapat ETA tanpa resep/harga dapur. Revisi SSE mencakup perubahan estimasi agar hitung mundur tidak membeku. Snapshot lama yang tidak mempunyai ETA tidak menampilkan angka buatan atau `undefined`.

Estimasi tetap heuristik dari durasi yang diisi pemilik, jumlah porsi, antrean dan kapasitas. Staf tetap mengonfirmasi setiap tahap; estimasi tidak menyatakan makanan matang otomatis. Resume memperkirakan fase aktif dari timestamp fase terbaru karena belum ada histori durasi fase terstruktur. Belum ada validasi waktu tunggu pada dapur nyata.

## Data

Schema target **29 tabel**. Penambahan Claude: `kitchen_stations`, `order_requests`, tiga kolom snapshot pada `kitchen_tasks`, serta `display_access.kind` dengan nilai lama `display`. Baris/kolom lama dibandingkan dengan backup menggunakan hash dari kolom asal; penambahan kolom tidak disalahartikan sebagai perubahan transaksi. Tidak ada menu, kapasitas tersimpan, pesanan, permintaan pelanggan atau catatan terbuang otomatis.

[Bukti preservasi usaha asli](evaluation/integration-data-preservation.json) · [bukti demo](evaluation/integration-demo-preservation.json). Database demo terpisah tetap berlabel simulasi dan tidak digunakan untuk melatih model atau menilai akurasi lapangan.

Sesudah migrasi dan server berjalan kembali, pemeriksaan ulang memastikan semua tabel bisnis tetap identik. Database asli mempunyai satu sesi login dan tautan account-session lebih sedikit; baris sesi yang tersisa tidak berubah. Penyebab penghapusan sesi tidak disimpulkan dan sesi tidak dipulihkan. Perbedaan sementara ini dicatat di bukti rilis; laporan migrasi awal tetap utuh.

## Verifikasi dan batas

Periksa [bukti rilis](evaluation/integration-release.json) untuk hasil akhir, browser yang dipakai, log percobaan dan pemeriksaan runtime. Pengujian perencana mencakup durasi total/pasif, alat penuh yang menahan staf, pengurangan kapasitas, waktu fase, prioritas usia, stasiun independen, serta pekerjaan siap/dibatalkan/ditutup. Regresi lama tetap dijalankan; tes UI operasional mematikan tutorial di preferensi fixture, sementara suite panduan menguji onboarding sebenarnya.

[Review UI](evaluation/INTEGRATION_UI_REVIEW.md) dan [catatan desain](evaluation/INTEGRATION_DESIGN_CHECK.md) membatasi penilaian pada bukti yang diperiksa. Tidak menyatakan audit keamanan produksi, kesiapan hosting, atau akurasi AI baru.

## Pekerjaan berikutnya

1. **Persiapan deployment dan uji antarperangkat:** konfigurasi origin/host/cookie/HTTPS, volume SQLite persisten, backup/restore, batas koneksi SSE/layanan suara, dan pengujian ponsel pelanggan serta perangkat staf. Server saat ini masih mengikat loopback dan memeriksa Host localhost/127.0.0.1.
2. **Pilot dapur nyata:** ukur durasi aktif/pasif, antrean, salah input, proses terbuang dan kondisi suara; perbaiki estimasi menggunakan bukti tersebut.
3. **Fungsi lanjutan:** alat bersama lintas stasiun, shift staf, pembelian/pembayaran daring dan adaptor ojol sesuai prioritas. Streaming suara dua detik dan kestabilan ASR tetap pekerjaan tersendiri.

Langkah ini menyelesaikan integrasi branch dan validasinya. Deployment publik, fitur alat bersama/shift, pembayaran/ojol dan model baru belum dikerjakan dalam integrasi ini.
