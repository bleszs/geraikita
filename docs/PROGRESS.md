# Perubahan terbaru v0.42

Kode masuk staf sudah tersedia: pemilik membuat nama/peran atau memilih staf yang sudah ada, kemudian membagikan kode sekali pakai 15 menit. Email/password lama tetap dapat digunakan. Kode tertunda bisa dicabut; Nonaktifkan mengakhiri sesi. Panduan berpanah menyesuaikan jenis akun dan mencakup 18 topik/93 langkah.

**317 tes lulus**, 263 Node + 54 browser, npm test exit 0. Backup/migrasi asli dan kedua demo mempertahankan seluruh nilai 29 tabel lama; schema menjadi 30 tabel dengan kredensial nullable dan staff_invites kosong. Runtime 18 pemeriksaan anonim dan tiga akun demo berhasil, tanpa perubahan data bisnis.

[Detail dan batas](STAFF_PAIRING.md) | [bukti rilis](evaluation/pairing-release.json) | [review UI](evaluation/PAIRING_UI_REVIEW.md) | [desain](evaluation/PAIRING_DESIGN_CHECK.md). Model AI tidak berubah; deployment dan uji antarperangkat menjadi berikutnya. Catatan versi di bawah adalah riwayat.

# Perubahan terbaru v0.41

Pembaruan rahasiagelap2.0 sampai fe073d0 digabung. Kasir mendapat status menu tanpa jumlah porsi; ambang berasal dari bahan yang diisi pemilik dan memperhitungkan cadangan. Catatan baru menyimpan ID/nama/peran/revisi pelaku dari akun, sementara histori lama tetap tidak diketahui. Demo terpisah kini mempunyai pemilik/kasir/dapur, 9 bahan, 7 menu dan empat antrean aktif.

Regresi akhir: **304 lulus**, 253 Node dan 51 browser, exit 0.

[Detail](FNB_OPERATIONS.md) · [akun demo](DEMO_ACCOUNT.md) · [bukti rilis](evaluation/fnb-release.json). Schema 29 tabel dengan delapan kolom nullable tambahan, tanpa penambahan data pada usaha asli atau perubahan model. Pairing dan deployment masih terbuka. Catatan lama di bawah adalah riwayat.

# Perubahan terbaru v0.40 — integrasi pekerjaan Claude

Branch feat/kitchen-capacity-and-waste kini menggabungkan tiga commit Claude (v0.37 kapasitas/waste, v0.38 katalog, v0.39 ETA) dan origin/rahasiagelap2.0 (tampilan/panduan dari basis lebih lama). Role staf dan semua fitur baru dipertahankan. main tetap terpisah. [Pemeriksaan dan koreksi lengkap](BRANCH_INTEGRATION.md).

**Regresi akhir: 295 tes lulus, exit 0** — 246 Node dan 49 browser pada Chromium terpisah, satu worker. Log final `data/integration-npm-test-release.log`; [bukti rilis](evaluation/integration-release.json) mencatat juga percobaan yang gagal dan perbaikannya. [Data asli](evaluation/integration-data-preservation.json) dan [demo](evaluation/integration-demo-preservation.json): seluruh baris/kolom asal identik; schema 29 tabel. Tidak ada dummy pada akun nyata atau perubahan bobot/benchmark.

Koreksi penting: ETA total/pasif dan slot alat/staf, satu perencana lintas layar, metadata ETA staf serta revisi SSE, tur manual yang tidak disela auto-page tour, target panduan antrean kosong, dan cache lengkap yang tidak tertimpa dokumen lain. [Review UI](evaluation/INTEGRATION_UI_REVIEW.md), [catatan desain](evaluation/INTEGRATION_DESIGN_CHECK.md). Kesiapan produksi/akurasi/latensi lapangan tidak diklaim.

Berikutnya persiapan deployment dan uji antarperangkat; lalu pilot dapur/suara dan alat bersama/shift. [Konteks untuk Claude](CONTINUE_WITH_CLAUDE.md). Catatan versi di bawah adalah riwayat.

# Perubahan terbaru v0.36 — akun staf

**Regresi akhir selesai normal: 227 tes Node dan 44 browser = 271 lulus, exit 0.** Browser pengujian Chromium terpisah dipilih melalui PLAYWRIGHT_CHANNEL; Chrome tetap default bila variabel tidak diisi. Log final `data/staff-npm-test-v036.log` dan riwayat percobaan tersedia pada [bukti rilis](evaluation/staff-release.json). Main 4174 dan demo 4180 aktif pada server terbaru; halaman/modul staf 200 dan bootstrap tanpa sesi 401.

Pemilik kini membuat akun kasir/dapur pada usaha yang sama melalui Pengaturan akun, lalu mengubah peran atau status dengan konfirmasi. Kasir menangani intake dan penyerahan, dapur menangani tahap/perintah memasak. Server memakai daftar izin eksplisit dan proyeksi data per peran; staf tidak menerima laporan, resep, pemasok, kelompok atau pengaturan pemilik.

Penggantian akses mencabut semua sesi target, termasuk stream aktif; login berikutnya membaca role baru. Staf mempunyai Akun saya dan panduan Lanjut/Lewati. Prefiks API untuk halaman/modul staf melewati cache shell lama. Bukti kirim memakai namespace akun/peran/revisi; staf tidak menyimpan snapshot offline atau melihat draft pemilik.

Schema **27 tabel**. [Usaha asli](evaluation/staff-data-preservation.json) dan [demo](evaluation/staff-demo-preservation.json): **25 tabel lama identik**, akun lama menjadi owner, nol staf/tindakan tambahan otomatis. Tidak ada data dummy pada akun asli atau perubahan model/benchmark AI. [Panduan lengkap](STAFF_ROLES.md), [bukti rilis](evaluation/staff-release.json), [review UI](evaluation/STAFF_ROLES_UI_REVIEW.md), [preservasi desain](evaluation/STAFF_ROLES_DESIGN_CHECK.md).

Belum: reset/transfer pemilik, izin bebas, audit aktor terstruktur menyeluruh, kapasitas alat/staf, waste sebagian, SLA suara dua detik, pilot nyata dan deployment produksi. Catatan di bawah merupakan riwayat versi sebelumnya.

# Perubahan terbaru v0.35 — akses khusus layar pelanggan

