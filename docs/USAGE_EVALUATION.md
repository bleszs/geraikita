# Evaluasi pemeriksaan pemakaian bahan

V0.30 menyediakan ekspor lembar anotasi dari ledger asli, pembekuan protokol sebelum anotasi, serta pengukuran kandidat review terhadap label manusia. Ini melanjutkan TODO validasi penyaring pemakaian. **Belum ada evaluasi lapangan atau skor akurasi dari akun aktif**: akun belum mempunyai histori pemakaian berlabel. Alat tidak membuat data, melatih model, mengubah ambang atau menulis ke SQLite.

## Persiapan bersama pemilik

Pilih satu bahan pada satu usaha yang pemiliknya mengizinkan pemakaian data untuk evaluasi. Catat referensi izin di berkas privat. Tentukan periode validation lebih dahulu, kemudian test yang tidak overlap; setiap periode maksimal 366 hari dan seluruh rentang maksimal 3660 hari. Semua tanggal target akan disertakan, termasuk tanggal kosong. Pilih tanggal sebelum hari berjalan.

Gunakan `npm run forecast -- sources` untuk melihat scope sebenarnya secara lokal. ID kelompok/usaha/bahan bersifat privat. Ganti semua nilai bertanda `ISI_...` pada contoh berikut dengan data yang sebenarnya; contoh tidak menyertakan akun, tanggal atau izin buatan.

```powershell
npm run usage:evaluation -- export --workspace ISI_ID_KELOMPOK --business ISI_ID_USAHA --product ISI_ID_BAHAN --validation-from ISI_TANGGAL_AWAL_VALIDATION --validation-to ISI_TANGGAL_AKHIR_VALIDATION --test-from ISI_TANGGAL_AWAL_TEST --test-to ISI_TANGGAL_AKHIR_TEST --confirm-permission --reference "ISI_REFERENSI_IZIN_ASLI" --out datasets/private/usage-labels.json
```

Format tanggal `YYYY-MM-DD`. `--database PATH` atau `DATABASE_PATH` dapat memilih database yang sudah ada; default database usaha aktif. Wajib memberikan ketiga ID, referensi izin dan `--confirm-permission`. Tanpa histori pada rentang tersebut, ekspor ditolak tanpa membuat file keluaran. Ini CLI operator dengan akses filesystem; tidak menambahkan jalur HTTP yang melewati login.

Ledger dibaca melalui snapshot transaksi SQLite `readOnly: true`. Ekspor mencakup observasi tersimpan sejak 56 hari sebelum validation hingga akhir test, satuan dan lembar anotasi seluruh tanggal target. Gap tidak diisi nol. Nama usaha/bahan, ID akun/scope dan path SQLite tidak dimasukkan; dataset memakai UUID baru. Jumlah, tanggal dan referensi tetap privat: pemisahan ID bukan jaminan anonimitas. Simpan berkas dalam `datasets/private/` atau `data/`, bukan `public/` atau repository.

Template `datasets/templates/usage-review-labels.json` sengaja kosong dan ditolak untuk evaluasi. Ekspor dari histori asli mengisi struktur yang dapat dibekukan; jangan mengisi template dengan catatan rekaan.

## Bekukan sebelum memberi label

```powershell
npm run usage:evaluation -- freeze --dataset datasets/private/usage-labels.json --out data/evaluation/usage/protocol-pilot
```

Perintah membuat `protocol.json` pada direktori **baru**. Isinya mencatat waktu pembekuan, hash input, identitas dataset, seluruh tanggal/split, aturan tetap dan hash enam berkas sumber. Lembar harus masih kosong: label, konteks, kelengkapan, annotator dan bukti belum diisi. Protokol tidak menghitung atau membocorkan kandidat aturan ke pemberi label.

Setelah pembekuan, jumlah ledger, satuan, izin, identitas dataset dan pemilihan tanggal tidak boleh diubah. Perubahan data memerlukan koleksi/protokol baru yang dijelaskan alasannya. Jika aturan/sumber evaluasi berubah, protokol lama ditolak; mengganti protokol bukan cara menjadikan test yang sudah dilihat sebagai test independen baru. File dan hash dapat mendeteksi perubahan terhadap bukti yang disimpan, bukan mencegah seseorang membuat pernyataan izin atau kronologi yang tidak benar.

## Anotasi tanpa melihat hasil penyaring

Pemilik atau peninjau memakai bukti transaksi, stok dan konteks usaha yang diizinkan, **tanpa membuka panel pemeriksaan pemakaian atau keluaran `forecast:anomalies` untuk periode yang dianotasi**. Jika hasil aturan sudah dilihat, jangan menyatakan `blindReviewConfirmed: true`; rancang pengumpulan baru atau laporkan bahwa studi itu tidak memenuhi protokol ini.

Isi setiap baris pada kedua split, bukan hanya hari yang tampak aneh:

