import {randomUUID,createHash} from 'node:crypto';
import {requireValue,units,quantity,dayAt} from './common.mjs';
import {usage} from '../public/catalog.js';

export function migrateKitchen(db){
  db.exec(`CREATE TABLE IF NOT EXISTS kitchen_menus(workspace_id TEXT NOT NULL,business_id TEXT NOT NULL,menu_id TEXT NOT NULL,minutes INTEGER NOT NULL,station TEXT NOT NULL,passive_minutes INTEGER NOT NULL,PRIMARY KEY(workspace_id,business_id,menu_id));
    CREATE TABLE IF NOT EXISTS kitchen_orders(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,business_id TEXT NOT NULL,idem TEXT NOT NULL,fingerprint TEXT NOT NULL,label TEXT NOT NULL,channel TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,items TEXT NOT NULL,usage_json TEXT NOT NULL,total INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,sale_id TEXT,UNIQUE(workspace_id,business_id,idem));
    CREATE TABLE IF NOT EXISTS kitchen_tasks(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,business_id TEXT NOT NULL,order_id TEXT NOT NULL,menu_id TEXT NOT NULL,name TEXT NOT NULL,qty INTEGER NOT NULL,note TEXT NOT NULL,station TEXT NOT NULL,minutes INTEGER NOT NULL,passive_minutes INTEGER NOT NULL,status TEXT NOT NULL,phase_started_at TEXT,FOREIGN KEY(order_id) REFERENCES kitchen_orders(id));
    CREATE TABLE IF NOT EXISTS kitchen_actions(workspace_id TEXT NOT NULL,business_id TEXT NOT NULL,idem TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(workspace_id,business_id,idem));
    CREATE INDEX IF NOT EXISTS kitchen_scope ON kitchen_orders(workspace_id,business_id,status);`);
}
const scope=s=>[s.workspace_id,s.business_id];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function kitchenReserved(store,s,product){
  return store.all("SELECT usage_json FROM kitchen_orders WHERE workspace_id=? AND business_id=? AND status NOT IN ('completed','cancelled','discarded')",...scope(s)).reduce((sum,r)=>sum+(JSON.parse(r.usage_json)[product]||0),0);
}
export function createKitchen(store,{available,stockChanged}){
  const {get,all,run,atomic,log,movement}=store;
  const order=(s,id)=>{const r=get('SELECT * FROM kitchen_orders WHERE workspace_id=? AND business_id=? AND id=?',...scope(s),id);requireValue(r,'Pesanan dapur tidak ditemukan.',404);return r;};
  function snapshot(s){
    const settings=all('SELECT menu_id AS menuId,minutes,station,passive_minutes AS passiveMinutes FROM kitchen_menus WHERE workspace_id=? AND business_id=?',...scope(s));
    const rows=all('SELECT * FROM kitchen_orders WHERE workspace_id=? AND business_id=? ORDER BY created_at DESC,rowid DESC',...scope(s));
    const tasks=all('SELECT * FROM kitchen_tasks WHERE workspace_id=? AND business_id=?',...scope(s));
    const waiting=tasks.filter(t=>t.status==='queued');
    waiting.sort((a,b)=>{
      const age=t=>Date.now()-Date.parse(rows.find(o=>o.id===t.order_id).created_at);
      const overdueA=age(a)>=900000,overdueB=age(b)>=900000;
      return Number(overdueB)-Number(overdueA)||(overdueA&&overdueB?age(b)-age(a):a.minutes*a.qty-b.minutes*b.qty)||a.id.localeCompare(b.id);
    });
    const stations=[...new Set(tasks.filter(t=>!['completed','cancelled','discarded'].includes(rows.find(o=>o.id===t.order_id).status)).map(t=>t.station))];
    const next=stations.map(station=>({station,taskId:tasks.some(t=>t.station===station&&t.status==='active')?null:waiting.find(t=>t.station===station)?.id||null}));
    const menus=store.menus(s).map(m=>({id:m.id,name:m.name,configured:settings.some(x=>x.menuId===m.id),portions:Math.max(0,Math.min(...Object.entries(m.recipe).map(([p,q])=>Math.floor(available(s,p)/units(q)))))}));
    const orders=rows.map(o=>({...o,items:JSON.parse(o.items),usage:JSON.parse(o.usage_json),tasks:tasks.filter(t=>t.order_id===o.id)}));
    return {settings,orders,next,menus,recentActions:all('SELECT idem FROM kitchen_actions WHERE workspace_id=? AND business_id=? ORDER BY rowid DESC',...scope(s)).map(x=>x.idem),revision:hash([rows.map(o=>[o.id,o.revision]),menus,settings,next])};
  }
  function create(s,b){
    requireValue(typeof b.idempotencyKey==='string'&&b.idempotencyKey.length>=8&&b.idempotencyKey.length<=100,'Kunci pesanan tidak valid.');
    requireValue(typeof b.label==='string'&&b.label.trim().length>=1&&b.label.trim().length<=60,'Isi nomor meja atau nama pesanan, maksimal 60 karakter.');
    requireValue(['dine_in','takeaway','web','external_manual'].includes(b.channel),'Pilih sumber pesanan.');
    requireValue(Array.isArray(b.items)&&b.items.length>0&&b.items.length<=20,'Isi 1–20 item pesanan.');
    requireValue(b.items.every(i=>i&&typeof i.id==='string'&&Number.isInteger(i.qty)&&i.qty>=1&&i.qty<=99&&(!i.note||typeof i.note==='string'&&i.note.length<=500)),'Item pesanan tidak valid.');
    const fingerprint=hash([b.label.trim(),b.channel,b.items,b.catalogRevision]);
    return atomic(()=>{
      const previous=get('SELECT id,fingerprint FROM kitchen_orders WHERE workspace_id=? AND business_id=? AND idem=?',...scope(s),b.idempotencyKey);
      if(previous){requireValue(previous.fingerprint===fingerprint,'Kunci pesanan sudah dipakai untuk rincian berbeda.',409);return {id:previous.id,duplicate:true};}
      requireValue(get('SELECT catalog_revision FROM business_state WHERE workspace_id=? AND business_id=?',...scope(s)).catalog_revision===b.catalogRevision,'Katalog berubah. Perbarui dan tinjau kembali pesanan.',409);
      const menus=store.menus(s),settings=snapshot(s).settings;
      const items=b.items.map(i=>{const m=menus.find(m=>m.id===i.id),p=settings.find(p=>p.menuId===i.id);requireValue(m&&p,'Atur waktu dan stasiun setiap menu di Produk & stok terlebih dahulu.',409);return {...i,note:i.note||'',name:m.name,unitPrice:m.price,preparation:p};});
      const used=usage(items,menus);
      for(const [p,q] of Object.entries(used))requireValue(available(s,p)>=units(q),'Bahan tidak cukup atau sedang dicadangkan untuk pesanan/surplus lain.',409);
      const id=randomUUID(),now=new Date().toISOString(),total=items.reduce((v,i)=>v+i.unitPrice*i.qty,0);
      run('INSERT INTO kitchen_orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)',id,...scope(s),b.idempotencyKey,fingerprint,b.label.trim(),b.channel,'queued',1,JSON.stringify(items),JSON.stringify(Object.fromEntries(Object.entries(used).map(([p,q])=>[p,units(q)]))),total,now,now);
      for(const i of items)run('INSERT INTO kitchen_tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?,NULL)',randomUUID(),...scope(s),id,i.id,i.name,i.qty,i.note,i.preparation.station,i.preparation.minutes,i.preparation.passiveMinutes,'queued');
      stockChanged(s);log(...scope(s),`Pesanan dapur ${b.label.trim()} masuk; bahan dicadangkan, belum menjadi penjualan.`);
      return {id,duplicate:false};
    });
  }
  function change(s,id,b){
    requireValue(typeof b.idempotencyKey==='string'&&b.idempotencyKey.length>=8&&b.idempotencyKey.length<=100,'Kunci tindakan tidak valid.');
    requireValue(Number.isInteger(b.revision),'Versi pesanan tidak valid.');
    requireValue(['start','passive','resume','ready','complete','cancel','discard'].includes(b.action),'Tindakan dapur tidak valid.');
    const fingerprint=hash([id,b.action,b.taskId||null,b.revision,b.confirmed===true]);
    return atomic(()=>{
      const prev=get('SELECT * FROM kitchen_actions WHERE workspace_id=? AND business_id=? AND idem=?',...scope(s),b.idempotencyKey);
      if(prev){requireValue(prev.fingerprint===fingerprint,'Kunci tindakan dipakai untuk tindakan berbeda.',409);return {...JSON.parse(prev.result),duplicate:true};}
      const o=order(s,id);requireValue(o.revision===b.revision,'Pesanan berubah di perangkat lain. Perbarui data dan periksa statusnya.',409);
      requireValue(!['completed','cancelled','discarded'].includes(o.status),'Pesanan sudah ditutup.',409);
      const tasks=all('SELECT * FROM kitchen_tasks WHERE workspace_id=? AND business_id=? AND order_id=?',...scope(s),id),now=new Date().toISOString();
      let status=o.status,saleId=null;
      if(['complete','cancel','discard'].includes(b.action)){
        if(b.action==='cancel'){requireValue(tasks.every(t=>t.status==='queued'),'Pesanan sudah dikerjakan. Gunakan penutupan bahan terpakai, bukan pengembalian stok.',409);status='cancelled';}
        else {
          if(b.action==='complete')requireValue(tasks.every(t=>t.status==='ready'),'Selesaikan semua item sebelum menyerahkan pesanan.',409);
          else requireValue(b.confirmed===true&&tasks.some(t=>t.status!=='queued'),'Konfirmasi bahwa seluruh bahan pesanan akan dicatat terpakai tanpa penjualan.',409);
          status=b.action==='complete'?'completed':'discarded';saleId=status==='completed'?randomUUID():null;
          const used=JSON.parse(o.usage_json),date=dayAt();
          for(const [p,q] of Object.entries(used)){
            requireValue(get('SELECT quantity FROM inventory WHERE workspace_id=? AND business_id=? AND product_id=?',...scope(s),p)?.quantity>=q,'Saldo stok tidak cukup. Periksa ledger.',409);
            run('UPDATE inventory SET quantity=quantity-? WHERE workspace_id=? AND business_id=? AND product_id=?',q,...scope(s),p);
            run('INSERT INTO daily_usage VALUES(?,?,?,?,?) ON CONFLICT(workspace_id,business_id,product_id,date) DO UPDATE SET quantity=quantity+excluded.quantity',...scope(s),p,date,q);
            movement(...scope(s),p,-quantity(q),status==='completed'?'sale':'kitchen_waste',saleId||id);
          }
          if(saleId)run('INSERT INTO sales(id,workspace_id,business_id,idem,fingerprint,items,total,date,created_at,cancelled_at,usage_snapshot) VALUES(?,?,?,?,?,?,?,?,?,NULL,?)',saleId,...scope(s),'kitchen:'+id,o.fingerprint,o.items,o.total,date,now,JSON.stringify(Object.fromEntries(Object.entries(used).map(([p,q])=>[p,quantity(q)]))));
        }
      }else{
        const t=tasks.find(t=>t.id===b.taskId);requireValue(t,'Item dapur tidak ditemukan.',404);
        const target={start:'active',passive:'passive',resume:'active',ready:'ready'}[b.action];
        requireValue(({start:['queued'],passive:['active'],resume:['passive'],ready:['active','passive']})[b.action].includes(t.status),'Tahap item sudah berubah atau tindakan tidak sesuai.',409);
        if(target==='active')requireValue(!all("SELECT id FROM kitchen_tasks WHERE workspace_id=? AND business_id=? AND station=? AND status='active'",...scope(s),t.station).length,'Stasiun masih mengerjakan item aktif. Tandai pasif atau siap terlebih dahulu.',409);
        if(b.action==='start')requireValue(snapshot(s).next.find(n=>n.station===t.station)?.taskId===t.id,'Ada item yang lebih dahulu diprioritaskan pada stasiun ini.',409);
        if(target==='passive')requireValue(t.passive_minutes>0,'Menu ini tidak mempunyai tahap pasif. Atur untuk pesanan berikutnya.',409);
        run('UPDATE kitchen_tasks SET status=?,phase_started_at=? WHERE workspace_id=? AND business_id=? AND id=?',target,now,...scope(s),t.id);
        status=tasks.every(x=>x.id===t.id?target==='ready':x.status==='ready')?'ready':'preparing';
      }
      run('UPDATE kitchen_orders SET status=?,revision=revision+1,updated_at=?,sale_id=? WHERE workspace_id=? AND business_id=? AND id=?',status,now,saleId,...scope(s),id);
      if(['cancelled','completed','discarded'].includes(status)){run('UPDATE kitchen_tasks SET status=? WHERE workspace_id=? AND business_id=? AND order_id=?',status,...scope(s),id);stockChanged(s);}
      log(...scope(s),`Dapur ${o.label}: ${b.action}; versi ${o.revision+1}.`);
      const result={id,status,revision:o.revision+1,saleId};
      run('INSERT INTO kitchen_actions VALUES(?,?,?,?,?)',...scope(s),b.idempotencyKey,fingerprint,JSON.stringify(result));return result;
    });
  }
  function command(s,b){
    requireValue(typeof b.text==='string'&&b.text.length>0&&b.text.length<=300,'Isi perintah maksimal 300 karakter.');
    const text=b.text.normalize('NFKC').toLowerCase().trim();
    requireValue(!/\b(jangan|bukan|batal|hapus|kecuali|belum|tidak)\b/.test(text),'Perintah negasi/pembatalan perlu diperiksa lewat tombol.',409);
    const match=text.match(/^(mulai|pasif|lanjutkan|siap|selesai)\s+(.+)$/);requireValue(match,'Gunakan: mulai/pasif/lanjutkan/siap diikuti nama menu dan label pesanan.',409);
    const state=snapshot(s),action={mulai:'start',pasif:'passive',lanjutkan:'resume',siap:'ready',selesai:'ready'}[match[1]];
    const normalize=v=>v.normalize('NFKC').toLowerCase().trim().replace(/\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\b/g,w=>({satu:'1',dua:'2',tiga:'3',empat:'4',lima:'5',enam:'6',tujuh:'7',delapan:'8',sembilan:'9',sepuluh:'10'})[w]).replace(/\s+/g,' ');
    const candidates=state.orders.filter(o=>!['completed','cancelled','discarded'].includes(o.status)).flatMap(o=>o.tasks.filter(t=>normalize(match[2])===normalize(t.name+' '+o.label)).map(t=>({o,t})));
    requireValue(candidates.length===1,'Perintah belum cocok dengan tepat satu item. Sebut nama menu dan label pesanan lengkap.',409);
    const {o,t}=candidates[0];requireValue(b.revisions?.[o.id]===o.revision,'Pesanan berubah sejak perintah dimulai. Perbarui dan ucapkan kembali.',409);
    return {id:o.id,action,taskId:t.id,revision:o.revision,label:o.label,menu:t.name};
  }
  return {snapshot,create,change,command};
}
