# Evaluasi profil ASR terpatok — v0.24

**Kandidat dipilih lewat validation: base-pinned. Model aplikasi tetap Tiny pada konfigurasi semula.** Tidak ada training/fine-tuning atau aktivasi otomatis. Penyebab kegagalan historis belum dinyatakan selesai.

16 kelompok kalimat validation dan 24 test baru dipilih sebelum inferensi, mengeluarkan seluruh 128 rekaman unik yang sudah dinilai pada v0.20/v0.21 beserta identitas/teksnya. Klip diagnostik lama adalah subset run sebelumnya. Test juga tidak memakai identitas/teks dari seluruh metadata validation penerbit. Sumber FLEURS Indonesia CC BY 4.0 yang sama; bukan dataset/speaker/domain independen. [Metode](../ASR_PROFILES.md), [JSON](asr-profile-results.json), [audit](asr-profile-audit.json).

| Profil | WER validation | WER test | CER test | Diterima / 24 | Tolak / error | p95 test |
|---|---:|---:|---:|---:|---:|---:|
| tiny-current | 54,98% | 86,59% | 43,43% | 22 | 2 / 0 | 8199 ms |
| tiny-pinned | 59,41% | 97,36% | 51,96% | 22 | 2 / 0 | 9649 ms |
| base-pinned | 33,21% | 36,99% | 12,86% | 24 | 0 / 0 | 9735 ms |

tiny-current memakai Tiny dengan lingkungan numerik warisan yang dicatat. tiny-pinned hanya menetapkan OPENBLAS_NUM_THREADS=1; base-pinned memakai Base dengan thread BLAS tetap yang sama. CPU int8/two threads Whisper, decoder, VAD dan gate segmen tetap. Proses baru per klip mencakup startup Python/model dan beban laptop; p95 bukan jaminan latensi umum.

Aturan validation dibekukan sebelum inferensi: pilih base-pinned bila WER sedikitnya 10% relatif lebih rendah dari tiny-current, tanpa error infrastruktur/penolakan tambahan dan p95 ≤15 detik. Jika gagal, tiny-pinned dipilih hanya bila WER tidak lebih buruk dan lolos gate lain; selain itu tiny-current. Hash keputusan ditulis sebelum test. Aturan ini pragmatis, bukan uji signifikansi atau bukti noninferioritas statistik.

## Perbandingan berpasangan terhadap tiny-current

| Profil | Galat lebih sedikit | Galat lebih banyak | Seri |
|---|---:|---:|---:|
| tiny-current | 0 | 0 | 24 |
| tiny-pinned | 7 | 10 | 7 |
| base-pinned | 22 | 0 | 2 |

## Pengulangan dan capture otomatis

Inferensi utama **120**, pengulangan tambahan **24**, capture bersyarat **0**. Dua klip test pertama per profil diulang empat kali; dibandingkan selalu dengan inferensi utama. Seluruh upaya dipertahankan.

| Profil | Pengulangan | Berbeda dari hasil utama | Semua diterima | Cocok pada lingkup ini |
|---|---:|---:|---|---|
| tiny-current | 8 | 0 | true | true |
| tiny-pinned | 8 | 0 | true | true |
| base-pinned | 8 | 0 | true | true |

Baseline tiny-current juga cocok pada pengulangan ini. Karena itu, cek terbatas ini tidak membuktikan bahwa penguncian thread menghilangkan variasi. Bandingkan tiga profil pada sampel yang sama; Tiny pinned yang lebih buruk tidak disembunyikan.

Ketidakcocokan pertama per profil disimpan sebelum empat capture deferred yang sudah ditetapkan protokol. Capture tidak mengganti hipotesis/skor utama dan tidak membuktikan jalur profiling identik dengan jalur tanpa profiling. Hasil belakangan yang cocok tidak menghapus kegagalan awal. Analisis tahap capture ada pada JSON audit.

## Batas dan tindak lanjut

**causeEstablished=false, fixValidated=false, readyForPromotion=false** tetap terpisah dari audit yang lulus dan pengulangan terbatas. Tidak ada klaim ketepatan menu/jumlah/negasi, mikrofon pemilik, kedai bising, generalisasi pembicara atau determinisme universal. Sampel ini sekarang sudah dinilai; jangan tuning lalu menyebutnya test baru.

Adapter profil merupakan factory opt-in yang memeriksa checksum serta identitas model/profil. HTTP/default worker tetap sebelumnya. Kandidat belum dipromosikan; perlu peninjauan kegagalan, protokol kestabilan yang memadai dan validasi tugas pesanan dengan data berizin.

[Protokol](../../models/benchmarks/asr-profiles/2026-10-15T17-28-28-568Z-4cbb5be2/protocol.json), [prediksi](../../models/benchmarks/asr-profiles/2026-10-15T17-28-28-568Z-4cbb5be2/predictions.json), [keputusan](../../models/benchmarks/asr-profiles/2026-10-15T17-28-28-568Z-4cbb5be2/decision.json), [pengulangan](../../models/benchmarks/asr-profiles/2026-10-15T17-28-28-568Z-4cbb5be2/repeats.json), [capture](../../models/benchmarks/asr-profiles/2026-10-15T17-28-28-568Z-4cbb5be2/captures.json).
