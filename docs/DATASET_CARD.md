# Sumber data dan evaluasi

Pelatihan pribadi Ridge menggunakan dataset satu usaha/bahan/satuan dengan minimal 84 tanggal lengkap, metadata sumber/izin, serta split kronologis train/validation/test. Template CSV dan metadata di datasets/templates tetap kosong. Tanggal hilang tidak dilengkapi saat impor CSV. Ekspor ledger hanya mengisi nol di dalam periode yang secara eksplisit dikonfirmasi lengkap. Panduan: [AI_TRAINING.md](AI_TRAINING.md). Tugas aktual: [AI_TODO.md](AI_TODO.md).

Dataset publik nyata yang sudah ditemukan, diunduh dan dipakai training: **FreshRetailNet-50K**, Dingdong-Inc, CC BY 4.0, revisi c374e85975c82816c495acfa904cc55ab14a47d3. Subset 500 seri dipilih dari ID tanpa mempertimbangkan hasil. Seluruh 48.500 baris sumber pada subset (90+7 hari per seri) dipertahankan tanpa imputasi; 45.000 di split train, 3.500 di split eval. Target normalized_sales berbeda dari satuan stok aplikasi. Seluruh sumber, checksum, perubahan dan atribusi tercatat di [README dataset](../datasets/public/freshretailnet/README.md). Dataset publik tidak diimpor ke usaha pengguna.

Aplikasi aktif mulai kosong. Identitas, katalog, harga, resep, penerimaan, transaksi, penawaran, izin dan persetujuan berasal dari formulir pengguna. Histori pemakaian berasal dari transaksi terkonfirmasi dan koreksinya. Tidak ada histori 28 hari yang dibangkitkan saat startup atau registrasi.

Forecast belum tersedia sebelum tujuh hari lengkap sejak pemakaian pertama. Tanggal tanpa pemakaian tercatat di antara tanggal pertama dan kemarin dihitung nol; hari berjalan/future dikecualikan. Asumsi ini adalah catatan ledger, bukan bukti bahwa usaha selalu mencatat lengkap. Kandidat: nilai terakhir, rata-rata tujuh hari, rata-rata hari sejenis. Pemilihan memakai MAE backtest dengan 14 hari warmup; WAPE tidak terdefinisi saat total aktual nol. Rentang adalah heuristik, bukan interval terkalibrasi.

npm run evaluate hanya membaca database aktif. Tanpa histori cukup, status insufficient_data dan metrik kosong. Metrik dipisah menurut satuan. Belum ada dataset chat lapangan berlabel, sehingga tidak ada angka akurasi ekstraksi. Laporan saat transisi tersimpan di evaluation/live-evaluation.json.

tests/fixtures memuat data sintetis untuk regresi terisolasi; tidak diimpor runtime atau ditampilkan pada akun pengguna. Laporan fixture lama disimpan di archive/v0.9/evaluation sebagai arsip pengembangan, bukan hasil lapangan. Pengguna perlu menyediakan catatan berizin dan label independen sebelum evaluasi mutu model lapangan.
