# Arsitektur Gerai Kita

Status 15 Oktober 2026: frontend modular/PWA, API Node, SQLite persisten, snapshot/draft IndexedDB dan Ollama lokal terhubung. PostgreSQL/Supabase merupakan target pilot; API sekarang adalah demo sintetis lokal.

## Modul

| Modul | Implementasi |
| --- | --- |
| UI | `public/app.js`, `screens.js`, `inventory-screen.js`, `ingredient-editor.js`, `surplus-screen.js`, `receipt-cancellation.js`, `stock-cancellation.js`, `receipt-measurement.js`, `attention.js`, `api.js`; tujuh route hash, editor, review, tema, ponsel |
| PWA/perangkat | `public/sw.js`, `manifest.webmanifest`, `offline.js`; shell cache, snapshot/draft IndexedDB, konfirmasi ulang eksplisit |
| Katalog | Lima bahan seed di `public/catalog.js`; katalog SQLite per usaha maksimal 25 bahan/20 menu. Nama/ambang/catatan bahan dan harga/resep/alias menu dapat diubah; satuan tetap |
| HTTP/sesi | `server/http.mjs`; cookie HttpOnly/SameSite Strict, CSRF, Origin/Host, JSON 64KB |
| Storage | `server/store.mjs`; SQLite WAL, foreign keys, namespace, stok integer 1/10.000 satuan |
| Domain | `server/service.mjs`, `operations.mjs`, `surplus.mjs`; transaksi/reversal, bahan/menu, barang masuk, scope, izin, versi, reservasi/transfer, audit |
| Ekstraksi | `server/extractor.mjs`; Qwen JSON schema, alias, bukti jumlah, guards, fallback |
| Forecast | `server/forecast.mjs`; naive, MA7, pola weekday, backtesting MAE/WAPE |
| Kolektif | `server/optimizer.mjs`, `collective.mjs`; MOQ, expiry, anggaran, ongkir, snapshot rencana, penerimaan bertahap dan siklus |

Browser → API same-origin → sesi usaha aktif → validasi → transaksi SQLite → bootstrap terlingkup. Request bisnis tidak bisa memilih scope dengan `business_id`. Profile-switch merupakan alat demo untuk keempat fixture dalam namespace sendiri; belum ada identitas orang sungguhan.

Sesi baru membuat namespace baru. Stok/transaksi/audit adalah milik usaha aktif. Rincian kebutuhan kelompok tampil ketika ≥3 usaha memiliki izin aktif. Tawaran surplus adalah informasi yang dibagikan; permintaan hanya dilihat penerima/pemilik. Reset terbatas namespace sesi dan mempertahankan cookie.

## API aktual

Semua POST memakai JSON dan `csrf` dari bootstrap, kecuali pembuatan sesi pertama. Selain sesi pertama, cookie wajib.