**Validasi akhir: `npm test` selesai normal dengan exit 0 — 220 tes Node dan 41 browser, total 261 lulus.** Lima tes Node dan enam browser khusus akses layar termasuk total ini. Regresi memeriksa kedua temuan review: rahasia sementara dibersihkan saat sesi hilang/akun berganti, dan kode tab tersembunyi disembunyikan sampai otorisasi baru. [Bukti rilis](evaluation/display-release.json), log `data/display-npm-test-final.log`, [review dua perbaikan](evaluation/CUSTOMER_DISPLAY_UI_REVIEW.md), [preservasi desain](evaluation/CUSTOMER_DISPLAY_DESIGN_CHECK.md). Model/benchmark Python tidak diulang karena tidak berubah.

Pemilik kini dapat membuat tautan bernama dengan masa aktif dan pencabutan melalui **Pengaturan akun → Layar pelanggan**. Halaman pelanggan tidak memerlukan sesi pemilik, tidak memanggil bootstrap akun dan hanya menerima kode/status antrean usaha terkait. Tidak ada menu, harga, stok, resep, label pelanggan atau catatan pribadi di proyeksi API.

Kunci acak hanya ada di memori pembuatan/fragment tautan. SQLite menyimpan SHA-256; daftar akses hanya metadata. Pembuatan ulang setelah respons hilang menggunakan kunci sama secara eksplisit. Pindah halaman/scope/logout/reload menghapus tautan sementara. Koneksi hilang/akses dicabut menyembunyikan kode dan tab kembali terbuka memeriksa otorisasi lagi. HTML melalui prefiks API melewati cache navigasi PWA lama.

Schema menjadi 25 tabel. [Preservasi data asli](evaluation/display-data-preservation.json) dan [demo](evaluation/display-demo-preservation.json) membuktikan 24 tabel lama identik, tabel akses baru kosong. Tidak membuat tautan/akun/pesanan contoh pada data nyata. Belum ada peran kasir/dapur, deployment lintas perangkat, target suara dua detik atau validasi TV lapangan. [Cara memakai dan batas](CUSTOMER_DISPLAY.md).

Regresi dan health v0.35 tersedia pada `evaluation/display-release.json`; server asli 4174 dan demo 4180 aktif pada kode terbaru. Bagian v0.34 dan sebelumnya di bawah merupakan riwayat.

# Perubahan terbaru v0.34 — prioritas operasional dapur

**Validasi akhir: `npm test` selesai normal dengan exit 0 — 215 tes Node dan 35 browser, total 250 lulus.** Browser dibatasi satu worker setelah percobaan paralel mengalami timeout karena perebutan sumber daya; log percobaan tetap disimpan. Server asli 4174 dan demo 4180 merespons health, aset dapur tersedia dan API tanpa sesi ditolak. [Bukti rilis](evaluation/kitchen-release.json), log `data/kitchen-npm-test-sequential.log`. Pemeriksaan UI `ship`, preservasi main/demo serta hash desain sudah dicatat. Tidak mengulang training/benchmark Python untuk integrasi ini dan tidak menyebut tes teknis sebagai akurasi lapangan.

SRS Smart Kitchen Command Center kini digabung sebagai modul **Operasional dapur** dan **Layar layanan**, dengan Node.js/ES modules tetap sesuai pilihan pengguna. Dapur menjadi halaman awal; Ringkasan, Catat pesanan langsung, forecasting, kulakan, surplus dan histori tetap tersedia.

Sudah dibuat: waktu/stasiun menu, antrean multi-item, SJF dengan aging, pengerjaan paralel lewat tahap pasif, cadangan bahan, snapshot harga/resep, penyelesaian sekali, pembatalan sebelum kerja dan konfirmasi pemakaian seluruh bahan setelah kerja. SSE memperbarui layar kedua, dengan penanda gangguan koneksi dan pemulihan fokus keyboard. Kendali suara memakai adapter lama dalam rekaman empat detik dan parser perintah terbatas; tidak ada klaim akurasi/latensi lapangan.

Migrasi menambah empat tabel kosong. **Seluruh 20 tabel lama identik dengan backup sebelum integrasi.** [Bukti](evaluation/kitchen-data-preservation.json). Tidak ada data demo di akun nyata atau perubahan bobot model. [Review UI](evaluation/KITCHEN_UI_REVIEW.md) memberi disposisi `ship` pada lingkup dapur/layanan, bukan kesiapan produksi.

Belum terpenuhi: SLA suara dua detik, integrasi katalog/pesanan eksternal, peran staf/token pelanggan publik, kapasitas alat/staf, waste sebagian, pilot nyata dan deployment produksi. [Panduan dan pemetaan lengkap](KITCHEN_INTEGRATION.md).

Angka/hasil versi lama di bawah merupakan catatan historis. Bukti regresi akhir integrasi tersedia pada `evaluation/kitchen-release.json`.

# Progres Gerai Kita

Pembaruan: **17 Oktober 2026 — v0.33.0**.

Tahap sekarang: **prototipe lokal dengan alur usaha dan kelompok yang berfungsi, ditambah eksperimen forecasting publik yang sudah dilatih dan dievaluasi**. Aplikasi belum menjadi layanan produksi atau pilot UMKM Indonesia yang tervalidasi. Persentase tunggal tidak dipakai karena kesiapan kode, mutu AI dan kesiapan data lapangan merupakan hal yang berbeda.

## Tambahan pada pekerjaan terbaru

- V0.33 memenuhi permintaan satu akun presentasi lengkap: **[DEMO] Kedai Bu Sari** pada **http://127.0.0.1:4180**, dengan database harian terpisah dari usaha asli. Delapan bahan, enam menu/resep, histori 84 hari, 173 penjualan awal, 106 penerimaan, review, kulakan dan surplus. Dua bisnis berlabel simulasi mendukung rincian kelompok tanpa akun login tambahan. [Akses dan alur presentasi](DEMO_ACCOUNT.md).
- Generator opt-in memakai fungsi aplikasi dan clock simulasi lokal prosesnya, memverifikasi saldo terhadap ledger serta pemakaian terhadap resep penjualan aktif. Menjalankan ulang mempertahankan data demo hari yang sama; tidak ada seed/reset pada runtime utama, training dari simulasi atau klaim akurasi baru. Semua 20 tabel usaha asli tetap sama dengan backup.
- Tiga tes demo lulus, dan browser membuka delapan halaman kerja tanpa error JavaScript; login/extraksi/pencatatan diuji pada database demo/fixture terpisah. Pemeriksaan Node gabungan mencatat **207 lulus**, lalu seluruh **32 kasus browser** melaporkan `ok`. Runner browser menggantung saat penutupan dan dihentikan setelah kasus selesai; **ini bukan klaim `npm test` exit 0**. Log awal juga mempertahankan satu kegagalan tes lama yang mengasumsikan pembelian 30 telur selalu cukup; tes diperbaiki agar memakai kebutuhan aktual hari itu, tetap memeriksa saran setelah stok mencukupi menjadi nol. [Pemeriksaan browser demo](evaluation/presentation-demo-browser.json), [preservasi usaha asli](evaluation/presentation-demo-live-preservation.json).