| Kolom | Isi |
| --- | --- |
| `label` | `review_needed`: perlu tindak lanjut menurut bukti manusia; `expected`: pemakaian dipahami dan tidak perlu tindak lanjut; `uncertain`: bukti belum cukup untuk menentukan |
| `recordingComplete` | `true` hanya setelah kelengkapan pencatatan tanggal tersebut diperiksa; `false` jika belum lengkap. Baris tersimpan bukan bukti kelengkapan |
| `annotator` | ID pseudonim peninjau, 3–100 karakter; hindari nama lengkap |
| `evidenceReference` | Referensi bukti privat yang dapat ditelusuri, 3–500 karakter; tidak perlu menyalin data pelanggan |
| `context` | `weekly_pattern`, `holiday`, `weather`, `promotion`, `recording_issue`, `other` atau `unknown`, berdasarkan bukti manusia |

Jangan mengubah `date`/`split` atau menambah kolom hasil aturan. Setelah seluruh anotasi selesai, set `provenance.humanAnnotated`, `blindReviewConfirmed`, dan `completenessReviewed` menjadi `true`, lalu isi `completenessReference` dengan referensi pemeriksaan bersama pemilik. Konfirmasi ini merupakan pernyataan penyedia data, belum verifikasi independen. Label positif berarti **perlu ditinjau**, bukan kepastian salah catat, pencurian atau penyebab tertentu.

## Jalankan penilaian

```powershell
npm run usage:evaluation -- evaluate --dataset datasets/private/usage-labels.json --protocol data/evaluation/usage/protocol-pilot/protocol.json --split validation --out data/evaluation/usage/validation-pilot
npm run usage:evaluation -- evaluate --dataset datasets/private/usage-labels.json --protocol data/evaluation/usage/protocol-pilot/protocol.json --split test --out data/evaluation/usage/test-pilot
```

`--split` default `test`. Semua anotasi pada kedua split harus selesai sebelum penilaian pertama agar hari sulit tidak dibuang sesudah melihat keluaran. Tanpa `--out`, freeze/evaluate memakai direktori baru berwaktu dan UUID. Direktori/file yang sudah ada ditolak; bukti lama tidak ditimpa. Dataset/protokol maksimal 5 MB. CLI hanya mencetak lokasi dan ringkasan metrik, bukan isi ledger atau bukti manusia.

Laporan menyertakan hash file dataset berlabel dan protokol, keputusan aturan produksi yang sama dengan panel, tanggal/label/konteks, serta:

| Metrik | Arti dan batas |
| --- | --- |
| `confusionOnScreened` | TP/FP/FN/TN hanya pada tanggal berlabel pasti, pencatatan lengkap dan referensi cukup |
| `precision` | TP / (TP + FP); null jika tidak ada kandidat yang dapat dinilai |
| `recallOnScreened` | TP / (TP + FN), hanya pada tanggal yang bisa diperiksa |
| `f1OnScreened` | 2TP / (2TP + FP + FN); null jika denominator nol |
| `coverage` | Tanggal dapat diperiksa / tanggal dengan label pasti dan pencatatan lengkap |
| `reviewNeededDuringAbstention` | Label perlu ditinjau pada tanggal yang aturannya tidak bisa dihitung |
| `endToEndRecall` | TP / seluruh label perlu ditinjau yang lengkap, termasuk yang terlewat akibat abstain |
| `actualReviewCandidates` / `reviewBurdenPer100TargetDays` | Semua tanda aturan / beban per 100 tanggal target, termasuk tanda pada label uncertain atau pencatatan belum lengkap |

Denominator nol menjadi `null`. Hasil tanpa tanggal yang dapat dinilai berstatus `not_estimable`. Jumlah label uncertain dan pencatatan belum lengkap selalu dilaporkan; kedua kelompok dapat overlap, sehingga tidak boleh dijumlahkan sebagai kelompok terpisah. Gap tidak dianggap normal, dan nol kandidat dari nol hari diperiksa bukan bukti bebas masalah.

Referensi target dapat memakai observasi validation atau test pada tanggal sebelumnya, seperti penggunaan kausal harian; label dan jumlah masa depan tidak menjadi referensi target. Ekspor membaca ledger terkoreksi saat ini, bukan rekonstruksi catatan yang diketahui pada tanggal historis. Label konteks hanya membantu analisis lanjutan; belum mengukur efek libur/cuaca atau membuktikan diagnosis penyebab.

## Status dan verifikasi

```powershell
npm run test:usage-evaluation
```

Tiga belas tes kontrak mencakup scope/izin, kesamaan seluruh 19 tabel pada database sementara, ekspor tanpa prediksi, rentang/gap, pembekuan dan penolakan perubahan sumber/data, label lengkap, confusion matrix yang dihitung manual, abstain, denominator nol, privasi laporan dan larangan overwrite. Semua fixture terisolasi; angka pada tes bukan skor lapangan.

Pekerjaan yang masih terbuka: pengumpulan berizin, label manusia, pemeriksaan kelengkapan, evaluasi pada periode yang dibekukan, analisis tren/musim dan beban review bersama pemilik. `fieldValidated` tetap `false`; adanya metrik dari satu koleksi tidak otomatis mengesahkan pemakaian operasional. Tidak ada notifikasi, penyimpanan keputusan review di aplikasi, retraining atau koreksi otomatis yang ditambahkan.