| Endpoint | Fungsi |
| --- | --- |
| POST `/api/demo/session` | Sesi pertama/ganti `businessId` fixture dalam namespace yang sama |
| GET `/api/bootstrap` | Namespace/epoch usaha aktif, katalog/revision, stok fisik/tersedia, sale, barang masuk, forecast, group, offers, transfer, audit, CSRF, AI |
| GET `/api/health` | SQLite dan ketersediaan model |
| POST `/api/extractions` | `{text}` → draft, mode, alasan, catalogRevision; katalog usaha aktif, stok tidak berubah |
| POST `/api/transactions` | `{items, idempotencyKey, catalogRevision}` → sale/pemakaian stok atomik |
| POST `/api/transactions/:id/cancel` | Reversal satu kali transaksi baru sendiri |
| POST `/api/stock-receipts` | `{productId, qty, inputUnit?, unitPrice, supplier, idempotencyKey}` → konversi kg/gram atau liter/ml ke stok; harga/jumlah menurut inputUnit, default satuan bahan |
| POST `/api/stock-receipts/:id/cancel` | `{reason?, csrf}`; UI mewajibkan alasan. Balik penerimaan pribadi sendiri sekali jika saldo tersedia cukup; kolektif memakai endpoint rencananya |
| POST `/api/ingredients` | `{name, unit, min, storageNote, catalogRevision}` → bahan pribadi baru, stok nol |
| POST `/api/ingredients/:id` | Payload sama → edit nama/ambang/catatan; satuan dan identitas telur tetap |
| POST `/api/menus` | `{name, price, aliases, recipe, catalogRevision}` → menu baru per usaha |
| POST `/api/menus/:id` | Payload sama → ubah menu sendiri jika revision masih sama |
| POST `/api/demand-consents` | `{qty, active, budget?}`; izin 24 jam, versi baru bila berubah |
| POST `/api/proposal/approval` | `{version, decision: accepted/declined}` bagian sendiri |
| POST `/api/collective-orders` | `{cycle, version}` → snapshot rencana setelah semua peserta setuju dan tanpa surplus pending |
| POST `/api/collective-orders/:id/receipts` | `{qty, idempotencyKey}` → bagian sendiri, stok/biaya/ongkir/audit atomik |
| POST `/api/collective-orders/:id/receipts/:receiptId/cancel` | `{reason}` 5–240 karakter; balik batch aktif terakhir sendiri pada siklus aktif jika stok tersedia cukup |
| POST `/api/collective-orders/:id/cancel` | Batalkan rencana bila tidak ada penerimaan aktif pada seluruh anggota |
| POST `/api/collective-cycles/next` | `{cycle, version}` → setelah lengkap/quote expired, izin baru tanpa reset stok/histori |
| POST `/api/offers` | `{productId: telur, qty, unitPrice, condition, expiresInHours, cycle, idempotencyKey}` → tawaran sendiri, harga/kondisi tetap |
| POST `/api/offers/:id/withdraw` | Tarik sisa sendiri setelah pending selesai; transfer selesai tetap tercatat |
| POST `/api/offers/:id/request` | `{qty}`; persetujuan penerima, stok pemilik dicadangkan |
| POST `/api/transfers/:id/approval` | Pemilik menyetujui; transfer dua stok atomik |
| POST `/api/transfers/:id/cancel` | Penerima/pemilik membatalkan pending |
| POST `/api/demo/reset` | Reset namespace sintetis aktif |

Katalog, inventory, recommendations dan summary dikirim lewat bootstrap; belum ada endpoint terpisah.

## Invariant

