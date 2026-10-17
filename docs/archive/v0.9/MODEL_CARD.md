# Model dan pipeline ekstraksi

## Model aktif

Ollama `qwen2.5:1.5b`, tag lokal `65ec06548149`, unduhan sekitar 986 MB, kuantisasi Q4_K_M. Model pihak ketiga dijalankan di laptop; **tidak dilatih atau fine-tune oleh proyek ini**. Lisensi dan metadata model tercantum di [pustaka resmi Ollama](https://ollama.com/library/qwen2.5:1.5b). Integrasi menggunakan [API chat Ollama](https://docs.ollama.com/api/chat) dengan JSON schema, `stream:false`, temperature 0, context 4096 dan output maksimum 512 token.

## Kontribusi kode proyek

Pipeline `server/extractor.mjs` menggabungkan katalog/alias, angka kata 1–10, pemisahan bukti jumlah, deteksi negasi/duplikasi/pecahan/instruksi, prompt katalog, JSON schema, verifikasi hasil terhadap bukti chat, serta fallback dan formulir review. Harga dan resep dihitung oleh domain backend. Output model tidak dipercaya sebagai transaksi.

Katalog berasal dari usaha aktif: tiga menu awal, maksimal 20 menu yang dapat ditambah/diubah beserta alias. Prompt/schema dibangun dari katalog tersebut. Model memakai referensi pendek `menu1`, `menu2`, dan seterusnya dalam satu request; server memetakannya kembali ke ID menu asli sebelum validasi bukti. Referensi membantu model kecil menyalin ID, tanpa mengubah ID yang tersimpan.

Sebelum pemanggilan model, gate deterministik harus mengenali seluruh item/jumlah. Artinya model saat ini **tidak memperluas cakupan parser**; ini tahap integrasi terjaga, bukan pemahaman bahasa bebas. Variasi dipertahankan sebagai catatan/pesan asli dan perlu diperiksa manusia; atribut variasi terstruktur belum tersedia.

AI timeout 45 detik; maksimal satu ekstraksi AI sekaligus, request tambahan mendapat pesan untuk mencoba lagi/manual. Model unavailable, invalid JSON atau jumlah berbeda mengaktifkan parser lokal dengan mode `fallback`. `rules` hanya parser; `ollama` berarti hasil AI lolos validator; `manual_review` di laporan berarti gate menahan input.

Chat dikirim hanya ke Ollama lokal default `127.0.0.1:11434`, bukan layanan cloud. URL/model bisa dikonfigurasi server. Chat mentah tidak disimpan dalam tabel backend; catatan item terkonfirmasi tetap tersimpan sebagai bagian transaksi, draft chat di browser.

## Hasil uji di laptop ini

Pada [laporan tersimpan](evaluation/results.json), 26 fixture memenuhi hasil yang diharapkan: 12 ekstraksi diterima dari model, 1 menggunakan fallback, 13 ditahan untuk review manual. Ini bukan akurasi 100% LLM; model berhasil lolos 12 dari 13 input yang gate anggap dapat diekstrak. Panggilan pertama fixture sekitar 2,6 detik; waktu fixture lain tercatat dalam JSON. Latensi dan output dapat berubah antar perangkat/versi.

[Uji browser langsung](evaluation/operations-live.json) membuat menu “Nasi goreng spesial” dan mengekstrak “nasgor spesial 2” dari Ollama dengan ID menu baru: 2 porsi, Rp44.000, sekitar 1,2 detik. Penjualan dan barang masuk berikutnya tersimpan setelah reload. Ini satu smoke test integrasi, bukan benchmark independen.

Fixture sintetis kecil diketahui selama pengembangan, bukan holdout bahasa yang independen. Belum ada evaluasi slang lapangan, ASR, multilingual, keamanan prompt yang menyeluruh, atau privasi produksi. Jangan mengklaim model dilatih sendiri atau siap tanpa review manusia.

## Langkah berikutnya

Kumpulkan chat berizin tanpa data pribadi, label item/qty/atribut/negasi, pisahkan train/dev/test sebelum mengubah prompt/parser, bandingkan model mentah dengan validator dan parser, lalu ukur exact match, precision/recall per item/qty, false acceptance, latensi, dan kegagalan. Tambahkan evidence spans dan tingkat ambiguitas agar gating dapat mendukung bahasa lebih luas tanpa mengarang jumlah.
