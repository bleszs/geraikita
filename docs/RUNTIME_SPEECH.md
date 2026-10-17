# Memakai profil suara di aplikasi

Mulai v0.25, profil kandidat dapat dipilih saat startup aplikasi. Tanpa pilihan, `npm start` tetap memakai Tiny dan worker asli di **http://localhost:4174**. Tidak ada penggantian model otomatis berdasarkan skor eksperimen.

Untuk mencoba Base pretrained yang sudah terpasang:

```powershell
npm run start:base
```

Buka **http://localhost:4176**, lalu masuk ke akun. Perintah ini memakai database usaha yang sama; tidak membuat akun, katalog atau transaksi contoh. Transkrip tetap dapat dikoreksi dan harus melewati review sebelum pesanan disimpan. Audio pengguna tidak disimpan.

Pada terminal lain, periksa server Base:

```powershell
npm run doctor:base
```

Pemeriksaan ini harus membaca `whisper-base`, profil `base-pinned`, dan `localModelVerified: true`. Perintah gagal bila profil server berbeda atau model yang diminta tidak siap. `npm run doctor` tanpa pilihan membaca profil server yang benar-benar berjalan di port default, lalu memeriksa bobot/model yang sesuai di laptop; tidak lagi selalu memeriksa Tiny.

Jika Base belum terpasang pada laptop lain, jalankan `npm run fetch:asr-model`; Tiny menggunakan `npm run voice:setup`. Tidak ada unduhan otomatis ketika melakukan transkripsi. Bila bobot profil yang dipilih tidak tersedia, suara dilaporkan belum siap dan input teks tetap tersedia; aplikasi tidak diam-diam beralih model.

## Pilihan startup

```powershell
npm start -- --speech-profile base-pinned --port 4176
npm start -- --speech-profile tiny-pinned --port 4177
npm start -- --speech-profile tiny-current --port 4178
```

Profil juga dapat diatur melalui `SPEECH_PROFILE`; flag CLI mengungguli variabel tersebut. `--port` mengungguli `PORT`. Tanpa profil/env profil kosong, singleton Tiny asli dipertahankan. Nama tidak dikenal, path, argumen salah dan port tidak valid ditolak sebelum database dibuka. Server tetap hanya mendengarkan `127.0.0.1`; `SPEECH_PROVIDER=disabled` tetap menonaktifkan suara. Satu inferensi dibatasi per instance/server.

`tiny-pinned` dan `base-pinned` menetapkan `OPENBLAS_NUM_THREADS=1` sebelum impor native. `tiny-current` adalah kandidat Tiny yang mewarisi lingkungan numerik. Profil eksplisit menggunakan adapter v0.24 dengan validasi checksum/identitas hasil serta batas ukuran/durasi, timeout dan abort yang sama. [Metode dan evaluasi v0.24](ASR_PROFILES.md).

## Bukti teknis dan batas hasil

Uji startup sungguhan menjalankan proses Node terpisah dari CLI, dengan SQLite sementara, identitas uji sementara dan audio FLEURS publik yang sudah dinilai. Login, CSRF/origin, model/profil respons, akses API serta kesamaan isi 19 tabel setelah transkripsi diperiksa. `doctor` diuji pada server Base dan pada permintaan profil yang salah. Database sementara dibersihkan sesudah uji; database usaha aktif tidak digunakan oleh smoke.

[Bukti awal](evaluation/runtime-speech-smoke-first.json) mempertahankan dua ketidakcocokan terhadap prediksi v0.24: satu Tiny default dan satu Base pinned. Karena entrypoint/env/waktu proses HTTP dan eksperimen tidak terbukti ekuivalen, ini pemeriksaan paritas setelah eksperimen, bukan bukti bahwa transport HTTP menyebabkan variasi. Bukti tidak dihapus jika run lain cocok.

Empat capture deferred pada klip Base yang berbeda menghasilkan hash tahap dan transkrip yang sama di antara empat capture tersebut. Perubahan konfigurasi tetap belum tertangkap di bawah instrumentasi; penyebab dan perbaikan masih belum terbukti. [Bukti capture](evaluation/runtime-speech-capture.json), [smoke pada startup final](evaluation/runtime-speech-smoke.json), [pemeriksaan rilis/data](evaluation/runtime-speech-release.json).

Base tetap **opsi kandidat**, bukan model yang sudah lulus promosi otomatis atau validasi pesanan lapangan. `causeEstablished=false`, `fixValidated=false`, `readyForPromotion=false`. Tidak ada training, WER test baru atau klaim universal kestabilan pada pekerjaan integrasi ini. Nilai v0.24 tetap hasil run yang dibekukan dan tidak dihitung ulang agar cocok dengan HTTP.

Tindak lanjut v0.31 menjalankan 24 transkripsi proses baru dan 36 replay decoder. Pada rekaman ketidakcocokan HTTP, enam plain Base pinned menghasilkan dua varian teks pada lingkungan numerik yang sama; jalur deferred/replay tetap cocok. Ini bukti tambahan bahwa penguncian thread belum menjamin kestabilan, bukan penetapan penyebab atau perbaikan. [Hasil](evaluation/ASR_DECODER_RESULTS.md), [protokol dan cara audit](ASR_DECODER.md).

Perintah teknis untuk memeriksa ulang:

```powershell
npm run test:runtime-speech
npm run voice:runtime-smoke
```

Smoke setelah perubahan dukungan port memiliki folder run/protokol terpisah di `models/benchmarks/runtime-speech/`; bukti awal dan kegagalan tetap dipertahankan. `npm run voice:capture-runtime` membuat empat capture pada ketidakcocokan Base pertama yang sudah disimpan, bukan loop sampai hasil cocok. Semua audio di alat tersebut adalah sumber publik yang dipatok, bukan rekaman pengguna.
