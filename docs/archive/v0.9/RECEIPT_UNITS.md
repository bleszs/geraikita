# Satuan penerimaan barang

Status 15 Oktober 2026, versi 0.9.0. Barang masuk pribadi dapat dicatat dalam satuan metrik yang setara dengan satuan bahan. Stok, resep dan saran tetap memakai satuan katalog yang sudah ditetapkan.

## Coba alurnya

1. Buka **Produk & stok → Catat barang masuk → Beras**.
2. Pilih **Satuan diterima: gram**, jumlah **250**, harga per satuan **13**. Harga ini berarti Rp13 untuk 1 gram.
3. Preview menampilkan **250 gram = 0,25 kg**, saldo beras **2,75 kg** dari saldo contoh 2,5 kg, dan biaya **Rp3.250**.
4. Simpan setelah memeriksa barang fisik. Riwayat dan CSV menyimpan 0,25 kg untuk stok sekaligus jumlah 250 gram dan harga Rp13/gram saat diterima.

Mengganti bahan atau satuan mengosongkan jumlah/harga, sementara pemasok tetap. Isi kembali sesuai satuan baru. Kesalahan validasi menjaga isian lain dan tidak mengubah saldo. Konversi berjalan di server juga; preview belum mencatat penerimaan.

## Pasangan yang didukung

| Satuan stok | Satuan diterima | Faktor ke stok |
| --- | --- | --- |
| kg | gram | ÷ 1.000 |
| gram | kg | × 1.000 |
| liter | ml | ÷ 1.000 |
| ml | liter | × 1.000 |
| Seluruh satuan katalog | Satuan yang sama | × 1 |

Butir/buah tetap bilangan bulat dan tidak dikonversi satu sama lain. Kg/liter tidak dikonversi karena berbeda dimensi. Papan, karung, botol dan kemasan lain memerlukan faktor khusus produk dan belum didukung. Kulakan bersama/surplus tetap telur dalam butir.

## Presisi dan biaya

Jumlah input positif, maksimal 10.000 dengan empat desimal. Hasil konversi juga maksimal 10.000 dalam satuan stok dan harus dapat diwakili persis pada presisi empat desimal. Contoh: 0,1 gram = 0,0001 kg diterima; 0,01 gram tidak dapat diwakili dan ditolak. Aplikasi tidak membulatkan saldo yang terlalu kecil menjadi nol.

Harga **input** rupiah bulat, 0–Rp10.000.000 per satuan diterima. Total dibulatkan dari jumlah input × harga input ke rupiah terdekat, maksimal Rp1 miliar. Harga per satuan **stok** diturunkan tanpa pembulatan awal dan dapat pecahan: 1,5 kg terigu pada Rp10.500/kg menjadi 1.500 gram, harga stok Rp10,5/gram, total Rp15.750. CSV menyertakan harga stok turunan serta harga input asal.

Resep mengurangi kuantitas stok yang sudah dikonversi. Pembatalan receipt mengurangi kuantitas yang sama jika saldo tersedia cukup, termasuk reservasi. Pencatatan ulang memakai kunci idempotency yang sama dan tidak menambah saldo lagi; rincian berbeda dengan kunci sama ditolak. Retry receipt yang sudah dibatalkan tidak menghidupkan kembali penerimaan.

## Riwayat, migrasi dan offline

Nama/satuan stok serta jumlah/satuan/harga input disimpan saat pencatatan. Rename bahan tidak menulis ulang histori. CSV barang masuk menambahkan tiga kolom: **Jumlah diterima asli**, **Satuan diterima asli**, **Harga per satuan diterima (Rp)**. Kolom stok, total, asal, ongkir dan alasan pembatalan tetap ada.

Migrasi aditif menambahkan kolom nullable `input_quantity`, `input_unit`, `input_unit_price`; tidak mengubah kolom/saldo/sesi lama. Untuk catatan lama dan penerimaan kelompok tanpa snapshot input, tampilan/CSV memakai rincian satuan stok asal. Backup sebelum migrasi: `data/backups/gerai-kita-2026-10-15T00-49-46-505Z-04a93d6e.sqlite`.

Modul konversi tercache pada shell v18 dan riwayat terakhir dapat dibaca offline. Penerimaan pribadi sekarang menyimpan proof rincian/jumlah/satuan/harga asal sebelum POST dan memulihkan respons hilang; lihat [panduan pemulihan](RECEIPT_RECOVERY.md). Pembatalan pribadi juga menyimpan proof alasan asal; lihat [panduan pembatalan](STOCK_CANCELLATIONS.md). Isian sebelum konfirmasi belum disimpan, dan IndexedDB bukan backup.

## Bukti

Suite penuh **50 backend/operasional + 38 browser = 88 lulus**. Lima tes backend dan tiga browser baru mencakup konversi dua arah, harga stok pecahan, batas presisi, ketidaksesuaian satuan, resep/reversal, retry, migrasi/reopen, CSV, rename, scope/CSRF, ponsel 320px, escaping dan riwayat offline. Pada tahap 0.8.0, tujuh tes satuan/offline lulus lagi setelah pembaruan cache v14 dan pembersihan pesan eror saat mengedit.

[Uji SQLite preview](evaluation/receipt-units-live.json) menjaga seluruh data lama pada 17 tabel, menguji beras 250 gram → 0,25 kg, minyak 125 ml → 0,125 liter, serta terigu 1,5 kg → 1.500 gram. Dua porsi dengan resep 25 gram mengurangi terigu menjadi 1.450 gram. Snapshot input bertahan setelah database dibuka ulang; reversal, retry serentak dan receipt dibatalkan menjaga saldo. Namespace uji dihapus dan data lama dibandingkan lagi.

Tampilan desktop/ponsel diperiksa dalam satu batch dan satu konfirmasi; ini Chrome dengan viewport simulasi, bukan audit perangkat fisik. [Doctor](evaluation/readiness.json) memeriksa 13 aset, SQLite serta Ollama; [latihan demo](evaluation/demo-rehearsal.json) memakai model lokal. Semua skenario memakai data sintetis.
