import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createStore} from '../server/store.mjs';
const [baseline,target,output]=process.argv.slice(2);
if(!baseline||!target||!output||!existsSync(baseline)||!existsSync(target)||resolve(baseline)===resolve(target)||existsSync(output))throw Error('Gunakan backup dan target berbeda yang sudah ada, serta laporan baru.');
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
function inspect(file){const db=new DatabaseSync(file,{readOnly:true});try{
 const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 return {tables:names.map(name=>{if(!/^[a-z_]+$/.test(name))throw Error('Nama tabel belum valid.');const columns=db.prepare(`PRAGMA table_info(${name})`).all().map(r=>r.name),rows=db.prepare(`SELECT * FROM ${name}`).all();return {name,columns,count:rows.length,hash:hash(rows)};}),accountSchema:db.prepare('PRAGMA table_info(accounts)').all().map(({name,type,notnull,pk})=>({name,type,notnull,pk})),integrity:db.prepare('PRAGMA quick_check').get().quick_check,foreignKeys:db.prepare('PRAGMA foreign_key_check').all()};
 }finally{db.close();}}
const before=inspect(baseline);if(before.tables.length!==29)throw Error('Baseline harus versi v0.41 (29 tabel).');
const store=createStore(target);store.close();const after=inspect(target),addedTables=after.tables.filter(t=>!before.tables.some(o=>o.name===t.name));
const preserved=before.tables.every(old=>after.tables.some(t=>t.name===old.name&&t.count===old.count&&t.hash===old.hash&&JSON.stringify(t.columns)===JSON.stringify(old.columns)));
const nullableCredentials=['email','password_hash','salt'].every(c=>after.accountSchema.find(row=>row.name===c)?.notnull===0);
const passed=preserved&&after.tables.length===30&&addedTables.length===1&&addedTables[0].name==='staff_invites'&&addedTables[0].count===0&&nullableCredentials&&after.integrity==='ok'&&!after.foreignKeys.length;
const report={version:'0.42.0',checkedAt:new Date().toISOString(),baseline,target,originalRowsAndColumnsPreserved:preserved,credentialValuesAndSessionsPreserved:preserved,nullableCredentialConstraint:nullableCredentials,addedTables,before,after,passed};writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});if(!passed)throw Error('Migrasi belum lolos; periksa laporan.');console.log('30 tabel; baris/kolom lama, hash kata sandi dan sesi identik; undangan baru kosong; relasi/integritas OK.');
