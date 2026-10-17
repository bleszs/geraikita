# Diagnostik kestabilan ASR — v0.22

**Audit artefak lulus; penyebab variasi dan perbaikan belum terbukti. Model aktif tetap Tiny.** Pemeriksaan ini bukan training, promosi Base, atau benchmark akurasi test baru.

Total **136 inferensi proses baru**, memakai dua rekaman FLEURS Indonesia yang sudah terlihat dan dipilih karena pernah gagal repeat. Seluruh percobaan dipertahankan. [JSON lengkap](asr-stability-results.json), [registry hash](../../benchmarks/asr-stability/evidence.json), [metode/perintah](../ASR_STABILITY.md).

| Eksperimen | Inferensi | Kelompok model/profil/klip | Kelompok dengan teks berubah |
|---|---:|---:|---:|
| stage_trace | 48 | 16 | 0 |
| import_order | 40 | 20 | 4 |
| single_factor | 48 | 6 | 0 |

Kelompok dengan teks berubah pada pengulangan dalam konfigurasi yang sama:

| Eksperimen | Profil | Model | Rekaman | Varian teks / pengulangan |
|---|---|---|---|---:|
| import_order | production | base | 9485984081064467567.wav | 2/2 |
| import_order | ct2_first | tiny | 9485984081064467567.wav | 2/2 |
| import_order | ct2_first | base | 9485984081064467567.wav | 2/2 |
| import_order | numpy_then_ct2 | base | 9485984081064467567.wav | 2/2 |

Semua 136 inferensi menghasilkan transkrip. Kelompok instrumentasi mencatat PCM, hasil VAD, fitur mel dan encoder: semuanya identik di dalam setiap kelompok yang diuji. **Ini tidak menghapus variasi pada jalur tanpa instrumentasi**, termasuk profil production Base. Pencatatan hash mengubah urutan impor/alokasi/salinan dan timing; tidak ada bukti bahwa efek observasi ini adalah penyebab variasi.

## Kontrol satu faktor

Pada klip pertama, hanya mengubah `OPENBLAS_NUM_THREADS=1` sebelum impor pustaka mempertahankan PCM, hasil VAD dan filter mel, tetapi mengubah fitur mel dan encoder untuk Tiny maupun Base. Teks Tiny berubah, teks Base sama. Setiap profil/model diulang delapan kali; semua pengulangan di dalam profil tersebut cocok. Mengubah hanya `CT2_PACKED_GEMM=0` tidak mengubah fitur, encoder maupun teks dibanding baseline pada klip itu.

Hash fitur baseline: `5055aa95879275b98bbe450940d41099dcb1ce5593fbadc7fd8fb97f0e5bea9f`. Hash fitur OpenBLAS satu thread: `7321958bba93991631409df436b820948fd7d9b64847b627668ca1f3116fed26`. Ini membuktikan sensitivitas pada intervensi pengaturan backend di eksperimen ini, **belum membuktikan penyebab variasi historis dalam konfigurasi yang sama**. Tidak ada pemilihan konfigurasi berdasarkan WER atau klaim akurasi membaik.

## Batas dan langkah berikutnya

Kegagalan historis v0.21 tetap **3/4 transkrip ulang berubah**, dengan sumber/skor utuh. `causeEstablished=false`, `fixValidated=false`, `readyForPromotion=false`. Tidak ada perubahan decoder, bobot, runtime akun atau skor eksperimen lama.

Berikutnya: tangkap tahap pertama yang berubah pada reproduksi kegagalan dengan konfigurasi tetap; uji intervensi tunggal pada jalur tanpa instrumentasi dengan protokol yang dibekukan sebelum run. Jika implementasi/config diubah, butuh evaluasi yang sesuai pada data belum dipakai tuning sebelum klaim peningkatan. Data pembicara/pesanan dan mikrofon pemilik usaha tetap belum tersedia.
