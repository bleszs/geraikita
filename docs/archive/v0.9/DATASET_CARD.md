# Dataset dan evaluasi Gerai Kita

## Fixture chat

`tests/fixtures/orders.json`, versi `gerai-chat-fixtures-v1`, 26 kalimat sintetis buatan proyek, CC0-1.0. Tidak berisi chat pelanggan, data pribadi, atau data UMKM sungguhan. Label berisi item katalog dan jumlah yang diharapkan, atau kebutuhan review manual.

Kategori: angka sebelum/sesudah menu, alias, angka kata, tanda baca, newline, huruf besar, variasi; lalu negasi/perubahan, item asing, duplikasi, jumlah hilang, pecahan, nol, batas 99, kosong, noise, dan instruksi yang bukan pesanan. Ini suite regresi pengembangan, **bukan split train/test independen**. Tidak ada proses pelatihan model pada dataset ini.

`npm run evaluate` menjalankan model aktual secara berurutan dan menyimpan expected/actual, mode, reason/error dan latensi. Fixture lolos jika item/jumlah tepat atau input yang ditandai ambigu ditahan. Hasil guard dan fallback tidak dihitung sebagai keberhasilan model.

Hasil run tersimpan: pipeline 26/26 sesuai label; parser 26/26; model diterima 12, fallback 1, review manual 13. Fallback terjadi pada fixture catatan sambal; periksa reason dalam [results.json](evaluation/results.json). Ukuran kecil dan cakupan terbatas tidak membuktikan generalisasi. Uji menu tambahan dengan katalog usaha aktif tercatat terpisah di [operations-live.json](evaluation/operations-live.json); fixture 26 kalimat tetap menggunakan tiga menu awal.

## Histori penggunaan sintetis

`gerai-demo-v2` dibangkitkan di `server/store.mjs`: empat profil usaha, 28 hari lengkap sebelum seed dan transaksi ilustrasi hari seed. Penggunaan telur = pola dasar + tambahan akhir pekan + variasi deterministik. Bahan lain mengikuti formula sintetis; ini sengaja tidak disebut hasil transaksi lapangan. Saldo awal adalah saldo sesudah penjualan seed. Transaksi baru mengubah stok dan daily usage memakai resep.

Tanggal relatif terhadap hari Jakarta saat seed. Ini dataset kalender demo, bukan arsip permanen tanggal 13 Oktober. Hari berjalan/future tidak digunakan untuk forecast; gap tanggal dilengkapi nol. Reset membuat ulang histori relatif terhadap tanggal reset.

## Forecast

Uji rolling-origin satu hari: tujuh tanggal terakhir menjadi target evaluasi. Setiap prediksi memilih kandidat menggunakan backtest atas histori **sebelum** target; target sebelumnya boleh menjadi histori ketika tanggal maju. Kandidat: last value, moving average tujuh hari, rata-rata weekday. Observasi backtest dimulai sesudah warmup 14 hari. Selection menggunakan MAE terkecil; WAPE = total galat absolut / total pemakaian aktual, `null` saat denominator nol.

Pada run tersimpan, target 7–13 Oktober 2026:

| Metode | MAE butir | WAPE |
| --- | ---: | ---: |
| Kandidat terpilih per origin | 0,571 | 3,74% |
| Nilai hari terakhir | 2,714 | 17,76% |
| Rata-rata tujuh hari | 2,959 | 19,36% |

Keunggulan pada pola buatan yang memiliki weekday signal ini **bukan bukti manfaat usaha nyata**. Prediksi terpilih dibulatkan ke butir utuh untuk tampilan; MA7 baseline dilaporkan sebagai mean kontinu. Tabel dalam aplikasi adalah hasil backtest pemilihan pada seluruh histori lengkap, berbeda dari tujuh target evaluasi skrip.

Rekomendasi dua hari = prediksi minus stok tersedia setelah reservasi, di-clamp nol; barang masuk yang sudah diterima menambah saldo, barang dalam perjalanan dan safety stock nol. Rentang MAE × horizon bersifat heuristik, bukan confidence interval terkalibrasi. Tidak mempertimbangkan spoilage, kapasitas, lot atau cuaca.

## Kolektif

Fixture tanpa surplus: kebutuhan 22 + 18 + 10 = 50 butir, minimum pemasok 30, harga kolektif Rp1.200/butir, ongkir Rp6.000. Total kolektif Rp66.000; individual Rp1.500/butir + Rp5.000 per usaha = Rp90.000. Selisih Rp24.000 merupakan ilustrasi pada quote buatan, bukan janji penghematan. Ongkir memakai alokasi integer proporsional yang tepat berjumlah Rp6.000.

Sesudah transfer surplus, biaya surplus ikut perhitungan, order pemasok berkurang dan constraint diuji ulang. Semua harga, tawaran dan kondisi harus diganti data terverifikasi sebelum pilot.
