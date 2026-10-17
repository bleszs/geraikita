# Lanjutan v0.37 — kapasitas dan bahan terbuang sebagian

- [x] Kapasitas per stasiun: staf aktif 1–20 membuka beberapa giliran SJF+aging sekaligus; alat tahap pasif 1–50 atau tidak dibatasi. Revisi mencegah penimpaan dari perangkat lain; bawaan sama dengan v0.36.
- [x] Pembatalan per item: item belum dikerjakan melepas cadangan item saja; item yang sudah dimulai mencatat `kitchen_waste` sesuai jumlah per bahan, sisa cadangan kembali tersedia. Total dan penjualan akhir tidak memuat item yang dibatalkan.
- [x] Penutupan seluruh pesanan menerima jumlah per bahan (bawaan seluruh cadangan).
- [x] Izin: pemilik mengatur kapasitas dan jumlah sebagian; akun dapur membatalkan item dengan seluruh resep; kasir tidak membatalkan item. Server menolak jumlah per bahan dari staf.
- [x] Migrasi aditif (`kitchen_stations`, `item_index`/`usage_json`/`waste_json`); pesanan lama multi-item menolak pembatalan per item dengan pesan jelas.
- [x] Panduan dapur diperbarui (88 langkah). Regresi: 233 Node + 45 browser. [Panduan](KITCHEN_CAPACITY.md).
- [ ] Alat bersama lintas stasiun, shift staf, perkiraan waktu tunggu dari kapasitas.
# Lanjutan v0.36 — akun staf

- [x] Regresi akhir selesai normal: 227 Node + 44 browser = **271 lulus**, exit 0 pada browser Chromium terpisah. [Bukti rilis](evaluation/staff-release.json). Percobaan gagal/cleanup lama tetap dicatat, bukan dihitung sebagai run sukses.

- [x] Review UI menilai dua perbaikan (fokus keyboard dan akses intake mobile) resolved; pemeriksaan desain mempertahankan kedua hash baseline. [Review](evaluation/STAFF_ROLES_UI_REVIEW.md) dan [catatan desain](evaluation/STAFF_ROLES_DESIGN_CHECK.md).

- [x] Role owner/cashier/kitchen di database, akun lama menjadi owner pada migrasi pertama; role hilang selalu gagal autentikasi.
- [x] Pemilik membuat akun staf nyata dalam usaha yang sama, mengubah peran dan mengaktifkan/menonaktifkan dengan konfirmasi/revisi/idempotensi.
- [x] Server membatasi endpoint/tindakan dan data bootstrap; dapur tidak mendapat harga/laporan/resep, kasir mendapat harga/porsi untuk intake saja.
- [x] Perubahan akses mencabut seluruh sesi target; SSE mendeteksi sesi hilang. Staf dapat mengubah password sendiri.
- [x] Tampilan kasir/dapur, antrean bersama dan panduan per peran; jalur masuk melewati cache PWA lama.
- [x] Namespace bukti kirim per akun/peran/revisi dan tanpa snapshot staf offline; draft pemilik tidak ditampilkan ke staf.
- [x] Backup/migrasi main+demo: 25 tabel lama identik, dua tabel baru, hanya role owner turunan akun lama; tanpa staf/data contoh otomatis.

[Cara memakai, batas dan pengujian](STAFF_ROLES.md). Tahap berikutnya: kapasitas alat/staf dan waste sebagian; kemudian pilot suara terukur serta deployment/HTTPS. Model/bobot/benchmark AI tidak berubah pada tahap ini.

Checklist versi lama di bawah menjadi riwayat; rincian riset yang belum selesai tetap terbuka.

# Lanjutan v0.35

- [x] Regresi akhir 220 Node + 41 browser = 261 lulus, proses selesai normal; sesi hilang/pergantian akun dan tab tersembunyi mendapat tes regresi khusus. [Bukti](evaluation/display-release.json).

Pekerjaan berikutnya setelah modul dapur: layar pelanggan yang dapat dibuka tanpa membagikan akun pemilik. Implementasi dan uji akses/proyeksi/migrasi sudah tersedia; tautan dibuat pemilik sesuai kebutuhan, bukan diisi otomatis. Node.js/SQLite tetap; tidak melatih/mengaktifkan model baru. [Alur dan batas](CUSTOMER_DISPLAY.md). Prioritas sesudahnya adalah peran kasir/staf dapur; suara dua detik dan deployment tetap terbuka.

# Prioritas integrasi SRS dapur — v0.34

