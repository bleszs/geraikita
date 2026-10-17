# Analisis error replikasi UCI

Run `2026-10-15T06-29-42-482Z-b034a708`, protokol tetap tanpa tuning setelah test.

| Negara | Ridge WAPE | MA7 WAPE | Pola mingguan WAPE |
|---|---:|---:|---:|
| EIRE | 65.41% | 87.80% | 102.28% |
| France | 49.33% | 50.26% | 80.50% |
| Germany | 77.31% | 83.13% | 88.73% |
| United Kingdom | 30.85% | 36.86% | 20.39% |

Ridge mengalahkan MA7 pada keempat negara. Namun baseline pola mingguan mengalahkan Ridge di Inggris, yang menyumbang **93.54%** target unit asli. Akibatnya, WAPE raw-unit pooled Ridge **32.92%** kalah dari pola mingguan **24.92%**. Ringkasan ternormalisasi, raw dan per negara menjawab pembobotan yang berbeda; jangan hanya melaporkan metrik yang paling menguntungkan.

WAPE ternormalisasi Ridge 54.41% masih menunjukkan galat yang besar. Model tidak mengalahkan setiap baseline untuk setiap cara agregasi dan belum menjadi rekomendasi operasional bagi akun pengguna. Empat negara dari satu peritel bukan empat usaha independen.

Lima target dengan galat Ridge ternormalisasi terbesar tersedia di [JSON analisis](uci-retail-error-analysis.json); semua target berada pada CSV/JSON run. Pemilihan kasus ini hanya untuk menjelaskan error, bukan memilih negara/model yang diaktifkan. Tidak ada penggantian sampel, penghapusan outlier atau training ulang berdasarkan test ini.

[Hasil utama](UCI_RETAIL_RESULTS.md), [protokol](../../benchmarks/uci-online-retail/protocol.json), [reproduksi](uci-retail-reproducibility.json).
