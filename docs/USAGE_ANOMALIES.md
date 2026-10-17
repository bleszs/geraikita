# Pemeriksaan pemakaian yang perlu ditinjau

V0.26 menyediakan penyaring statistik lokal melalui CLI. Hasilnya adalah **kandidat untuk ditinjau**, bukan kepastian transaksi salah, pencurian, stok kosong atau perubahan permintaan. Aturan ini belum dilatih atau divalidasi pada anomali usaha berlabel. Tidak ada skor akurasi pengganti.

```powershell
npm run forecast:anomalies
npm run forecast:anomalies -- --days 7
npm run forecast:anomalies -- --workspace ID --business ID --product ID --out data/private/usage-review.json
npm run test:anomalies
```

Database default `data/gerai-kita-live.sqlite`; `--database PATH` atau `DATABASE_PATH` memilih file lain yang sudah ada. Filter bahan/usaha memerlukan pasangan workspace/business. Ini alat operator lokal dengan akses filesystem, bukan API multi-pengguna; laporan tanpa filter dapat memuat seluruh usaha. Laporan lengkap mengandung identitas dan pemakaian privat, sehingga simpan di `data/private/`, bukan direktori publik. File keluaran yang sudah ada ditolak agar bukti lama terjaga.

`--as-of YYYY-MM-DD` mengecualikan tanggal itu dan masa depan; default tanggal Asia/Jakarta. `--days` membatasi jendela 1–28 hari terakhir, default 28. Cutoff lama membaca ledger terkoreksi saat ini; bukan rekonstruksi data yang diketahui pada tanggal tersebut.

## Aturan tetap v1

Untuk setiap tanggal target yang memiliki catatan, seluruh **56 tanggal kalender sebelumnya harus mempunyai baris ledger tersimpan**. Delapan catatan pada hari minggu yang sama menjadi referensi. Contohnya, pemakaian Selasa dibandingkan dengan delapan Selasa sebelumnya; target sendiri dan tanggal sesudahnya tidak masuk referensi.

Hitung median referensi dan MAD, yaitu median jarak absolut dari median. Ambang selisih adalah nilai terbesar dari:

- `3.5 × MAD / 0.6745`;
- `0.5 × median`, penahan sensitivitas untuk deret yang nyaris konstan;
- `2 × 0.0001` satuan bahan, sesuai langkah penyimpanan ledger.

Selisih absolut yang **melampaui** ambang menghasilkan `review: true` dengan arah `higher`/`lower`. Batas tepat tidak ditandai; toleransi floating point kecil mencegah selisih representasi angka membalik keputusan. Batas bawah dibatasi nol. Ketika MAD nol, modified Z-score menjadi `null`; aturan penahan tetap dapat diperiksa. Satuan buah/butir juga memakai presisi ledger karena resep dapat mengonsumsi pecahan satuan.

Dasar modified Z-score dan ambang 3,5 merujuk [NIST Engineering Statistics Handbook](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm). Pilihan delapan minggu, kelengkapan 56 baris, penahan 50% dan dua langkah ledger adalah **heuristik aplikasi**, bukan rekomendasi NIST atau ambang yang sudah dikalibrasi untuk UMKM. Aturan ini bukan uji probabilistik; delapan referensi, pola penjualan tidak normal, tren, musim dan pemeriksaan berulang dapat menghasilkan tanda keliru atau anomali terlewat.

## Cara membaca hasil

| Status per tanggal | Makna |
|---|---|
| `missing_observation` | Target tidak punya baris; `quantity` dan `review` null, bukan nol atau normal |
| `insufficient_reference_span` | Histori belum menjangkau awal 56 hari referensi |
| `reference_has_gaps` | Rentang cukup panjang tetapi referensi mengandung tanggal tanpa baris; daftar gap disertakan |
| `screened` | Aturan dapat dihitung; median, MAD, referensi, batas dan keputusan disertakan |

Nol eksplisit tetap angka observasi, termasuk nol akibat koreksi/pembatalan. **Baris tersimpan tidak membuktikan pencatatan satu hari lengkap**; `recordingCompleteness` selalu `not_verified_by_ledger`. Pada akun aktif tanpa histori, hasilnya `no_history` dengan nol hari diperiksa. Nol kandidat dari nol hari diperiksa bukan bukti usaha bebas anomali.

Penyaring CLI membaca SQLite dengan `readOnly: true` dan snapshot transaksi. Tidak ada penambahan histori, perbaikan transaksi, penggantian forecast, pelatihan, aktivasi atau retraining. Sejak v0.27, aturan yang sama tersedia pada API bootstrap akun dan [panel Saran kulakan](USAGE_REVIEW.md), memakai ledger sesuai sesi. Pemberitahuan otomatis, input libur/cuaca dan diagnosis drift belum tersedia. Sumber dan bukti eksperimen forecasting/ASR lama dipertahankan.

## Verifikasi dan pekerjaan tersisa

Empat belas tes kontrak mencakup kausalitas, pola mingguan, lonjakan/penurunan, nol/gap, MAD, batas angka, tahun kabisat, isolasi usaha, file keluaran dan kesamaan semua tabel database sementara. Fixture hanya ada di memori/file sementara; bukan dataset evaluasi nyata dan tidak dimasukkan ke aplikasi aktif.

Pemeriksaan ledger aktif dan kesamaan seluruh tabel terhadap backup tersedia pada [usage-anomalies-release.json](evaluation/usage-anomalies-release.json). Ulangi dengan backup yang cocok dan nama keluaran baru:

```powershell
npm run backup
npm run verify:anomalies -- --backup "PATH_BACKUP_DARI_PERINTAH_DI_ATAS" --out data/private/usage-verification-new.json
```

V0.30 menambahkan [alat evaluasi review pemakaian](USAGE_EVALUATION.md): ekspor lembar semua tanggal tanpa prediksi, pembekuan split/aturan/sumber sebelum anotasi, validasi label manusia dan pengukuran precision/recall, coverage, abstain serta beban review. Template tetap kosong dan akun aktif belum mempunyai histori; belum ada skor lapangan. Berikutnya: kumpulkan periode berizin, tinjau kelengkapan bersama pemilik, anotasi tanpa melihat keluaran aturan dan nilai pada protokol yang dibekukan. Jangan mengubah threshold berdasarkan test lalu mengklaim test independen. Hari libur/cuaca memerlukan sumber dan evaluasi tersendiri; belum diuji. [TODO](AI_TODO.md), [progres keseluruhan](PROGRESS.md).