Pengguna memilih memprioritaskan fungsi SRS Smart Kitchen Command Center dan mempertahankan teknologi saat ini. [Pemetaan kebutuhan, cara mencoba dan batas](KITCHEN_INTEGRATION.md).

- [x] Tambah pengaturan waktu total/pasif dan stasiun ke menu tanpa nilai contoh di akun nyata.
- [x] Antrean multi-item, SJF per stasiun dengan aging 15 menit, tahap pasif dan giliran berikutnya.
- [x] Reservasi seluruh bahan, perlindungan penjualan/surplus/penerimaan, snapshot resep/harga, konsumsi saat selesai tepat sekali.
- [x] Pembatalan sebelum mulai serta penutupan seluruh bahan terpakai dengan konfirmasi eksplisit setelah mulai.
- [x] Layar layanan terautentikasi dan SSE scoped, status koneksi serta perbaikan fokus keyboard.
- [x] Kendali suara opt-in menggunakan adapter lokal, parser perintah terbatas, penolakan ambigu/negasi/revisi usang; tidak menyimpan rekaman/transkrip.
- [x] Tema mengikuti OS sebelum pengguna memilih tema sendiri; panduan tambahan enam langkah dapur/layanan.
- [x] Backup dan migrasi aditif: 20 tabel asli identik, empat tabel dapur kosong; tidak mengubah bobot/model atau hasil benchmark.
- [x] Regresi penuh selesai normal: 215 Node dan 35 browser lulus; worker browser tunggal, stream/idle connection ditutup saat shutdown. [Bukti rilis](evaluation/kitchen-release.json).
- [ ] Target voice-to-screen ≤2 detik: belum terpenuhi (rekaman saat ini empat detik), perlu streaming dan pengukuran nyata.
- [ ] Validasi koki/pemilik, durasi masak aktual, kebisingan dan mikrofon lapangan; kestabilan Whisper masih terbuka.
- [x] Layar pelanggan tanpa login pemilik: token baca terbatas/berakhir/dicabut, proyeksi kode-status, SSE, tidak menyimpan kunci asli atau transkrip. [Panduan](CUSTOMER_DISPLAY.md).
- [x] Peran kasir/dapur dengan pembatasan tindakan/sesi server selesai pada v0.36. [Cakupan dan batas](STAFF_ROLES.md).
- [ ] Kapasitas alat/staf, tahapan lebih rinci dan pencatatan waste sebagian.
- [ ] Integrasi pemesanan/katalog ojol dan kanal eksternal; sumber saat ini dicatat manual.
- [ ] Kesiapan deployment, HTTPS, pemantauan, backup produksi dan uji beban.

Checklist riset lama di bawah tetap berlaku; model publik tidak otomatis digunakan untuk bahan akun atau penjadwalan dapur.

# Pekerjaan AI sesuai proposal

Urutan kerja saat ini: data berizin → pelatihan forecasting → evaluasi waktu terpisah → aktivasi bersyarat → eksperimen ekstraksi.

