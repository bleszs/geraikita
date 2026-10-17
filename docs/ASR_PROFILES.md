# Kandidat profil suara dengan konfigurasi terpatok

**Pembaruan v0.25:** kandidat kini dapat dipilih saat startup melalui CLI atau `SPEECH_PROFILE`, tanpa mengubah default Tiny. Jalankan `npm run start:base` untuk port 4176. Uji HTTP memperlihatkan ketidakcocokan baru terhadap prediksi v0.24, sehingga pengulangan terbatas di bawah tidak membuktikan perbaikan variasi. [Cara menjalankan dan bukti terbaru](RUNTIME_SPEECH.md).

V0.24 menambah adapter kandidat yang terpisah dari default aplikasi, preparasi sampel baru, pembanding tiga profil dan capture otomatis jika pengulangan berubah. [Hasil aktual](evaluation/ASR_PROFILE_RESULTS.md), [audit](evaluation/asr-profile-audit.json), [protokol sebelum inferensi](../benchmarks/asr-profiles/protocol.json).

## Profil dan batas penggunaan

| Profil | Bobot | Perubahan numerik |
|---|---|---|
| tiny-current | Tiny pretrained yang sudah dipasang | Mewarisi lingkungan numerik proses, seperti default sebelumnya |
| tiny-pinned | Tiny pretrained yang sama | Menetapkan `OPENBLAS_NUM_THREADS=1` sebelum pustaka native diimpor |
| base-pinned | Base pretrained yang sudah dipasang | Menetapkan `OPENBLAS_NUM_THREADS=1` sebelum pustaka native diimpor |

Seluruhnya mempertahankan CPU int8, dua thread Whisper, decoder audio berbatas, bahasa Indonesia, VAD, beam size, temperatur dan gate segmen produksi. Batas ukuran/durasi, timeout, abort, validasi keluaran dan satu inferensi pada setiap instance menggunakan transport yang sudah ada. Adapter memeriksa checksum bobot yang sesuai dan menolak identitas model/profil/thread yang tidak cocok. Thread BLAS tidak otomatis sama dengan thread Whisper.

`server/ml/transcribe-profile.py` adalah entrypoint kandidat baru; `server/ml/transcribe.py` dan `server/transcriber.mjs` lama dipertahankan agar bukti eksperimen sebelumnya tetap dapat diperiksa. Tidak ada training/fine-tuning atau perubahan bobot. **Tanpa pilihan eksplisit, aplikasi tetap memakai Tiny pada konfigurasi sebelumnya.** Mulai v0.25, `SPEECH_PROFILE` atau `--speech-profile` dipakai oleh startup; tidak ada pemilihan otomatis berdasarkan skor.

Periksa pemasangan kandidat tanpa mengubah aplikasi:

```powershell
npm run voice:profile -- tiny-pinned
npm run voice:profile -- base-pinned
```

Factory opt-in tersedia melalui `createProfileTranscriber` di `server/speech-profiles.mjs`; startup v0.25 menghubungkannya ke HTTP hanya jika profil dipilih eksplisit. Status kandidat tidak sama dengan bukti akurasi atau kestabilan lapangan.

## Data dan protokol

Sumber tetap rekaman nyata publik FLEURS Indonesia, CC BY 4.0, revisi Parquet dan checksum yang sudah dipatok. [Atribusi dan batas dataset](../datasets/public/fleurs/README.md). Tidak ada audio atau transaksi publik yang dimasukkan ke akun usaha.

16 kelompok kalimat validation dan 24 test dipilih dengan ranking hash sebelum inferensi. Seluruh 64 rekaman v0.20 dan 64 rekaman unik v0.21 dikeluarkan melalui sentence ID, teks ternormalisasi, filename dan hash audio hasil konversi. Klip diagnostik v0.22/v0.23 merupakan subset dari run tersebut. Test juga mengeluarkan identitas/teks dari seluruh metadata validation penerbit, bukan hanya 16 pilihan. Tidak ada pemilihan berdasarkan durasi/kemudahan transkrip atau penggantian kasus gagal. Satu rekaman per kelompok, tanpa cropping/augmentasi.