- V0.32 menyimpan tinjauan pemilik pada Saran kulakan: pilih Sudah diperiksa/Perlu tindak lanjut, catatan opsional dan konfirmasi. Hasil bertahan setelah reload, ringkasan per bahan memisahkan tindak lanjut dan data yang berubah. Fingerprint target/56 referensi serta revisi sesi mencegah penyimpanan pada data lama; retry identik hanya menambah satu event. [Cara memakai](USAGE_DECISIONS.md).
- Delapan tes backend dan empat browser mencakup simpan/reopen, migrasi, perubahan data/gap, konflik, scope/login/CSRF/origin, escaping, offline dan respons hilang. Seluruh 19 tabel lama tetap sama; tabel ke-20 ditambahkan kosong. Review tidak mengubah transaksi, stok, forecast, model atau label riset. Server lokal dimulai ulang; shell v32 siap diperbarui.

- V0.31 menjalankan diagnostik decoder dengan protokol sebelum inferensi: 24 transkripsi Base pada dua klip publik lama, plain/deferred dan enam pengulangan. Pencatatan tahap diperluas hingga prompt/opsi/token/skor decoder, segmen dan teks. Seluruh 36 replay dari buffer encoder yang ditahan cocok tanpa mutasi input; tujuh tes Node dan tiga Python baru lulus. [Hasil lengkap](evaluation/ASR_DECODER_RESULTS.md), [cara audit](ASR_DECODER.md).
- **Base pinned plain kembali menghasilkan dua varian teks dalam enam pengulangan** pada konfigurasi numerik yang sama. Semua tahap deferred cocok, sehingga tahap pertama variasi plain belum tertangkap. Audit/checkpoint/hash lulus, tetapi `causeEstablished=false`, `fixValidated=false`, `readyForPromotion=false` tetap berlaku. Tidak ada perbaikan yang diklaim, training, skor WER baru atau perubahan default Tiny.

- V0.30 menyiapkan evaluasi review pemakaian: ekspor satu bahan berizin dengan semua tanggal target, protokol beku sebelum anotasi, label/konteks/kelengkapan manusia, pengukuran precision/recall/F1, coverage, abstain dan beban review. Hash input/sumber mencegah penggunaan protokol yang sama setelah data/aturan berubah; keluaran lama tidak ditimpa. Tiga belas tes baru memakai fixture sementara, bukan penilaian lapangan. [Cara memakai](USAGE_EVALUATION.md).
- Akun aktif tetap belum mempunyai histori pemakaian untuk evaluasi. Pengumpulan berizin dan validasi lapangan tetap terbuka; tidak ada label buatan, model baru, perubahan threshold, aktivasi model atau keputusan bisnis otomatis.

- V0.29 menyediakan **tur pengenalan berpanah** di atas aplikasi: pengenalan Gerai Kita, lalu perpindahan fitur satu per satu melalui Lanjut. Target nyata disorot dengan lubang pada latar yang diredupkan; panah menghubungkan target dengan kotak penjelasan yang menyesuaikan ruang layar. Tur utama sesudah masuk 11 langkah; pengenalan sebelum masuk 5 langkah; katalog rinci 14 topik / 67 langkah. [Cara memakai](INTERACTIVE_GUIDE.md).
- Panah mengikuti scroll/resize dan ukuran target. Jika bagian belum tampil atau halaman berbeda, panah tidak dibuat; teks menjelaskan keadaan tersebut. Delapan tes kontrak dan delapan skenario browser menguji geometri, seluruh 67 langkah tanpa POST bisnis, panah untuk seluruh fitur tur utama, serta pembersihan saat skip. Progress v2 terpisah dari urutan lama; tidak mengubah akun, transaksi atau model AI.

- V0.28 menambah panduan interaktif untuk pengguna awam: tawaran Mulai/Lewati sebelum masuk dan setelah masuk, tur awal enam langkah, serta **14 topik / 61 langkah** lengkap yang dapat dicari dari nama fitur/tombol. Panduan per halaman, Lanjut/Kembali, penjelasan isian, pause/resume dan penyimpanan progress per akun/perangkat tersedia. UI menyorot bagian sebenarnya tanpa mengisi data, menekan konfirmasi atau meminta mikrofon otomatis. [Cakupan dan cara memakai](INTERACTIVE_GUIDE.md).
- Enam tes kontrak dan tujuh browser baru mencakup seluruh 61 langkah dengan nol POST bisnis, field editor yang tetap ada, skip/completion, replay/resume, offline, progress akun terpisah dan penolakan localStorage. Tur belum diuji dalam studi pemahaman bersama pemilik usaha awam. Tidak ada model AI baru atau perubahan training.

- V0.27 menghubungkan hasil pemeriksaan pemakaian ke API bootstrap akun dan panel **Saran kulakan → Periksa pemakaian bahan**. Ringkasan membedakan histori kosong, referensi kurang, tanggal yang perlu ditinjau dan hasil tanpa tanda pada hari yang benar-benar diperiksa. Rincian menampilkan jumlah, median/batas dan delapan pembanding tersimpan; daftar semua tanggal dibuka terpisah. Pada ponsel, tiap tanggal memakai label yang tetap terbaca. [Panduan panel](USAGE_REVIEW.md).
- Empat tes backend dan empat browser baru menguji kesamaan dengan aturan CLI, forecast yang sama, login/scope usaha, koreksi/gap, keyboard, escaping, offline dan snapshot lama. Data fixture hanya ada pada database sementara/memory. Panel tidak menyimpan keputusan review atau mengoreksi transaksi otomatis; akurasi anomali lapangan tetap belum dinilai.

- V0.26 menyelesaikan penyaring awal anomali pemakaian melalui `npm run forecast:anomalies`: pembanding median/MAD delapan hari sejenis sebelumnya, dengan syarat seluruh 56 tanggal referensi tersimpan. Tanggal kosong tidak diisi nol; keputusan ditahan bila data kurang. Referensi tidak memakai target atau data masa depan. Laporan privat menunjukkan tanggal, jumlah, median, MAD, ambang dan kandidat review. [Aturan dan penggunaan](USAGE_ANOMALIES.md).
- Empat belas tes kontrak baru lulus. Audit database aktif tetap menemukan satu bahan tanpa histori, sehingga nol hari diperiksa dan **belum ada skor akurasi anomali**. Kesamaan seluruh 19 tabel terhadap backup diverifikasi. Belum ada panel/API, notifikasi, pelatihan detektor, koreksi otomatis atau fitur libur/cuaca. [Bukti](evaluation/usage-anomalies-release.json).

