# FreshRetailNet-50K — hasil pelatihan nyata publik

Sumber: [Dingdong-Inc](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K), CC BY 4.0. Revisi c374e85975c82816c495acfa904cc55ab14a47d3.

500 model Ridge dilatih dari 45000 observasi train publik; evaluasi eksternal memakai 1500 target dua hari dari split eval penerbit. Data asli bernilai normalisasi dipertahankan, tanpa imputasi atau data sintetis.

| Metode | MAE eksternal (normalized sales / 2 hari) | WAPE eksternal |
|---|---:|---:|
| ridge | 0.86853887 | 35.65% |
| naive | 0.90882000 | 37.30% |
| moving_average_7 | 0.65498190 | 26.88% |

Model lolos kedua baseline pada test internal: 179/500. Pada eval eksternal: 158/500. Semua seri terpilih dilaporkan, termasuk yang kalah dari baseline. Kegagalan pipeline: 0.

Artefak: models\benchmarks\freshretailnet\2026-10-15T05-14-08-079Z-70b4caa7. Setiap seri menyimpan koefisien/scaler dan metadata. report.json memuat seluruh hasil dan errors.csv memuat rincian prediksi/target. Tidak ada model publik yang diaktifkan untuk usaha pengguna.

## Batas

- Public benchmark models are never activated for user accounts. Stockout-affected sales remain observed sales, not estimates of latent demand. This is not an Indonesian UMKM field evaluation. Qwen remains pretrained.
- 500 ID-selected series (1% of the dataset), not a full 50,000-series benchmark.
- External holdout has three shared calendar origins across series; outcomes are correlated and do not establish broad generalization.
- Rolling observed-history evaluation uses actual earlier eval days as lags, not a seven-day recursive forecast.
- Normalized observed sales, not recovered latent demand, raw units or ingredient usage.
- No local user accounts, inventory, sales or recipes are created or modified.
- Qwen is not fine-tuned by this experiment.
