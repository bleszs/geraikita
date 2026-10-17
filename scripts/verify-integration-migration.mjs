import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createStore} from '../server/store.mjs';
const [baseline,target,output]=process.argv.slice(2);
if(!baseline||!target||!output||!existsSync(baseline)||!existsSync(target)||resolve(baseline)===resolve(target))throw Error('Gunakan backup dan database target yang sudah ada dan berbeda, beserta laporan baru.');
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
function inspect(filename,original){const db=new DatabaseSync(filename,{readOnly:true});try{
 const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 const tables=names.map(name=>{
  if(!/^[a-z_]+$/.test(name))throw Error('Nama tabel tidak valid.');
  const columns=db.prepare(`PRAGMA table_info(${name})`).all().map(c=>c.name),selected=original?.tables.find(t=>t.name===name)?.columns||columns;
  if(selected.some(c=>!columns.includes(c)||!/^[a-z_]+$/.test(c)))throw Error('Kolom lama hilang atau tidak valid.');
  const rows=db.prepare(`SELECT ${selected.join(',')} FROM ${name}`).all();
  return {name,columns,comparedColumns:selected,count:rows.length,hash:hash(rows)};
 });
 return {tables,integrity:db.prepare('PRAGMA quick_check').get().quick_check,foreignKeys:db.prepare('PRAGMA foreign_key_check').all()};
}finally{db.close();}}
const before=inspect(baseline);if(![27,28,29].includes(before.tables.length))throw Error('Baseline harus schema v0.36–0.39.');
const store=createStore(target);store.close();const after=inspect(target,before);
const preserved=before.tables.every(old=>after.tables.some(t=>t.name===old.name&&t.count===old.count&&t.hash===old.hash));
const added=after.tables.filter(t=>!before.tables.some(old=>old.name===t.name));
const extraColumns=after.tables.flatMap(t=>t.columns.filter(c=>before.tables.some(old=>old.name===t.name&&!old.columns.includes(c))).map(column=>({table:t.name,column})));
const allowedColumns=new Set(['kitchen_tasks.item_index','kitchen_tasks.usage_json','kitchen_tasks.waste_json','display_access.kind']);
const ok=preserved&&after.tables.length===29&&after.integrity==='ok'&&!after.foreignKeys.length&&added.every(t=>['kitchen_stations','order_requests'].includes(t.name)&&!t.count)&&extraColumns.every(c=>allowedColumns.has(c.table+'.'+c.column));
const report={version:'0.40.0',checkedAt:new Date().toISOString(),baseline,target,originalRowsAndColumnsPreserved:preserved,addedTables:added,addedColumns:extraColumns,before,after,passed:ok};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});if(!ok)throw Error('Migrasi belum lolos. Periksa laporan; tidak ada pemulihan otomatis.');console.log('Kolom dan baris lama tetap identik; schema 29 tabel; integritas dan relasi OK.');
