# Analisis error run publik pertama

Protokol gerai-freshretailnet-v1 ditetapkan sebelum pelatihan. Hasil ini tidak digunakan untuk menyetel ulang parameter pada test eksternal yang sama. Reproduksi hanya mengulang prosedur yang sama, bukan memilih run dengan skor lebih baik.

## Evaluasi eksternal

| Metode | MAE, normalized sales per dua hari | WAPE |
|---|---:|---:|
| ridge | 0.86853887 | 35.65% |
| naive | 0.90882000 | 37.30% |
| moving_average_7 | 0.65498190 | 26.88% |

Ridge mengurangi MAE terhadap nilai terakhir sebesar 4.43%, tetapi MAE masih 32.61% lebih besar dari rata-rata tujuh hari. WAPE bukan angka akurasi yang boleh diubah menjadi 100%-WAPE.

## Stabilitas pemilihan model

179/500 model mengalahkan kedua baseline pada test internal. Dari kelompok itu, 72 juga mengalahkan keduanya pada eval eksternal, sedangkan 107 tidak. Total model yang mengalahkan keduanya pada eksternal adalah 158/500; jumlah ini bukan daftar model yang boleh dipilih setelah melihat test. Semua model tetap dilaporkan.

## Stockout

| Kelompok target dua hari | Jumlah target | WAPE Ridge | WAPE rata-rata tujuh hari |
|---|---:|---:|---:|
| Setidaknya satu hari terkena stockout | 886 | 37.55% | 28.03% |
| Tidak ada stockout tercatat pada target | 614 | 33.05% | 25.32% |

Ridge masih kalah dari rata-rata tujuh hari pada kedua kelompok. Tabel ini deskriptif; tidak membuktikan penyebab error. Target tetap observed sales dan tidak memulihkan permintaan yang hilang karena stok kosong.

## Batas interpretasi dan langkah berikutnya

Hanya 500 seri dari 50.000 dan tiga origin kalender bersama pada eval eksternal. Seri lintas toko/produk dapat berkorelasi. Data berasal dari retailer produk segar di luar Indonesia dan target dinormalisasi. Tidak ada bukti peningkatan operasional UMKM Indonesia.

Riset berikutnya harus menetapkan protokol baru dan holdout yang belum dipakai sebelum mencoba model pooling/nonlinear atau pemulihan stockout. Dataset/label asli tidak diubah agar model terlihat menang. Baseline rata-rata tujuh hari tetap kandidat yang lebih baik pada agregat run ini.
