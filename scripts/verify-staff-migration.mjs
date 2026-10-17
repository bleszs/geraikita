import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createStore} from '../server/store.mjs';
const [baseline,filename,output]=process.argv.slice(2);
if(!baseline||!filename||!output)throw Error('Gunakan: node scripts/verify-staff-migration.mjs backup.sqlite target.sqlite laporan.json');
function inspect(file){const db=new DatabaseSync(file,{readOnly:true});try{
 const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 return {tables:names.map(name=>{if(!/^[a-z_]+$/.test(name))throw Error('Nama tabel tidak valid.');const rows=db.prepare(`SELECT * FROM ${name}`).all().map(r=>JSON.stringify(r)).sort();return {name,count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}),integrity:db.prepare('PRAGMA quick_check').get().quick_check,foreignKeys:db.prepare('PRAGMA foreign_key_check').all()};
}finally{db.close();}}
const before=inspect(baseline);if(before.tables.length!==25)throw Error('Baseline harus v0.35, 25 tabel.');
const store=createStore(filename);store.close();const after=inspect(filename),added=after.tables.filter(t=>!before.tables.some(b=>b.name===t.name));
const preserved=before.tables.every(b=>{const a=after.tables.find(a=>a.name===b.name);return a?.count===b.count&&a.hash===b.hash;});
const db=new DatabaseSync(filename,{readOnly:true});let ownersMatch,staffCount,actionCount;
try{
 ownersMatch=db.prepare("SELECT COUNT(*) AS n FROM accounts a LEFT JOIN account_roles r ON r.account_id=a.id WHERE r.account_id IS NULL OR r.workspace_id<>a.workspace_id OR r.business_id<>a.business_id OR r.role<>'owner' OR r.disabled_at IS NOT NULL").get().n===0;
 ownersMatch&&=db.prepare('SELECT COUNT(*) AS n FROM account_roles').get().n===db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n;
 staffCount=db.prepare("SELECT COUNT(*) AS n FROM account_roles WHERE role<>'owner'").get().n;actionCount=db.prepare('SELECT COUNT(*) AS n FROM staff_actions').get().n;
}finally{db.close();}
const report={version:'0.36.0',checkedAt:new Date().toISOString(),baseline,filename,originalTablesPreserved:preserved,addedTables:added,ownersMatchExistingAccounts:ownersMatch,staffCount,actionCount,integrity:after.integrity,foreignKeys:after.foreignKeys,before,after};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(!preserved||after.integrity!=='ok'||after.foreignKeys.length||added.length!==2||!added.some(x=>x.name==='account_roles')||!added.some(x=>x.name==='staff_actions')||!ownersMatch||staffCount||actionCount)throw Error('Preservasi belum lolos; periksa laporan tanpa memulihkan data otomatis.');
console.log('25 tabel lama identik; akun lama menjadi pemilik, tanpa staf/tindakan baru; integritas dan foreign keys OK.');
