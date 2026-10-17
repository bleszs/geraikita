# Hasil ASR bahasa Indonesia: FLEURS

Run **2026-10-15T07-34-09-350Z-ae86cc5d**, v0.20.0. Whisper Tiny pretrained CPU int8 diuji melalui adapter dan subprocess produksi. Tidak ada training, fine-tuning, pengubahan model atau tuning sesudah test.

Sumber: [google/fleurs](https://huggingface.co/datasets/google/fleurs), Conneau dkk. (2022), CC BY 4.0. Revisi/hash, pemilihan dan konversi audio dicatat pada [protokol](../../benchmarks/fleurs/protocol.json), [atribusi dataset](../../datasets/public/fleurs/README.md) dan [panduan](../FLEURS_ASR.md).

## Sampel dan hasil

Dari **687 rekaman test penerbit**, dipilih **64 rekaman** melalui urutan hash sebelum inferensi. Ada 61 ID kalimat berbeda dan 870.30 detik audio terpilih; rekaman dengan kalimat sama tidak dianggap bukti independen. Tidak ada filtering berdasarkan hasil model.

| Ukuran | Hasil |
|---|---:|
| Total kata referensi | 1320 |
| Total karakter referensi tanpa spasi | 8032 |
| WER seluruh sampel | **67,27%** |
| CER seluruh sampel | **27,64%** |
| Teks identik setelah normalisasi | 0/64 (0,00%) |
| Menghasilkan transkrip / ditolak / error infrastruktur | 58 / 6 / 0 |
| Substitusi / penghapusan / penyisipan kata | 522 / 120 / 246 |
| Latensi p50 / p95 | 3,96 detik / 5,73 detik |
| Real-time factor p50 / p95 | 0.307 / 0.530 |

WER/CER adalah galat jarak edit, **bukan persentase keberhasilan mencatat pesanan**. Semua rekaman yang ditolak/error dinilai sebagai hipotesis kosong dan menyumbang penghapusan seluruh kata referensinya. Normalisasi tidak memperluas digit menjadi kata atau memperbaiki nama.

## Batas input dan analisis deskriptif

Konversi gagal pada 0 rekaman. 1 rekaman melebihi 30 detik, 1 melebihi 1 MiB, dan 1 melampaui setidaknya satu batas. Rekaman itu **tetap dinilai** tanpa crop/penggantian. WER utama mengukur kebijakan penerimaan aplikasi beserta transkripsi, bukan Whisper mentah tanpa batas.

58 transkrip yang diterima masih memiliki galat kata. Ringkasan status kegagalan: {"http_422":5,"http_400":1}. Status HTTP saja tidak cukup untuk menganggap semua penolakan sebagai audio hening. Analisis berikut dibuat setelah scoring, tidak digunakan untuk memilih sampel atau mengubah model.

| Durasi (detik) | Rekaman | WER | CER | Ditolak |
|---|---:|---:|---:|---:|
| under_5 | 0 | Tidak tersedia | Tidak tersedia | 0 |
| from_5_to_10 | 16 | 66,06% | 34,12% | 4 |
| from_10_to_20 | 41 | 71,27% | 26,82% | 1 |
| at_least_20 | 7 | 52,09% | 24,50% | 1 |
| unknown | 0 | Tidak tersedia | Tidak tersedia | 0 |

Kelompok durasi dapat sangat kecil dan bukan perbandingan kausal. Latensi adalah adapter/Python/model pada laptop ini, termasuk pemuatan model baru per klip. Mikrofon/browser/HTTP/persiapan data tidak termasuk dan beban latar laptop tidak dikendalikan.

Sepuluh kasus dengan jumlah galat kata terbesar, tanpa menghapus kasus buruk:

| Audio sumber | Status | Kata referensi | Galat kata | WER |
|---|---|---:|---:|---:|
| 10582873098068662583.wav | accepted | 14 | 112 | 800,00% |
| 16558020848172193726.wav | accepted | 16 | 69 | 431,25% |
| 18417012389792353106.wav | accepted | 30 | 25 | 83,33% |
| 15348167519118099798.wav | accepted | 29 | 22 | 75,86% |
| 17249834387342525111.wav | accepted | 26 | 22 | 84,62% |
| 893869228407466263.wav | accepted | 24 | 22 | 91,67% |
| 12419882125114087229.wav | rejected | 21 | 21 | 100,00% |
| 3036831053971184691.wav | accepted | 20 | 21 | 105,00% |
| 11495663757007397159.wav | accepted | 31 | 20 | 64,52% |
| 316355196094816047.wav | rejected | 18 | 18 | 100,00% |

## Audit dan batas klaim

- [Seluruh prediksi, referensi dan skor per rekaman](../../models/benchmarks/fleurs/2026-10-15T07-34-09-350Z-ae86cc5d/predictions.json).
- [Konfigurasi/hash yang dibekukan](../../models/benchmarks/fleurs/2026-10-15T07-34-09-350Z-ae86cc5d/protocol.json), [versi lingkungan aktual](../../models/benchmarks/fleurs/2026-10-15T07-34-09-350Z-ae86cc5d/environment.json).
- [Hasil JSON](fleurs-asr-results.json), [analisis lengkap](fleurs-asr-analysis.json), [verifikasi ulang](fleurs-asr-reproducibility.json), [preservasi data/rilis](fleurs-asr-release.json).

Ini sampel kecil suara pembacaan teks umum berlisensi publik. Belum menjadi hasil seluruh test FLEURS, uji pesanan UMKM, label menu/jumlah/negasi, kebisingan kedai, atau mikrofon pengguna. Overlap dengan pretraining Whisper tidak dapat dikesampingkan. Sampel kini sudah terlihat dan tidak boleh dijadikan tuning lalu disebut test independen. Verifikasi mengulang inferensi hanya delapan rekaman pertama yang ditetapkan sebelum run; kesamaan transkrip tidak diklaim untuk seluruh 64.
