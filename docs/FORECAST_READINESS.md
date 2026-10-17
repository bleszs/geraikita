# Audit kesiapan data forecasting

V0.16.0 menambah audit ledger **read-only** yang menjelaskan apa yang benar-benar tersimpan sebelum training dan ketika forecast dibentuk. Audit tidak membuat histori, mengisi transaksi, menyatakan izin atas nama pemilik, melatih model, atau mengubah aktivasi model.

```powershell
npm run forecast -- readiness
```

Untuk menyimpan laporan privat ke file baru:

```powershell
npm run forecast -- readiness --out data/evaluation/forecast-readiness.json
```

File yang sudah ada tidak ditimpa. Laporan berisi identitas scope/nama bahan dan harus diperlakukan sebagai data privat. Folder `data/` diabaikan Git. File hasil pemeriksaan laptop pada pekerjaan ini: `data/evaluation/forecast-readiness-v016.json`.

Filter satu usaha/bahan menggunakan ID sebenarnya yang diperoleh melalui `npm run forecast -- sources`:

```powershell
npm run forecast -- readiness --workspace ID_KELOMPOK --business ID_USAHA --product ID_BAHAN
```

Semua placeholder perlu diganti. Filter usaha/bahan memerlukan pasangan kelompok dan usaha; hasil tidak mengambil bahan kelompok/anggota lain. `--database PATH` dan `--models DIRECTORY` tersedia untuk instalasi berbeda. Registry dibaca tanpa menulis atau mengaktifkan artefak.

## Membaca hasil

| Bagian | Arti |
|---|---|
| `recordedDates` | Jumlah tanggal dengan baris pemakaian tersimpan sebelum tanggal audit |
| `explicitZeroDates` | Tanggal yang memang memiliki baris bernilai nol; dapat berasal dari pembatalan/koreksi |
| `calendarDaysSinceFirst` | Jumlah hari kalender dari baris pertama sampai kemarin; bukan jumlah hari yang sudah diverifikasi lengkap |
| `assumedZeroDatesSinceFirst` | Tanggal tanpa baris ledger dalam rentang tersebut; forecast saat ini menganggapnya nol |
| `daysWithoutEntryAtEnd` | Hari kalender sejak baris terakhir sampai kemarin; `null` bila belum ada histori |
| `recent14` | Cakupan 14 tanggal sebelum audit: baris ada, nol tersimpan, nol asumsi dan tanggal sebelum histori tersedia |
| `recordingCompleteness` | Selalu `not_verified_by_ledger`; keberadaan baris belum membuktikan seluruh transaksi hari itu dicatat |
| `baseline` | Ketersediaan baseline sesuai rentang minimal tujuh hari, termasuk penjelasan bila memerlukan nol asumsi |
| `model.registryStatus` | Status artefak untuk scope/satuan tersebut; bukan jaminan bahwa model sedang digunakan saat inferensi |
| `training` | Kekurangan rentang atau kandidat periode yang masih memerlukan verifikasi izin/kelengkapan |

Hari berjalan dan masa depan tidak masuk diagnostik. `excludedPartialOrFutureRows` menunjukkan jumlah baris yang dikeluarkan oleh audit. Audit menggunakan tanggal usaha Asia/Jakarta secara default. `--as-of YYYY-MM-DD` boleh untuk cutoff lama, tidak boleh melewati hari ini. Cutoff lama membaca keadaan ledger **saat ini setelah koreksi**, bukan rekonstruksi snapshot historis pada waktu itu.

Rentang 84 hari hanya batas protokol training Ridge. Satu baris yang sudah berumur 84 hari tidak dianggap 84 observasi terverifikasi. Statusnya tetap `needs_permission_and_completeness_confirmation`, dengan jumlah baris dan nol asumsi pada kandidat 84 hari terakhir. Nilai `additionalCalendarDays` menjelaskan rentang kalender yang kurang, bukan perintah menunggu jika arsip nyata berizin sudah tersedia.

Ekspor tetap memerlukan `--confirm-records` beserta referensi izin setelah pemilik meninjau kelengkapan periode. Audit tidak memasang flag tersebut secara otomatis. Model publik tetap tidak digunakan sebagai model bahan akun.

## Perubahan pola yang ditampilkan

Jika rentang histori sudah 14 hari, `recentChange` menunjukkan rata-rata tujuh hari terakhir, tujuh hari sebelumnya, selisih absolut dan perubahan relatif. Semua memakai satuan bahan yang sama. Jika terdapat tanggal tanpa baris, `usesAssumedZeros` bernilai benar. Bila rata-rata periode sebelumnya nol, perubahan relatif `null`, bukan persentase buatan atau tak hingga.

Ini ringkasan deskriptif, **belum detektor anomali/drift yang tervalidasi**, tidak memiliki ambang otomatis, dan tidak melatih ulang atau menonaktifkan model. Penurunan pemakaian dapat berasal dari permintaan, stok kosong atau pencatatan yang belum lengkap; ledger saja belum membedakannya.

## Metadata saat aplikasi berjalan

`server/forecast.mjs` memakai pemeriksaan yang sama dan menyertakan `historyQuality` pada rekomendasi API, termasuk ketika histori belum cukup. Angka forecast dan kebijakan aktivasi yang ada tetap berlaku; perubahan ini menjelaskan cakupan input. Rincian ini dapat dilihat lewat CLI/API dan belum memiliki panel khusus pada tampilan Saran kulakan. Model masih memerlukan scope/satuan/horizon yang sesuai dan tanggal setelah evaluasi; registry aktif tidak otomatis berarti model berlaku pada setiap tanggal.

Sembilan tes di `tests/forecast-readiness.test.mjs` mencakup histori kosong, nol eksplisit/asumsi, cutoff, tahun kabisat, kandidat 84 hari, statistik dengan penyebut nol, API, isolasi scope, model dan CLI. Seluruh data tes berada di file sementara, terpisah dari akun aktif. Jalankan `npm run test:readiness`.

V0.26 menambahkan penyaring kandidat anomali terpisah: `npm run forecast:anomalies`. Penyaring mensyaratkan 56 tanggal referensi tersimpan, tanpa asumsi nol; ringkasan `recentChange` dan prediksi di atas tetap memakai perilaku sebelumnya. Ini belum detektor tervalidasi atau bukti kelengkapan lapangan. [Aturan dan status](USAGE_ANOMALIES.md).

V0.27 menampilkan hasil penyaring tersebut pada `recommendations[].usageScreening` di API bootstrap dan panel **Periksa pemakaian bahan** di Saran kulakan. Panel membedakan tanggal yang dapat diperiksa dari gap, menyertakan referensi dan memberi penanda data tersimpan saat offline. Metadata `historyQuality` dan ringkasan `recentChange` tetap tersedia dengan arti sebelumnya. [Panduan panel](USAGE_REVIEW.md).