- `BEGIN IMMEDIATE` menggabungkan sale, saldo, daily usage, movement dan audit. Kekurangan bahan membatalkan semua perubahan. Retry kunci sama mengembalikan sale sebelumnya; payload berbeda dengan kunci sama ditolak.
- Reversal hanya transaksi baru milik sendiri, stok kembali sekali. Seed histori tidak dibatalkan; saldo fixture sudah sesudah transaksi seed.
- Nama, harga per item dan pemakaian resep disimpan bersama sale. Perubahan katalog tidak mengubah riwayat atau bahan yang dipulihkan saat reversal. Konfirmasi memakai revision katalog; draft lama ditolak untuk ditinjau ulang. Retry transaksi yang sudah sukses tetap mengembalikan snapshot asal.
- Penjualan menyimpan outbox perangkat sebelum POST. Payload belum pasti dikunci; bootstrap mencocokkan `idem`, retry memakai kunci/rincian asal. Tidak ada background sync. Snapshot tidak mengubah stok/omzet server dan tidak memberi persetujuan kelompok. Scope perangkat mengikat namespace, epoch reset dan usaha, lalu diverifikasi terhadap bootstrap server sebelum mengirim.
- Katalog bahan terlingkup usaha aktif, maksimal 25 termasuk seed. Enam satuan didukung (kg, gram, liter, ml, butir, buah); konversi metrik hanya saat menerima barang dan tetap memakai satuan katalog untuk stok/resep. Nama dinormalisasi NFKC/lowercase untuk konflik, revision sama dengan menu menjaga draft lama. Bahan baru tidak memiliki histori sintetis dan saldo awal nol.
- Penerimaan memakai bahan katalog sendiri; inputUnit mendukung pasangan kg/gram dan liter/ml, sementara butir/buah tetap satuannya dan bulat. Jumlah input/hasil konversi positif, masing-masing maksimal 10.000 dengan presisi stok empat desimal. Harga input rupiah bulat; harga stok turunan dapat pecahan. Total dibulatkan dari jumlah × harga input tanpa membulatkan harga stok dahulu. Retry barang masuk tidak menggandakan saldo. Pembatalan memeriksa stok tersedia termasuk reservasi; ini pembalikan catatan, bukan refund. Biaya barang masuk tidak menambah omzet. Nama/satuan penerimaan disimpan saat pencatatan dan dipakai riwayat/CSV meski nama bahan diubah.
- Perubahan stok melalui sale/reversal/penerimaan menaikkan revision stok. Kebutuhan yang sudah dibagikan menjadi `needsReview`; pemilik harus menegaskan jumlah kembali. Versi kelompok berubah dan semua approval gugur, tanpa mengubah jumlah consent otomatis.
- Sesudah rencana disimpan, jumlah/biaya/approval memakai snapshot dan tidak berubah karena stok harian. Penerimaan maksimum sisa bagian sendiri; ongkir sekali pada batch aktif pertama. Pembatalan batch terakhir sendiri pada siklus aktif mengurangi stok tersedia dan biaya aktif, menyimpan alasan/waktu, membuka sisa penerimaan serta mengembalikan status completed menjadi receiving. Urutan memakai rowid agar waktu identik tetap deterministik. Rencana dapat dibatalkan jika tidak ada penerimaan aktif.
- Surplus terikat siklus. Siklus baru mempertahankan stok/histori, mengosongkan kebutuhan/izin/approval dan tidak memasukkan surplus lama. Rencana tersimpan hanya bagi peserta; histori hanya bagian sendiri.
- Tawaran terikat siklus, pemilik dan kunci immutable. Maksimal 10 per usaha per siklus; harga/kondisi tetap. Penerbitan belum mencadangkan stok; permintaan memeriksa stok tersedia global lintas tawaran, sisa tawaran dan kebutuhan aktif termasuk pending. Satu pending per penerima/tawaran. Penarikan ditolak selama pending; tidak menghapus transfer selesai. Sale tidak memakai stok yang dicadangkan. Permintaan bersaing tidak mengalokasikan tawaran dua kali. Transfer memperbarui stok dua pihak, audit dan versi bersama.
- Izin/quote berlaku 24 jam, surplus 12 jam sejak seed. Expiry diperiksa saat pembacaan dan keputusan. Reset namespace membuat penawaran demo baru.
- Perubahan jumlah, anggaran, izin, atau transfer mereset seluruh persetujuan. Versi lama ditolak. `ready` membutuhkan constraint dan semua anggota setuju versi sama.
- Hanya telur dalam butir untuk kolektif. Jumlah tidak dinaikkan diam-diam demi MOQ. Konversi papan/kg belum tersedia.
- Ongkir integer Rp6.000 dibagi proporsional order, memakai largest remainder/tie-break deterministik. Biaya mencakup surplus selesai; pembanding individual memakai kebutuhan sama dan ongkir individual.
- Forecast hanya hari lengkap sebelumnya, tanpa data berjalan/future; hari kosong diisi nol. Rekomendasi mengurangi prediksi dengan stok tersedia setelah reservasi, termasuk penerimaan yang sudah disimpan. Barang dalam perjalanan/safety stock nol. Rentang MAE × horizon bersifat heuristik.

Masa simpan tabel adalah ilustrasi, bukan inventaris lot. Kapasitas, kerusakan, kalender/cuaca belum dimodelkan. SQLite bawaan Node 24.9 mengeluarkan warning eksperimental dan operasi sinkron sesuai skala demo.

`tests/surplus.test.mjs` dan `tests/surplus.spec.js` menguji CRUD terbatas tawaran, reservasi global, permintaan parsial, withdrawal, expiry/siklus, HTTP/CSRF, migrasi/reopen, offline, escaping dan proof. Kolom offers `cycle`, `created_at`, `cancelled_at`, `idem`, `fingerprint` dimigrasikan aditif; tawaran lama di siklus 1. Indeks `(workspace_id, owner_id, idem)` menjaga retry. IndexedDB menyimpan proof penerbitan sebelum POST, scope namespace/epoch/usaha; bootstrap hanya mengirim kunci kepada pemilik agar respons hilang bisa dicocokkan. [SURPLUS.md](SURPLUS.md) memuat bukti preview/migrasi.

