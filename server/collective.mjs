import { randomUUID, createHash } from 'node:crypto';
import { requireValue, units, quantity } from './common.mjs';

export function createCollective(store, { group, bump, stockChanged, available }) {
  const { get, all, run, atomic, log, movement } = store;
  const context = s => get('SELECT active_cycle AS id,version,quote_expires AS expiresAt,quote_json FROM workspaces WHERE id=?', s.workspace_id);
  const current = s => get("SELECT * FROM collective_orders WHERE workspace_id=? AND cycle=? AND status<>'cancelled'", s.workspace_id, context(s).id);
  const pending = s => get("SELECT COUNT(*) AS count FROM transfers WHERE workspace_id=? AND cycle=? AND status='pending'", s.workspace_id, context(s).id).count;
  const locked = s => !!current(s);
  function member(order, s) { return JSON.parse(order.snapshot).participants.find(p => p.businessId === s.business_id); }
  function received(order, business) {
    return all('SELECT id,idem,quantity/10000 AS qty,shipping,total,created_at FROM stock_receipts WHERE collective_order_id=? AND business_id=? AND cancelled_at IS NULL ORDER BY rowid', order.id, business);
  }
  function receiptLedger(order,s) {
    const active=received(order,s.business_id),latest=active.at(-1)?.id;
    return all('SELECT id,idem,product_id,quantity/10000 AS qty,shipping,total,created_at,cancelled_at,cancel_reason FROM stock_receipts WHERE collective_order_id=? AND business_id=? ORDER BY rowid DESC',order.id,s.business_id).map(r=>{
      const blocked=r.cancelled_at ? 'Catatan sudah dibatalkan.' : order.cycle!==context(s).id ? 'Siklus berikutnya sudah dibuka.' : r.id!==latest ? 'Batalkan batch paling akhir terlebih dahulu.' : available(s,r.product_id)<units(r.qty) ? 'Stok tersedia tidak cukup untuk membalik batch ini.' : '';
      return {...r,canCancel:!blocked,cancelBlockedReason:blocked};
    });
  }
  function frozenGroup(s) {
    const order = current(s); if (!order) return null;
    const snapshot = JSON.parse(order.snapshot); const mine = member(order,s); const visible = !!mine;
    const participants = snapshot.participants.map(p => {
      const receipts = received(order,p.businessId); const count = receipts.reduce((sum,r) => sum+r.qty,0);
      return {...p, needsReview:false, receivedFromSupplier:count, remaining:p.order-count, receivedCost:receipts.reduce((sum,r)=>sum+r.total,0)};
    });
    const own = participants.find(p => p.businessId === s.business_id) || null;
    return {...snapshot, version:order.approved_version, visible, participants:visible ? participants : [], own,
      collective:visible ? snapshot.collective : null, surplus:visible ? snapshot.surplus : null, order:visible ? snapshot.order : null, totalCost:visible ? snapshot.totalCost : null,
      eligible:false, ready:true, conflicts:[], frozen:true, cycle:{id:order.cycle,status:order.status,canAdvance:order.status==='completed' && !!own},
      purchase:{id:order.id,status:order.status,createdAt:order.created_at}, pendingTransfers:0,
      receiptHistory:own ? receiptLedger(order,s) : []};
  }
  function finalize(s, body) {
    return atomic(() => {
      const existing = current(s);
      if (existing) { requireValue(member(existing,s), 'Usahamu tidak ikut rencana ini.',403); requireValue(body.cycle === existing.cycle && body.version === existing.approved_version,'Rencana sudah berubah.',409); return {id:existing.id,duplicate:true}; }
      const ctx = context(s); requireValue(body.cycle === ctx.id && body.version === ctx.version,'Siklus atau proposal berubah. Muat ulang sebelum melanjutkan.',409);
      const plan = group(s); requireValue(plan.own?.decision === 'accepted','Setujui bagianmu sebelum menyimpan rencana penerimaan.',403);
      requireValue(plan.ready,'Semua anggota harus menyetujui proposal yang memenuhi syarat.',409);
      requireValue(!pending(s),'Selesaikan atau batalkan permintaan surplus sebelum menyimpan rencana.',409);
      const id = randomUUID(); const now = new Date().toISOString();
      run('INSERT INTO collective_orders VALUES(?,?,?,?,?,?,?,NULL)',id,s.workspace_id,ctx.id,ctx.version,'receiving',JSON.stringify(plan),now);
      run("UPDATE collective_cycles SET status='receiving' WHERE workspace_id=? AND cycle=?",s.workspace_id,ctx.id);
      for (const p of plan.participants) log(s.workspace_id,p.businessId,`Siklus ${ctx.id}: rencana penerimaan disimpan sesuai persetujuan versi ${ctx.version}. Barang pemasok belum menambah stok.`);
      return {id,duplicate:false};
    });
  }
  function receive(s, orderId, body) {
    requireValue(Number.isInteger(body.qty) && body.qty >= 1 && body.qty <= 100,'Jumlah diterima harus 1–100 satuan.');
    requireValue(typeof body.idempotencyKey === 'string' && body.idempotencyKey.length >= 8 && body.idempotencyKey.length <= 100,'Kunci penerimaan tidak valid.');
    const hash = createHash('sha256').update(JSON.stringify(['collective',orderId,body.qty])).digest('hex');
    return atomic(() => {
      const order = get('SELECT * FROM collective_orders WHERE id=? AND workspace_id=?',orderId,s.workspace_id);
      requireValue(order,'Rencana penerimaan tidak ditemukan.',404); const own = member(order,s);
      requireValue(own,'Usahamu tidak ikut rencana ini.',403);
      const previous = get('SELECT * FROM stock_receipts WHERE workspace_id=? AND business_id=? AND idem=?',s.workspace_id,s.business_id,body.idempotencyKey);
      if (previous) { requireValue(previous.fingerprint === hash,'Kunci penerimaan dipakai untuk rincian berbeda.',409); return {id:previous.id,total:previous.total,duplicate:true,cancelled:!!previous.cancelled_at}; }
      requireValue(order.status === 'receiving' && order.cycle === context(s).id,'Rencana sudah selesai atau tidak aktif.',409);
      const earlier = received(order,s.business_id); const count = earlier.reduce((sum,r)=>sum+r.qty,0);
      requireValue(count + body.qty <= own.order,`Sisa bagianmu hanya ${own.order-count} satuan.`,409);
      const snapshot = JSON.parse(order.snapshot); const shipping = earlier.length ? 0 : own.transport;
      const total = body.qty * snapshot.quote.unitPrice + shipping; const id = randomUUID(); const now = new Date().toISOString();
      run('INSERT INTO stock_receipts(id,workspace_id,business_id,idem,fingerprint,product_id,quantity,unit_price,total,supplier,created_at,cancelled_at,collective_order_id,shipping) VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL,?,?)',id,s.workspace_id,s.business_id,body.idempotencyKey,hash,snapshot.quote.productId,units(body.qty),snapshot.quote.unitPrice,total,snapshot.quote.supplier,now,orderId,shipping);
      run('UPDATE stock_receipts SET product_name=?,product_unit=? WHERE id=?',snapshot.quote.productName,snapshot.quote.unit,id);
      run('UPDATE inventory SET quantity=quantity+? WHERE workspace_id=? AND business_id=? AND product_id=?',units(body.qty),s.workspace_id,s.business_id,snapshot.quote.productId);
      movement(s.workspace_id,s.business_id,snapshot.quote.productId,body.qty,'collective_receipt',id); stockChanged(s);
      log(s.workspace_id,s.business_id,`Siklus ${order.cycle}: ${body.qty} satuan pemasok diterima; biaya Rp${total}, termasuk ongkir Rp${shipping}.`);
      const complete = snapshot.participants.every(p => received(order,p.businessId).reduce((sum,r)=>sum+r.qty,0) === p.order);
      if (complete) {
        run("UPDATE collective_orders SET status='completed' WHERE id=?",orderId);
        run("UPDATE collective_cycles SET status='completed' WHERE workspace_id=? AND cycle=?",s.workspace_id,order.cycle);
        for (const p of snapshot.participants) log(s.workspace_id,p.businessId,`Siklus ${order.cycle}: semua bagian pemasok sudah diterima. Siklus berikutnya dapat dibuka.`);
      }
      return {id,total,shipping,duplicate:false};
    });
  }
  function cancelReceipt(s,orderId,receiptId,body) {
    requireValue(typeof body.reason==='string' && body.reason.trim().length>=5 && body.reason.trim().length<=240,'Isi alasan pembatalan dalam 5–240 karakter.');
    const reason=body.reason.trim();
    return atomic(()=>{
      const order=get('SELECT * FROM collective_orders WHERE id=? AND workspace_id=?',orderId,s.workspace_id);
      requireValue(order,'Rencana penerimaan tidak ditemukan.',404);requireValue(member(order,s),'Usahamu tidak ikut rencana ini.',403);
      const receipt=get('SELECT * FROM stock_receipts WHERE id=? AND collective_order_id=? AND workspace_id=? AND business_id=?',receiptId,orderId,s.workspace_id,s.business_id);
      requireValue(receipt,'Catatan penerimaan milikmu tidak ditemukan.',404);
      if(receipt.cancelled_at){requireValue(receipt.cancel_reason===reason,'Catatan sudah dibatalkan dengan alasan lain. Muat ulang riwayat.',409);return {id:receiptId,duplicate:true};}
      requireValue(order.cycle===context(s).id && ['receiving','completed'].includes(order.status),'Siklus berikutnya sudah dibuka atau rencana tidak aktif. Catatan lama tidak dapat dibatalkan.',409);
      requireValue(received(order,s.business_id).at(-1)?.id===receiptId,'Batalkan batch paling akhir usahamu terlebih dahulu agar ongkir tetap konsisten.',409);
      requireValue(available(s,receipt.product_id)>=receipt.quantity,'Stok sudah terpakai atau dicadangkan. Saldo tersedia belum cukup untuk membatalkan batch ini.',409);
      const now=new Date().toISOString();
      run('UPDATE inventory SET quantity=quantity-? WHERE workspace_id=? AND business_id=? AND product_id=?',receipt.quantity,s.workspace_id,s.business_id,receipt.product_id);
      run('UPDATE stock_receipts SET cancelled_at=?,cancel_reason=? WHERE id=?',now,reason,receiptId);
      run("UPDATE collective_orders SET status='receiving' WHERE id=?",orderId);
      run("UPDATE collective_cycles SET status='receiving' WHERE workspace_id=? AND cycle=?",s.workspace_id,order.cycle);
      movement(s.workspace_id,s.business_id,receipt.product_id,-quantity(receipt.quantity),'collective_receipt_reversal',receiptId);stockChanged(s);
      log(s.workspace_id,s.business_id,`Siklus ${order.cycle}: batch ${receiptId.slice(0,8)} sejumlah ${quantity(receipt.quantity)} satuan dibatalkan; biaya Rp${receipt.total} tidak dihitung aktif. Alasan: ${reason}`);
      if(order.status==='completed')for(const p of JSON.parse(order.snapshot).participants)if(p.businessId!==s.business_id)log(s.workspace_id,p.businessId,`Siklus ${order.cycle}: catatan penerimaan salah satu anggota dikoreksi. Periksa kemajuan sebelum siklus berikutnya.`);
      return {id:receiptId,duplicate:false};
    });
  }
  function cancel(s,id) {
    return atomic(() => {
      const order = get('SELECT * FROM collective_orders WHERE id=? AND workspace_id=?',id,s.workspace_id);
      requireValue(order,'Rencana tidak ditemukan.',404);requireValue(member(order,s),'Usahamu tidak ikut rencana ini.',403);
      if (order.status === 'cancelled') return {duplicate:true};
      requireValue(order.cycle === context(s).id && order.status === 'receiving','Rencana tidak aktif atau sudah selesai.',409);
      requireValue(!get('SELECT COUNT(*) AS count FROM stock_receipts WHERE collective_order_id=? AND cancelled_at IS NULL',id).count,'Masih ada penerimaan aktif. Rencana tidak dapat dibatalkan.',409);
      run("UPDATE collective_orders SET status='cancelled',cancelled_at=? WHERE id=?",new Date().toISOString(),id);
      run("UPDATE collective_cycles SET status='planning' WHERE workspace_id=? AND cycle=?",s.workspace_id,order.cycle); bump(s);
      for (const p of JSON.parse(order.snapshot).participants) log(s.workspace_id,p.businessId,`Siklus ${order.cycle}: rencana penerimaan dibatalkan tanpa catatan penerimaan aktif. Histori tetap tersimpan; proposal perlu disetujui kembali.`);
      return {duplicate:false};
    });
  }
  function next(s,body) {
    requireValue(Number.isInteger(body.cycle) && Number.isInteger(body.version),'Siklus/versi tidak valid.');
    return atomic(() => {
      const ctx = context(s);
      if (ctx.id === body.cycle+1 && get('SELECT closed_at FROM collective_cycles WHERE workspace_id=? AND cycle=?',s.workspace_id,body.cycle)?.closed_at) return {cycle:ctx.id,duplicate:true};
      requireValue(ctx.id === body.cycle && ctx.version === body.version,'Siklus atau versi berubah. Muat ulang sebelum memulai siklus baru.',409);
      const order = current(s);
      if (order) { requireValue(order.status === 'completed','Semua bagian pemasok harus diterima sebelum siklus berikutnya.',409);requireValue(member(order,s),'Usahamu tidak ikut rencana ini.',403); }
      else requireValue(ctx.quote_json && Date.now() >= ctx.expiresAt,'Siklus masih terbuka. Siklus berikutnya tersedia setelah penawaran kedaluwarsa.',409);
      requireValue(!pending(s),'Selesaikan atau batalkan permintaan surplus terlebih dahulu.',409);
      const now = new Date().toISOString();
      run('UPDATE collective_cycles SET closed_at=? WHERE workspace_id=? AND cycle=?',now,s.workspace_id,ctx.id);
      run("INSERT INTO collective_cycles VALUES(?,?,'planning',?,NULL)",s.workspace_id,ctx.id+1,now);
      run('UPDATE workspaces SET active_cycle=?,quote_expires=0,quote_json=NULL WHERE id=?',ctx.id+1,s.workspace_id);
      run("UPDATE demands SET qty=0,active=0,budget=NULL,approved_version=NULL,decision='pending',stock_revision=(SELECT stock_revision FROM business_state st WHERE st.workspace_id=demands.workspace_id AND st.business_id=demands.business_id) WHERE workspace_id=?",s.workspace_id);bump(s);
      for (const b of all('SELECT id FROM businesses WHERE workspace_id=?',s.workspace_id)) log(s.workspace_id,b.id,`Siklus ${ctx.id+1} dibuka. Bagikan kebutuhan dan persetujuan baru; stok serta histori siklus sebelumnya dipertahankan.`);
      return {cycle:ctx.id+1,duplicate:false};
    });
  }
  function history(s) {
    return all('SELECT * FROM collective_orders WHERE workspace_id=? ORDER BY created_at DESC,id DESC',s.workspace_id).flatMap(order => {
      const own = member(order,s); if (!own) return [];
      const snapshot = JSON.parse(order.snapshot); const receipts = received(order,s.business_id);
      return [{id:order.id,cycle:order.cycle,status:order.status,createdAt:order.created_at,qty:own.order,surplus:own.surplus,plannedCost:own.cost,supplierCost:own.order*snapshot.quote.unitPrice+own.transport,received:receipts.reduce((sum,r)=>sum+r.qty,0),receivedCost:receipts.reduce((sum,r)=>sum+r.total,0)}];
    });
  }
  return { context,current,pending,locked,frozenGroup,finalize,receive,cancel,cancelReceipt,next,history };
}