- V0.25 menghubungkan profil kandidat ke aplikasi melalui pilihan CLI/env yang divalidasi sebelum SQLite dibuka. **`npm run start:base` → http://localhost:4176**, dan `npm run doctor:base` memeriksa model/profil server yang sebenarnya beserta model lokal yang sesuai. `npm start` tetap singleton/worker Tiny asli di port 4174; tidak ada penggantian berdasarkan skor secara otomatis. Sepuluh tes baru mencakup default, prioritas konfigurasi, port, penolakan salah profil dan pemeriksaan doctor.
- Dua smoke CLI → HTTP → Python pada database sementara lulus: 401 tanpa login, 403 tanpa CSRF/origin yang benar, respons Base/Tiny yang sesuai, doctor salah profil ditolak, dan seluruh 19 tabel tiap database tetap sama setelah transkripsi. Database sementara dibersihkan; data usaha aktif tidak digunakan oleh smoke.
- Bukti awal tetap menyimpan **dua transkrip berbeda** terhadap v0.24, termasuk Base pinned. Run setelah dukungan port juga mempertahankan perbedaan tersebut. Empat capture deferred pada klip Base cocok antarcapture, tanpa menangkap tahap yang berubah. **Variasi belum selesai, kandidat belum dipromosikan, tidak ada training/skor akurasi baru.** [Cara menjalankan dan bukti](RUNTIME_SPEECH.md).

- V0.24 menambah adapter profil opt-in dengan checksum/identitas model dan pengaturan BLAS sebelum impor native. Tiga kandidat: Tiny current, Tiny pinned, Base pinned. Transport, batas, timeout, abort dan konkurensi menggunakan kode yang sama; default HTTP/model aktif tetap Tiny. Sebelas tes kontrak tambahan.
- Evaluasi **16 validation/24 test baru** mengeluarkan 128 rekaman terdahulu, tanpa overlap identitas/teks/hash audio. Base pinned dipilih lewat validation sebelum test. WER test **36,99%** dibanding Tiny current **86,59%**; galat relatif lebih rendah **57,28%**, lebih sedikit galat pada 22/24 klip dan dua seri. Tiny pinned justru **97,36%**; hasil buruk tetap dilaporkan. p95 test Base 9,735 detik vs Tiny current 8,199 detik pada run laptop ini, bukan jaminan latensi umum.
- **120 inferensi utama dan 24 pengulangan** selesai; dua klip test pertama per profil diulang empat kali dan semuanya cocok. Baseline juga cocok, sehingga tidak membuktikan pinning memperbaiki variasi. Capture bersyarat sudah ditetapkan protokol tetapi tidak terpicu pada run ini. Preparasi ulang sumber, hash model/audio, skor, keputusan dan seluruh pengulangan cocok saat audit. **Belum ada penyebab/perbaikan tervalidasi, aktivasi atau training baru.** [Hasil](evaluation/ASR_PROFILE_RESULTS.md), [audit](evaluation/asr-profile-audit.json), [panduan](ASR_PROFILES.md).

- Tindak lanjut v0.23: **68 inferensi tambahan** (64 plain/deferred dan empat capture Tiny), serta **112 pemeriksaan kernel alignment** pada satu klip publik yang sudah dilihat. Pengulangan cocok di delapan kelompok pada run ini; semua pemeriksaan alignment cocok dengan referensi masing-masing. Ini hasil negatif terhadap dua cara memancing variasi, bukan bukti universal kestabilan.
- Pada **16/16 pasangan baseline vs OpenBLAS satu thread**, perubahan pertama terletak di **proyeksi mel**, sesudah input PCM/window/filter/STFT/magnitudes yang sama. Kegagalan historis konfigurasi tetap masih belum tertangkap bersama hash tahapnya. Belum ada perbaikan, training, promosi model atau skor akurasi baru. [Hasil](evaluation/ASR_FOLLOWUP_RESULTS.md), [metode/perintah](ASR_FOLLOWUP.md).
- Registry baru mematok bukti v0.21/v0.22 dan kedua run tindak lanjut tanpa menulis ulang laporan lama. Tujuh tes baru membedakan perubahan isi dari alamat buffer, mendeteksi tahap pertama, dan menolak trace gagal/cakupan kernel yang tidak lengkap atau hasil numerik yang bertentangan.

- Diagnostik variasi ASR: **136 inferensi proses baru** pada dua rekaman publik yang sudah diketahui bermasalah, tanpa training atau skor test baru. Hash tahap, urutan impor dan kontrol satu faktor disimpan lengkap. Pada empat dari 20 kelompok tanpa hash tensor, transkrip berbeda dalam konfigurasi yang sama; 22 kelompok instrumentasi cocok pada pengulangan yang diamati. Kelompok tersebut bukan 22 klip unik.
- Mengubah hanya thread OpenBLAS ke satu mempertahankan PCM/VAD/filter mel tetapi mengubah fitur mel dan encoder kedua model; teks Tiny berubah, Base sama. Ini bukti sensitivitas backend pada klip tersebut, **belum bukti penyebab variasi historis**. `causeEstablished=false`, `fixValidated=false`, `readyForPromotion=false`; model aktif tetap Tiny. [Hasil](evaluation/ASR_STABILITY_RESULTS.md), [metode/perintah](ASR_STABILITY.md).
- Analyzer memeriksa registry hash, sumber/model/audio, kelengkapan cohort dan kegagalan repeat lama. Tujuh tes tambahan menolak cohort tidak lengkap/duplikat, audio berubah dan bukti tahap yang hilang; pengulangan penolakan tidak dihitung sukses. Tidak ada dependency, bobot atau data usaha baru.

