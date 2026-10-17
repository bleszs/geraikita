# Prioritas terbaru v0.34

SRS dapur menjadi prioritas fungsi. Modul Dapur/Layanan, SJF+aging, tahapan pasif, reservasi/penyelesaian bahan, SSE, kendali suara terbatas dan pengaturan menu sudah ditambahkan. Teknologi dipertahankan atas pilihan pengguna. [Cakupan dan pekerjaan yang belum terpenuhi](KITCHEN_INTEGRATION.md).

Model AI lama dan fitur kelompok tetap ada. Kesiapan produksi, suara dua detik, staf/perangkat pelanggan berizin minimum, kapasitas alat dan koneksi kanal eksternal tetap terbuka.

# Status implementasi v0.33.0

Permintaan akun presentasi berdata contoh dipenuhi pada database/demo server terpisah. Satu login utama, dua bisnis simulasi tanpa login, katalog/resep, histori 84 hari, kulakan/surplus dan review; tidak dipakai training/evaluasi lapangan. [Akses demo](DEMO_ACCOUNT.md). Tiga tes demo dan verifikasi browser delapan halaman selesai; bukti preservasi seluruh 20 tabel usaha asli tersedia.

Tinjauan pemilik kini tersimpan per bahan/tanggal, dengan catatan, waktu, status data berubah, konflik revisi dan retry idempoten. Tidak mengubah stok/transaksi/model; offline tidak mengirim otomatis. Delapan tes backend/empat browser baru dan migrasi aditif tanpa perubahan pada 19 tabel lama. [Panduan](USAGE_DECISIONS.md).

Diagnostik decoder menyelesaikan 24 transkripsi publik dan 36 replay dengan audit hash/checkpoint. Base pinned plain memiliki dua versi teks pada konfigurasi tetap; tahap deferred/replay cocok sehingga penyebab/perbaikan belum terlokalisasi. Default tetap Tiny. [Hasil](evaluation/ASR_DECODER_RESULTS.md).

Alat evaluasi review pemakaian menyediakan ekspor berizin read-only, lembar anotasi semua tanggal, protokol sebelum anotasi, label manusia dan precision/recall/coverage/beban review. Tiga belas tes kontrak baru; belum ada histori akun atau label lapangan, sehingga validasi lapangan tetap terbuka. [Panduan evaluasi](USAGE_EVALUATION.md).

Tur visual berpanah dimulai dari pengenalan aplikasi, kemudian 11 langkah fitur utama. Target nyata disorot, latar diredupkan dan penjelasan mengikuti posisi layar; Lanjut/Kembali/Lewati tetap tersedia. Katalog rinci 14 topik/67 langkah, termasuk pengenalan akun sebelum masuk. Tidak ada aksi bisnis otomatis atau model baru. [Panduan](INTERACTIVE_GUIDE.md).

Panduan rinci juga menyediakan pencarian tombol, petunjuk per halaman dan kontrol jeda/lanjutkan. Berfungsi sebelum/sesudah masuk serta offline dengan progress per akun/perangkat. Tidak ada transaksi contoh atau konfirmasi otomatis; uji kegunaan dengan pemilik awam masih terbuka. [Panduan](INTERACTIVE_GUIDE.md).

Panel pemeriksaan pemakaian kini tersedia di Saran kulakan, mengikuti scope akun melalui bootstrap. Ringkasan per bahan, rincian tanggal/referensi, cakupan data, offline dan snapshot lama sudah ditangani. Membuka panel tidak mengubah transaksi atau forecast. [Panduan](USAGE_REVIEW.md).

Penyaring kandidat anomali pemakaian tersedia lewat `npm run forecast:anomalies`, dengan referensi hari sejenis, gate 56 tanggal tersimpan dan 14 tes kontrak aturan. Hasilnya kandidat review, belum model terlatih atau validasi lapangan; akun aktif tanpa histori dilaporkan belum cukup data. Fitur libur/cuaca belum tersedia. [Panduan dan bukti](USAGE_ANOMALIES.md).

Profil kandidat kini dapat dijalankan pada aplikasi melalui CLI/env, dengan pemeriksaan model server yang sesuai. Uji HTTP/CLI terisolasi lulus; bukti perbedaan transkrip dan empat capture disimpan. Default tetap Tiny dan belum ada perbaikan kestabilan tervalidasi. [Panduan dan bukti](RUNTIME_SPEECH.md).

Adapter kandidat profil dan evaluasi 16 validation/24 test baru selesai. Base pinned dipilih lewat validation; WER test 36,99% vs Tiny current 86,59%, sementara Tiny pinned memburuk ke 97,36%. Audit dan 24 pengulangan terbatas cocok, tetapi belum membuktikan perbaikan variasi dan kandidat belum dipromosikan. [Hasil](evaluation/ASR_PROFILE_RESULTS.md), [panduan](ASR_PROFILES.md).

Tindak lanjut ASR: 68 inferensi tambahan/112 pemeriksaan kernel dan lokalisasi sensitivitas pengaturan ke proyeksi mel. Penyebab kegagalan historis konfigurasi tetap dan perbaikan belum terbukti. [Hasil](evaluation/ASR_FOLLOWUP_RESULTS.md).

Diagnostik ASR awal selesai: 136 inferensi, hash tahap, kontrol urutan impor/backend dan tujuh tes audit. Penyebab variasi konfigurasi tetap/perbaikan belum terbukti; belum promosi model. [Hasil dan pekerjaan berikutnya](evaluation/ASR_STABILITY_RESULTS.md).

