import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createStore} from './fixtures/store.mjs';
import {createService} from '../server/service.mjs';
import {createDisplayAccess} from '../server/display-access.mjs';
import {createApp} from '../server/http.mjs';
function fixture(t){
 const store=createStore(':memory:');t.after(()=>store.close());const s=store.session(),svc=createService(store),links=createDisplayAccess(store);
 for(const [id,minutes,station] of [['ayam',10,'dapur'],['teh',2,'minuman']]){const state=svc.bootstrap(s),m=state.menu.find(m=>m.id===id);svc.saveMenu(s,id,{...m,catalogRevision:state.catalogRevision,preparation:{minutes,station,passiveMinutes:0}});}
 const token=randomBytes(32).toString('hex');links.create(s,{kind:'catalog',label:'Katalog meja',durationHours:8,token,idempotencyKey:randomUUID(),confirmed:true});
 return {store,s,svc,links,token,access:links.resolve('Bearer '+token,'catalog')};
}
const ask=(svc,access,items,extra={})=>svc.requests.submit(access,{label:'Meja 9',items,idempotencyKey:randomUUID(),...extra});
test('catalog link is separate from status display and projects only configured menus with boolean availability',t=>{
 const {store,s,svc,links,token,access}=fixture(t);
 assert.throws(()=>links.resolve('Bearer '+token),/berakhir/);assert.equal(links.list(s)[0].kind,'catalog');
 const display=randomBytes(32).toString('hex');links.create(s,{label:'TV',durationHours:1,token:display,idempotencyKey:randomUUID(),confirmed:true});assert.throws(()=>links.resolve('Bearer '+display,'catalog'),/Katalog/);
 const data=svc.requests.catalog(access);assert.deepEqual(data.menus.map(m=>m.id).sort(),['ayam','teh']);
 for(const m of data.menus)assert.deepEqual(Object.keys(m).sort(),['available','id','name','price']);
 assert.equal(JSON.stringify(data).includes('portions'),false);assert.equal(JSON.stringify(data).includes('telur'),false);
 store.run("UPDATE inventory SET quantity=0 WHERE workspace_id=? AND business_id=? AND product_id='telur'",s.workspace_id,s.business_id);
 assert.equal(svc.requests.catalog(access).menus.find(m=>m.id==='ayam').available,false);assert.equal(svc.requests.catalog(access).menus.find(m=>m.id==='teh').available,true);
 assert.throws(()=>ask(svc,access,[{id:'ayam',qty:1}]),/habis/);assert.throws(()=>ask(svc,access,[{id:'nasi',qty:1}]),/tidak tersedia/);
});
test('requests stay pending without reserving stock; accepting creates one web kitchen order and status shows its code',t=>{
 const {s,svc,access}=fixture(t),before=svc.bootstrap(s),key=randomUUID(),body={label:'Meja 9',note:'Tanpa es',items:[{id:'teh',qty:2},{id:'ayam',qty:1}],idempotencyKey:key};
 const r=svc.requests.submit(access,body);assert.equal(svc.requests.submit(access,body).duplicate,true);assert.throws(()=>svc.requests.submit(access,{...body,label:'Lain'}),/isi berbeda/);
 assert.deepEqual(svc.bootstrap(s).availableStock,before.availableStock);
 const pending=svc.kitchen.snapshot(s).requests;assert.equal(pending.length,1);assert.equal(pending[0].total,2*8000+18000);
 assert.equal(svc.requests.status(access,r.id).status,'pending');
 const accepted=svc.requests.decide(s,r.id,{decision:'accept'});assert.equal(svc.requests.decide(s,r.id,{decision:'accept'}).duplicate,true);assert.throws(()=>svc.requests.decide(s,r.id,{decision:'reject'}),/sudah diterima/);
 const order=svc.kitchen.snapshot(s).orders.find(o=>o.id===accepted.orderId);assert.equal(order.channel,'web');assert.equal(order.label,'Meja 9');assert.equal(order.items[0].note,'Tanpa es');
 assert.equal(svc.kitchen.snapshot(s).orders.length,1);assert.equal(svc.kitchen.snapshot(s).requests.length,0);
 const status=svc.requests.status(access,r.id);assert.equal(status.status,'accepted');assert.equal(status.code,accepted.orderId.slice(0,8).toUpperCase());
 assert.ok(svc.bootstrap(s).availableStock.gula<before.availableStock.gula);
});
test('reject records a reason; expiry, price changes, stock shortage and scope are enforced atomically',t=>{
 const {store,s,svc,access}=fixture(t);
 const a=ask(svc,access,[{id:'teh',qty:1}]);svc.requests.decide(s,a.id,{decision:'reject',reason:'Dapur tutup'});assert.deepEqual([svc.requests.status(access,a.id).status,svc.requests.status(access,a.id).reason],['rejected','Dapur tutup']);
 const b=ask(svc,access,[{id:'teh',qty:1}]);store.run('UPDATE order_requests SET created_ms=? WHERE id=?',Date.now()-31*60000,b.id);
 assert.equal(svc.requests.status(access,b.id).status,'expired');assert.throws(()=>svc.requests.decide(s,b.id,{decision:'accept'}),/kedaluwarsa/);
 const c=ask(svc,access,[{id:'teh',qty:1}]),state=svc.bootstrap(s),tea=state.menu.find(m=>m.id==='teh');svc.saveMenu(s,'teh',{...tea,price:9000,catalogRevision:state.catalogRevision});
 assert.throws(()=>svc.requests.decide(s,c.id,{decision:'accept'}),/Harga menu berubah/);assert.equal(svc.requests.status(access,c.id).status,'pending');
 const d=ask(svc,access,[{id:'ayam',qty:1}]);store.run("UPDATE inventory SET quantity=0 WHERE workspace_id=? AND business_id=? AND product_id='telur'",s.workspace_id,s.business_id);
 assert.throws(()=>svc.requests.decide(s,d.id,{decision:'accept'}),/tidak cukup/);assert.equal(svc.requests.status(access,d.id).status,'pending');assert.equal(svc.kitchen.snapshot(s).orders.length,0);
 assert.throws(()=>svc.requests.decide(store.session('budi',s.workspace_id),d.id,{decision:'reject'}),/tidak ditemukan/);
});
test('per-link rate limit and pending cap',t=>{
 const {store,svc,access}=fixture(t);
 for(let i=0;i<10;i++)ask(svc,access,[{id:'teh',qty:1}]);assert.throws(()=>ask(svc,access,[{id:'teh',qty:1}]),/Terlalu banyak/);
 store.run('UPDATE order_requests SET created_ms=created_ms-120000');for(let i=0;i<10;i++)ask(svc,access,[{id:'teh',qty:1}]);
 store.run('UPDATE order_requests SET created_ms=created_ms-120000');assert.throws(()=>ask(svc,access,[{id:'teh',qty:1}]),/menunggu konfirmasi/);
 for(const bad of [{label:''},{items:[]},{items:[{id:'teh',qty:21}]},{items:[{id:'teh',qty:1},{id:'teh',qty:1}]},{note:'x'.repeat(201)}])assert.throws(()=>ask(svc,access,[{id:'teh',qty:1}],bad));
});
test('HTTP: public catalog uses only its bearer token; cashier decides; kitchen cannot',async t=>{
 const app=createApp({filename:':memory:',extractor:{status:async()=>({provider:'rules'})},transcriber:{status:async()=>({available:false})}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 async function auth(path,body){const r=await fetch(base+'/api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok(r.ok);return {data:await r.json(),cookie:r.headers.get('set-cookie').split(';')[0]};}
 const post=(who,path,body={})=>fetch(base+'/api'+path,{method:'POST',headers:{cookie:who.cookie,'Content-Type':'application/json'},body:JSON.stringify({...body,csrf:who.data.csrf})});
 const owner=await auth('register',{email:randomUUID()+'@example.test',password:'OwnerTesting2026!',businessName:'Usaha katalog',communityName:'Kelompok'});
 const staff=role=>({email:randomUUID()+'@example.test',password:'StaffTesting2026!',name:'Staf '+role,role,confirmed:true,idempotencyKey:randomUUID()});
 const cb=staff('cashier'),kb=staff('kitchen');for(const b of [cb,kb])assert.equal((await post(owner,'/staff',b)).status,201);const cashier=await auth('login',cb),kitchen=await auth('login',kb);
 const s=app.store.get('SELECT * FROM sessions WHERE csrf=?',owner.data.csrf),svc=app.service;
 const p=svc.saveIngredient(s,null,{name:'Bahan rahasia',unit:'gram',min:0,storageNote:'',catalogRevision:1});svc.receive(s,{productId:p.id,qty:20,unitPrice:1,supplier:'',idempotencyKey:randomUUID()});
 const m=svc.saveMenu(s,null,{name:'Roti katalog',price:6000,aliases:[],recipe:{[p.id]:10},catalogRevision:2,preparation:{minutes:4,passiveMinutes:0,station:'oven'}});
 const token=randomBytes(32).toString('hex'),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 assert.equal((await post(cashier,'/displays',{kind:'catalog',label:'Katalog',durationHours:1,token,idempotencyKey:randomUUID(),confirmed:true})).status,403);
 assert.equal((await post(owner,'/displays',{kind:'catalog',label:'Katalog',durationHours:1,token,idempotencyKey:randomUUID(),confirmed:true})).status,201);
 assert.equal((await fetch(base+'/api/catalog/snapshot')).status,401);assert.equal((await fetch(base+'/api/display/snapshot',{headers})).status,401);
 const snap=await(await fetch(base+'/api/catalog/snapshot',{headers})).json();assert.deepEqual(snap.menus,[{id:m.id,name:'Roti katalog',price:6000,available:true}]);assert.equal(JSON.stringify(snap).includes('Bahan rahasia'),false);
 assert.equal((await fetch(base+'/api/catalog/snapshot',{method:'POST',headers})).status,405);
 assert.equal((await fetch(base+'/api/catalog/requests',{method:'POST',headers:{...headers,Origin:'http://evil.test'},body:'{}'})).status,403);
 const made=await fetch(base+'/api/catalog/requests',{method:'POST',headers,body:JSON.stringify({label:'Meja 3',items:[{id:m.id,qty:2}],idempotencyKey:randomUUID()})});assert.equal(made.status,201);const {id}=await made.json();
 assert.equal((await(await fetch(base+'/api/catalog/requests/'+id,{headers})).json()).status,'pending');
 const k=await(await fetch(base+'/api/bootstrap',{headers:{cookie:kitchen.cookie}})).json(),c=await(await fetch(base+'/api/bootstrap',{headers:{cookie:cashier.cookie}})).json();
 assert.equal(k.kitchen.requests.length,0);assert.equal(c.kitchen.requests[0].total,12000);
 assert.equal((await post(kitchen,`/order-requests/${id}/decision`,{decision:'accept'})).status,403);
 assert.equal((await post(cashier,`/order-requests/${id}/decision`,{decision:'accept'})).status,200);
 const done=await(await fetch(base+'/api/catalog/requests/'+id,{headers})).json();assert.equal(done.status,'accepted');assert.match(done.code,/^[A-F0-9]{8}$/);
 const after=await(await fetch(base+'/api/catalog/snapshot',{headers})).json();assert.equal(after.menus[0].available,false);
 const screen=await fetch(base+'/api/catalog/screen');assert.equal(screen.status,200);assert.equal(screen.headers.get('referrer-policy'),'no-referrer');
});
