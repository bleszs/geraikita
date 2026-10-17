# PWA dan catatan offline

Status 15 Oktober 2026: manifest, ikon PNG 192/512, service worker dan penyimpanan IndexedDB berjalan pada demo lokal. Chrome memeriksa manifest tanpa installability error; pemasangan melalui dialog sistem dan perangkat fisik belum diuji. Ketentuan browser merujuk [panduan PWA MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Pasang dan coba

1. Jalankan server dan buka `http://localhost:4174` pada Chrome. Tunggu aplikasi terbuka agar shell dan data terakhir tersimpan.
2. Gunakan **Pasang Gerai Kita** bila browser menampilkannya, atau opsi pemasangan aplikasi pada menu Chrome. Browser/platform dapat memakai istilah berbeda.
3. Jika server tidak terjangkau, buka kembali aplikasi pada origin yang sama. Banner menyebut tanggal/jam data terakhir; stok, histori dan rencana adalah snapshot.
4. **Catat pesanan → Isi menu secara manual → Simpan di perangkat**. Catatan tersimpan sebagai draft, tanpa penjualan atau pengurangan stok di server.
5. Saat server kembali, klik **Hubungkan & muat ulang → Tinjau draft**. Jika katalog berubah, klik **Perbarui katalog**, periksa harga/resep dan konfirmasi kembali. Tidak ada pengiriman otomatis saat koneksi pulih.

Internet yang terputus sementara server/Ollama localhost tetap berjalan tidak menghalangi alur lokal biasa. Mode snapshot digunakan ketika API server tidak terjangkau. Tambah/ubah bahan dan menu, barang masuk, pergantian profil, kelompok dan transfer memerlukan server. AI/parser server juga memerlukan koneksi ke backend; input manual tetap tersedia.

## Status pesanan

| Keadaan | Penyimpanan dan tindakan |
| --- | --- |
| Draft perangkat | Rincian tersimpan di IndexedDB. Bisa ditinjau, diedit, dihapus atau diekspor. Belum mengubah stok. |
| Pengiriman belum pasti | Request sudah dicoba; respons belum diterima. Pesanan mungkin sudah tercatat. Rincian/kunci dikunci dan penghapusan ditahan sampai status diperiksa. |
| Ditemukan di ledger server | Bootstrap mencocokkan kunci transaksi dan membersihkan catatan perangkat. Server tidak dikirimi transaksi kedua. |
| Dikirim ulang | Payload dan kunci tetap sama. Idempotency backend mengembalikan transaksi sebelumnya atau mencatat satu transaksi bila belum ada. |
| Ditolak validasi | Respons 4xx mengembalikan catatan menjadi draft yang dapat diperbaiki. Harga/resep, stok atau versi harus diperiksa kembali. |

Outbox disimpan **sebelum setiap konfirmasi penjualan**, termasuk ketika online. Ini menjaga kunci dan rincian asli jika respons hilang atau browser ditutup. Penyimpanan yang gagal tidak dilaporkan sebagai berhasil dan tidak mengirim penjualan tersebut. Penerimaan kelompok juga menyimpan jumlah/kunci di IndexedDB sebelum POST, dikunci bila respons hilang dan dicocokkan terhadap histori ketika terhubung kembali. Penerimaan kelompok memerlukan server; Penerbitan tawaran juga menyimpan proof/kunci sebelum POST dan mencocokkannya dengan tawaran sendiri setelah respons hilang; scope mengikat namespace/epoch/usaha. Isian pending tetap terkunci setelah reload/offline. Penerbitan memerlukan server dan tidak berjalan otomatis. Pembatalan penerimaan kelompok menyimpan proof receipt/rencana/alasan sebelum POST, terlingkup namespace/epoch/usaha. Respons hilang mengunci alasan dan konfirmasi hingga bootstrap menemukan receipt sudah dibatalkan atau pengguna memilih Periksa & ulangi pembatalan dengan alasan yang sama. Gagal menyimpan proof tidak mengirim POST. Pembatalan memerlukan server; tidak menjadi draft koreksi offline yang dikirim otomatis. Barang masuk pribadi kini menyimpan proof sebelum POST. Payload asal dikunci bila transport/5xx belum pasti dan dicocokkan dengan seluruh receipt saat bootstrap; receipt dibatalkan tetap dikenali. Jika belum ditemukan, Periksa & ulangi barang masuk mengirim payload asal secara eksplisit. Menutup form tidak menghapus proof; rincian bisa dibuka saat offline, sedangkan tombol kirim tetap disabled. Storage proof gagal tidak mengirim POST. Gagal menulis snapshot tidak menghentikan pembacaan proof yang sudah ada. Pembatalan barang masuk pribadi kini menyimpan proof receipt/alasan asal sebelum POST; setelah respons hilang rincian dikunci dan dicocokkan terhadap cancelled_at. Retry eksplisit memakai alasan yang sama; alasan server tidak ditimpa bila pembatalan sudah dilakukan perangkat lain. Tindakan kelompok lain belum seluruhnya memiliki proof perangkat.

## Pemisahan dan retensi

- Scope draft terdiri dari namespace, waktu pembentukan namespace dan usaha. Server menentukan scope dari cookie; nilai scope perangkat hanya digunakan untuk pemeriksaan sebelum mengirim.
- Pergantian usaha menampilkan hanya draft usaha aktif. Reset atau sesi baru membuat scope lama berbeda sehingga draft lama tidak dikirim ke data demo baru. Draft dari scope lain dapat diekspor untuk disalin dan ditinjau secara manual.
- Maksimal 50 draft/outbox penjualan per origin. Proof barang masuk disimpan satu per scope usaha dan tidak dihitung pada batas itu. Browser dapat menghapus data situs atau kehilangan penyimpanan; IndexedDB bukan backup. `npm run backup` hanya mencadangkan database server SQLite dan tidak mencakup draft perangkat. Ekspor CSV sebelum menghapus data browser. Catatan dengan status belum pasti perlu dicocokkan dengan histori server sebelum dibuat ulang dari CSV.
- `localhost`, `127.0.0.1` dan port berbeda adalah origin berbeda. Gunakan alamat yang sama untuk cookie, cache dan draft yang sama.
- Snapshot terakhir hanya menyimpan profil aktif terakhir. Ini penyimpanan demo pada perangkat, belum sistem login atau penyimpanan terenkripsi untuk data UMKM nyata.

Form/list `surplus-screen.js` termasuk shell. Snapshot memuat tawaran terakhir, tetapi membuat/menarik tawaran dan meminta/menyetujui transfer memerlukan server.

Modul ringkasan `attention.js` juga tercache. Daftar langkah saat snapshot berjudul Langkah pada data terakhir; navigasi cepat tetap aktif untuk membaca dan tindakan server tetap disabled.

## Cache dan pembaruan

`public/sw.js` hanya melakukan precache shell, modul, font, manifest dan ikon dari origin sendiri. Respons `/api/` dan semua POST selalu melewati jaringan; API usaha tidak masuk Cache Storage. Snapshot ditulis aplikasi ke IndexedDB setelah bootstrap berhasil.

Modul konversi `receipt-measurement.js` termasuk shell. Snapshot riwayat menjaga satuan/jumlah/harga asal dan dapat dibaca offline; mencatat barang masuk pribadi memakai proof perangkat, dan pembatalannya juga menyimpan proof alasan asal. Keduanya tetap memerlukan server.

Form pembatalan `receipt-cancellation.js` termasuk shell; hanya status/data terakhir yang dapat dibaca saat offline. Ringkasan menampilkan Pembatalan penerimaan belum pasti untuk membuka langkah pemulihan.

Editor bahan `ingredient-editor.js` termasuk shell; snapshot membawa katalog pribadi terakhir, tetapi edit bahan memerlukan server.

Cache shell saat ini `gerai-kita-shell-v18`. **Naikkan versi cache setiap perubahan file shell sebelum merilis** dan sesuaikan assertion cache di tes. Worker baru menunggu; pengguna memilih **Muat ulang aplikasi** setelah menyimpan isian. Aktivasi menghapus hanya cache shell Gerai Kita versi lama, tanpa menghapus draft. Draft review yang belum disimpan dan isian editor perlu disimpan sebelum reload.

Implementasi mengikuti [lifecycle service worker MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers). Belum ada background sync, pengiriman otomatis, login produksi, hosting HTTPS publik atau dukungan instalasi yang diverifikasi pada semua browser. Server lokal hanya mendengarkan loopback; akses perangkat fisik lain membutuhkan hosting yang sesuai.

## Bukti

Empat tes browser offline mencakup cache tanpa API, reload offline, konfirmasi eksplisit, respons hilang/retry, perubahan katalog, scope profil/reset/sesi, kegagalan storage dan bootstrap tanpa snapshot. Suite terbaru: 50 backend/operasional + 38 browser lulus; siklus/penerimaan diuji terpisah di `tests/collective.spec.js`. Capture desktop/320px diperiksa dalam satu pass dan satu ronde konfirmasi.

[Smoke test browser persisten](evaluation/pwa-live.json) menutup dan membuka ulang Chrome: satu draft tetap tersedia offline, stok snapshot 8 butir, lalu stok server 6 butir dan satu transaksi baru setelah konfirmasi manual. Ini uji integrasi pada data sintetis, bukan pengujian pilot atau jaminan terhadap semua kegagalan perangkat.

Enam tes `stock-receipt-recovery.spec.js` memeriksa commit dengan respons hilang, offline reload, close/reopen, field immutable, retry eksplisit, profile-switch/reset/sesi, storage gagal, snapshot gagal ditulis, 4xx/5xx, sukses POST dengan bootstrap gagal dan receipt dibatalkan. [Panduan pemulihan](RECEIPT_RECOVERY.md) dan [bukti preview SQLite](evaluation/stock-receipt-recovery-live.json).

`stock-cancellation.js` termasuk shell. Snapshot membawa riwayat/alasan terakhir. Satu proof pembatalan disimpan per scope usaha, di luar batas 50 outbox penjualan. Penerimaan pending diperiksa sebelum pembatalan; pembatalan pending menahan penerimaan baru, dengan tautan pemulihan di Stok/Ringkasan. [Panduan pembatalan pribadi](STOCK_CANCELLATIONS.md).

Verifikasi terbaru: 50 backend/operasional + 38 browser lulus pada cache v18. Modul stock-cancellation termasuk pemeriksaan 14 aset doctor; pembatalan pribadi diuji pada server SQLite aktual dalam namespace baru tanpa mengubah data sebelumnya.