- [x] Memeriksa proposal bagian 4.2–4.6 dan 8: model bahasa lokal, forecasting dibanding baseline, dataset/evaluasi dan kontribusi pipeline.
- [x] Format dataset harian, template kosong, validasi CSV dan ekspor read-only dari SQLite dengan konfirmasi izin/kelengkapan.
- [x] Implementasi pelatihan Ridge dan run nyata publik: 500 model dipelajari dari 45.000 catatan harian FreshRetailNet-50K, tanpa data sintetis.
- [x] Pemisahan train/validation/test kronologis, target dua hari tanpa overlap, MAE/WAPE, dua baseline dan ablation kalender.
- [x] Artefak model, hash dataset, parameter/scaler, aktivasi bersyarat, checksum dan integrasi saran kulakan per usaha/bahan.
- [x] Sebelas uji ML terisolasi, termasuk penolakan aktivasi model publik untuk akun usaha. Panduan: AI_TRAINING.md.
- [x] Mencari, memeriksa lisensi dan mengunduh dataset nyata publik secara mandiri: Dingdong-Inc, CC BY 4.0, revisi/checksum dipatok. Lihat datasets/public/freshretailnet/README.md.
- [x] Pengguna belum memiliki CSV; pencarian dan eksperimen publik tidak lagi menunggu pengguna mengumpulkan file. Template kosong dan DATA_COLLECTION.md tetap tersedia untuk pilot sendiri.
- [x] Melatih 500 model, menilai 3.500 target internal dan 1.500 target eksternal, serta menyimpan seluruh bobot/scaler, error, metrik dan provenance. Hasil: evaluation/FRESHRETAILNET_RESULTS.md.
- [x] Melaporkan kegagalan mengalahkan baseline: Ridge WAPE eksternal 35,65%, nilai terakhir 37,30%, rata-rata tujuh hari 26,88%. Tidak mengklaim Ridge lebih baik dari seluruh baseline atau mengubah test agar lolos.
- [x] Error analysis stockout/non-stockout dan stabilitas kelulusan; run ulang memverifikasi 500 bobot/scaler/prediksi identik. Lihat evaluation/FRESHRETAILNET_ERROR_ANALYSIS.md dan freshretailnet-reproducibility.json.
- [x] Menetapkan protokol v2 sebelum eksperimen: pooled residual boosting, 16 kandidat validasi, 200 toko holdout di luar seluruh 355 toko pengembangan. Test v1 tidak digunakan kembali sebagai bukti independen.
- [x] Melatih model gabungan dari 19.000 target nyata; test 600 target toko baru menghasilkan WAPE 24,83% dibanding MA7 27,04% (galat turun 8,16%). Model menang pada 113/200 seri; semua kegagalan tetap dilaporkan. Lihat evaluation/FRESHRETAILNET_V2_RESULTS.md.
- [x] Memeriksa ulang sumber/hash, pemilihan toko, label, baseline, seluruh metrik dan pelatihan ulang konfigurasi yang dibekukan: 600 prediksi identik. Tujuh tes Python tambahan lulus; aplikasi tetap memakai data pengguna, tanpa mengaktifkan model publik.
- [x] Replikasi pipeline Ridge pada sumber/domain dan kalender berbeda: UCI Online Retail 2010–2011, CC BY 4.0; protokol dibekukan, 4 negara dipilih dari development saja, 4 model dan 76 target eksternal. WAPE ternormalisasi 54,41% vs MA7 62,99%; raw Ridge 32,92% kalah dari pola mingguan 24,92%. Laporan: evaluation/UCI_RETAIL_RESULTS.md.
- [x] Verifikasi replikasi UCI dari workbook asli: hash preparasi/pemilihan/normalisasi sama, 4 bobot/scaler dan 76 prediksi identik; delapan tes kontrak tambahan. Semua hasil, termasuk baseline yang lebih baik, disimpan dan model publik tidak diaktifkan.
- [x] Periksa kompatibilitas transfer v2 ke UCI: stockout tidak tersedia, sehingga fitur itu tidak diisi nol. Siapkan varian sales-only dengan fitur relatif; bobot v2 asli tetap utuh dan tidak ditransfer langsung.
- [x] Uji varian boosting lintas dataset: fit/validasi hanya pada 500 seri FreshRetailNet, lalu transfer bobot tetap ke 10 negara UCI yang sebelumnya belum dinilai / 190 target. Protokol mengakui kalender UCI sudah diketahui. Hasil negatif: rata-rata WAPE negara 173,00% vs MA7 165,12% dan MA14 156,51%; model menang atas MA7 pada 1/10 negara. Panduan: BOOSTING_TRANSFER.md.
- [x] Verifikasi transfer dari sumber asli: bobot/koreksi refit identik, 190 prediksi dan seluruh metrik cocok; tujuh tes transfer tambahan. Analisis 121 target dua hari SUM event nol, seluruh kasus/negara tetap disimpan. Tidak ada retuning/aktivasi publik.
- [ ] Perbaiki dan validasi generalisasi dengan strategi adaptasi/data yang sesuai serta test baru sebelum klaim operasional. Hasil transfer sales-only belum mengalahkan baseline. Fresh v1/v2, UCI Ridge dan UCI transfer kini sudah terlihat; jangan tuning di sana lalu menyebutnya test independen. Transfer bobot v2 asli dengan fitur yang benar tetap belum diuji.
- [ ] Validasi pilot dengan data usaha Indonesia yang berizin; ini pekerjaan terpisah dari pelatihan publik yang sudah selesai. Jangan memasangkan model publik ke bahan pengguna.
- [x] Audit cakupan ledger read-only melalui `forecast readiness` dan metadata `historyQuality` saat inferensi: nol tersimpan/asumsi, tanggal sebelum histori, status kandidat training, registry dan ringkasan perubahan tujuh hari. Sembilan tes tambahan; panduan FORECAST_READINESS.md.
- [ ] Pada pilot usaha sendiri: verifikasi kelengkapan pencatatan bersama pemilik dan validasi pemantauan perubahan pola. Audit deskriptif belum membuktikan kelengkapan atau mendeteksi drift/anomali secara tervalidasi. Belum ada retraining otomatis.
- [x] Infrastruktur evaluasi chat: template kosong, panduan anotasi, validasi sumber/izin/redaksi, pencegahan kebocoran percakapan/teks antar-split, hash dataset dan keluaran privat. Panduan: CHAT_EVALUATION.md.
- [x] Alat pembanding parser, Qwen mentah dan pipeline aplikasi yang sebenarnya, dengan exact match, false acceptance, fallback/error dan p50/p95; sepuluh tes kontrak terisolasi. Tidak membuat skor tanpa dataset nyata.
- [ ] Kumpulkan chat nyata berizin, redaksi, anotasi manusia dan pembekuan split percakapan sebelum eksperimen. Belum ada dataset chat lapangan yang dinilai.
- [ ] Jalankan pembanding pada chat nyata dan analisis kesalahan/latensi. Pipeline sekarang memakai parser sebagai gate, sehingga hasil pipeline bukan bukti bahwa Qwen memperluas cakupan parser. Qwen tetap pretrained, belum fine-tune.
- [x] Infrastruktur voice bookkeeping lokal: Whisper Tiny pretrained multilingual, CPU int8, source lock/checksum dan lingkungan terpisah; rekam/stop/batal, transkrip dapat dikoreksi dan ditambahkan ke catatan sebelum review pesanan. Audio tidak disimpan; login/CSRF, batas ukuran/durasi/konkurensi/timeout dan pembatalan tersedia. Tujuh tes Node, tujuh Python dan empat browser tambahan. Panduan: [VOICE_BOOKKEEPING.md](VOICE_BOOKKEEPING.md).
- [x] Evaluasi ASR pada suara nyata publik: FLEURS Indonesia, CC BY 4.0; checksum/revisi dan pemilihan hash dibekukan, 64 dari 687 rekaman test melalui adapter produksi tanpa training/fine-tuning. WER 67,27%, CER 27,64%, exact match 0/64, enam penolakan tetap dinilai. Delapan tes skor/pemilihan tambahan. [Hasil dan batas klaim](evaluation/FLEURS_ASR_RESULTS.md).
- [x] Verifikasi ASR publik: preparasi ulang sumber, seluruh 64 hash audio/referensi dan skor/durasi dibandingkan; delapan inferensi pertama sesuai protokol diulang. Kesamaan transkrip hanya diklaim untuk delapan pengulangan tersebut. Tidak mengubah sampel/model setelah hasil buruk.
- [x] Tetapkan dan jalankan pembanding ASR Tiny/Base dengan 16 kalimat validation dan 48 test baru, tanpa kalimat/teks/audio dari run lama atau overlap validation-test. Aturan pemilihan dan keputusan validation dibekukan sebelum test. Pada satu run: WER test Base 36,36% vs Tiny 66,93% (galat relatif turun 45,67%), Base lebih baik pada 43/48 rekaman. Delapan tes pemisahan/keputusan ditambahkan. [Hasil dan batas klaim](evaluation/ASR_COMPARISON_RESULTS.md).
- [x] Audit perbandingan: preparasi ulang sumber/hash, seluruh skor, pairing dan keputusan validation cocok. Kegagalan reproduksi inferensi tetap dilaporkan: **3/4 transkrip ulang berbeda**; ini bukan lulus reproduksi prediksi. Runtime/model aktif tidak diganti. [Bukti](evaluation/asr-comparison-reproducibility.json).
- [x] Diagnostik awal variasi inferensi: 136 inferensi proses baru dengan hash PCM/VAD/fitur/encoder, lima urutan impor dan kontrol satu faktor. Empat dari 20 kelompok tanpa hash tensor masih berubah; 22 kelompok instrumentasi cocok pada pengulangan yang diamati. Hanya mengganti thread OpenBLAS mengubah fitur/encoder dan teks Tiny pada klip yang diketahui bermasalah. Seluruh bukti/hash/protokol dan tujuh tes audit tersedia; ini belum menetapkan penyebab variasi konfigurasi tetap. [Hasil diagnostik v0.22](evaluation/ASR_STABILITY_RESULTS.md), [panduan](ASR_STABILITY.md).
- [x] Tindak lanjut v0.23: 64 inferensi plain/deferred dengan hash setelah transkripsi, empat capture Tiny dan 112 pemeriksaan alignment. Delapan kelompok pengulangan cocok pada run ini; seluruh kontrol alignment cocok dengan referensi profilnya. Pada 16/16 pasangan perubahan OpenBLAS, tahap pertama berbeda adalah **proyeksi mel**, setelah PCM/window/filter/STFT/magnitudes yang sama. Ini lokalisasi intervensi pengaturan, bukan penyebab kegagalan historis konfigurasi tetap. Tujuh tes audit tambahan; seluruh hasil negatif dan bukti lama dipertahankan. [Hasil](evaluation/ASR_FOLLOWUP_RESULTS.md), [panduan](ASR_FOLLOWUP.md).
- [x] Adapter kandidat profil v0.24: Tiny current, Tiny pinned dan Base pinned; pengaturan BLAS sebelum impor native, checksum serta identitas model/profil diperiksa, transport/timeout/abort/konkurensi tetap dibatasi. Factory opt-in dan CLI pemeriksaan tersedia; default HTTP/model aktif tidak dialihkan. Sebelas tes kontrak tambahan lulus. [Panduan](ASR_PROFILES.md).
- [x] Evaluasi profil v0.24 dan audit preparasi ulang selesai: 16 validation / 24 test mengecualikan seluruh 128 rekaman lama; Base pinned dipilih lewat validation sebelum test. WER test Base pinned **36,99%** vs Tiny current **86,59%**, sedangkan Tiny pinned lebih buruk **97,36%**. Base lebih sedikit galat pada 22/24 klip, dua seri. Semua 24 pengulangan tambahan pada dua klip per profil cocok dengan hasil utama; baseline juga cocok, sehingga ini bukan bukti pinning menyelesaikan variasi. Capture bersyarat tidak terpicu. Model aktif tetap Tiny; **belum promosi/perbaikan tervalidasi**. [Hasil](evaluation/ASR_PROFILE_RESULTS.md), [audit](evaluation/asr-profile-audit.json).
- [x] Integrasi runtime v0.25: profil opt-in lewat CLI/`SPEECH_PROFILE`, port terpisah untuk Base, penolakan konfigurasi sebelum membuka DB, dan doctor yang memeriksa profil server sebenarnya. Uji CLI → HTTP → Python pada database sementara lulus; login/CSRF/origin serta kesamaan 19 tabel diperiksa. Default tetap Tiny. [Cara menjalankan](RUNTIME_SPEECH.md).
- [x] Pertahankan ketidakcocokan baru pada smoke HTTP: satu Tiny default dan satu Base pinned berbeda dari prediksi v0.24. Empat capture deferred pada klip Base yang dipatok cocok antar-capture, sehingga penyebab masih belum terlokalisasi. Tidak mengubah skor lama atau menyatakan pinning menyelesaikan variasi. [Bukti awal](evaluation/runtime-speech-smoke-first.json), [capture](evaluation/runtime-speech-capture.json).
- [x] Diagnostik decoder v0.31: protokol sebelum run, 24 transkripsi pada dua klip publik lama × plain/deferred × enam pengulangan, penangkapan hingga token/skor/segmen dan 36 replay dari buffer encoder ditahan. Semua upaya disimpan dan hash/checkpoint diaudit. **Base pinned plain kembali menghasilkan dua varian teks**, sedangkan tahap deferred dan replay cocok; variasi plain belum terlokalisasi dan penguncian thread belum menjamin kestabilan. Tujuh tes Node/tiga Python baru; default Tiny dan seluruh bukti lama dipertahankan. [Hasil](evaluation/ASR_DECODER_RESULTS.md), [metode](ASR_DECODER.md).
- [ ] Tangkap tahap pertama yang berubah pada kegagalan konfigurasi tetap dan validasi perbaikan pada jalur tanpa instrumentasi. Setelah perubahan yang beralasan, evaluasi kestabilan dan mutu pada protokol/data yang sesuai sebelum promosi atau klaim peningkatan yang berulang. `causeEstablished=false`, `fixValidated=false`, `readyForPromotion=false`. Sampel v0.20/v0.21/v0.24 dan klip diagnostik kini telah dilihat; jangan tuning di sana lalu menyebutnya test baru.
- [ ] Validasi suara nyata berizin: anotasi/split pembicara, WER/CER dan exact match pesanan/negasi, latensi menurut durasi serta uji mikrofon pemilik usaha. Model suara belum fine-tune; tes transport/sinyal teknis tidak membuktikan akurasi lapangan.
- [x] Penyaring awal pemakaian tidak biasa: median/MAD delapan hari sejenis, referensi 56 tanggal tersimpan, tanpa imputasi nol atau informasi masa depan. CLI read-only dengan scope/cutoff, rincian keputusan dan 14 tes kontrak; seluruh 19 tabel aktif sesuai backup. Ini aturan review, bukan model anomali terlatih atau bukti akurasi. [Panduan](USAGE_ANOMALIES.md), [pemeriksaan data aktif](evaluation/usage-anomalies-release.json).
- [x] Integrasikan pemeriksaan pemakaian ke API bootstrap akun dan panel Saran kulakan: ringkasan per bahan, tanggal untuk ditinjau, delapan referensi asli, semua tanggal/gap, status offline dan snapshot lama. Empat tes backend serta empat browser terisolasi; tidak ada tindakan atau perubahan forecast otomatis. [Panduan panel](USAGE_REVIEW.md).
- [x] Infrastruktur evaluasi review pemakaian: ekspor read-only satu bahan dengan izin, semua tanggal target dan gap asli, lembar tanpa prediksi/label buatan, protokol dibekukan sebelum anotasi, hash sumber/data, validasi label/kelengkapan dan split waktu, precision/recall/F1, coverage, abstain serta beban review. Tiga belas tes kontrak terisolasi; template tetap kosong dan belum ada skor lapangan. [Panduan evaluasi](USAGE_EVALUATION.md).
- [x] Simpan hasil tinjauan pemilik per bahan/tanggal: Sudah diperiksa/Perlu tindak lanjut, catatan dan waktu, event revisi, data berubah meminta review ulang, konflik sesi serta retry idempoten. Delapan tes backend/empat browser; migrasi hanya menambah tabel kosong, 19 tabel lama tetap sama. Status operasional tidak menjadi label riset buta atau mengubah stok/forecast. [Panduan](USAGE_DECISIONS.md).
- [ ] Validasi penyaring anomali pada data nyata berizin/berlabel dan split waktu beku: precision/recall, beban review, tren/musim dan kelengkapan pencatatan. Akun aktif belum mempunyai histori untuk dinilai. Penyimpanan tinjauan operasional tersedia; notifikasi otomatis belum diimplementasikan.
- [ ] Pengujian fitur hari libur/cuaca dengan sumber dan protokol evaluasi yang sesuai; belum diimplementasikan. Penyaring statistik tidak menjelaskan penyebab perubahan.

