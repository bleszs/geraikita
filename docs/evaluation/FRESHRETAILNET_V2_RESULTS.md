# FreshRetailNet v2: transfer ke toko baru

Run `2026-10-15T05-29-16Z-d1f901c0`. Model HistGradientBoostingRegressor dipelajari dari 500 seri / 355 toko / 19,000 target dua hari nyata. Model, parameter, 16 kandidat validasi, pemilihan toko dan seluruh prediksi tersimpan di `models/benchmarks/freshretailnet-v2/2026-10-15T05-29-16Z-d1f901c0`.

## Pengujian yang dibekukan

200 toko dipilih melalui hash ID, seluruhnya di luar toko pengembangan. Satu produk per toko; 600 target dua hari, 26 Juni–1 Juli 2024. Tidak ada seri gagal/dibuang. Pilihan konfigurasi dan bobot koreksi disimpan sebelum label holdout dibaca. Penjualan masa lalu dari toko holdout menjadi konteks inferensi, tidak dipakai melatih atau memilih model.

| Metode | MAE | WAPE |
|---|---:|---:|
| pooled | 0.565100 | 24.83% |
| naive | 0.829650 | 36.46% |
| ma7 | 0.615315 | 27.04% |
| ma14 | 0.654193 | 28.75% |
| weekly | 0.688930 | 30.27% |

Perubahan MAE terhadap MA7 pada **test yang sama**: +8.16% (positif berarti lebih kecil). Model menang terhadap MA7 pada 113/200 seri. Konfigurasi terpilih: `calendar`, 15 leaf, bobot residual 1. Bobot nol berarti keluaran identik MA7 dan bukan keberhasilan tambahan model.

## Batas klaim

The held-out store records have not been scored in v1, but calendar conditions are shared with v1's known evaluation period. This is store-group transfer evidence, not a completely new temporal/domain replication or an Indonesian UMKM field test. Public models stay separate from user workspaces. No retuning after this test.

Target adalah penjualan teramati yang dinormalisasi, bukan kebutuhan bahan atau permintaan laten saat stockout. MAE/WAPE tidak menunjukkan kalibrasi interval. Nilai Ridge v1 menggunakan toko berbeda sehingga tidak menjadi pembanding langsung. Model publik tidak diaktifkan pada akun pengguna; Qwen tetap pretrained.

Sumber: [Dingdong-Inc/FreshRetailNet-50K](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K), CC BY 4.0, revisi `c374e85975c82816c495acfa904cc55ab14a47d3`. [Protokol v2](../../benchmarks/freshretailnet/protocol-v2.json), [hasil lengkap](freshretailnet-v2-results.json).
