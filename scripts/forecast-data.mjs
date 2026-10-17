import {DatabaseSync} from 'node:sqlite';
import {statSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {addDays,dayAt,quantity} from '../server/common.mjs';
import {ensure,validDate,validateDataset} from '../server/ml/forecast-model.mjs';

export function readJson(filename){ensure(statSync(filename).size<=5000000,'File terlalu besar (maksimal 5 MB).');return JSON.parse(readFileSync(filename,'utf8'));}
export function writeNewJson(filename,data){mkdirSync(path.dirname(path.resolve(filename)),{recursive:true});writeFileSync(filename,JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
export function listSources(filename){statSync(filename);const db=new DatabaseSync(filename,{readOnly:true});try{return db.prepare('SELECT i.workspace_id AS workspaceId,i.business_id AS businessId,i.id AS productId,i.unit,i.name AS product,b.name AS business,w.name AS community,MIN(d.date) AS firstRecorded,MAX(d.date) AS lastRecorded,COUNT(d.date) AS recordedDates FROM ingredients i JOIN businesses b ON b.workspace_id=i.workspace_id AND b.id=i.business_id JOIN workspaces w ON w.id=i.workspace_id LEFT JOIN daily_usage d ON d.workspace_id=i.workspace_id AND d.business_id=i.business_id AND d.product_id=i.id GROUP BY i.workspace_id,i.business_id,i.id ORDER BY b.name,i.name').all();}finally{db.close();}}
export function importCsv(filename,metadata){
  ensure(statSync(filename).size<=5000000,'CSV terlalu besar (maksimal 5 MB).');
  const lines=readFileSync(filename,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);ensure(lines.shift()==='date,quantity','Header CSV harus date,quantity; tanpa pemisah ribuan atau kolom tambahan.');
  const observations=lines.filter(s=>s.trim()).map((line,i)=>{const cells=line.split(',');ensure(cells.length===2 && /^\d+(\.\d{1,4})?$/.test(cells[1]),`Format jumlah CSV baris ${i+2} tidak valid.`);return {date:cells[0],quantity:Number(cells[1])};});
  return validateDataset({...metadata,observations});
}
export function exportDatabase({filename,workspaceId,businessId,productId,from,to,reference,confirmed}){
  ensure(confirmed===true,'Konfirmasi izin dan kelengkapan pencatatan periode dengan --confirm-records.');
  ensure(validDate(from) && validDate(to) && from<=to && to<dayAt(),'Isi tanggal awal/akhir yang valid sebelum hari berjalan.');
  ensure(typeof reference==='string' && reference.trim().length>=5,'Isi referensi izin/sumber dengan --reference.');
  statSync(filename);const db=new DatabaseSync(filename,{readOnly:true});
  try{
    const ingredient=db.prepare('SELECT unit FROM ingredients WHERE workspace_id=? AND business_id=? AND id=?').get(workspaceId,businessId,productId);ensure(ingredient,'Bahan tidak ditemukan pada usaha dan kelompok yang dipilih.');
    const first=db.prepare('SELECT MIN(date) AS date FROM daily_usage WHERE workspace_id=? AND business_id=? AND product_id=?').get(workspaceId,businessId,productId).date;
    ensure(first && from>=first,'Tidak ada histori untuk periode ini, atau tanggal awal mendahului catatan pertama. Tidak membuat histori pengganti.');
    const rows=db.prepare('SELECT date,quantity FROM daily_usage WHERE workspace_id=? AND business_id=? AND product_id=? AND date>=? AND date<=? ORDER BY date').all(workspaceId,businessId,productId,from,to),points=new Map(rows.map(r=>[r.date,quantity(r.quantity)])),observations=[];
    for(let date=from;date<=to;date=addDays(date,1)){ensure(observations.length<3660,'Periode maksimal 3660 hari.');observations.push({date,quantity:points.get(date)||0});}
    return validateDataset({schemaVersion:1,scope:{workspaceId,businessId,productId,unit:ingredient.unit},provenance:{source:'user_records',reference:reference.trim(),permissionConfirmed:true,completeDailyRecords:true,exportedAt:new Date().toISOString(),missingDatePolicy:'Zero only inside the user-confirmed complete recording period; no earlier history generated.'},observations});
  }finally{db.close();}
}
