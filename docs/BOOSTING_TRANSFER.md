# Transfer boosting sales-only

V0.18.0 menyelesaikan eksperimen transfer lintas dataset dengan protokol baru. **Hasilnya belum mengalahkan MA7/MA14 pada metrik utama.** Model eksperimen tidak dipasang pada akun pengguna.

## Kompatibilitas fitur

Model FreshRetailNet v2 memerlukan proporsi stockout masa lalu dan log level penjualan absolut. UCI tidak mempunyai catatan stockout; mengisi fitur itu dengan nol akan menyatakan informasi yang tidak diketahui sebagai fakta. Unit penjualan kedua sumber juga berbeda. Karena itu eksperimen memakai **varian baru** dengan 21 fitur histori relatif atau 24 fitur bila kalender ditambahkan. Fitur stockout dan log level absolut dihapus sebelum training. Model v2 asli tetap utuh dan belum diuji transfer langsung ke UCI.

Satu model baru dilatih hanya dari 500 seri FreshRetailNet / 19.000 target dua hari. Pilihan varian, ukuran pohon dan bobot residual ditentukan dari 16 kandidat validasi FreshRetailNet, lalu model final dilatih pada sumber yang sama. Tidak ada parameter atau bobot yang dilatih dari UCI. Kesesuaian skala fitur tidak otomatis berarti kesesuaian pola permintaan antar-domain.

## Kelompok dan kalender test

Test mencakup 10 negara UCI yang belum dinilai dalam replikasi Ridge: Australia, Belgium, Finland, Italy, Netherlands, Norway, Portugal, Spain, Sweden dan Switzerland. Pemilihan memakai minimal 20 tanggal aktif, 1.000 unit dan skala awal positif pada periode konteks sampai Oktober 2011. Empat negara yang sudah dinilai sebelumnya dikeluarkan. Ambang dipatok sebelum scoring dan tidak dilonggarkan setelah melihat hasil.

Masing-masing memiliki 19 target dua hari, total 190 target, 1 November–8 Desember 2011. Model memakai bobot tetap dan 14 hari aktual sebelumnya sebagai konteks. Model/konfigurasi/checksum disimpan sebelum workbook target diparsing pada run ini. Protokol mengakui bahwa file UCI, kondisi kalender dan hasil empat negara sebelumnya telah tersedia; ini kelompok yang belum dinilai, **bukan test yang sepenuhnya buta terhadap kalender/domain**.

Target tetap SUM event invoice positif terpublikasi menurut aturan UCI yang sudah didokumentasikan. SUM kosong bernilai nol menurut definisi event log, bukan imputasi latent demand atau histori pengguna. Tidak ada pelanggan yang disalin ke hasil turunan.

## Hasil yang dipertahankan

| Metode | Rata-rata WAPE negara | WAPE pooled unit asli |
|---|---:|---:|
| Boosting sales-only | 173,00% | 174,98% |
| MA7 | 165,12% | 165,21% |
| MA14 | 156,51% | 156,13% |

Model menang terhadap MA7 hanya pada 1/10 negara. Ada 121 target dua hari dengan SUM event nol. Angka WAPE di atas 100% berarti jumlah galat absolut melebihi jumlah aktual, bukan akurasi negatif. Hasil ini tidak mendukung klaim bahwa model siap dipakai lintas domain. Tidak ada tuning ulang, penghapusan negara, atau aktivasi model berdasarkan hasil test ini.

## Reproduksi

Sumber sudah tersedia pada laptop. Untuk instalasi lain, ikuti preparasi [FreshRetailNet](../datasets/public/freshretailnet/README.md) dan [UCI](../datasets/public/uci-online-retail/README.md) terlebih dahulu, dengan environment `requirements-ml.txt`.

```powershell
npm run test:transfer
npm run benchmark:transfer
npm run verify:transfer
npm run analyze:transfer
```

Benchmark membuat run baru; pengulangan adalah reproduksi atas test yang sudah diketahui. Verifikasi memeriksa checksum kode/sumber/artefak, melatih ulang konfigurasi sumber yang tetap, menghitung agregat ulang dari workbook, lalu membandingkan koreksi model, semua prediksi serta metrik. Hasil pertama: satu model dan 190 prediksi identik.

Parameter inferensi juga dibandingkan langsung: field node pohon, baseline, ambang bin dan parameter estimator. Hash state yang bermakna sama setelah refit; padding memori dalam array terstruktur tidak dianggap sebagai parameter hasil belajar. Bukti rinci ada pada JSON reproduksi. Seluruh 123 tes dan preservasi 19 tabel pengguna dicatat pada [verifikasi rilis](evaluation/boosting-transfer-release.json).

Artefak asli, metadata fitur dan semua kasus: [AI_MODEL_INDEX.md](evaluation/AI_MODEL_INDEX.md). [Protokol](../benchmarks/boosting-transfer/protocol.json), [hasil](evaluation/BOOSTING_TRANSFER_RESULTS.md), [analisis error](evaluation/BOOSTING_TRANSFER_ERROR_ANALYSIS.md), [reproduksi](evaluation/boosting-transfer-reproducibility.json).

Perbaikan berikutnya memerlukan strategi adaptasi/validasi pada data yang sesuai dan test baru. Semua holdout yang sudah dilihat harus dinyatakan sebagai bukti pengembangan bila dipakai lagi. Validasi UMKM Indonesia, pelatihan akun, deteksi drift tervalidasi dan fine-tuning Qwen tetap belum dilakukan.