- Perbandingan Tiny/Base memakai 16 kalimat validation dan 48 test yang belum dinilai, tanpa overlap kalimat/referensi/audio dengan run lama dan antar-split. Base dipilih melalui validation dengan empat gate yang dipatok sebelum inferensi; hash keputusan ditulis sebelum test dimulai.
- Pada **satu run**, WER test Base **36,36%** vs Tiny **66,93%**, CER Base 13,74% vs Tiny 31,72%. Base memiliki lebih sedikit galat pada 43 rekaman, Tiny pada satu, empat seri. Base p95 2,23 detik vs Tiny 1,91 detik pada run ini; bukan jaminan perangkat umum.
- Audit data/hash/skor/keputusan lulus, tetapi **reproduksi prediksi gagal: 3/4 transkrip berubah**. Ketidakcocokan awal dan keluaran asli/pengulangan disimpan; skor utama tidak diganti agar tampak lebih baik. Penyebab variasi belum terbukti, `readyForPromotion=false` dan model aktif tetap Tiny. [Hasil lengkap](evaluation/ASR_COMPARISON_RESULTS.md), [audit/repeat](evaluation/asr-comparison-reproducibility.json).
- Base multilingual pretrained terpasang dengan source lock/checksum terpisah; tidak ada training/fine-tuning, aktivasi model baru, atau perubahan runtime akun. Delapan tes tambahan untuk pemisahan data/pemilihan/pairing. [Panduan](ASR_COMPARISON.md).

- Alat evaluasi ASR pada suara nyata publik FLEURS `id_id`, CC BY 4.0: revisi/checksum sumber dipatok, 64 dari 687 rekaman test dipilih lewat hash sebelum inferensi, tanpa seleksi berdasarkan hasil atau cropping.
- Hasil publik **belum menunjukkan pengenalan andal**: WER 67,27%, CER 27,64%, exact match 0/64. Ada 58 transkrip dan enam penolakan, seluruhnya tetap dinilai; satu sampel melampaui batas ukuran/durasi. Latensi adapter/Python/model p50 3,96 detik, p95 5,73 detik pada run ini, bukan jaminan latensi umum.
- Jalur produksi Whisper Tiny dievaluasi tanpa training/fine-tuning. WER/CER, exact match, galat substitusi/penghapusan/penyisipan, penolakan, latensi p50/p95 dan kelompok durasi disimpan. [Hasil aktual dan analisis](evaluation/FLEURS_ASR_RESULTS.md), [protokol/reproduksi](FLEURS_ASR.md).
- Delapan tes skor/pemilihan ditambahkan. Lingkungan `.venv-speech-data` memisahkan PyArrow pembaca batch dari runtime ASR dan forecasting. Ini bukti pada sampel suara pembacaan umum; belum validasi pesanan, speaker pemilik usaha atau mikrofon pengguna. Data usaha tidak menerima audio/transaksi publik.

- TODO infrastruktur suara selesai: Whisper Tiny multilingual pretrained terpasang dan terverifikasi, inferensi CPU int8 lokal. Perekaman, koreksi transkrip, pemakaian teks eksplisit dan review pesanan tersedia; audio tidak disimpan atau dikirim ke cloud.
- Batas 1 MiB/30 detik hasil dekode, satu inferensi CPU, timeout/abort, validasi login/origin/CSRF, penghentian mikrofon saat batal/navigasi/offline dan penolakan hasil terlambat sudah diuji. Data usaha aktif dipertahankan; tidak ada transaksi contoh.
- Pada rilis suara v0.19 ditambahkan tujuh tes Node, tujuh Python dan empat browser. Saat rilis itu belum ada benchmark ASR; v0.20 menambah skor publik di atas. Uji suara pemilik usaha tetap belum tersedia. Whisper dan Qwen tetap pretrained. [Panduan suara](VOICE_BOOKKEEPING.md), [bukti rilis v0.19](evaluation/voice-release.json).

- TODO eksperimen transfer boosting selesai: satu varian sales-only dilatih hanya pada FreshRetailNet, lalu bobot tetap diuji pada 10 negara UCI baru / 190 target. Tidak ada fitur stockout buatan atau fitting di UCI.
- Hasil **belum mengalahkan baseline**: mean-country WAPE model 173,00% vs MA7 165,12% dan MA14 156,51%; hanya 1/10 negara menang atas MA7. Semua hasil negatif disimpan dan tidak diaktifkan ke akun.
- Refit sumber, agregasi workbook ulang, koreksi model dan 190 prediksi identik. Tujuh tes baru lulus. Analisis memuat 121 target dua hari dengan SUM event nol, tanpa menghapus kasus tersebut. [Panduan](BOOSTING_TRANSFER.md), [hasil](evaluation/BOOSTING_TRANSFER_RESULTS.md), [analisis error](evaluation/BOOSTING_TRANSFER_ERROR_ANALYSIS.md).
- Ini varian baru dengan fitur yang tersedia di kedua sumber. Bobot v2 asli memerlukan stockout dan belum ditransfer langsung. Kalender UCI telah diketahui dari eksperimen sebelumnya, sehingga hasil bukan validasi kalender yang sepenuhnya baru.

Tambahan v0.17 yang tetap tersedia:

- TODO replikasi metode pada sumber/domain/kalender berbeda selesai: UCI Online Retail, empat model Ridge tambahan dan 76 target test eksternal pada November–Desember 2011.
- WAPE ternormalisasi Ridge 54,41% vs MA7 62,99%; raw-unit Ridge 32,92% kalah dari pola mingguan 24,92%. Seluruh negara/metode disimpan, bukan hanya yang menguntungkan.
- Protokol dan checksum konten dibekukan; preparasi ulang dari workbook menghasilkan hash sama dan empat model/76 prediksi identik. Delapan tes baru. [Hasil](evaluation/UCI_RETAIL_RESULTS.md), [analisis error](evaluation/UCI_RETAIL_ERROR_ANALYSIS.md), [sumber](../datasets/public/uci-online-retail/README.md).
- Ini replikasi algoritme dengan training ulang pada agregat negara dari satu peritel, belum transfer model boosting atau validasi UMKM Indonesia. Model publik tetap terpisah dari akun.

Tambahan v0.16 yang tetap tersedia:

- Audit kesiapan forecasting melalui `npm run forecast -- readiness`, membaca ledger dan registry tanpa mengubah data.
- Pemisahan nol tercatat, nol asumsi, tanggal sebelum histori dan rentang kandidat training yang masih memerlukan verifikasi pemilik; metadata yang sama tersedia pada rekomendasi API.
- Ringkasan perubahan pemakaian tujuh hari terakhir terhadap tujuh hari sebelumnya, dengan penanda nol asumsi; belum merupakan detektor drift/anomali atau retraining otomatis.
- Sembilan tes audit baru. Panduan: [FORECAST_READINESS.md](FORECAST_READINESS.md).

Tambahan v0.15 yang tetap tersedia:

