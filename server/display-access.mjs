import {randomUUID,createHash} from 'node:crypto';
import {requireValue} from './common.mjs';
import {planKitchen} from './kitchen-schedule.mjs';

export function migrateDisplayAccess(db){
  db.exec(`CREATE TABLE IF NOT EXISTS display_access(
    id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,business_id TEXT NOT NULL,
    label TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,idem TEXT NOT NULL,fingerprint TEXT NOT NULL,
    created_at TEXT NOT NULL,expires_at INTEGER NOT NULL,revoked_at TEXT,
    UNIQUE(workspace_id,business_id,idem),
    FOREIGN KEY(workspace_id,business_id) REFERENCES businesses(workspace_id,id));`);
  // Additive: links created before v0.38 are status displays.
  if(!db.prepare('PRAGMA table_info(display_access)').all().some(c=>c.name==='kind'))db.exec("ALTER TABLE display_access ADD COLUMN kind TEXT NOT NULL DEFAULT 'display'");
}
const digest=value=>createHash('sha256').update(value).digest('hex');
const scope=s=>[s.workspace_id,s.business_id];
const names={display:'layar',catalog:'katalog'};
export function createDisplayAccess(store){
  const {get,all,run,atomic}=store;
  const metadata=r=>({id:r.id,label:r.label,kind:r.kind||'display',createdAt:r.created_at,expiresAt:new Date(r.expires_at).toISOString(),status:r.revoked_at?'revoked':r.expires_at<=Date.now()?'expired':'active'});
  function list(s){
    return all('SELECT id,label,kind,created_at,expires_at,revoked_at FROM display_access WHERE workspace_id=? AND business_id=? ORDER BY (revoked_at IS NULL AND expires_at>?) DESC,created_at DESC,rowid DESC LIMIT 50',...scope(s),Date.now()).map(metadata);
  }
  function create(s,b){
    const kind=b.kind===undefined?'display':b.kind;
    requireValue(['display','catalog'].includes(kind),'Pilih jenis tautan: layar status atau katalog pesanan.');
    requireValue(typeof b.label==='string'&&b.label.trim().length>=2&&b.label.trim().length<=60,'Isi nama layar dalam 2–60 karakter.');
    requireValue(Number.isInteger(b.durationHours)&&b.durationHours>=1&&b.durationHours<=168,'Masa aktif harus 1–168 jam.');
    requireValue(typeof b.token==='string'&&/^[a-f0-9]{64}$/.test(b.token),'Tautan akses belum valid. Buat ulang tautan.');
    requireValue(typeof b.idempotencyKey==='string'&&b.idempotencyKey.length>=8&&b.idempotencyKey.length<=100,'Kunci pembuatan layar tidak valid.');
    requireValue(b.confirmed===true,kind==='catalog'?'Setujui bahwa pemegang tautan dapat melihat menu, harga dan ketersediaan, serta mengirim permintaan pesanan selama tautan aktif.':'Setujui bahwa pemegang tautan dapat melihat kode dan status pesanan selama tautan aktif.');
    // Display fingerprints keep their v0.35 shape so retries of older keys still match.
    const tokenHash=digest(b.token),fingerprint=digest(JSON.stringify([b.label.trim(),b.durationHours,tokenHash,...(kind==='catalog'?[kind]:[])]));
    return atomic(()=>{
      const previous=get('SELECT * FROM display_access WHERE workspace_id=? AND business_id=? AND idem=?',...scope(s),b.idempotencyKey);
      if(previous){requireValue(previous.fingerprint===fingerprint,'Kunci pembuatan sudah dipakai untuk layar berbeda.',409);return {...metadata(previous),duplicate:true};}
      requireValue(get('SELECT COUNT(*) AS n FROM display_access WHERE workspace_id=? AND business_id=? AND kind=? AND revoked_at IS NULL AND expires_at>?',...scope(s),kind,Date.now()).n<10,`Maksimal 10 tautan ${names[kind]} aktif. Cabut tautan yang tidak digunakan.`,409);
      requireValue(!get('SELECT id FROM display_access WHERE token_hash=?',tokenHash),'Tautan sudah digunakan. Buat ulang tautan.',409);
      const id=randomUUID(),now=new Date().toISOString(),expires=Date.now()+b.durationHours*3600000;
      run('INSERT INTO display_access(id,workspace_id,business_id,label,token_hash,idem,fingerprint,created_at,expires_at,revoked_at,kind) VALUES(?,?,?,?,?,?,?,?,?,NULL,?)',id,...scope(s),b.label.trim(),tokenHash,b.idempotencyKey,fingerprint,now,expires,kind);
      store.log(...scope(s),`Akses ${kind==='catalog'?'katalog pesanan':'layar pelanggan'} dibuat: ${b.label.trim()}, berlaku ${b.durationHours} jam.`);
      return {...metadata(get('SELECT * FROM display_access WHERE workspace_id=? AND business_id=? AND id=?',...scope(s),id)),duplicate:false};
    });
  }
  function revoke(s,id){
    return atomic(()=>{
      const row=get('SELECT * FROM display_access WHERE workspace_id=? AND business_id=? AND id=?',...scope(s),id);
      requireValue(row,'Akses layar tidak ditemukan.',404);
      if(row.revoked_at)return {revoked:true,duplicate:true};
      run('UPDATE display_access SET revoked_at=? WHERE workspace_id=? AND business_id=? AND id=?',new Date().toISOString(),...scope(s),id);
      store.log(...scope(s),`Akses ${row.kind==='catalog'?'katalog pesanan':'layar pelanggan'} dicabut: ${row.label}.`);return {revoked:true,duplicate:false};
    });
  }
  // A token only opens the surface it was created for.
  function resolve(authorization,kind='display'){
    const token=typeof authorization==='string'&&authorization.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    requireValue(token,kind==='catalog'?'Buka tautan katalog pesanan yang masih aktif.':'Buka tautan layar pelanggan yang masih aktif.',401);
    const row=get('SELECT id,workspace_id,business_id FROM display_access WHERE token_hash=? AND kind=? AND revoked_at IS NULL AND expires_at>?',digest(token),kind,Date.now());
    requireValue(row,kind==='catalog'?'Katalog berakhir atau sudah dicabut. Tanyakan kepada petugas.':'Akses layar berakhir atau sudah dicabut. Minta tautan baru kepada pemilik.',401);
    return row;
  }
  function snapshot(s){
    const rows=all("SELECT id,status,created_at FROM kitchen_orders WHERE workspace_id=? AND business_id=? AND status IN ('queued','preparing','ready') ORDER BY created_at,id",...scope(s));
    const tasks=all('SELECT id,order_id,status,minutes,qty,passive_minutes,phase_started_at,station FROM kitchen_tasks WHERE workspace_id=? AND business_id=?',...scope(s));
    const capacities=all('SELECT station,cooks,equipment,revision FROM kitchen_stations WHERE workspace_id=? AND business_id=?',...scope(s));
    const {orderEtas}=planKitchen(rows,tasks,[],capacities);
    return {orders:rows.slice(0,200).map(r=>({code:r.id.slice(0,8).toUpperCase(),status:r.status,etaMinutes:orderEtas.get(r.id)??null})),hasMore:rows.length>200,updatedAt:new Date().toISOString()};
  }
  return store.attribute({list,create,revoke,resolve,snapshot});
}
