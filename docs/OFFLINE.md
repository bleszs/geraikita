# PWA dan pemulihan

Untuk halaman versi lama yang berhenti pada “Aplikasi belum terhubung”, buka http://localhost:4174/api/recovery dan klik Perbarui & buka aplikasi. Endpoint dan script pemulihan melewati worker lama melalui prefix API, tanpa memerlukan login. Tindakan ini hanya melepas worker scope aplikasi dan membersihkan cache gerai-kita-shell; IndexedDB, cookie dan SQLite tetap. Server harus aktif. Uji browser mereproduksi shell lama dan memastikan draft tetap tersimpan setelah pemulihan.

Buka aplikasi saat server aktif untuk menyiapkan shell. Cache v24-live berisi aset dan font lokal; API tidak dicache. Snapshot berwaktu dan draft memakai IndexedDB gerai-kita-device-v2, terpisah dari penyimpanan demo lama. Jangan menghapus data situs jika masih ada draft/proof yang diperlukan.

Pembaruan shell ditawarkan juga pada halaman daftar/masuk. Munculnya pemberitahuan tidak merender ulang formulir yang sedang diisi. Simpan isian sebelum menekan Muat ulang aplikasi; tombol tersebut mengaktifkan worker baru dan memuat ulang halaman. Password tidak disimpan dalam values, snapshot atau draft.

Saat server terputus, snapshot terakhir ditandai waktunya. Stok, persetujuan, penawaran dan penerimaan tidak bisa diubah offline. Pesanan manual dari katalog terakhir dapat disimpan sebagai draft, maksimum 50 catatan perangkat. Menghubungkan kembali tidak mengirim draft secara otomatis.

Tindakan fisik menyimpan scope, path, payload dan kunci asal sebelum POST. Jika penyimpanan gagal, POST tidak dikirim dan isian dipertahankan. Jika respons hilang, rincian terkunci pada panel tindakan tertunda. Hubungkan lalu Periksa status & ulangi: bootstrap diperiksa dahulu, tindakan yang sudah terbukti tidak dikirim lagi. Jika belum ditemukan, payload asal dikirim ulang secara eksplisit. Backend menjaga idempotensi.

Draft/proof hanya dapat digunakan pada akun/kelompok asal. Keluar akun menghapus snapshot aktif; proof tetap disimpan untuk pemulihan ketika akun asal masuk lagi. Respons 401 menampilkan masuk, tanpa membuka snapshot akun sebagai pengganti. Offline tidak bisa mendaftarkan atau masuk akun baru.

Backup SQLite tidak mencakup data browser, cache atau model Ollama. localhost dan 127.0.0.1 memiliki penyimpanan/cookie terpisah. Dialog pemasangan OS dan perangkat fisik belum diverifikasi pada perubahan ini.