- Alat evaluasi ekstraksi chat membandingkan parser, Qwen mentah dan pipeline aplikasi yang sebenarnya.
- Validasi sumber/izin/anotasi, pemisahan percakapan antar-split, hash dataset, hasil per kasus, false acceptance, fallback dan latensi.
- Helper pemanggilan model bersama aplikasi/evaluator; validasi keluaran juga menolak field tambahan, ID duplikat dan struktur yang tidak sesuai.
- Template dataset chat tetap kosong; panduan anotasi dan penggunaan ada di [CHAT_EVALUATION.md](CHAT_EVALUATION.md).
- Sepuluh tes baru untuk evaluasi chat; tidak ada chat buatan yang dimasukkan ke akun pengguna atau diklaim sebagai evaluasi lapangan.

## Aplikasi yang sudah dibuat

| Bagian | Status dan perilaku saat ini | Batas yang perlu diketahui |
|---|---|---|
| Tampilan dan navigasi | Delapan halaman kerja dan halaman Panduan penggunaan, warna krem/terakota, tampilan mobile, keadaan kosong dan pesan pemulihan | Diuji di browser; belum ada studi kegunaan dengan pemilik usaha |
| Akun dan kelompok | Registrasi/login/logout, usaha sendiri, membuat/bergabung kelompok dengan kode undangan | Belum ada verifikasi email dan pemulihan kata sandi |
| Pengaturan | Ubah nama usaha, nama kelompok oleh pengelola, rotasi undangan, perubahan password yang mengeluarkan sesi lain | Pemakaian lokal |
| Katalog dan resep | Bahan, satuan, menu, alias, harga serta resep dari input pemilik | Tidak ada katalog/harga/resep bisnis bawaan |
| Barang masuk dan stok | Penerimaan, konversi satuan metrik yang kompatibel, ledger, koreksi dengan alasan | Bukan pemeriksaan stok fisik otomatis |
| Pencatatan pesanan | Manual, chat atau suara lokal → koreksi teks → review sebelum konfirmasi, snapshot harga/resep, pemakaian bahan, pembatalan dan CSV | Whisper pretrained; akurasi suara lapangan belum dievaluasi, variasi pesanan tetap diperiksa manusia |
| Saran kulakan | Baseline, pipeline Ridge pribadi dengan aktivasi bersyarat, audit ledger/model dan metadata cakupan histori di API | Akun aktif belum punya model pribadi/histori cukup; rincian audit tersedia di CLI/API, belum panel khusus |
| Beli bersama | Kebutuhan dengan izin, rincian setelah tiga usaha aktif memberi izin, quote pemasok aktual, minimum, ongkir dan persetujuan per versi | Menyimpan rencana internal; belum mengirim pesanan/pembayaran ke pemasok |
| Penerimaan kolektif | Penerimaan parsial, ongkir sekali, koreksi, siklus berikutnya dengan penawaran baru | Anggota mencatat barang yang benar-benar diterima |
| Surplus | Tawaran pemilik, reservasi dan transfer setelah persetujuan dua pihak | Belum ada pengantaran atau transaksi pembayaran |
| Offline/PWA | Shell, snapshot, draft dan bukti tindakan tertunda, pemulihan respons hilang, pembaruan aplikasi | Tidak mengirim mutasi otomatis saat online kembali |
| Penyimpanan/operasional | SQLite, backup konsisten, pemeriksaan read-only, pemulihan cache lama | Belum ada hosting publik, pemantauan produksi dan uji beban |

Implementasi utama ada di `public/`, `server/` dan `scripts/`. Bukti alur diuji dengan database memory/file sementara melalui `npm test`. Tes terisolasi tidak menambah catatan ke database usaha aktif.

## AI: yang benar-benar sudah dilatih

| Komponen | Sudah ada | Belum ada / batas hasil |
|---|---|---|
| Qwen2.5 1.5B | Terpasang melalui Ollama; ekstraksi sesuai katalog dan fallback parser | **Pretrained**, belum dilatih ulang/fine-tune oleh tim; belum ada skor chat lapangan |
| Ridge pribadi | Kode training target dua hari, minimum 84 hari lengkap, impor/ekspor, split waktu, baseline, artefak dan registry | **Belum dilatih untuk akun usaha aktif** karena belum ada dataset pribadi lengkap |
| Ridge publik v1 | 500 model terlatih dari 45.000 catatan harian nyata FreshRetailNet, sumber/lisensi/hash dicatat | WAPE test v1 35,65%, kalah dari MA7 26,88% pada test v1 |
| Boosting publik v2 | Satu model gabungan dilatih dari 19.000 target dua hari pada 500 seri; test 200 toko terpisah / 600 target | WAPE 24,83% dibanding MA7 27,04% pada test v2; galat relatif turun 8,16%; 113/200 seri menang |
| Replikasi UCI | Empat Ridge tambahan dari 1.336 agregat harian development; 76 target eksternal pada domain/kalender berbeda | WAPE ternormalisasi 54,41% vs MA7 62,99%; raw Ridge 32,92% kalah dari pola mingguan 24,92%. Training ulang metode, bukan transfer bobot boosting |
| Transfer sales-only | Satu boosting tambahan dilatih pada sumber FreshRetailNet yang sama, lalu bobot tetap diuji di 10 kelompok UCI baru / 190 target | Mean-country WAPE 173,00% vs MA7 165,12%; transfer belum mendukung penerapan. Bukan bobot v2 asli atau validasi kalender buta |
| Reproduksi | 500 model v1 identik ketika diulang; 600 prediksi v2 identik dari refit konfigurasi tetap dan pemeriksaan sumber | Pengulangan bukan test independen baru |
| Evaluasi chat | Infrastruktur pembanding, validator dataset, template kosong dan 10 tes kontrak | Belum ada chat aktual berizin/berlabel yang dijalankan; tidak ada skor pengganti |
| Pemeriksaan anomali | Penyaring median/MAD kausal dengan gate cakupan ledger, CLI, API akun dan panel Saran kulakan; 14 tes aturan serta 4 backend/4 browser integrasi. Alat ekspor/anotasi/protokol/evaluasi dengan 13 tes tambahan | Heuristik review, bukan model terlatih; alat precision/recall tersedia tetapi belum ada histori akun/label untuk menilai mutu lapangan, notifikasi atau fitur libur/cuaca |

**Model publik belum digunakan untuk memprediksi bahan akun.** Satuannya normalized sales dari sumber, tidak otomatis sama dengan gram/buah atau pemakaian bahan. Kalender test v2 sama dengan v1; hasilnya menunjukkan transfer ke toko lain pada kalender tersebut, belum generalisasi waktu baru atau usaha Indonesia. Kedua run memakai sampel test berbeda, sehingga angka Ridge v1 dan boosting v2 bukan perbandingan langsung pada sampel yang sama.

