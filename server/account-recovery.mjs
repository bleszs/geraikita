import {randomUUID,randomBytes,scryptSync,createHash} from 'node:crypto';
import {requireValue} from './common.mjs';
export const RECOVERY_CODE_COUNT=10;
// 32 unambiguous characters (no I, O, 0, 1); 256 is a multiple of 32, so byte%32 is unbiased.
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const normalizeRecoveryCode=code=>typeof code==='string'?code.replace(/[\s-]/g,'').toUpperCase():'';
const validCode=code=>/^[A-HJ-NP-Z2-9]{10}$/.test(code);
const digest=value=>createHash('sha256').update(value).digest('hex');
const generateCode=()=>Array.from(randomBytes(10),b=>ALPHABET[b%32]).join('');
export function migrateRecoveryCodes(db){
  db.exec(`CREATE TABLE IF NOT EXISTS account_recovery_codes(id TEXT PRIMARY KEY,account_id TEXT NOT NULL,workspace_id TEXT NOT NULL,business_id TEXT NOT NULL,code_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,used_at TEXT,FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,FOREIGN KEY(workspace_id,business_id) REFERENCES businesses(workspace_id,id));
    CREATE INDEX IF NOT EXISTS recovery_scope ON account_recovery_codes(account_id);`);
}
export function remainingRecoveryCodes(store,accountId){return store.get('SELECT COUNT(*) AS n FROM account_recovery_codes WHERE account_id=? AND used_at IS NULL',accountId).n;}
export function createAccountRecovery(store,{account,owner,issue,emailOf}){
  const {get,run,atomic}=store,scope=s=>[s.workspace_id,s.business_id];
  // Owner generates a fresh batch to save offline; regenerating invalidates every earlier code.
  function generateRecoveryCodes(s,b){
    owner(s);const a=account(s);
    requireValue(a.password_hash&&a.salt,'Akun kode masuk tidak memakai kode pemulihan.',403);
    requireValue(b.confirmed===true,'Konfirmasi pembuatan kode pemulihan; kode lama akan diganti.');
    return atomic(()=>{
      run('DELETE FROM account_recovery_codes WHERE account_id=?',a.id);
      const codes=[],now=new Date().toISOString();
      while(codes.length<RECOVERY_CODE_COUNT){
        const code=generateCode(),hash=digest(code);
        if(get('SELECT 1 FROM account_recovery_codes WHERE code_hash=?',hash))continue;
        run('INSERT INTO account_recovery_codes(id,account_id,workspace_id,business_id,code_hash,created_at) VALUES(?,?,?,?,?,?)',randomUUID(),a.id,...scope(s),hash,now);
        codes.push(code);
      }
      store.log(...scope(s),`Kode pemulihan akun dibuat ulang: ${RECOVERY_CODE_COUNT} kode sekali pakai. Kode sebelumnya tidak berlaku.`);
      return {codes,remaining:RECOVERY_CODE_COUNT};
    });
  }
  // Public reset: email + one unused code + new password. Consumes the code and ends every old session.
  function recover(body){
    const email=emailOf(body.email);
    requireValue(email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Isi alamat email yang valid.');
    const code=normalizeRecoveryCode(body.code);
    requireValue(validCode(code),'Email atau kode pemulihan tidak sesuai.',401);
    requireValue(typeof body.newPassword==='string'&&body.newPassword.length>=10&&body.newPassword.length<=128,'Kata sandi baru harus 10–128 karakter.');
    return atomic(()=>{
      const target=get('SELECT * FROM accounts WHERE email=?',email);
      const row=target&&get('SELECT * FROM account_recovery_codes WHERE account_id=? AND code_hash=? AND used_at IS NULL',target.id,digest(code));
      requireValue(target&&row,'Email atau kode pemulihan tidak sesuai.',401);
      run('UPDATE account_recovery_codes SET used_at=? WHERE id=?',new Date().toISOString(),row.id);
      const salt=randomBytes(16).toString('hex'),hash=scryptSync(body.newPassword,salt,64).toString('hex');
      run('UPDATE accounts SET password_hash=?,salt=? WHERE id=?',hash,salt,target.id);
      run('DELETE FROM sessions WHERE id IN (SELECT session_id FROM account_sessions WHERE account_id=?)',target.id);
      const s=issue({id:target.id,workspace_id:target.workspace_id,business_id:target.business_id});
      store.withActor(s,()=>store.log(target.workspace_id,target.business_id,'Kata sandi dipulihkan dengan kode pemulihan; seluruh sesi lama dikeluarkan.'));
      return {session:s,remaining:remainingRecoveryCodes(store,target.id)};
    });
  }
  return {generateRecoveryCodes,recover};
}
