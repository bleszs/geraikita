import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createStore} from '../server/store.mjs';
const [baseline,filename,output]=process.argv.slice(2);
if(!baseline||!filename||!output)throw Error('Gunakan: node scripts/verify-kitchen-migration.mjs backup.sqlite target.sqlite output.json');
function inspect(file){const db=new DatabaseSync(file,{readOnly:true});try{
 const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 return {tables:names.map(name=>{if(!/^[a-z_]+$/.test(name))throw Error('Nama tabel tidak valid.');const rows=db.prepare(`SELECT * FROM ${name}`).all().map(r=>JSON.stringify(r)).sort();return {name,count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}),integrity:db.prepare('PRAGMA quick_check').get().quick_check,foreignKeys:db.prepare('PRAGMA foreign_key_check').all()};
}finally{db.close();}}
const before=inspect(baseline);if(before.tables.length!==20)throw Error('Baseline harus schema v0.33 dengan 20 tabel.');
const store=createStore(filename);store.close();const after=inspect(filename),added=after.tables.filter(t=>!before.tables.some(b=>b.name===t.name));
const preserved=before.tables.every(b=>{const a=after.tables.find(a=>a.name===b.name);return a?.count===b.count&&a.hash===b.hash;});
const result={version:'0.34.0',createdAt:new Date().toISOString(),baseline,filename,originalTablesPreserved:preserved,addedTables:added,integrity:after.integrity,foreignKeys:after.foreignKeys,before,after};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
if(!preserved||after.integrity!=='ok'||after.foreignKeys.length||added.length!==4||added.some(t=>t.count!==0))throw Error('Preservasi migrasi belum lolos. Periksa laporan; data tidak dipulihkan/ditimpa otomatis.');
console.log('Migrasi aditif lulus: 20 tabel asli identik, 4 tabel dapur kosong, integritas dan foreign keys OK.');