File yang sedang kamu buka, `server/ml/forecast-model.mjs`, berisi **algoritme/pipeline training Ridge**, bukan seluruh bobot hasil pelatihan. Bobot Ridge tersimpan pada JSON per seri; pohon boosting tersimpan di `pooled-model.joblib`. Buka [AI_MODEL_INDEX.md](evaluation/AI_MODEL_INDEX.md) untuk tautan artefak, metadata dan semua prediksi. [Hasil v1](evaluation/FRESHRETAILNET_RESULTS.md), [hasil v2](evaluation/FRESHRETAILNET_V2_RESULTS.md), [panduan training](AI_TRAINING.md).

## Kondisi data usaha saat diperiksa

Pemeriksaan read-only 16 Oktober 2026 menemukan **1 akun, 1 usaha, 1 bahan, 0 menu, 0 penjualan, 0 histori pemakaian dan 0 penerimaan** pada database aktif. Ini kondisi catatan yang tersedia, bukan batas kemampuan fitur. Tidak ada histori pengganti yang dibuat. Saran forecast dan penyaring anomali akun masih belum cukup data; akurasi chat belum dinilai. [Bukti terkini](evaluation/usage-anomalies-release.json).

Bukti terbarui: [live-evaluation.json](evaluation/live-evaluation.json). Database aktif: `data/gerai-kita-live.sqlite`; database lama tetap terpisah. Ketersediaan server, integritas SQLite, 15 aset dan Ollama diperiksa melalui [progress-health.json](evaluation/progress-health.json).

## Hasil pemeriksaan kode

**236 tes lulus melalui `npm test` pada pemeriksaan terbaru v0.32:** 204 backend/operasional/ML/chat/audit/suara/anomali/panduan/evaluasi dan 32 browser. Delapan backend/empat browser review baru sudah termasuk total. Log regresi: `data/usage-decisions-npm-test.log`. Tiga tes Python decoder lulus pada v0.31 dan 26 tes Python lama tercatat pada v0.25; suite Python tidak diulang untuk perubahan review ini. Tes software bukan skor mutu lapangan dan tidak menghapus variasi ASR yang belum diperbaiki.

V0.32 mempertahankan schema/isi seluruh 19 tabel asli dan menambah `usage_review_decisions` kosong. Akun aktif tetap mempunyai satu bahan tanpa histori; tidak ada review contoh yang diisi agar tombol muncul. Preview **http://localhost:4174** dimulai ulang pada kode baru dengan Tiny tetap default. Review UI memberi disposisi **ship** pada lingkup fitur ini. [Pemeriksaan rilis](evaluation/usage-decisions-release.json), [health](evaluation/usage-decisions-health.json), [preservasi migrasi](evaluation/usage-decisions-data-preservation-final.json), [review UI](evaluation/USAGE_DECISIONS_UI_REVIEW.md), [pemeriksaan desain](evaluation/USAGE_DECISIONS_DESIGN_CHECK.md).

V0.31 mempertahankan seluruh 19 tabel usaha sesuai backup. 24 transkripsi/36 replay hanya memakai dua audio publik di luar SQLite; tidak ada data dummy, bobot baru, perubahan worker atau antarmuka. [Pemeriksaan rilis](evaluation/asr-decoder-release.json), [health](evaluation/asr-decoder-health.json), [preservasi data](evaluation/asr-decoder-data-preservation.json), [audit eksperimen](evaluation/asr-decoder-results.json).

V0.30 mempertahankan seluruh 19 tabel usaha sesuai backup. Akun aktif memiliki satu bahan tanpa histori pemakaian; evaluasi lapangan tidak dijalankan dan metriknya tetap null. Kode/shell UI, sumber forecasting dan ASR tetap dipertahankan. [Pemeriksaan rilis](evaluation/usage-evaluation-release.json), [health](evaluation/usage-evaluation-health.json), [preservasi data](evaluation/usage-evaluation-data-preservation.json), [panduan evaluasi](USAGE_EVALUATION.md).

V0.29 mempertahankan seluruh 19 tabel usaha sesuai backup sebelum pekerjaan. Tur pengenalan dan panah menunjuk target nyata tanpa transaksi otomatis. Preview tetap **http://localhost:4174**; shell v29 memuat tur terbaru. Review UI berdisposisi **ship** untuk koreksi tur berpanah; ini belum merupakan persetujuan pengguna atau studi pemahaman pengguna awam. [Pemeriksaan rilis](evaluation/guide-arrow-release.json), [health](evaluation/guide-arrow-health.json), [preservasi data](evaluation/guide-arrow-data-preservation.json), [review UI](evaluation/GUIDE_ARROW_UI_REVIEW.md), [pemeriksaan desain](evaluation/GUIDE_ARROW_DESIGN_CHECK.md).

V0.28 mempertahankan seluruh 19 tabel usaha sesuai backup sebelum pekerjaan. Panduan hanya menavigasi halaman dan menyimpan progress lokal; tidak ada akun, histori atau transaksi contoh di data aktif. Preview tetap **http://localhost:4174**; pembaruan shell v28 menyediakan modul panduan. [Pemeriksaan rilis](evaluation/guide-release.json), [health](evaluation/guide-health.json), [preservasi data](evaluation/guide-data-preservation.json), [review UI](evaluation/GUIDE_UI_REVIEW.md), [pemeriksaan desain](evaluation/GUIDE_DESIGN_CHECK.md). Pengujian pemahaman dengan pengguna awam belum dilakukan.

V0.27 mempertahankan seluruh 19 tabel usaha sesuai backup sebelum perubahan. Satu bahan aktif belum mempunyai histori pemakaian; panel tidak membuat data atau skor pengganti. Preview telah dimulai ulang untuk memuat API baru pada **http://localhost:4174**; default suara tetap Tiny. [Pemeriksaan rilis](evaluation/usage-review-release.json), [health](evaluation/usage-review-health.json), [preservasi data](evaluation/usage-review-data-preservation.json). Review UI berdisposisi **ship** untuk lingkup panel baru; [laporan](evaluation/USAGE_REVIEW_UI_REVIEW.md), [pemeriksaan konsistensi desain](evaluation/USAGE_REVIEW_DESIGN_CHECK.md). Drift sidecar desain lama dicatat tanpa perbaikan di luar lingkup.

Pemeriksaan server, aset, SQLite/Ollama dan preservasi data: [progress-health.json](evaluation/progress-health.json), [progress-validation.json](evaluation/progress-validation.json). Bukti pemeriksaan v0.16 disimpan terpisah pada [forecast-readiness-release.json](evaluation/forecast-readiness-release.json). Preview lokal: **http://localhost:4174**.

