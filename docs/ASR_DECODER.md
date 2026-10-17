# Diagnostik tahap decoder ASR

V0.31 melanjutkan TODO penangkapan variasi transkrip pada konfigurasi tetap. Percobaan memakai dua rekaman publik yang **sudah terlihat dan diketahui pernah berbeda**, bukan sampel mutu baru. Aplikasi dan worker suara produksi tidak diubah. [Sumber FLEURS, lisensi dan atribusi](../datasets/public/fleurs/README.md), [hasil terdahulu](evaluation/ASR_STABILITY_RESULTS.md), [ketidakcocokan HTTP](evaluation/runtime-speech-smoke-first.json).

[Run aktual](evaluation/ASR_DECODER_RESULTS.md) selesai: 24 transkripsi dan 36 replay. Base pinned plain menghasilkan dua varian teks; semua tahap deferred/replay cocok pada pengulangan yang diamati. Audit artefak lulus, tetapi tahap pertama variasi plain dan perbaikannya belum tertangkap. [Bukti audit](evaluation/asr-decoder-results.json).

## Rancangan yang dibekukan sebelum inferensi

| Kasus | Konfigurasi | Alasan dipilih |
| --- | --- | --- |
| `base-legacy-known-failure` | Base CPU int8, dua thread Whisper; lingkungan numerik diwarisi | Rekaman pertama dari perbandingan lama, pernah berubah pada pengulangan import-order produksi |
| `base-pinned-http-discrepancy` | Base yang sama, hanya `OPENBLAS_NUM_THREADS=1` ditetapkan sebelum impor native | Ketidakcocokan Base pertama dari smoke HTTP awal |

Masing-masing kasus menjalani enam pengulangan proses baru dalam dua mode: plain dan deferred. Total tetap **24 upaya transkripsi**. Urutan kasus dan mode dibalik pada pengulangan genap. Tidak ada pengulangan bersyarat sampai hasil cocok, pemilihan sampel baru berdasarkan hasil, pelatihan, perubahan threshold, promosi Base atau skor WER baru.

Sebelum run, runner memeriksa hash sumber v0.24, manifest/audio dan checksum seluruh berkas model Base. Protokol mencatat ID run, dua kasus, jadwal semua upaya, lingkungan numerik, sepuluh hash sumber dan tujuh hash bukti sebelumnya. Setiap upaya menghasilkan checkpoint baru, termasuk kegagalan proses. `traces.json` dan `summary.json` dibuat setelah jadwal selesai. Run tambahan selalu memakai direktori baru; tidak ada pointer `latest` yang mengubah bukti mana yang dinilai.

## Apa yang ditangkap

Mode plain memanggil fungsi transkripsi produksi dengan model Base, tanpa profiler atau pembungkus internal fitur/encoder. Mode deferred memakai `sys.setprofile` untuk menahan referensi ketika fungsi Python mengembalikan hasil. Hash dan penilaian dilakukan sesudah seluruh transkripsi selesai. Referensi tambahan tetap dapat memengaruhi alokasi, waktu dan umur buffer; kedua mode tidak diasumsikan identik.

Urutan tahap: PCM → waveform setelah VAD/padding → window → filter mel → STFT → magnitudes → proyeksi mel → log-mel → input/output encoder → input decoder (buffer, prompt dan opsi) → token decoder → skor decoder → segmen → teks akhir. Fingerprint nilai hanya memakai hash byte, shape dan dtype; offset/alignment disimpan sebagai metadata dan tidak dianggap perubahan nilai.

Penangkapan decoder mengikuti kode lokal `generate_with_fallback` pada versi faster-whisper terpasang, yang hashnya ikut dipatok. Opsi temperature harus tepat nol. Token, skor, probabilitas no-speech, average log probability, compression ratio dan segmen ditahan untuk membedakan perubahan numerik dari perubahan token/teks. Tidak ada referensi transkrip penerbit yang dipakai sebagai prompt.

Sesudah tiap transkripsi deferred, decoder dipanggil **tiga kali** untuk setiap pemanggilan decoder yang tertangkap, menggunakan buffer encoder, prompt, opsi dan instance model yang ditahan. Profiler sudah dimatikan. Hash input diperiksa sebelum dan sesudah setiap replay; jumlah replay mengikuti jumlah pemanggilan decoder yang benar-benar tertangkap, bukan selalu satu per audio. Error replay tetap dihitung. Keadaan proses/model sesudah inferensi dapat berbeda dari keadaan panggilan awal; replay yang cocok tidak membuktikan panggilan awal atau seluruh aplikasi deterministik.

## Menjalankan dan mengaudit

```powershell
npm run diagnose:asr-decoder
npm run test:asr-decoder
.venv-voice/Scripts/python.exe -m unittest discover -s tests -p test_asr_decoder.py
```

Runner hanya membaca dua audio publik terpatok di `datasets/public/fleurs/`; tidak memakai SQLite, API transaksi atau rekaman pengguna. Setiap subprocess memiliki batas 90 detik, stdout 1 MB dan stderr 8 KB. `--out DIRECTORY_BARU` memilih direktori keluaran baru; direktori lama ditolak sebelum inferensi. Tidak ada unduhan model/dataset pada perintah ini.

Runner mencetak direktori run. Audit tanpa inferensi memakai direktori eksplisit:

```powershell
npm run analyze:asr-decoder -- --directory "ISI_DIREKTORI_RUN" --out data/private/decoder-audit-new.json
```

Analyzer memeriksa seluruh hash sumber/bukti/audio/model, jadwal, checkpoint, lingkungan, kelengkapan tahap dan replay, lalu menghitung ulang ringkasan dan membandingkannya dengan hasil tersimpan. File keluaran lama ditolak. Audit artefak yang lulus berbeda dari berhasil menangkap variasi atau memvalidasi perbaikan.

Tujuh tes Node dan tiga tes Python menggunakan fixture terisolasi: kelengkapan cohort, deteksi duplikasi/perubahan sumber, urutan tahap pertama, token versus skor, buffer mutation, penolakan/error, opsi replay dan fingerprint nilai. Tes tersebut bukan skor ASR pada audio nyata.

## Batas interpretasi

Perbedaan tahap pertama adalah lokalisasi observasi pada jalur yang diinstrumentasi, belum penetapan penyebab atau validasi perbaikan. Variasi plain tidak dapat dilokalisasi dengan menempelkan hash dari run deferred lain. Skor dapat berubah sementara token/teks tetap sama. Kegagalan historis tetap berlaku walaupun semua pengulangan baru cocok.

Lingkungan run sekarang dicatat, tetapi tidak dinyatakan merekonstruksi seluruh kondisi proses, beban laptop atau lingkungan historis. Kedua kasus berbeda rekaman sekaligus profil: angka lintas kasus bukan eksperimen satu faktor tentang efek OpenBLAS. Pembandingan pengulangan berlaku di dalam setiap kasus/mode.

`causeEstablished`, `fixValidated` dan `readyForPromotion` tetap false pada diagnostik ini. Default aplikasi tetap Tiny; Base tetap kandidat opt-in. Perbaikan yang diusulkan nanti memerlukan intervensi beralasan, pengujian jalur tanpa instrumentasi dan evaluasi mutu yang sesuai sebelum promosi. Data tugas pesanan/pembicara/mikrofon pemilik usaha berizin masih diperlukan.
