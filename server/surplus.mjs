import { randomUUID, createHash } from 'node:crypto';
import { requireValue, quantity, units } from './common.mjs';

export function createSurplus(store, { cycles, available }) {
  const { all, get, run, atomic, log } = store;
  const scope = s => [s.workspace_id,s.business_id];
  function offers(s) {
    const cycle = cycles.context(s).id;
    return all(`SELECT o.*,b.name FROM offers o JOIN businesses b ON b.workspace_id=o.workspace_id AND b.id=o.owner_id
      WHERE o.workspace_id=? AND (o.cycle=? OR o.owner_id=? OR EXISTS(SELECT 1 FROM transfers t WHERE t.offer_id=o.id AND t.receiver_id=?)) ORDER BY o.rowid`,s.workspace_id,cycle,s.business_id,s.business_id).map(o=>{
      const used=all("SELECT qty,status FROM transfers WHERE offer_id=? AND status IN ('pending','completed')",o.id);
      const claimed=used.reduce((n,t)=>n+t.qty,0);
      return {id:o.id,ownerId:o.owner_id,ownerName:o.name,productId:o.product_id,qty:o.qty,unitPrice:o.unit_price,expiresAt:o.expires_at,condition:o.condition,cycle:o.cycle,createdAt:o.created_at,cancelledAt:o.cancelled_at,
        idempotencyKey:o.owner_id===s.business_id ? o.idem : undefined,
        pendingQty:used.filter(t=>t.status==='pending').reduce((n,t)=>n+t.qty,0),completedQty:used.filter(t=>t.status==='completed').reduce((n,t)=>n+t.qty,0),
        remaining:Math.max(0,o.qty-claimed),available:o.cancelled_at || o.cycle!==cycle || o.expires_at<=Date.now() ? 0 : Math.max(0,Math.min(o.qty-claimed,Math.floor(quantity(available({...s,business_id:o.owner_id},o.product_id))))) };
    });
  }
  function create(s,body) {
    const product=JSON.parse(get('SELECT settings FROM workspaces WHERE id=?',s.workspace_id).settings || '{}').product;
    requireValue(product && body.productId===product.id,'Pilih bahan bersama yang sudah disepakati kelompok.');
    requireValue(Number.isInteger(body.qty) && body.qty>=1 && body.qty<=100,'Jumlah tawaran harus 1–100 satuan.');
    requireValue(Number.isInteger(body.unitPrice) && body.unitPrice>=0 && body.unitPrice<=10000000,'Harga harus rupiah bulat, 0–10.000.000.');
    requireValue(typeof body.condition==='string' && body.condition.trim().length>=10 && body.condition.trim().length<=240,'Jelaskan kondisi dan penyimpanan dalam 10–240 karakter.');
    requireValue(Number.isInteger(body.expiresInHours) && body.expiresInHours>=1 && body.expiresInHours<=24,'Batas pengambilan harus 1–24 jam dari sekarang.');
    requireValue(Number.isInteger(body.cycle),'Siklus tidak valid.');
    requireValue(typeof body.idempotencyKey==='string' && body.idempotencyKey.length>=8 && body.idempotencyKey.length<=100,'Kunci tawaran tidak valid.');
    const condition=body.condition.trim();
    const hash=createHash('sha256').update(JSON.stringify([body.productId,body.qty,body.unitPrice,condition,body.expiresInHours,body.cycle])).digest('hex');
    return atomic(()=>{
      const existing=get('SELECT * FROM offers WHERE workspace_id=? AND owner_id=? AND idem=?',...scope(s),body.idempotencyKey);
      if(existing){requireValue(existing.fingerprint===hash,'Kunci tawaran sudah dipakai untuk rincian berbeda.',409);return {id:existing.id,duplicate:true};}
      requireValue(!cycles.locked(s),'Rencana penerimaan sudah disimpan. Buat tawaran pada siklus berikutnya.',409);
      const current=cycles.context(s);requireValue(current.id===body.cycle,'Siklus berubah. Muat ulang sebelum membuat tawaran.',409);
      requireValue(current.expiresAt>Date.now(),'Penawaran pemasok kedaluwarsa. Mulai siklus baru sebelum membuat tawaran.',409);
      requireValue(get('SELECT COUNT(*) AS n FROM offers WHERE workspace_id=? AND owner_id=? AND cycle=?',...scope(s),body.cycle).n<10,'Maksimal 10 tawaran per usaha dalam satu siklus.');
      requireValue(available(s,product.id)>=units(body.qty),'Stok tersedia tidak cukup atau sudah dicadangkan untuk permintaan lain.',409);
      const id=randomUUID(),now=Date.now();
      run('INSERT INTO offers(id,workspace_id,owner_id,product_id,qty,unit_price,expires_at,condition,cycle,created_at,idem,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,...scope(s),product.id,body.qty,body.unitPrice,now+body.expiresInHours*3600000,condition,body.cycle,new Date(now).toISOString(),body.idempotencyKey,hash);
      log(...scope(s),`Menawarkan ${body.qty} ${product.unit} surplus seharga Rp${body.unitPrice}/${product.unit}, berlaku ${body.expiresInHours} jam pada siklus ${body.cycle}. Stok dicadangkan saat ada permintaan.`);
      return {id,duplicate:false};
    });
  }
  function withdraw(s,id) {
    return atomic(()=>{
      const offer=get('SELECT * FROM offers WHERE id=? AND workspace_id=? AND owner_id=?',id,...scope(s));
      requireValue(offer,'Tawaran milikmu tidak ditemukan.',404);
      if(offer.cancelled_at)return {duplicate:true};
      requireValue(!get("SELECT COUNT(*) AS n FROM transfers WHERE offer_id=? AND status='pending'",id).n,'Selesaikan atau batalkan permintaan yang menunggu sebelum menarik tawaran.',409);
      run('UPDATE offers SET cancelled_at=? WHERE id=?',new Date().toISOString(),id);
      log(...scope(s),'Sisa tawaran surplus ditarik. Transfer yang sudah selesai dan biayanya tetap tercatat.');
      return {duplicate:false};
    });
  }
  return {offers,create,withdraw};
}