Laporan utama fitur, lokasi model, kondisi data aktif, hasil pemeriksaan dan pekerjaan tersisa: **[PROGRESS.md](PROGRESS.md)**. Panduan evaluasi chat: [CHAT_EVALUATION.md](CHAT_EVALUATION.md).

Selesai: registrasi/login akun usaha, undangan kelompok, katalog kosong, resep/harga sendiri, penerimaan metrik, ekstraksi katalog lokal, review/manual, ledger stok, koreksi, kebutuhan berizin, penawaran pemasok dari pengelola, persetujuan per versi, penerimaan kolektif, surplus dua pihak, offline draft/proof, backup dan pemeriksaan read-only.

Pengaturan akun kini mencakup perubahan nama usaha, nama kelompok oleh pengelola, kode undangan baru, dan perubahan kata sandi yang mengeluarkan sesi lain. Pemberitahuan pembaruan tersedia sebelum login tanpa mereset isian ketika pembaruan terdeteksi.

Pipeline AI mencakup pelatihan Ridge target dua hari, provenance, split kronologis, MAE/WAPE, baseline, ablation, artefak dan aktivasi pribadi. Dataset nyata FreshRetailNet-50K dipakai melatih 500 Ridge serta satu model gabungan boosting. Ridge v1 kalah dari MA7; pada test v2 dengan 200 toko baru, boosting WAPE 24,83% dibanding MA7 27,04%. Kalender test sama dengan v1 dan belum menjadi pilot Indonesia. Seluruh model dan hasil buruk tetap disimpan. Alat evaluasi chat parser/Qwen/pipeline sudah dibuat, tetapi chat nyata berlabel dan skor lapangan belum ada. Qwen tidak dilatih ulang. Daftar kerja: [AI_TODO.md](AI_TODO.md). Lokasi model: [AI_MODEL_INDEX.md](evaluation/AI_MODEL_INDEX.md).

V0.16 menambah audit ledger/model read-only, pembedaan nol tercatat/asumsi, metadata cakupan input pada API serta perubahan rata-rata tujuh hari secara deskriptif. Panduan: [FORECAST_READINESS.md](FORECAST_READINESS.md). Verifikasi pencatatan bersama pemilik serta validasi drift di lapangan tetap belum selesai.

V0.17 menyelesaikan replikasi metode Ridge di UCI Online Retail: empat model tambahan, 76 target test eksternal, WAPE ternormalisasi 54,41% vs MA7 62,99%. Pada unit asli, Ridge 32,92% kalah dari pola mingguan 24,92%. Ini training ulang metode pada sumber berbeda, bukan transfer model boosting. Sumber/hasil/transformasi: [laporan UCI](evaluation/UCI_RETAIL_RESULTS.md).

V0.18 menambah transfer bobot tetap varian boosting sales-only: training/validasi hanya FreshRetailNet, test 10 kelompok UCI baru / 190 target. Hasil negatif: mean-country WAPE 173,00% vs MA7 165,12%; kalender UCI sudah diketahui. Model publik tidak diaktifkan, tidak dituning ulang setelah test. Varian baru tanpa stockout ini tidak menguji bobot v2 asli. Panduan: [BOOSTING_TRANSFER.md](BOOSTING_TRANSFER.md).

V0.19 menambahkan suara lokal melalui Whisper Tiny pretrained: rekam → koreksi hasil ucapan → gunakan teks → review pesanan. Model dipatok revisi/checksum dan berjalan pada CPU, audio tidak disimpan. Ini implementasi teknis, belum evaluasi akurasi suara nyata atau fine-tuning. [Panduan suara](VOICE_BOOKKEEPING.md).

V0.20 mengevaluasi Whisper Tiny melalui pipeline produksi pada 64 rekaman nyata publik FLEURS Indonesia: WER 67,27%, CER 27,64%, exact match 0/64, enam penolakan tetap dihitung. Seluruh audio/referensi/skor diverifikasi dari preparasi ulang dan delapan inferensi diulang sesuai protokol. Pengenalan belum andal pada sampel ini; tidak ada training/model swap. [Hasil](evaluation/FLEURS_ASR_RESULTS.md).

V0.21 membandingkan Tiny/Base pada 16 validation dan 48 test dari kalimat baru, dengan keputusan validation dibekukan sebelum test. Pada satu run WER test Base 36,36% vs Tiny 66,93%; Base menang pada 43 klip, Tiny pada satu, empat seri. Audit data/skor/keputusan lulus, tetapi 3/4 transkrip ulang berubah. Investigasi kestabilan dan uji tugas pesanan tetap TODO; model aplikasi tidak diganti. [Hasil](evaluation/ASR_COMPARISON_RESULTS.md).

Validasi software terbaru v0.32: 204 tes backend dan 32 browser lulus melalui `npm test` (236 total). Tiga tes Python decoder v0.31 dan 26 tes Python lama tidak diulang pada perubahan ini. Kelulusan software terpisah dari kegagalan repeat prediksi ASR, termasuk variasi plain pada v0.31. Reproduksi forecasting dicatat pada laporan run masing-masing. Model publik tidak diaktifkan untuk akun/bahan pengguna; data pengguna dipertahankan. Belum ada validasi forecast/ekstraksi/suara/anomali pada pilot UMKM Indonesia atau studi pemahaman panduan oleh pengguna awam.

Pekerjaan berikutnya untuk pilot nyata: pengisian data oleh pemilik, uji bahasa/chat/suara berizin, peninjauan kecocokan satuan/kemasan, validasi penyaring anomali dengan label manusia serta evaluasi penggunaan oleh anggota. Deployment publik, email/password recovery, pembayaran, integrasi pemasok dan fitur libur/cuaca belum dikerjakan. Tidak ada tanggal atau hasil pilot yang dibuat otomatis.
