# Model dan pipeline

## Forecasting yang dapat dilatih — v0.12.0

Kode Ridge di server/ml/forecast-model.mjs mempelajari bobot dari input pengguna, dengan target total pemakaian dua hari, lag/statistik 14 hari dan ablation fitur hari dalam minggu. Minimal 84 hari lengkap; train/validation/test berurutan dengan target tanpa overlap. Dua baseline dinilai pada target test yang sama; aktivasi lokal hanya jika MAE lebih rendah dari keduanya. Metrik/scaler/koefisien, hash dan sumber dataset disimpan pada artefak. Ini model terpisah dari Qwen.

**Status v0.13.0: 500 model Ridge dilatih dari data nyata publik FreshRetailNet-50K; belum ada model khusus usaha pengguna yang diaktifkan.** Pelatihan menggunakan 45.000 baris train publik dan evaluasi eksternal 1.500 target dua hari. WAPE eksternal Ridge 35,65%, nilai terakhir 37,30%, rata-rata tujuh hari 26,88%. Jadi Ridge belum mengalahkan baseline rata-rata tujuh hari secara agregat. Semua 500 model disimpan; 179 lolos kedua baseline pada test internal dan 158 mengalahkan keduanya pada eval eksternal, dua kelompok yang tidak boleh disamakan. Target adalah penjualan ternormalisasi publik, bukan bahan/permintaan laten UMKM. Dataset: Dingdong-Inc, CC BY 4.0; [hasil dan batas](evaluation/FRESHRETAILNET_RESULTS.md).

Model publik ditolak oleh registry akun. Saran kulakan tetap memberi baseline atau belum cukup histori sampai model usaha sendiri lolos, diaktifkan pada scope/satuan yang tepat, dan histori inferensi mencukupi. Rentang Ridge memakai galat validasi sebagai heuristik, bukan interval terkalibrasi. Cuaca/libur, anomali, lost sales dan retraining otomatis belum dicakup. Rincian protokol: [AI_TRAINING.md](AI_TRAINING.md).

## Ekstraksi bahasa

Ollama qwen2.5:1.5b berjalan lokal. Model tidak dilatih atau fine-tune oleh proyek. Konfigurasi: temperature 0, konteks 4096, output 512 token, timeout 45 detik, satu ekstraksi AI sekaligus. Server dapat mengganti provider/model/URL lewat environment.

Katalog berasal dari akun, tanpa menu awal. Parser deterministik mengenali menu/alias dan bukti jumlah sebelum model dipanggil. Katalog/pesan diperlakukan sebagai data, bukan instruksi. Referensi menu1 dan seterusnya hanya ID sementara dalam request. Schema dan validator memeriksa hasil terhadap bukti; harga dan resep dihitung backend, bukan model.

Mode ollama berarti model lolos pemeriksaan, fallback berarti parser dipakai setelah AI gagal, rules berarti hanya parser. Input ambigu ditahan untuk manual. Model belum memperluas cakupan parser dan tidak memahami bahasa bebas secara andal. Pengguna selalu meninjau hasil sebelum transaksi.

Tidak ada klaim akurasi lapangan. Evaluasi fixture versi lama tersimpan di archive/v0.9/evaluation dan bukan bukti data pengguna aktif. npm run evaluate membaca histori nyata tersimpan; akurasi ekstraksi tetap not_evaluated tanpa dataset berlabel pengguna. Chat mentah tidak disimpan sebagai histori backend; catatan item terkonfirmasi tersimpan dalam transaksi. Aplikasi belum terintegrasi dengan ASR/input suara.
