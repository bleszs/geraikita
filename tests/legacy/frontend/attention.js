export function attentionPanel({state,catalog,connected,pendingOrders=[],offerUi,cancellationUi,receiptDraft,stockReceiptDraft,stockCancellationUi,escape,icon,number}) {
  const tasks=[],g=state.group,cycle=g.cycle?.id || 1;
  const add=(title,detail,route,action,symbol='clock')=>tasks.push({title,detail,route,action,symbol});
  const uncertain=pendingOrders.filter(d=>d.status!=='draft').length,drafts=pendingOrders.length-uncertain;
  if(uncertain)add(`${uncertain} pesanan belum pasti tercatat`,'Periksa status dengan rincian dan kunci asli sebelum membuat catatan baru.','pesanan','Periksa pesanan');
  if(stockReceiptDraft)add('Barang masuk pribadi belum pasti','Rincian asal tersimpan. Periksa riwayat sebelum menambah catatan barang yang sama.','stok','Periksa barang masuk','box');
  if(stockCancellationUi.draft?.status==='sending')add('Pembatalan barang masuk belum pasti','Periksa status dengan alasan asal agar stok tidak dikurangi dua kali.','riwayat','Periksa pembatalan barang','box');
  if(offerUi.draft?.status==='sending')add('Tawaran belum pasti diterbitkan','Rincian terkunci sampai tawaran ditemukan atau dikirim ulang dengan kunci yang sama.','surplus','Periksa tawaran','leaf');
  if(cancellationUi.draft?.status==='sending')add('Pembatalan penerimaan belum pasti','Periksa status catatan agar stok tidak dikurangi dua kali.','kelompok','Periksa pembatalan','box');
  if(receiptDraft?.status==='sending')add('Penerimaan belum pasti tercatat','Cocokkan histori sebelum mencatat barang yang sama kembali.','kelompok','Periksa penerimaan','box');
  const incoming=state.transfers.filter(t=>t.owner_id===state.business.id && t.status==='pending');
  if(incoming.length)add(`${incoming.length} permintaan surplus menunggumu`,`${number(incoming.reduce((n,t)=>n+t.qty,0))} butir diminta. Periksa sebelum menyetujui atau menolak.`, 'surplus','Tinjau permintaan','leaf');
  const waiting=state.transfers.filter(t=>t.receiver_id===state.business.id && t.status==='pending');
  const expired=waiting.filter(t=>{const o=state.offers.find(o=>o.id===t.offer_id);return !o || o.cancelledAt || o.expiresAt<=Date.now() || (o.cycle ?? t.cycle ?? 1)!==cycle;});
  if(expired.length)add(`${expired.length} permintaanmu tidak berlaku lagi`,'Batalkan permintaan yang kedaluwarsa sebelum melanjutkan siklus.','surplus','Periksa permintaan','leaf');
  else if(waiting.length)add('Menunggu persetujuan pemilik',`${number(waiting.reduce((n,t)=>n+t.qty,0))} butir masih diminta; stok penerima belum bertambah.`, 'surplus','Lihat status surplus','leaf');
  if(g.frozen && g.own) {
    if(g.own.remaining>0 && receiptDraft?.status!=='sending')add('Catat barang yang diterima',`${number(g.own.remaining)} butir pemasok belum dicatat. Isi hanya jumlah fisik yang sudah diterima.`,'kelompok','Buka penerimaan','box');
    else if(g.cycle.canAdvance)add('Siklus kulakan sudah lengkap','Mulai kebutuhan dan izin baru sambil mempertahankan stok serta histori.','kelompok','Buka siklus baru','people');
    else if(!g.own.remaining)add('Bagianmu sudah diterima','Periksa kemajuan anggota sebelum memulai siklus berikutnya.','kelompok','Lihat penerimaan','people');
  } else if(g.quote.expiresAt<=Date.now())add('Penawaran pemasok sudah kedaluwarsa',g.cycle?.canAdvance ? 'Mulai siklus baru untuk meninjau penawaran dan kebutuhan.' : 'Periksa permintaan surplus yang masih menunggu sebelum siklus baru.','kelompok','Periksa siklus','people');
  else if(state.shared && state.needsReview)add('Periksa ulang kebutuhanmu','Stok berubah sesudah kebutuhan dibagikan. Jumlah tidak diperbarui otomatis.','restock','Tinjau kebutuhan','trend');
  else if(g.ready && g.own)add('Proposal disetujui bersama',g.pendingTransfers ? 'Permintaan surplus perlu diselesaikan sebelum rencana penerimaan disimpan.' : 'Rincian siap disimpan sebagai rencana; barang pemasok belum masuk stok.','kelompok','Periksa rencana','people');
  else if(g.own && g.eligible && g.own.decision==='pending')add('Bagian proposal perlu ditinjau',`Periksa jumlah dan biaya pada versi ${g.version} sebelum memberi keputusan.`,'kelompok','Tinjau bagianku','people');
  else if(g.own?.decision==='accepted')add('Menunggu keputusan anggota','Bagianmu sudah disetujui. Semua anggota perlu meninjau versi yang sama.','kelompok','Lihat persetujuan','people');
  if(drafts)add(`${drafts} draft pesanan di perangkat`,'Tinjau harga, resep dan stok sebelum mengonfirmasi saat tersambung.','pesanan','Tinjau catatan','receipt');
  const low=catalog.filter(p=>state.availableStock[p.id]<=0 || state.availableStock[p.id]<p.min);
  if(low.length)add(`${low.length} bahan perlu diperiksa`,'Lihat saldo dan saran kulakan sebelum menentukan kebutuhan.','stok','Periksa stok','box');
  const row=t=>`<div class="attention-item"><span class="list-symbol">${icon(t.symbol)}</span><div><strong>${escape(t.title)}</strong><p>${escape(t.detail)}</p></div><a class="text-link" href="#${t.route}">${escape(t.action)}${icon('arrow')}</a></div>`;
  return `<section class="attention-panel" aria-labelledby="attention-title"><div class="attention-heading"><h2 id="attention-title">${connected ? 'Langkah berikutnya' : 'Langkah pada data terakhir'}</h2><span>${tasks.length} langkah</span></div>${!connected ? '<p class="small muted attention-offline">Daftar mengikuti data terakhir. Hubungkan sebelum memberi keputusan.</p>' : ''}${tasks.length ? row(tasks[0]) : '<p class="attention-empty">Belum ada tindakan yang menunggu. Catat pesanan berikutnya saat ada pelanggan.</p>'}${tasks.length>1 ? `<details class="attention-more"><summary>Lihat ${tasks.length-1} langkah lain${icon('chevron')}</summary>${tasks.slice(1).map(row).join('')}</details>` : ''}</section>`;
}
