import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createStore} from '../server/store.mjs';
const [baseline,filename,output]=process.argv.slice(2);
if(!baseline||!filename||!output)throw Error('Gunakan: node scripts/verify-display-migration.mjs backup.sqlite target.sqlite laporan.json');
function inspect(file){const db=new DatabaseSync(file,{readOnly:true});try{
 const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 return {tables:names.map(name=>{if(!/^[a-z_]+$/.test(name))throw Error('Nama tabel tidak valid.');const rows=db.prepare(`SELECT * FROM ${name}`).all().map(r=>JSON.stringify(r)).sort();return {name,count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}),integrity:db.prepare('PRAGMA quick_check').get().quick_check,foreignKeys:db.prepare('PRAGMA foreign_key_check').all()};
}finally{db.close();}}
const before=inspect(baseline);if(before.tables.length!==24)throw Error('Baseline harus v0.34, 24 tabel.');
const store=createStore(filename);store.close();const after=inspect(filename),added=after.tables.filter(t=>!before.tables.some(b=>b.name===t.name));
const preserved=before.tables.every(b=>{const a=after.tables.find(a=>a.name===b.name);return a?.count===b.count&&a.hash===b.hash;});
const report={version:'0.35.0',checkedAt:new Date().toISOString(),baseline,filename,originalTablesPreserved:preserved,addedTables:added,integrity:after.integrity,foreignKeys:after.foreignKeys,before,after};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(!preserved||after.integrity!=='ok'||after.foreignKeys.length||added.length!==1||added[0].name!=='display_access'||added[0].count!==0)throw Error('Preservasi belum lolos; periksa laporan tanpa memulihkan data otomatis.');
console.log('24 tabel lama identik; display_access kosong; integritas dan foreign keys OK.');