`public/attention.js` merangkum tindakan dari bootstrap usaha aktif, outbox penjualan, proof tawaran/penerimaan dan stok; tidak menambah API atau menulis data bisnis. Tautan mengarah ke layar review, tanpa persetujuan/transaksi otomatis. `app.js` menambahkan navigasi cepat ponsel, label usaha aktif, serta penutupan menu/fokus dengan Escape. `tests/navigation.spec.js` memeriksa transisi queue, scope, keyboard, chat, footer, viewport 320/1024 dan offline. [NAVIGATION.md](NAVIGATION.md) mencatat batas bukti.

## Operasional demo

`scripts/doctor.mjs` memeriksa runtime, file SQLite (read-only), aset server loopback dan model; tidak membuat sesi. `scripts/backup.mjs` memakai SQLite `VACUUM INTO` untuk snapshot konsisten, termasuk WAL yang sudah commit, dengan filename unik dan verifikasi integritas/relasi. Draft IndexedDB/model tidak termasuk. `scripts/rehearse.mjs` menjalankan narasi dengan model aktual dan store memory terisolasi, tanpa memodifikasi database nyata. `tests/maintenance.test.mjs` memeriksa snapshot committed/uncommitted, backup berulang, schema read-only, kegagalan aset/identitas aplikasi dan larangan URL eksternal. [FINAL_DEMO.md](FINAL_DEMO.md) mencatat perintah dan batas bukti.

## Sebelum pilot

Login/membership terverifikasi, penghapusan profile-switch/reset publik, HTTPS, backup rutin, migrasi produksi, konversi kemasan khusus, lot, penyimpanan multi-user dan dataset lapangan berizin. Menu belum dapat diarsipkan/dihapus. Evaluasi saat ini tidak membuktikan keamanan/akurasi produksi.

Migrasi SQLite bersifat aditif: tabel menu/revision/barang masuk baru, serta snapshot sale dan revision consent. Bahan/menu default diisi untuk usaha lama; snapshot nama/satuan penerimaan lama diisi dari katalog saat migrasi. Snapshot resep histori dipulihkan dari movement asal. Saldo dan sesi lama dipertahankan. Salinan database dibuat di `data/backups/` sebelum migrasi demo pada sesi pengembangan ini; backup rutin belum otomatis.

Tabel `ingredients` menyimpan identitas, satuan tetap, ambang integer 1/10.000, catatan dan identitas bersama per usaha. Snapshot receipt `product_name`/`product_unit` ditambahkan secara aditif. [INGREDIENTS.md](INGREDIENTS.md) memuat alur dan bukti migrasi database lokal.

`tests/backend.test.mjs` menguji domain, HTTP, persistence, migrasi versi lama dan permintaan bersaing. `tests/prototype.spec.js` dan `tests/operations.spec.js` menguji browser termasuk persetujuan pemilik dari profil lain, editor menu dan barang masuk. `scripts/evaluate.mjs` menghasilkan laporan model dan forecast aktual.

`tests/offline.spec.js` menguji cache tanpa API, offline/reload, outbox, respons hilang, versi katalog, scope/reset/sesi, dan storage failure. [OFFLINE.md](OFFLINE.md) menjelaskan pemulihan, retensi dan versi cache shell. API timeout 15 detik, ekstraksi 60 detik (provider 45 detik); request timeout tidak diasumsikan berarti transaksi gagal.

`tests/ingredients.spec.js` menguji bahan → penerimaan → resep → penjualan → rename → reversal, scope profil, mobile, escaping dan offline. Suite saat ini 50 backend/operasional + 38 browser lulus.