Tambahan pengalaman pengguna (terpisah dari training AI):

- [x] Atas permintaan pengguna, sediakan satu akun usaha demo lengkap pada database/server terpisah: 8 bahan, 6 menu, histori 84 hari, stok/penjualan/pembatalan, kulakan, surplus dan review. Hanya satu akun login; dua bisnis pendukung berlabel simulasi tanpa login. Saldo/pemakaian diverifikasi, data asli tetap utuh, tidak melatih AI dari data demo. [Akun dan alur presentasi](DEMO_ACCOUNT.md).
- [x] Panduan visual berpanah sesuai koreksi pengguna: 11 langkah dimulai dari pengenalan aplikasi lalu fitur utama, target nyata disorot dan bagian lain diredupkan; Lanjut/Kembali/Lewati. Posisi panel/panah mengikuti scroll/resize. Katalog rinci 14 topik / 67 langkah, pause/resume, pencarian, bantuan per halaman, akses sebelum/sesudah masuk, offline dan progress v2 per akun/perangkat. Panduan tidak mengisi atau mengirim transaksi. [Panduan fitur](INTERACTIVE_GUIDE.md).
- [ ] Uji pemahaman panduan bersama pemilik usaha awam; periksa istilah, waktu menyelesaikan pekerjaan dan bagian yang masih membingungkan. Belum ada studi kegunaan lapangan.

Data uji otomatis hanya berada pada fixture/database sementara. Aplikasi usaha utama tetap tidak diisi data dummy. Pengecualian eksplisit yang diminta pengguna: akun presentasi berdata simulasi hanya berada di database demo terpisah; tidak menjadi data riset/pilot. Status selesai teknis tidak berarti model sudah dilatih dengan data usaha atau berhasil pada lapangan.

Laporan keseluruhan fitur, model, data aktif dan pekerjaan tersisa: [PROGRESS.md](PROGRESS.md).
