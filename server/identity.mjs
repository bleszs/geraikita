import {randomUUID,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {requireValue} from './common.mjs';

export function createIdentity(store) {
  const {get,run,atomic}=store;
  const emailOf=value=>typeof value==='string' ? value.trim().toLowerCase() : '';
  function credentials(body){
    const email=emailOf(body.email);
    requireValue(email.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Isi alamat email yang valid.');
    requireValue(typeof body.password==='string' && body.password.length>=10 && body.password.length<=128,'Kata sandi harus 10–128 karakter.');
    return email;
  }
  function issue(account){const s=store.session(account.business_id,account.workspace_id);run('INSERT INTO account_sessions VALUES(?,?)',s.id,account.id);return s;}
  function register(body){
    const email=credentials(body);
    requireValue(typeof body.businessName==='string' && body.businessName.trim().length>=2 && body.businessName.trim().length<=60,'Nama usaha harus 2–60 karakter.');
    const joining=typeof body.inviteCode==='string' && !!body.inviteCode.trim();
    requireValue(joining || (typeof body.communityName==='string' && body.communityName.trim().length>=2 && body.communityName.trim().length<=80),'Isi nama kelompok atau kode bergabung.');
    const salt=randomBytes(16).toString('hex'),hash=scryptSync(body.password,salt,64).toString('hex');
    return atomic(()=>{
      requireValue(!get('SELECT id FROM accounts WHERE email=?',email),'Email sudah terdaftar. Masuk dengan akunmu.',409);
      let workspace=joining && get('SELECT * FROM workspaces WHERE join_code=?',body.inviteCode.trim());
      requireValue(!joining || workspace,'Kode kelompok tidak ditemukan.',404);
      const business=randomUUID(),now=new Date().toISOString();
      if(!joining){const id=randomUUID();run('INSERT INTO workspaces(id,version,quote_expires,created_at,active_cycle,name,join_code,owner_business_id,settings) VALUES(?,1,0,?,1,?,?,?,?)',id,now,body.communityName.trim(),randomBytes(12).toString('hex'),business,'{}');run("INSERT INTO collective_cycles VALUES(?,1,'planning',?,NULL)",id,now);workspace=get('SELECT * FROM workspaces WHERE id=?',id);}
      const name=body.businessName.trim();run('INSERT INTO businesses VALUES(?,?,?,?,?)',workspace.id,business,name,name,Array.from(name)[0].toUpperCase());
      run('INSERT INTO business_state VALUES(?,?,1,0)',workspace.id,business);
      run("INSERT INTO demands(workspace_id,business_id,qty,active,budget,expires_at,approved_version,decision,stock_revision) VALUES(?,?,0,0,NULL,0,NULL,'pending',0)",workspace.id,business);
      const product=JSON.parse(workspace.settings || '{}').product;
      if(product){run('INSERT INTO ingredients VALUES(?,?,?,?,?,?,0,?,1)',workspace.id,business,product.id,product.name,product.name.normalize('NFKC').toLowerCase(),product.unit,'');run('INSERT INTO inventory VALUES(?,?,?,?,NULL)',workspace.id,business,product.id,0);}
      const account={id:randomUUID(),workspace_id:workspace.id,business_id:business};run('INSERT INTO accounts VALUES(?,?,?,?,?,?,?)',account.id,email,hash,salt,workspace.id,business,now);
      store.log(workspace.id,business,joining ? 'Usaha bergabung ke kelompok dengan kode undangan.' : 'Usaha dan kelompok dibuat oleh pemilik.');
      return issue(account);
    });
  }
  function login(body){
    const email=credentials(body),account=get('SELECT * FROM accounts WHERE email=?',email);
    // Equal work for unknown addresses; password contents never enter responses or logs.
    const candidate=scryptSync(body.password,account?.salt || 'unregistered-account',64);
    requireValue(account && timingSafeEqual(candidate,Buffer.from(account.password_hash,'hex')),'Email atau kata sandi tidak sesuai.',401);
    return atomic(()=>issue(account));
  }
  function resolve(id){return id && get('SELECT s.* FROM sessions s JOIN account_sessions a ON a.session_id=s.id JOIN accounts u ON u.id=a.account_id AND u.workspace_id=s.workspace_id AND u.business_id=s.business_id WHERE s.id=? AND s.expires_at>?',id,Date.now());}
  function account(s){const row=get('SELECT a.* FROM accounts a JOIN account_sessions x ON x.account_id=a.id WHERE x.session_id=? AND a.workspace_id=? AND a.business_id=?',s.id,s.workspace_id,s.business_id);requireValue(row,'Sesi akun tidak ditemukan.',401);return row;}
  function details(s){const a=account(s);return {email:a.email,createdAt:a.created_at};}
  function saveBusiness(s,body){
    requireValue(typeof body.businessName==='string' && body.businessName.trim().length>=2 && body.businessName.trim().length<=60,'Nama usaha harus 2–60 karakter.');
    const name=body.businessName.trim();return atomic(()=>{account(s);run('UPDATE businesses SET name=?,short_name=?,letter=? WHERE workspace_id=? AND id=?',name,name,Array.from(name)[0].toUpperCase(),s.workspace_id,s.business_id);store.log(s.workspace_id,s.business_id,'Nama usaha diperbarui oleh pemilik akun.');return {saved:true};});
  }
  function changePassword(s,body){
    requireValue(typeof body.currentPassword==='string' && body.currentPassword.length>=10 && body.currentPassword.length<=128,'Isi kata sandi saat ini.');
    requireValue(typeof body.newPassword==='string' && body.newPassword.length>=10 && body.newPassword.length<=128,'Kata sandi baru harus 10–128 karakter.');
    requireValue(body.currentPassword!==body.newPassword,'Gunakan kata sandi baru yang berbeda.');
    const a=account(s),candidate=scryptSync(body.currentPassword,a.salt,64);
    requireValue(timingSafeEqual(candidate,Buffer.from(a.password_hash,'hex')),'Kata sandi saat ini tidak sesuai.',403,'incorrect_password');
    const salt=randomBytes(16).toString('hex'),hash=scryptSync(body.newPassword,salt,64).toString('hex');
    return atomic(()=>{
      run('UPDATE accounts SET password_hash=?,salt=? WHERE id=?',hash,salt,a.id);
      const result=run('DELETE FROM sessions WHERE id IN (SELECT session_id FROM account_sessions WHERE account_id=? AND session_id<>?)',a.id,s.id);
      store.log(s.workspace_id,s.business_id,'Kata sandi diperbarui; sesi lain pada akun ini dikeluarkan.');return {saved:true,revokedSessions:Number(result.changes)};
    });
  }
  function saveCommunity(s,body){
    requireValue(typeof body.communityName==='string' && body.communityName.trim().length>=2 && body.communityName.trim().length<=80,'Nama kelompok harus 2–80 karakter.');
    return atomic(()=>{account(s);const w=get('SELECT owner_business_id FROM workspaces WHERE id=?',s.workspace_id);requireValue(w.owner_business_id===s.business_id,'Hanya pengelola kelompok dapat mengubah pengaturan ini.',403);run('UPDATE workspaces SET name=? WHERE id=?',body.communityName.trim(),s.workspace_id);store.log(s.workspace_id,s.business_id,'Nama kelompok diperbarui oleh pengelola.');return {saved:true};});
  }
  function rotateInvite(s,body){
    requireValue(typeof body.expectedCode==='string' && body.expectedCode.length<=64,'Kode undangan asal tidak valid.');
    return atomic(()=>{account(s);const w=get('SELECT owner_business_id,join_code FROM workspaces WHERE id=?',s.workspace_id);requireValue(w.owner_business_id===s.business_id,'Hanya pengelola kelompok dapat mengganti kode undangan.',403);requireValue(w.join_code===body.expectedCode,'Kode sudah berubah. Perbarui data untuk melihat kode terbaru.',409);const code=randomBytes(12).toString('hex');run('UPDATE workspaces SET join_code=? WHERE id=?',code,s.workspace_id);store.log(s.workspace_id,s.business_id,'Kode undangan diganti; kode sebelumnya tidak dapat dipakai bergabung.');return {saved:true};});
  }
  return {register,login,resolve,details,saveBusiness,changePassword,saveCommunity,rotateInvite};
}
