# Perbandingan ASR: Whisper Tiny dan Base

Run **2026-10-15T08-17-56-627Z-20faa6f2**, v0.21.0. Kedua model pretrained multilingual memakai CPU int8/two threads, decoder/VAD/gate dan normalisasi yang sama. Tidak ada training atau fine-tuning. **Pilihan dari validasi: base**; keputusan dibekukan sebelum test dimulai.


## Kestabilan prediksi belum lulus

Audit berkas/sumber/audio dan perhitungan ulang skor/keputusan **lulus**, tetapi uji inferensi ulang **gagal**: 3/4 transkrip berbeda dari run awal. Output awal serta pengulangan disimpan; hasil utama tidak diganti dengan pengulangan yang lebih baik. Ketidakcocokan pertama tetap dipertahankan.

Dua panggilan tambahan ke adapter Tiny produksi cocok dengan pengulangan Tiny terbaru pada dua klip yang sama, tetapi berbeda dari run awal. Ini observasi terbatas, bukan bukti kesetaraan universal atau penjelasan penyebab. Penyebab variasi belum ditetapkan.

Angka pada tabel adalah **satu run** sesuai protokol. Penurunan galat pada run ini belum membuktikan kestabilan keuntungan antar-run; promosi otomatis model ditolak (readyForPromotion=false). Verifier menulis laporan audit dan mengembalikan kegagalan bila repeat tidak identik. Tidak ada klaim seluruh prediksi berhasil direproduksi.

## Sumber dan pemisahan

Data nyata publik [google/fleurs](https://huggingface.co/datasets/google/fleurs), Conneau dkk. (2022), CC BY 4.0. [Protokol](../../benchmarks/asr-comparison/protocol.json), [panduan](../ASR_COMPARISON.md), [sumber Base](https://huggingface.co/Systran/faster-whisper-base).

- Validasi penerbit: 350 rekaman, 147 kelompok kalimat eligible setelah eksklusi; dipilih 16 kalimat dengan satu rekaman per kalimat.
- Test penerbit: 687 rekaman, 267 kelompok eligible; dipilih 48 kalimat yang belum dinilai.
- Seluruh 64 rekaman/61 kalimat dari run lama dikecualikan berdasarkan ID, nama berkas dan referensi ternormalisasi. Semua kelompok/referensi validasi penerbit dikecualikan dari test, bukan hanya 16 yang dipilih. Hash audio terpilih juga diperiksa terhadap run lama dan antar-split.
- Tidak ada seleksi durasi/hasil, crop, denoise atau normalisasi volume. Penolakan tetap hipotesis kosong dan masuk denominator. Ini kelompok kalimat baru pada sumber yang sama, bukan dataset atau audit pembicara independen.

## Hasil berpasangan

| Split | Model | Rekaman | WER | CER | Exact match | Ditolak | Error infrastruktur | Latensi p50 / p95 (detik) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| validation | tiny | 16 | 65,71% | 35,47% | 0/16 | 2 | 0 | 1,21 / 2,21 |
| validation | base | 16 | 36,89% | 12,30% | 1/16 | 0 | 0 | 1,66 / 1,99 |
| test | tiny | 48 | 66,93% | 31,72% | 0/48 | 4 | 0 | 1,20 / 1,91 |
| test | base | 48 | 36,36% | 13,74% | 1/48 | 2 | 0 | 1,67 / 2,23 |

WER test Base turun 45,67% relatif terhadap Tiny pada **48 rekaman yang sama**. Base memiliki lebih sedikit galat kata pada 43 rekaman, Tiny pada 1, dan 4 seri. Ini perbandingan deskriptif sampel kecil, bukan klaim signifikansi statistik. Jangan memakai angka Tiny 67,27% dari sampel lama sebagai baseline langsung untuk Base pada sampel baru.

Model yang dipilih lewat validasi (base) menghasilkan WER test 36,36% dan CER 13,74%. Keputusan tidak diubah setelah melihat test, termasuk bila test tidak mendukung hasil validasi. WER/CER mengukur transkripsi umum bersama kebijakan penolakan aplikasi, bukan ketepatan menu/jumlah/negasi atau keamanan pencatatan pesanan.

## Keputusan sebelum test

Aturan Base: WER validasi minimal 10% lebih rendah secara relatif, tanpa error infrastruktur, penolakan tidak melebihi Tiny, dan p95 <= 15 detik. Gate aktual: wordErrorImproved=true; noBaseInfrastructureErrors=true; noExtraRejections=true; latencyWithinBound=true.

Keputusan ditulis **2026-10-15T08:18:44.179Z**; test mulai **2026-10-15T08:18:44.181Z** dengan SHA256 keputusan `90637f98878ac38a0643f347e1b1ccc34baf2bb4497e25dfe2e5031434a9825a`. Hash dan seluruh skor diperiksa ulang oleh verifier. Pilihan ini **untuk eksperimen**, bukan aktivasi otomatis model baru pada akun aplikasi.

## Kasus memburuk tetap disimpan

Sepuluh delta galat kata terbesar (Base minus Tiny; positif berarti Base lebih buruk):

| Audio sumber | Galat Tiny | Galat Base | Delta |
|---|---:|---:|---:|
| 5391610382088254398.wav | 3 | 8 | 5 |
| 18047620031436021096.wav | 7 | 7 | 0 |
| 3847795109135951088.wav | 12 | 12 | 0 |
| 4600139786023009708.wav | 8 | 8 | 0 |
| 8467235396572034984.wav | 18 | 18 | 0 |
| 14496880555594414124.wav | 7 | 6 | -1 |
| 14558356872710198155.wav | 13 | 12 | -1 |
| 1799385846660421241.wav | 8 | 7 | -1 |
| 10767369870409762683.wav | 8 | 6 | -2 |
| 11314714857215564898.wav | 4 | 2 | -2 |

Status kegagalan seluruh model/split dan sepuluh perbaikan terbesar tersedia pada [analisis lengkap](asr-comparison-analysis.json). Tidak ada kasus yang dihapus untuk memperbaiki skor. Latensi adalah subprocess baru per klip pada laptop ini; urutan model bergantian per rekaman. Beban latar tidak diisolasi, mikrofon/browser/HTTP tidak termasuk.

## Bukti dan batas klaim

[Semua prediksi/referensi](../../models/benchmarks/asr-comparison/2026-10-15T08-17-56-627Z-20faa6f2/predictions.json), [konfigurasi/hash/lingkungan](../../models/benchmarks/asr-comparison/2026-10-15T08-17-56-627Z-20faa6f2/protocol.json), [keputusan validasi](../../models/benchmarks/asr-comparison/2026-10-15T08-17-56-627Z-20faa6f2/decision.json), [hasil JSON](asr-comparison-results.json), [reproduksi](asr-comparison-reproducibility.json), [preservasi/rilis](asr-comparison-release.json).

Verifikasi mempersiapkan ulang seluruh audio dari Parquet asli, menghitung ulang skor/keputusan dan mengulang dua test clip per model. Klaim inferensi identik terbatas pada empat pengulangan tersebut. Model tetap pretrained dan kode suara aplikasi tetap menggunakan Tiny. Diperlukan evaluasi pesanan/mikrofon berizin sebelum klaim operasional. Overlap pretraining tidak dapat dikesampingkan; kedua sampel sekarang sudah terlihat dan tidak boleh disebut test baru ketika dipakai tuning berikutnya.
