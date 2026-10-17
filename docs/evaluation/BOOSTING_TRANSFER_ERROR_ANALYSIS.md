# Analisis kegagalan transfer boosting sales-only

Run `2026-10-15T06-43-36Z-fc59f6b9`. Metrik utama, rata-rata WAPE negara, adalah 173.00% untuk model dibanding 165.12% untuk MA7 dan 156.51% untuk MA14. Tidak mengklaim transfer berhasil; model menang terhadap MA7 hanya pada 1/10 negara.

| Negara | Model WAPE | MA7 WAPE | MA14 WAPE | Tanggal tanpa event terpublikasi |
|---|---:|---:|---:|---:|
| Australia | 195.02% | 188.11% | 182.37% | 33/38 |
| Belgium | 166.23% | 155.99% | 136.67% | 28/38 |
| Finland | 173.27% | 172.13% | 145.74% | 30/38 |
| Italy | 155.67% | 140.94% | 187.06% | 31/38 |
| Netherlands | 173.86% | 161.74% | 154.34% | 28/38 |
| Norway | 203.60% | 204.46% | 169.75% | 32/38 |
| Portugal | 130.31% | 123.13% | 110.44% | 27/38 |
| Spain | 137.94% | 131.14% | 133.15% | 26/38 |
| Sweden | 168.01% | 158.80% | 161.40% | 32/38 |
| Switzerland | 226.06% | 214.76% | 184.16% | 33/38 |

Ada 121 target dua hari dengan total event nol. Pada kasus tersebut, jumlah galat absolut model 39630.176 unit, MA7 34230.857 unit. Ini observasi error pada publikasi invoice; belum membuktikan penyebab kausal kegagalan atau permintaan sebenarnya. Sumber FreshRetailNet adalah seri produk segar per toko, target UCI agregat negara dari peritel hadiah/grosir; skala fitur yang kompatibel belum menjamin pola permintaannya sesuai.

WAPE = jumlah galat absolut dibagi jumlah aktual, sehingga nilai di atas 100% valid secara matematis. Ini bukan akurasi klasifikasi atau angka yang boleh diubah menjadi akurasi negatif. Ringkasan per negara, volume/prediksi dan sepuluh galat absolut terbesar disimpan di [JSON](boosting-transfer-error-analysis.json). Semua negara dan kasus tetap disertakan.

Tidak ada training atau penyetelan ulang setelah melihat test. Model publik tidak diaktifkan untuk pengguna. Perbaikan berikutnya harus memakai data validasi/adaptasi berizin dan test baru; 190 target ini kini hanya menjadi bukti pengembangan/error analysis bila dipakai lagi.

[Hasil lengkap](BOOSTING_TRANSFER_RESULTS.md), [protokol](../../benchmarks/boosting-transfer/protocol.json), [bukti reproduksi](boosting-transfer-reproducibility.json).
