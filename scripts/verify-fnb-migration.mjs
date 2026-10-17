import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createStore} from '../server/store.mjs';
const [baseline,target,output]=process.argv.slice(2);
if(!baseline||!target||!output||!existsSync(baseline)||!existsSync(target)||resolve(baseline)===resolve(target)||existsSync(output))throw Error('Gunakan backup, target yang sudah ada dan berbeda, serta laporan baru.');
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
function inspect(file,original){const db=new DatabaseSync(file,{readOnly:true});try{
 const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 return {tables:names.map(name=>{if(!/^[a-z_]+$/.test(name))throw Error('Tabel tidak valid.');const columns=db.prepare(`PRAGMA table_info(${name})`).all().map(r=>r.name),selected=original?.tables.find(t=>t.name===name)?.columns||columns;if(!selected.every(c=>/^[a-z_]+$/.test(c)&&columns.includes(c)))throw Error('Kolom asal hilang.');const rows=db.prepare(`SELECT ${selected.join(',')} FROM ${name}`).all();return {name,columns,comparedColumns:selected,count:rows.length,hash:hash(rows)};}),integrity:db.prepare('PRAGMA quick_check').get().quick_check,foreignKeys:db.prepare('PRAGMA foreign_key_check').all()};
 }finally{db.close();}}
const before=inspect(baseline);if(before.tables.length!==29)throw Error('Baseline harus schema v0.40 (29 tabel).');
const store=createStore(target);store.close();const after=inspect(target,before),addedColumns=after.tables.flatMap(t=>t.columns.filter(c=>!before.tables.find(o=>o.name===t.name)?.columns.includes(c)).map(column=>({table:t.name,column})));
const preserved=before.tables.every(old=>after.tables.some(t=>t.name===old.name&&t.count===old.count&&t.hash===old.hash));
const allowed=new Set(['audit','kitchen_actions'].flatMap(table=>['actor_id','actor_name','actor_role','actor_revision'].map(col=>table+'.'+col)));
const passed=preserved&&after.tables.length===29&&after.integrity==='ok'&&!after.foreignKeys.length&&addedColumns.every(c=>allowed.has(c.table+'.'+c.column));
const report={version:'0.41.0',checkedAt:new Date().toISOString(),baseline,target,originalRowsAndColumnsPreserved:preserved,addedColumns,before,after,passed};writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});if(!passed)throw Error('Verifikasi migrasi gagal; periksa laporan.');console.log('29 tabel, seluruh baris/kolom lama identik; kolom aktor aditif, integritas/relasi OK.');
