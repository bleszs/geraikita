# Membuat dan mengelola tawaran surplus

Status 15 Oktober 2026, versi 0.6.0: tawaran dibuat oleh usaha aktif dan disimpan di SQLite, dengan permintaan/persetujuan dua pihak. Fitur memakai profil sintetis, belum marketplace atau login produksi.

## Pemilik bahan

1. Buka **Surplus → Buat tawaran surplus** pada siklus perencanaan yang masih berlaku.
2. Isi jumlah telur, harga per butir, kondisi/penyimpanan, dan batas pengambilan 1–24 jam dari sekarang.
3. **Terbitkan tawaran**. Jumlah tidak boleh melebihi stok tersedia saat diterbitkan. Stok belum berpindah; tawaran sendiri belum menjadi reservasi.
4. Ketika ada permintaan, periksa penerima, jumlah dan biaya. **Setujui transfer** memindahkan stok kedua usaha atomik, atau **Tolak permintaan** melepas cadangannya.
5. **Tarik sisa tawaran** menghentikan permintaan baru. Selesaikan/tolak permintaan yang menunggu dahulu. Transfer selesai dan biaya historisnya tetap tercatat.

Harga, jumlah awal, kondisi dan batas waktu tetap setelah diterbitkan. Untuk mengganti rincian, tarik sisa tawaran lalu buat tawaran baru. Maksimal 10 tawaran per usaha per siklus, termasuk yang sudah ditarik. Tawaran bawaan Bu Dewi juga dihitung pada batas ini.

## Penerima bahan

Isi **Jumlah diminta dari …**, boleh sebagian, lalu **Minta transfer**. Satu permintaan yang masih menunggu per penerima per tawaran; sesudah diselesaikan atau dibatalkan, sisa yang tersedia bisa diminta lagi. Jumlah terbatas stok tersedia, sisa tawaran, dan sisa kebutuhan yang dibagikan bila izin aktif. Permintaan menunggu dari tawaran lain juga dihitung terhadap kebutuhan tersebut.

Permintaan hanya mencadangkan stok pemilik. Penerima mendapat stok setelah pemilik menyetujui. Penjualan/barang masuk memakai stok tersedia sesudah cadangan seluruh tawaran; dua tawaran tidak bisa mengalokasikan saldo yang sama dua kali. Beberapa tawaran boleh mengacu saldo sama, tetapi jumlah tawaran bukan total stok bebas dan setiap permintaan diperiksa kembali secara atomik.

Transfer selesai mengurangi sisa beli kelompok dan menghitung ulang biaya serta mereset persetujuan proposal untuk ditinjau pada versi baru. Kondisi perlu diperiksa saat serah terima. Batas pengambilan bukan tanggal kedaluwarsa pangan dan aplikasi belum melacak inventaris per lot.

## Siklus dan batas

- Hanya **Telur ayam dalam butir**. Bahan pribadi, konversi satuan dan surplus bahan lain belum tersedia.
- Jumlah 1–100 butir, harga rupiah bulat 0–10.000.000, kondisi 10–240 karakter.
- Rencana penerimaan yang sudah disimpan menahan tawaran/permintaan baru sampai siklus berikutnya. Quote perencanaan yang kedaluwarsa juga meminta siklus baru.
- Tawaran siklus lama tidak dapat diminta pada siklus baru. Pemilik melihat historinya; penerima melihat tawaran terkait transfernya. Buat tawaran baru dari saldo yang masih tersedia.
- Tawaran expired tidak bisa disetujui. Cadangannya tidak lagi mengurangi stok tersedia, tetapi permintaan pending perlu dibatalkan sebelum rencana/siklus bisa dilanjutkan.
- Transfer selesai belum dapat dibalik. Menarik tawaran tidak mengembalikan barang yang sudah dipindahkan.

## Saat respons penerbitan hilang

Penerbitan menyimpan rincian/kunci di IndexedDB sebelum POST. Jika penyimpanan gagal, tawaran tidak dikirim dan isian tetap dapat diperbaiki. Jika respons belum pasti, rincian dikunci; **Hubungkan & muat ulang** mencocokkan kunci dengan daftar tawaran sendiri. Bila belum ditemukan, **Periksa & kirim ulang tawaran** memakai rincian/kunci asli.

Proof tetap setelah reload dan dipisahkan menurut namespace, epoch reset dan usaha. Scope lain tidak mengirim proof tersebut. Pembuatan tawaran tetap memerlukan server; tidak ada penerbitan offline atau otomatis ketika jaringan kembali. Respons penarikan/permintaan tidak memiliki outbox khusus: muat ulang daftar dan periksa status sebelum mengulangi. Penarikan sendiri idempotent; permintaan pending ganda dari penerima/tawaran sama ditolak.

## Migrasi dan bukti

Migrasi menambah `cycle`, `created_at`, `cancelled_at`, `idem`, `fingerprint` pada `offers` serta indeks kunci per workspace/pemilik. Tawaran lama masuk siklus 1, dengan waktu pembuatan kosong bila sebelumnya tidak dicatat. Saldo, transaksi, transfer, harga/kondisi lama dipertahankan. Backup konsisten dibuat sebelum migrasi di `data/backups/gerai-kita-2026-10-14T23-04-28-880Z-c8b54767.sqlite`.

Suite 36 backend/operasional + 18 browser lulus. Lima tes domain/HTTP baru memeriksa scope, validasi, retry, beberapa tawaran/cadangan bersama, expiry, withdrawal, siklus, migrasi dan reopen. Empat tes browser baru memeriksa alur parsial, ponsel 320px, escaping, offline, respons hilang, scope proof dan storage failure.

[Uji database lokal](evaluation/surplus-live.json) membandingkan data sebelum/sesudah migrasi, menerbitkan dua tawaran dari saldo 8 butir, mencadangkan total 8 dan menolak permintaan berlebih. Transfer 6 butir mengubah pemilik 8 → 2 dan penerima 30 → 36, lalu penarikan menyimpan status/harga transfer selesai. Hanya namespace uji tersendiri direset. Bukti ini regresi sintetis lokal, bukan pilot atau audit produksi.