Ini kelompok kalimat belum dinilai dari sumber yang sama, bukan dataset independen, split pembicara yang diaudit, atau uji suara pesanan. Sampel yang sudah dinilai tidak boleh dituning lalu disebut test baru. Jika protokol baru dibuat, tambahkan seluruh rekaman run ini ke daftar eksklusi.

Pemilihan hanya memakai validation dengan urutan yang dipatok:

1. Pilih Base pinned jika WER setidaknya 10% relatif lebih rendah dari Tiny current, tidak ada error infrastruktur, penolakan tidak bertambah dan p95 paling lama 15 detik.
2. Jika Base tidak lolos, pilih Tiny pinned hanya jika WER tidak lebih buruk dari Tiny current dan gate error/penolakan/latensi juga lulus.
3. Selain itu tetap Tiny current.

Aturan ini merupakan kriteria praktis pada sampel kecil; bukan pembuktian statistik noninferioritas atau generalisasi. Keputusan validation beserta hash prediksi ditulis sebelum test dimulai. Semua profil tetap dibandingkan pada test yang sama; hasil test tidak mengubah keputusan. WER/CER memasukkan seluruh penolakan/error sebagai hipotesis kosong. Latensi mencakup startup proses/model pada laptop ini; beban latar tidak dikendalikan.

## Pengulangan dan capture ketika gagal

Setelah 120 inferensi utama, dua rekaman test pertama per profil diulang empat kali: 24 inferensi tambahan yang sudah dipatok. Keberhasilan terbatas mensyaratkan semuanya diterima dan cocok dengan hasil utama. Semua percobaan tetap disimpan; penolakan berulang yang sama tidak dianggap keberhasilan.

Jika ketidakcocokan pertama muncul pada suatu profil, file `first-failure-<profile>.json` menyimpan hasil asli dan ulang sebelum empat capture deferred tambahan. Jumlah capture dibatasi empat per profil, tanpa retry sampai cocok. Capture memakai pencatatan setelah inferensi dari v0.23, menyimpan hash PCM, tahap fitur dan encoder; hasil capture tidak mengganti skor utama. Profiling dapat memengaruhi timing/alokasi/lifetime dan belum tentu menangkap kegagalan jalur tanpa profiling.

Ada tiga status terpisah: audit sumber/skor, kecocokan pada pengulangan terbatas, dan kesiapan promosi. Penyebab historis tetap belum terbukti; `causeEstablished=false`, `fixValidated=false` dan `readyForPromotion=false` tidak otomatis berubah hanya karena satu run cocok. Validasi menu/jumlah/negasi dan mikrofon pemilik usaha masih membutuhkan data berizin.

## Perintah

```powershell
npm run prepare:asr-profiles
npm run benchmark:asr-profiles
npm run verify:asr-profiles
npm run analyze:asr-profiles
npm run test:asr-profiles
```

Lingkungan `.venv-speech-data` membaca Parquet; `.venv-voice` melakukan konversi dan inferensi. Tidak ada dependency atau bobot baru. `verify:asr-profiles` mempersiapkan ulang dari Parquet asli dan menghitung ulang sumber/hash/pemilihan/skor/keputusan serta seluruh hasil pengulangan, tanpa menjalankan ulang inferensi sampai lolos.

Artefak `models/benchmarks/asr-profiles/<run>/` mempertahankan protokol/hash, lingkungan, keputusan sebelum test, prediksi, hasil ulang, kegagalan awal dan seluruh capture. Dataset preparasi ada di direktori `datasets/public/fleurs/comparison/profiles-*`; pointer terpisah tidak menimpa pointer eksperimen lama. Menjalankan ulang protokol yang sama adalah replikasi pada sampel yang sudah dilihat, bukan test baru.
