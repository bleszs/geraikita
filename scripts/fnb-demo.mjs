// Opt-in synthetic F&B presentation only; never imported by the live server.
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {buildPresentationDemo,DEMO_ACCOUNT} from './presentation-demo.mjs';
import {createStore} from '../server/store.mjs';
import {createService} from '../server/service.mjs';
import {createIdentity} from '../server/identity.mjs';
import {staffPrefix,staffBootstrap} from '../server/roles.mjs';
import {dayAt,units} from '../server/common.mjs';

export const FNB_DEMO_ACCOUNTS=Object.freeze({owner:DEMO_ACCOUNT,cashier:{email:'kasir.demo@geraikita.test',password:'KasirDemo2026!',name:'[DEMO] Kasir Sari'},kitchen:{email:'dapur.demo@geraikita.test',password:'DapurDemo2026!',name:'[DEMO] Dapur Sari'}});
export const fnbDemoDirectory=()=>path.resolve('data/demo/fnb-'+dayAt());
const key=s=>staffPrefix(s)+randomUUID();
export function inspectFnbDemo(store,owner){
 assert.equal(store.get('PRAGMA integrity_check').integrity_check,'ok');assert.deepEqual(store.all('PRAGMA foreign_key_check'),[]);
 assert.equal(store.get('SELECT COUNT(*) AS n FROM accounts').n,3);
 for(const row of store.all('SELECT * FROM inventory')){
  const ledger=store.get('SELECT COALESCE(SUM(delta),0) AS qty FROM movements WHERE workspace_id=? AND business_id=? AND product_id=?',row.workspace_id,row.business_id,row.product_id).qty;assert.equal(row.quantity,ledger);
 }
 for(const row of store.all('SELECT * FROM daily_usage WHERE workspace_id=? AND business_id=?',owner.workspace_id,owner.business_id)){
  const sales=store.all('SELECT usage_snapshot FROM sales WHERE workspace_id=? AND business_id=? AND date=? AND cancelled_at IS NULL',owner.workspace_id,owner.business_id,row.date);
  const used=sales.reduce((sum,sale)=>sum+units(JSON.parse(sale.usage_snapshot)[row.product_id]||0),0);
  const waste=store.all("SELECT delta,created_at FROM movements WHERE workspace_id=? AND business_id=? AND product_id=? AND reason='kitchen_waste'",owner.workspace_id,owner.business_id,row.product_id).filter(m=>dayAt(Date.parse(m.created_at))===row.date).reduce((sum,m)=>sum-m.delta,0);
  assert.equal(row.quantity,used+waste);
 }
 const state=createService(store).bootstrap(owner),statuses=[...new Set(state.kitchen.menus.map(m=>m.status))].sort();
 return {accounts:3,roles:store.all('SELECT role,COUNT(*) AS count FROM account_roles GROUP BY role'),ingredients:state.catalog.length,menus:state.menu.length,activeOrders:state.kitchen.orders.filter(o=>!['completed','cancelled','discarded'].includes(o.status)).length,menuStatuses:statuses,ledgerConsistent:true,foreignKeysValid:true,trainingAllowed:false};
}
export function buildFnbDemo(directory){
 const folder=path.resolve(directory),manifestFile=path.join(folder,'fnb-account.json');
 if(existsSync(manifestFile)||existsSync(path.join(folder,'history')))throw Error('Folder demo F&B sudah dipakai. Data yang ada tidak ditimpa.');
 const base=buildPresentationDemo(path.join(folder,'history')),store=createStore(base.filename),identity=createIdentity(store),service=createService(store);
 try{
  const owner=identity.login(FNB_DEMO_ACCOUNTS.owner);
  for(const role of ['cashier','kitchen'])identity.createStaff(owner,{...FNB_DEMO_ACCOUNTS[role],role,confirmed:true,idempotencyKey:randomUUID()});
  const cashier=identity.login(FNB_DEMO_ACCOUNTS.cashier),kitchen=identity.login(FNB_DEMO_ACCOUNTS.kitchen),sessions=[owner,cashier,kitchen];
  const revision=()=>store.get('SELECT catalog_revision FROM business_state WHERE workspace_id=? AND business_id=?',owner.workspace_id,owner.business_id).catalog_revision;
  const prep={'Nasi ayam':[6,2,'kompor'],'Nasi telur':[4,1,'kompor'],'Ayam krispi':[8,4,'penggorengan'],'Kopi susu':[2,0,'bar'],'Telur dadar':[3,0,'kompor'],'Kopi hitam':[2,0,'bar']};
  for(const m of store.menus(owner)){const [minutes,passiveMinutes,station]=prep[m.name];service.saveMenu(owner,m.id,{...m,catalogRevision:revision(),preparation:{minutes,passiveMinutes,station}});}
  service.kitchen.saveStation(owner,{station:'kompor',cooks:2,equipment:1,revision:0});
  const syrup=service.saveIngredient(owner,null,{name:'[SIMULASI] Sirup',unit:'liter',min:.2,storageNote:'Contoh bahan belum diterima; saldo awal nol.',catalogRevision:revision()});
  service.saveMenu(owner,null,{name:'[DEMO] Es sirup',price:9000,aliases:[],recipe:{[syrup.id]:.05},catalogRevision:revision(),preparation:{minutes:1,passiveMinutes:0,station:'bar'}});
  const menus=store.menus(owner),item=(name,qty=1)=>({id:menus.find(m=>m.name===name).id,qty,note:'SIMULASI presentasi F&B'});
  const create=(label,items)=>service.kitchen.create(cashier,{label:'[DEMO] '+label,channel:'dine_in',items,catalogRevision:revision(),idempotencyKey:key(cashier)});
  const advance=(s,o,action,taskId,extra={})=>{const current=service.kitchen.snapshot(s).orders.find(x=>x.id===o.id);return service.kitchen.change(s,o.id,{action,taskId,revision:current.revision,idempotencyKey:key(s),...extra});};
  const task=(o,name)=>service.kitchen.snapshot(owner).orders.find(x=>x.id===o.id).tasks.find(t=>t.name===name);
  const ready=create('Bungkus 02',[item('Kopi susu')]);advance(kitchen,ready,'start',task(ready,'Kopi susu').id);advance(kitchen,ready,'ready',task(ready,'Kopi susu').id);
  const passive=create('Meja 03',[item('Ayam krispi')]);advance(kitchen,passive,'start',task(passive,'Ayam krispi').id);advance(kitchen,passive,'passive',task(passive,'Ayam krispi').id);
  const wasted=create('Item terbuang',[item('Nasi ayam',2),item('Kopi hitam')]);advance(kitchen,wasted,'start',task(wasted,'Nasi ayam').id);
  const recipe=menus.find(m=>m.name==='Nasi ayam').recipe;advance(owner,wasted,'void',task(wasted,'Nasi ayam').id,{confirmed:true,wasted:recipe});
  create('Meja 01',[item('Nasi telur'),item('Kopi hitam')]);
  // One completed service illustrates cashier handover and actor attribution.
  const done=create('Sudah diserahkan',[item('Telur dadar')]);advance(kitchen,done,'start',task(done,'Telur dadar').id);advance(kitchen,done,'ready',task(done,'Telur dadar').id);advance(cashier,done,'complete');
  const c=staffBootstrap(store,service,cashier,identity.details(cashier));assert.equal(JSON.stringify(c).includes('portions'),false);
  const counts=inspectFnbDemo(store,owner);assert.deepEqual(counts.menuStatuses,['low','ok','out']);
  service.bootstrap(owner).recommendations.forEach(r=>assert.notEqual(r.trainedModel?.status,'active'));
  store.log(owner.workspace_id,owner.business_id,'SIMULASI F&B: akun pemilik/kasir/dapur, antrean dan status menu hanya untuk presentasi.');
  sessions.forEach(s=>store.run('DELETE FROM sessions WHERE id=?',s.id));
  const manifest={kind:'user-requested-synthetic-fnb-demo-v1',asOf:dayAt(),createdAt:new Date().toISOString(),filename:base.filename,accounts:FNB_DEMO_ACCOUNTS,owner:base.owner,counts,trainingAllowed:false,fieldAccuracyClaim:false,productionDataTouched:false,note:'Data simulasi terpisah; history/account.json adalah manifest seed awal satu pemilik, fnb-account.json adalah manifest akhir tiga peran. Tidak dipakai untuk pelatihan atau evaluasi lapangan.'};
  writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});return manifest;
 }finally{store.close();}
}
export function prepareFnbDemo(directory=fnbDemoDirectory()){
 const folder=path.resolve(directory),file=path.join(folder,'fnb-account.json');if(!existsSync(file))return buildFnbDemo(folder);
 const manifest=JSON.parse(readFileSync(file,'utf8'));assert.equal(manifest.kind,'user-requested-synthetic-fnb-demo-v1');assert.equal(path.resolve(manifest.filename),path.join(folder,'history','gerai-kita-demo.sqlite'));assert(existsSync(manifest.filename),'Database demo hilang; tidak dibuat ulang otomatis.');
 const store=createStore(manifest.filename);try{const identity=createIdentity(store);for(const account of Object.values(manifest.accounts)){const s=identity.login(account);store.run('DELETE FROM sessions WHERE id=?',s.id);}assert.equal(store.get('SELECT COUNT(*) AS n FROM accounts').n,3);}finally{store.close();}return manifest;
}
