import {DatabaseSync} from 'node:sqlite';
import {statSync} from 'node:fs';
import {dayAt,addDays,quantity} from '../server/common.mjs';
import {backtest} from '../server/forecast.mjs';

// Read-only: inspecting readiness never creates accounts or business records.
export function liveReport(filename){
  if(!statSync(filename).isFile())throw new Error('Database belum tersedia. Jalankan aplikasi terlebih dahulu.');
  const db=new DatabaseSync(filename,{readOnly:true});
  try{
    const tables=['workspaces','accounts','businesses','ingredients','menus','inventory','sales','daily_usage','stock_receipts','offers','transfers','collective_orders'];
    const counts=Object.fromEntries(tables.map(t=>[t,db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n]));
    const series=db.prepare('SELECT d.workspace_id,d.business_id,d.product_id,i.unit,MIN(d.date) AS first FROM daily_usage d JOIN ingredients i ON i.workspace_id=d.workspace_id AND i.business_id=d.business_id AND i.id=d.product_id WHERE d.date<? GROUP BY d.workspace_id,d.business_id,d.product_id,i.unit').all(dayAt());
    let eligible=0,insufficient=0;const totals={};
    for(const entry of series){
      const rows=db.prepare('SELECT date,quantity FROM daily_usage WHERE workspace_id=? AND business_id=? AND product_id=? AND date<? ORDER BY date').all(entry.workspace_id,entry.business_id,entry.product_id,dayAt());
      const points=new Map(rows.map(r=>[r.date,quantity(r.quantity)])),history=[];
      for(let date=entry.first;date<dayAt();date=addDays(date,1))history.push({date,qty:points.get(date)||0});
      if(history.length<15){insufficient++;continue;}eligible++;
      const unitTotals=totals[entry.unit]??={};
      for(const [method,m] of Object.entries(backtest(history))){const a=unitTotals[method]??={absoluteError:0,actual:0,observations:0};a.absoluteError+=m.mae*m.observations;a.actual+=history.slice(14).reduce((s,p)=>s+p.qty,0);a.observations+=m.observations;}
    }
    const metrics=Object.fromEntries(Object.entries(totals).map(([unit,methods])=>[unit,Object.fromEntries(Object.entries(methods).map(([name,m])=>[name,{mae:m.observations?m.absoluteError/m.observations:null,wape:m.actual?m.absoluteError/m.actual:null,observations:m.observations}]))]));
    return {checkedAt:new Date().toISOString(),source:filename,readOnly:true,mode:'live',counts,forecast:{status:eligible?'evaluated':'insufficient_data',eligibleSeries:eligible,insufficientSeries:insufficient,metrics,method:'Rolling one-day validation, minimum 14 earlier completed days; gaps since first actual usage count as zero; current day excluded.'},extraction:{status:'not_evaluated',reason:'Belum ada dataset berlabel yang diberikan pengguna; tidak membuat nilai akurasi.'},nextSteps:!counts.accounts?['Daftarkan akun usaha sendiri.','Isi katalog, resep, penerimaan, dan penawaran pemasok dari data sebenarnya.']:['Lanjutkan pencatatan dari transaksi dan penerimaan sebenarnya.'],scope:'Jumlah catatan dan validasi histori tersimpan; tidak menguji kebenaran data lapangan dan tidak mengubah database.'};
  }finally{db.close();}
}