`tests/collective.spec.js` menguji siklus penuh, penerimaan parsial, response loss/offline reload dan cancellation. Tabel `collective_cycles`/`collective_orders`, kolom workspace/transfer siklus serta receipt sumber/ongkir dimigrasikan secara aditif. [COLLECTIVE_CYCLES.md](COLLECTIVE_CYCLES.md) mencatat invariant dan bukti preview.

`stock_receipts.cancel_reason` dimigrasikan aditif nullable tanpa mengubah data lama. `group.receiptHistory` mengirim seluruh ledger bagian sendiri (termasuk dibatalkan) dengan `canCancel`/`cancelBlockedReason`; jumlah/biaya dan ongkir hanya menghitung receipt aktif. Retry pembatalan mengikat receipt dan alasan asal, sedangkan replay pencatatan receipt yang sudah dibatalkan mengembalikan `cancelled:true`. Pemeriksaan siklus dan koreksi stok/audit berjalan dalam satu transaksi; setelah siklus berikutnya dibuka, receipt aktif lama dilindungi. Pembatalan tidak melacak lot dan tidak mengubah snapshot persetujuan. Browser menyimpan proof pembatalan sebelum POST di IndexedDB (`receipt-cancel:namespace:epoch:usaha`), lalu mencocokkan receipt pada bootstrap atau mengulang alasan asal secara eksplisit. [Panduan koreksi dan bukti](COLLECTIVE_CORRECTIONS.md).

`receipt-measurement.js` dipakai browser/backend untuk pasangan metrik tetap 1000. Kuantitas integer 1/10.000 menolak konversi yang tidak dapat diwakili. Kolom nullable `input_quantity` (integer 1/10.000), `input_unit`, `input_unit_price` menyimpan rincian asal; quantity/product_unit/unit_price memakai satuan stok dan harga turunan. Kolom lama tidak diubah; receipt lama/kelompok menggunakan fallback rincian stok saat ditampilkan/diekspor. Fingerprint lama untuk satuan stok dipertahankan; konversi mengikat satuan/jumlah/harga input agar retry tidak menulis ulang histori. Pembatalan memakai quantity stok. [Panduan satuan dan bukti](RECEIPT_UNITS.md).

Penerimaan pribadi menyimpan proof sebelum POST melalui `saveStockReceiptDraft`; satu key `stock-receipt:namespace:epoch:usaha` mengikat payload/idempotency key dan snapshot nama/satuan. Payload tertunda tidak dapat diganti di UI maupun helper IndexedDB. Bootstrap mencocokkan `stockReceipts.idem`, termasuk receipt dibatalkan. Retry setelah pemeriksaan memakai payload asal; duplicate receipt API menyertakan `cancelled` agar UI tidak mengklaim stok bertambah untuk receipt lama yang sudah dibatalkan. Status 4xx definitif membersihkan proof dan menjaga isian editable; transport/5xx tetap terkunci. Sukses POST dengan bootstrap gagal dilaporkan diterima server dan menunggu refresh, tanpa mengirim otomatis. Pembacaan/reconciliation proof terpisah dari penyimpanan snapshot: kegagalan menulis snapshot tidak melewatkan pemulihan. Tidak ada perubahan schema SQLite pada versi 0.8.1. [Panduan dan bukti](RECEIPT_RECOVERY.md).

`public/stock-cancellation.js` menampilkan review jumlah stok/biaya, alasan wajib dan konfirmasi sebelum pembatalan pribadi. `stock-cancel:namespace:epoch:usaha` menyimpan receipt/alasan asal sebelum POST dan menolak penggantian rincian pending. Bootstrap mencocokkan cancelled_at pada receipt sendiri; alasan yang disimpan server tidak ditimpa oleh proof perangkat lain. 4xx definitif mengembalikan isian editable setelah proof dibersihkan, sedangkan transport/5xx mempertahankan rincian terkunci. Snapshot gagal ditulis tidak menghalangi reconciliation. API alasan opsional untuk klien demo lama; alasan yang dikirim harus 5–240 karakter. Retry receipt dibatalkan dengan alasan berbeda ditolak. Kolom cancel_reason sudah ada; tidak ada migrasi baru. [Panduan dan bukti](STOCK_CANCELLATIONS.md).
