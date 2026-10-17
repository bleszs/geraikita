# Transfer boosting sales-only ke kelompok UCI baru

Run `2026-10-15T06-43-36Z-fc59f6b9`. Satu model baru dilatih hanya pada 500 seri / 19,000 target dua hari FreshRetailNet, melalui 25 Juni 2024. Varian hanya memakai histori penjualan dan kalender; fitur stockout dan log level absolut dihapus sebelum eksperimen. Model v2 asli tetap tersimpan dan tidak dipaksakan menerima data stockout yang tidak tersedia.

Model, parameter dan checksum dibekukan sebelum workbook UCI diparsing pada run ini. Tidak ada fitting/tuning dengan UCI. Konteks 14 hari sebelumnya dari UCI dipakai untuk inferensi dengan bobot tetap. Test berisi **10 negara dan 190 target dua hari**, 1 November–8 Desember 2011. Negara terpilih: Australia, Belgium, Finland, Italy, Netherlands, Norway, Portugal, Spain, Sweden, Switzerland. Empat negara yang pernah dinilai pada replikasi Ridge dikeluarkan; tidak ada kelompok terpilih yang dibuang setelah scoring.

## Metrik utama: rata-rata WAPE per negara

| Metode | Mean country WAPE | Negara WAPE undefined |
|---|---:|---:|
| boosting | 173.00% | 0 |
| naive | 204.99% | 0 |
| ma7 | 165.12% | 0 |
| ma14 | 156.51% | 0 |
| weekly | 175.50% | 0 |

## Metrik tambahan: pooled unit invoice asli

| Metode | MAE / dua hari | WAPE |
|---|---:|---:|
| boosting | 490.478939 | 174.98% |
| naive | 535.857895 | 191.17% |
| ma7 | 463.092481 | 165.21% |
| ma14 | 437.644361 | 156.13% |
| weekly | 494.489474 | 176.41% |

Menang terhadap MA7: 1/10 negara; terhadap pola mingguan: 6/10. Konfigurasi dipilih pada validasi sumber saja: `calendar`, 15 leaf, bobot residual 1. Bobot nol berarti keluaran sama dengan MA7 dan tidak membuktikan manfaat koreksi model.

## Batas klaim

Kalender UCI dan hasil empat negara sebelumnya sudah diketahui. Ini pengujian pada kelompok yang sebelumnya belum dinilai, bukan test yang sepenuhnya buta terhadap kondisi kalender. Agregat negara berasal dari satu peritel hadiah/grosir dan tidak mewakili usaha independen atau UMKM Indonesia. Target ialah unit invoice positif terpublikasi; SUM event kosong adalah nol menurut definisi target, bukan imputasi permintaan tak diketahui. Tidak ada fitur stockout buatan, konversi resep atau aktivasi model publik ke akun.

Model ini varian baru dengan bobot yang dipelajari dari FreshRetailNet dan ditransfer tetap; hasil tidak menguji bobot v2 asli atau dibandingkan langsung dengan angka sampel sebelumnya. Hasil kini diketahui, pengulangan hanya reproduksi. Qwen tetap pretrained. Seluruh negara, metrik, label, prediksi, source hash dan artefak disimpan.

[Protokol](../../benchmarks/boosting-transfer/protocol.json), [hasil lengkap](boosting-transfer-results.json). Artefak: `models/benchmarks/boosting-transfer/2026-10-15T06-43-36Z-fc59f6b9`. Sumber/lisensi: [FreshRetailNet](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K) dan [UCI Online Retail](https://archive.ics.uci.edu/dataset/352/online+retail), CC BY 4.0.
