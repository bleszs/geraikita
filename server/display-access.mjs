import {randomUUID,createHash} from 'node:crypto';
import {requireValue} from './common.mjs';

export function migrateDisplayAccess(db){
  db.exec(`CREATE TABLE IF NOT EXISTS display_access(
    id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,business_id TEXT NOT NULL,
    label TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,idem TEXT NOT NULL,fingerprint TEXT NOT NULL,
    created_at TEXT NOT NULL,expires_at INTEGER NOT NULL,revoked_at TEXT,
    UNIQUE(workspace_id,business_id,idem),
    FOREIGN KEY(workspace_id,business_id) REFERENCES businesses(workspace_id,id));`);
}
const digest=value=>createHash('sha256').update(value).digest('hex');
const scope=s=>[s.workspace_id,s.business_id];
export function createDisplayAccess(store){
  const {get,all,run,atomic}=store;
  const metadata=r=>({id:r.id,label:r.label,createdAt:r.created_at,expiresAt:new Date(r.expires_at).toISOString(),status:r.revoked_at?'revoked':r.expires_at<=Date.now()?'expired':'active'});
  function list(s){
    return all('SELECT id,label,created_at,expires_at,revoked_at FROM display_access WHERE workspace_id=? AND business_id=? ORDER BY (revoked_at IS NULL AND expires_at>?) DESC,created_at DESC,rowid DESC LIMIT 50',...scope(s),Date.now()).map(metadata);
  }
  function create(s,b){
    requireValue(typeof b.label==='string'&&b.label.trim().length>=2&&b.label.trim().length<=60,'Isi nama layar dalam 2–60 karakter.');
    requireValue(Number.isInteger(b.durationHours)&&b.durationHours>=1&&b.durationHours<=168,'Masa aktif harus 1–168 jam.');
    requireValue(typeof b.token==='string'&&/^[a-f0-9]{64}$/.test(b.token),'Tautan akses belum valid. Buat ulang tautan.');
    requireValue(typeof b.idempotencyKey==='string'&&b.idempotencyKey.length>=8&&b.idempotencyKey.length<=100,'Kunci pembuatan layar tidak valid.');
    requireValue(b.confirmed===true,'Setujui bahwa pemegang tautan dapat melihat kode dan status pesanan selama tautan aktif.');
    const tokenHash=digest(b.token),fingerprint=digest(JSON.stringify([b.label.trim(),b.durationHours,tokenHash]));
    return atomic(()=>{
      const previous=get('SELECT * FROM display_access WHERE workspace_id=? AND business_id=? AND idem=?',...scope(s),b.idempotencyKey);
      if(previous){requireValue(previous.fingerprint===fingerprint,'Kunci pembuatan sudah dipakai untuk layar berbeda.',409);return {...metadata(previous),duplicate:true};}
      requireValue(get('SELECT COUNT(*) AS n FROM display_access WHERE workspace_id=? AND business_id=? AND revoked_at IS NULL AND expires_at>?',...scope(s),Date.now()).n<10,'Maksimal 10 tautan layar aktif. Cabut tautan yang tidak digunakan.',409);
      requireValue(!get('SELECT id FROM display_access WHERE token_hash=?',tokenHash),'Tautan sudah digunakan. Buat ulang tautan.',409);
      const id=randomUUID(),now=new Date().toISOString(),expires=Date.now()+b.durationHours*3600000;
      run('INSERT INTO display_access VALUES(?,?,?,?,?,?,?,?,?,NULL)',id,...scope(s),b.label.trim(),tokenHash,b.idempotencyKey,fingerprint,now,expires);
      store.log(...scope(s),`Akses layar pelanggan dibuat: ${b.label.trim()}, berlaku ${b.durationHours} jam.`);
      return {...metadata(get('SELECT * FROM display_access WHERE workspace_id=? AND business_id=? AND id=?',...scope(s),id)),duplicate:false};
    });
  }
  function revoke(s,id){
    return atomic(()=>{
      const row=get('SELECT * FROM display_access WHERE workspace_id=? AND business_id=? AND id=?',...scope(s),id);
      requireValue(row,'Akses layar tidak ditemukan.',404);
      if(row.revoked_at)return {revoked:true,duplicate:true};
      run('UPDATE display_access SET revoked_at=? WHERE workspace_id=? AND business_id=? AND id=?',new Date().toISOString(),...scope(s),id);
      store.log(...scope(s),`Akses layar pelanggan dicabut: ${row.label}.`);return {revoked:true,duplicate:false};
    });
  }
  function resolve(authorization){
    const token=typeof authorization==='string'&&authorization.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    requireValue(token,'Buka tautan layar pelanggan yang masih aktif.',401);
    const row=get('SELECT workspace_id,business_id FROM display_access WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?',digest(token),Date.now());
    requireValue(row,'Akses layar berakhir atau sudah dicabut. Minta tautan baru kepada pemilik.',401);
    return row;
  }
  function snapshot(s){
    const rows=all("SELECT id,status FROM kitchen_orders WHERE workspace_id=? AND business_id=? AND status IN ('queued','preparing','ready') ORDER BY created_at,id LIMIT 201",...scope(s));
    return {orders:rows.slice(0,200).map(r=>({code:r.id.slice(0,8).toUpperCase(),status:r.status})),hasMore:rows.length>200,updatedAt:new Date().toISOString()};
  }
  return {list,create,revoke,resolve,snapshot};
}
