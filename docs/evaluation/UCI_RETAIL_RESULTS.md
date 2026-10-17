# Replikasi Ridge — UCI Online Retail

4 model dilatih dari 1336 agregat harian development. Test eksternal: **76 target dua hari**, 1 November–8 Desember 2011. Algoritme Ridge yang sama dilatih ulang; ini bukan transfer bobot boosting FreshRetailNet.

| Metode | MAE normalized sales / 2 hari | WAPE |
|---|---:|---:|
| ridge | 2.474925 | 54.41% |
| naive | 4.152226 | 91.28% |
| moving_average_7 | 2.865235 | 62.99% |
| moving_average_14 | 2.811730 | 61.81% |
| weekly | 3.283577 | 72.19% |

Perubahan MAE Ridge terhadap MA7 pada test yang sama: 13.62% (positif berarti galat berkurang). Menang dari naive dan MA7: 4/4 negara. Seluruh negara terpilih disimpan, termasuk yang kalah; kegagalan pipeline 0.

## Setelah dikembalikan ke satuan invoice

| Metode | MAE gross invoice units / 2 hari | WAPE |
|---|---:|---:|
| ridge | 3921.275030 | 32.92% |
| naive | 6826.513158 | 57.31% |
| moving_average_7 | 4667.389098 | 39.18% |
| moving_average_14 | 4801.300752 | 40.31% |
| weekly | 2968.092105 | 24.92% |

Porsi Inggris terhadap total target raw: 93.54%. Laporan JSON juga memuat rata-rata WAPE per negara dan nilai undefined, agar dominasi volume tidak tersembunyi.

## Transformasi dan batas

Target adalah jumlah Quantity positif dari baris invoice terpublikasi yang lolos filter protokol, dikelompokkan per negara/tanggal. Tanggal tanpa event yang cocok menghasilkan jumlah kosong nol menurut definisi agregasi; bukan transaksi buatan atau imputasi permintaan yang tidak diketahui. Jumlah tanggal agregat kosong: development 590, eksternal 36. Normalisasi hanya memakai 84 tanggal development pertama.

Tidak ada penambahan stok/transaksi akun atau aktivasi model publik. Bukan pilot Indonesia, kebutuhan bahan, pemulihan lost sales, atau bukti boosting v2 menggeneralisasi. Negara berasal dari satu peritel dan berbagi kondisi kalender; ini bukan banyak usaha independen. Angka lintas dataset tidak dibandingkan langsung. Hasil test kini sudah diketahui; pengulangan hanya reproduksi.

Sumber: [Chen (2015), UCI Online Retail](https://archive.ics.uci.edu/dataset/352/online+retail), DOI 10.24432/C5BW33, CC BY 4.0. Hash XLSX 43465a06f2ccf7c8b5bd2892bc7defb52f97487934fe93b16ae4c3936424676d dipatok secara lokal sebelum parsing; bukan checksum yang diterbitkan UCI.

[Protokol](../../benchmarks/uci-online-retail/protocol.json), [hasil lengkap](uci-retail-results.json). Artefak dan seluruh prediksi: `models/benchmarks/uci-online-retail/2026-10-15T06-29-42-482Z-b034a708`.
