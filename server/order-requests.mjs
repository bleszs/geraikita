import {randomUUID,createHash} from 'node:crypto';
import {requireValue} from './common.mjs';

export function migrateOrderRequests(db){
  db.exec(`CREATE TABLE IF NOT EXISTS order_requests(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,business_id TEXT NOT NULL,access_id TEXT NOT NULL,idem TEXT NOT NULL,fingerprint TEXT NOT NULL,label TEXT NOT NULL,note TEXT NOT NULL,items TEXT NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','accepted','rejected')),created_at TEXT NOT NULL,created_ms INTEGER NOT NULL,decided_at TEXT,order_id TEXT,reason TEXT,UNIQUE(access_id,idem),FOREIGN KEY(access_id) REFERENCES display_access(id));
    CREATE INDEX IF NOT EXISTS order_request_scope ON order_requests(workspace_id,business_id,status,created_ms);`);
}
export const REQUEST_TTL=30*60000;
const scope=s=>[s.workspace_id,s.business_id];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Pending requests lapse instead of waiting forever for a cashier.
export function pendingRequests(store,s){
  return store.all("SELECT * FROM order_requests WHERE workspace_id=? AND business_id=? AND status='pending' AND created_ms>? ORDER BY created_ms",s.workspace_id,s.business_id,Date.now()-REQUEST_TTL)
    .map(r=>({id:r.id,label:r.label,note:r.note,items:JSON.parse(r.items),total:r.total,createdAt:r.created_at,expiresAt:new Date(r.created_ms+REQUEST_TTL).toISOString()}));
}
const effective=r=>r.status==='pending'&&r.created_ms+REQUEST_TTL<=Date.now()?'expired':r.status;
export function createOrderRequests(store,{kitchen}){
  const {get,all,run,atomic,log}=store;
  // Public projection: only kitchen-ready menus, and availability as a boolean, never portions.
  function catalog(access){
    const portions=kitchen.snapshot(access).menus,business=get('SELECT name FROM businesses WHERE workspace_id=? AND id=?',...scope(access));
    const menus=store.menus(access).filter(m=>portions.find(p=>p.id===m.id)?.configured).map(m=>({id:m.id,name:m.name,price:m.price,available:portions.find(p=>p.id===m.id).portions>0}));
    return {business:business.name,menus,updatedAt:new Date().toISOString()};
  }
  function submit(access,b){
    requireValue(typeof b.idempotencyKey==='string'&&b.idempotencyKey.length>=8&&b.idempotencyKey.length<=100,'Kunci permintaan tidak valid. Muat ulang halaman.');
    requireValue(typeof b.label==='string'&&b.label.trim().length>=1&&b.label.trim().length<=40,'Isi nama atau nomor meja, maksimal 40 karakter.');
    requireValue(b.note===undefined||typeof b.note==='string'&&b.note.length<=200,'Catatan maksimal 200 karakter.');
    requireValue(Array.isArray(b.items)&&b.items.length>=1&&b.items.length<=10,'Pilih 1–10 menu.');
    requireValue(b.items.every(i=>i&&typeof i.id==='string'&&Number.isInteger(i.qty)&&i.qty>=1&&i.qty<=20)&&new Set(b.items.map(i=>i.id)).size===b.items.length,'Jumlah setiap menu harus 1–20.');
    const label=b.label.trim(),note=(b.note||'').trim(),fingerprint=hash([label,note,b.items]);
    return atomic(()=>{
      const previous=get('SELECT id,fingerprint,status FROM order_requests WHERE access_id=? AND idem=?',access.id,b.idempotencyKey);
      if(previous){requireValue(previous.fingerprint===fingerprint,'Permintaan ini sudah dikirim dengan isi berbeda.',409);return {id:previous.id,duplicate:true};}
      const now=Date.now();
      requireValue(get('SELECT COUNT(*) AS n FROM order_requests WHERE access_id=? AND created_ms>?',access.id,now-60000).n<10,'Terlalu banyak permintaan dari katalog ini. Coba lagi sebentar lagi.',429);
      requireValue(get("SELECT COUNT(*) AS n FROM order_requests WHERE access_id=? AND status='pending' AND created_ms>?",access.id,now-REQUEST_TTL).n<20,'Masih banyak permintaan menunggu konfirmasi. Tanyakan kepada petugas.',429);
      const menus=catalog(access).menus;
      const items=b.items.map(i=>{const m=menus.find(m=>m.id===i.id);requireValue(m,'Menu tidak tersedia di katalog. Muat ulang katalog.',409);requireValue(m.available,`${m.name} sedang habis. Pilih menu lain.`,409);return {id:m.id,name:m.name,qty:i.qty,unitPrice:m.price};});
      const id=randomUUID(),total=items.reduce((v,i)=>v+i.unitPrice*i.qty,0);
      run('INSERT INTO order_requests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,NULL)',id,...scope(access),access.id,b.idempotencyKey,fingerprint,label,note,JSON.stringify(items),total,'pending',new Date(now).toISOString(),now);
      log(...scope(access),`Permintaan pesanan katalog web dari ${label} menunggu konfirmasi.`);
      return {id,duplicate:false};
    });
  }
  // Customers read only their own request through the same link.
  function status(access,id){
    const r=get('SELECT * FROM order_requests WHERE access_id=? AND id=?',access.id,id);requireValue(r,'Permintaan tidak ditemukan.',404);
    return {id:r.id,status:effective(r),total:r.total,items:JSON.parse(r.items).map(({name,qty})=>({name,qty})),code:r.order_id?r.order_id.slice(0,8).toUpperCase():null,reason:r.status==='rejected'?r.reason:null};
  }
  function decide(s,id,b){
    requireValue(['accept','reject'].includes(b.decision),'Pilih terima atau tolak.');
    requireValue(b.reason===undefined||typeof b.reason==='string'&&b.reason.length<=120,'Alasan maksimal 120 karakter.');
    const target=b.decision==='accept'?'accepted':'rejected';
    return atomic(()=>{
      const r=get('SELECT * FROM order_requests WHERE workspace_id=? AND business_id=? AND id=?',...scope(s),id);requireValue(r,'Permintaan tidak ditemukan.',404);
      if(r.status!=='pending'){requireValue(r.status===target,r.status==='accepted'?'Permintaan sudah diterima ke antrean.':'Permintaan sudah ditolak.',409);return {id,status:r.status,orderId:r.order_id,duplicate:true};}
      requireValue(effective(r)==='pending','Permintaan sudah kedaluwarsa. Minta pelanggan mengirim ulang.',409);
      let orderId=null;
      if(target==='accepted'){
        const items=JSON.parse(r.items),menus=store.menus(s);
        requireValue(items.every(i=>menus.find(m=>m.id===i.id)?.price===i.unitPrice),'Harga menu berubah sejak permintaan dikirim. Tolak dan minta pelanggan memesan ulang.',409);
        const catalogRevision=get('SELECT catalog_revision FROM business_state WHERE workspace_id=? AND business_id=?',...scope(s)).catalog_revision;
        // The request id keys the kitchen order, so a retried accept never creates a second order.
        orderId=kitchen.create(s,{label:r.label,channel:'web',items:items.map((i,index)=>({id:i.id,qty:i.qty,note:index===0?r.note:''})),catalogRevision,idempotencyKey:'request:'+r.id}).id;
      }
      const reason=target==='rejected'?(b.reason||'').trim()||'Pesanan belum dapat diproses.':null;
      run('UPDATE order_requests SET status=?,decided_at=?,order_id=?,reason=? WHERE workspace_id=? AND business_id=? AND id=?',target,new Date().toISOString(),orderId,reason,...scope(s),id);
      log(...scope(s),`Permintaan katalog web ${r.label} ${target==='accepted'?'diterima ke antrean dapur':'ditolak'}.`);
      return {id,status:target,orderId,duplicate:false};
    });
  }
  return {catalog,submit,status,decide};
}