V0.17 menambah eksperimen/alat benchmark terpisah; runtime usaha tetap menggunakan implementasi yang sudah ada. [Reproduksi UCI](evaluation/uci-retail-reproducibility.json), [verifikasi rilis UCI](evaluation/uci-retail-release.json).

V0.18 juga terpisah dari runtime usaha. [Reproduksi transfer](evaluation/boosting-transfer-reproducibility.json), [verifikasi rilis transfer](evaluation/boosting-transfer-release.json). Total artefak publik: 504 Ridge dan dua boosting; kedua boosting memakai kembali data sumber yang sama, bukan dua kumpulan target sumber unik.

V0.19 memperbarui runtime dengan suara lokal. [Pemeriksaan operasional terbaru](evaluation/voice-health.json) lulus pada server yang sudah dimulai ulang; [verifikasi rilis suara](evaluation/voice-release.json) membuktikan 19 tabel data aktif sama dengan backup sebelum pekerjaan, model/checksum tersedia, dan smoke teknis lulus. [Review UI](evaluation/VOICE_UI_REVIEW.md) mencatat penyelesaian dua temuan pada lingkup fitur suara. Belum ada validasi mikrofon/ucapan pemilik usaha.

V0.20 hanya menambah evaluasi/alat riset; kode runtime tetap versi implementasi suara sebelumnya. [Health terbaru](evaluation/speech-health.json), [verifikasi rilis/data](evaluation/fleurs-asr-release.json), [reproduksi ASR](evaluation/fleurs-asr-reproducibility.json) memuat preparasi ulang seluruh 64 audio/referensi/skor dan delapan transkrip ulang identik. Semua 19 tabel usaha tetap sama dengan backup sebelum benchmark. Total model yang dilatih tetap 504 Ridge dan dua boosting; Whisper tidak dilatih ulang.

V0.21 juga mempertahankan kode runtime/model aktif. [Health](evaluation/asr-comparison-health.json), [pemeriksaan rilis/data](evaluation/asr-comparison-release.json) dan [audit/repeat](evaluation/asr-comparison-reproducibility.json) menunjukkan 19 tabel usaha tetap sama, audit data/skor lulus, dan repeat prediksi tidak lulus. Status `readyForPromotion=false` tetap ditampilkan; lulus tes software tidak menggantikan hasil eksperimen yang gagal.

## Yang belum selesai

1. **Data dan pilot nyata:** izin/catatan usaha Indonesia, histori harian lengkap, chat yang sudah diredaksi dan dianotasi, serta uji penggunaan oleh anggota sebenarnya.
2. **AI pribadi dan validasi tambahan:** training dari histori akun, kecocokan satuan/resep, verifikasi kelengkapan bersama pemilik, validasi pemantauan perubahan pola, serta perbaikan generalisasi/adaptasi dengan test baru. Replikasi Ridge dan eksperimen transfer sales-only selesai; hasil transfer negatif, bobot v2 asli belum diuji langsung. Audit deskriptif tersedia, belum ada retraining otomatis.
3. **Mutu ekstraksi:** jalankan evaluator pada chat nyata dengan split percakapan yang dibekukan, analisis kesalahan dan latensi, kemudian tentukan apakah parser/prompt/model perlu diperbaiki. Fine-tuning Qwen belum dilakukan dan bukan syarat otomatis sebelum hasil pembanding tersedia.
4. **Fitur proposal lanjutan:** validasi suara nyata berizin, validasi penyaring anomali dengan label manusia/split waktu dan evaluasi fitur hari libur/cuaca. Infrastruktur suara, penyaring CLI/panel, evaluator dan penyimpanan tinjauan pemilik tersedia; belum ada fine-tuning, skor ASR/anomali lapangan atau notifikasi otomatis.
5. **Operasional produksi:** hosting/HTTPS, pengelolaan layanan dan backup produksi, pemantauan, uji beban, verifikasi email serta pemulihan password.
6. **Integrasi bisnis eksternal:** pemesanan pemasok, pembayaran dan pengantaran, jika termasuk ruang lingkup rilis yang dipilih.

V0.22 mempertahankan seluruh 19 tabel data usaha sesuai backup awal pekerjaan. [Health terbaru](evaluation/asr-stability-health.json), [pemeriksaan rilis/data](evaluation/asr-stability-release.json) dan [diagnostik](evaluation/ASR_STABILITY_RESULTS.md) memisahkan kelulusan audit/software dari perbaikan ASR yang belum tervalidasi. Tidak ada dependency atau model baru.

V0.23 mempertahankan seluruh 19 tabel data usaha sesuai backup awal. Preview yang sempat tidak aktif sudah dijalankan kembali dengan database yang sama. [Health terkini](evaluation/asr-followup-health.json), [pemeriksaan awal sebelum server dinyalakan](evaluation/asr-followup-health-first.json), [pemeriksaan rilis/data](evaluation/asr-followup-release.json) dan [hasil diagnostik](evaluation/ASR_FOLLOWUP_RESULTS.md).

V0.24 mempertahankan seluruh 19 tabel usaha sesuai backup awal; default HTTP/model tetap Tiny. Factory kandidat tersedia terpisah. [Health](evaluation/asr-profile-health.json), [pemeriksaan rilis/data](evaluation/asr-profile-release.json), [hasil](evaluation/ASR_PROFILE_RESULTS.md), [audit](evaluation/asr-profile-audit.json). Seluruh laporan/sumber eksperimen lama dipertahankan.

V0.25: pilihan runtime dan doctor diuji tanpa mengubah profil server aktif. [Health](evaluation/runtime-speech-health.json), [pemeriksaan rilis/data](evaluation/runtime-speech-release.json), [bukti smoke awal](evaluation/runtime-speech-smoke-first.json), [smoke final](evaluation/runtime-speech-smoke.json), [capture](evaluation/runtime-speech-capture.json). Seluruh 19 tabel usaha sama dengan backup awal; hasil/sumber v0.24 dipertahankan.

Pekerjaan berikutnya: anotasi dan validasi penyaring anomali dengan data berizin, serta evaluasi fitur libur/cuaca dengan sumber/protokol terpisah. Panel dan penyimpanan tinjauan tersedia; notifikasi otomatis masih terbuka. Investigasi variasi ASR konfigurasi tetap juga belum selesai. Jalur lapangan: dataset chat/suara nyata berizin → evaluasi parser/Qwen/ASR → perbaikan berdasarkan validasi → pengujian pilot. Pekerjaan yang memerlukan data nyata tetap ditandai belum selesai, meskipun infrastrukturnya sudah dibuat. Rincian checklist: [AI_TODO.md](AI_TODO.md).
