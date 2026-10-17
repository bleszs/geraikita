import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createStore} from './fixtures/store.mjs';
import {createService} from '../server/service.mjs';
const fresh=t=>{const store=createStore(':memory:');t.after(()=>store.close());const s=store.session(),svc=createService(store);return {store,s,svc};};
function configure(svc,s,id='ayam',minutes=10,station='dapur',passiveMinutes=3){const state=svc.bootstrap(s),m=state.menu.find(m=>m.id===id);svc.saveMenu(s,id,{...m,catalogRevision:state.catalogRevision,preparation:{minutes,station,passiveMinutes}});}
function enter(svc,s,label='Meja 2',id='ayam',qty=1){return svc.kitchen.create(s,{label,channel:'dine_in',items:[{id,qty}],catalogRevision:svc.bootstrap(s).catalogRevision,idempotencyKey:randomUUID()});}
function step(svc,s,id,action,taskId,extra={}){const o=svc.kitchen.snapshot(s).orders.find(o=>o.id===id);return svc.kitchen.change(s,id,{action,taskId,revision:o.revision,idempotencyKey:randomUUID(),...extra});}
test('kitchen reserves stock, blocks old sales, completes exactly once from immutable recipes',t=>{
 const {s,svc}=fresh(t);configure(svc,s);const before=svc.bootstrap(s),m=before.menu.find(m=>m.id==='ayam'),o=enter(svc,s,'Meja 2','ayam',2);let state=svc.bootstrap(s);
 for(const [p,q] of Object.entries(m.recipe)){assert.equal(state.stock[p],before.stock[p]);assert.ok(Math.abs(state.availableStock[p]-(before.availableStock[p]-q*2))<1e-8);}
 assert.equal(state.transactions.length,before.transactions.length);
 const beforeCapacity=Math.min(...Object.entries(m.recipe).map(([p,q])=>Math.floor(before.availableStock[p]/q)));
 assert.throws(()=>svc.transaction(s,{items:[{id:'ayam',qty:beforeCapacity}],catalogRevision:state.catalogRevision,idempotencyKey:randomUUID()}));
 const task=state.kitchen.orders.find(x=>x.id===o.id).tasks[0];step(svc,s,o.id,'start',task.id);
 const changed=svc.bootstrap(s);svc.saveMenu(s,'ayam',{...m,recipe:Object.fromEntries(Object.entries(m.recipe).map(([p,q])=>[p,q*2])),catalogRevision:changed.catalogRevision});
 step(svc,s,o.id,'ready',task.id);const ready=svc.kitchen.snapshot(s).orders.find(x=>x.id===o.id),body={action:'complete',revision:ready.revision,idempotencyKey:randomUUID()};
 const result=svc.kitchen.change(s,o.id,body);assert.equal(result.status,'completed');assert.equal(svc.kitchen.change(s,o.id,body).duplicate,true);
 state=svc.bootstrap(s);assert.equal(state.transactions.length,before.transactions.length+1);
 for(const [p,q] of Object.entries(m.recipe))assert.ok(Math.abs(state.stock[p]-(before.stock[p]-q*2))<1e-8);
 assert.throws(()=>svc.cancelSale(s,result.saleId),/dapur/);
});
test('SJF per station, passive handoff and concurrent revisions enforce legal transitions',t=>{
 const {s,svc}=fresh(t);configure(svc,s,'ayam',12);configure(svc,s,'nasi',5,'dapur',1);
 const slow=enter(svc,s,'Meja 1'),fast=enter(svc,s,'Meja 2','nasi'),state=svc.kitchen.snapshot(s),a=state.orders.find(o=>o.id===slow.id).tasks[0],b=state.orders.find(o=>o.id===fast.id).tasks[0];
 assert.throws(()=>step(svc,s,slow.id,'start',a.id),/diprioritaskan/);step(svc,s,fast.id,'start',b.id);
 assert.throws(()=>step(svc,s,slow.id,'start',a.id),/Stasiun/);step(svc,s,fast.id,'passive',b.id);step(svc,s,slow.id,'start',a.id);
 assert.throws(()=>svc.kitchen.change(s,slow.id,{action:'ready',taskId:a.id,revision:1,idempotencyKey:randomUUID()}),/berubah/);
 assert.throws(()=>step(svc,s,fast.id,'resume',b.id),/Stasiun/);
});
test('queued cancellation releases reserves; started cancellation requires explicit waste and no revenue',t=>{
 const {s,svc}=fresh(t);configure(svc,s);const before=svc.bootstrap(s),one=enter(svc,s);step(svc,s,one.id,'cancel');assert.deepEqual(svc.bootstrap(s).availableStock,before.availableStock);
 const two=enter(svc,s),task=svc.kitchen.snapshot(s).orders.find(o=>o.id===two.id).tasks[0];step(svc,s,two.id,'start',task.id);
 assert.throws(()=>step(svc,s,two.id,'cancel'),/sudah dikerjakan/);assert.throws(()=>step(svc,s,two.id,'discard'),/Konfirmasi/);step(svc,s,two.id,'discard',null,{confirmed:true});
 const after=svc.bootstrap(s);assert.equal(after.transactions.length,before.transactions.length);assert.ok(after.movements.some(m=>m.reason==='kitchen_waste'));
});
test('orders and action keys are scoped and immutable; voice rejects ambiguity, negation, stale revisions',t=>{
 const {s,svc,store}=fresh(t);configure(svc,s);const data={label:'Meja 2',channel:'takeaway',items:[{id:'ayam',qty:1}],catalogRevision:svc.bootstrap(s).catalogRevision,idempotencyKey:randomUUID()},o=svc.kitchen.create(s,data);
 assert.equal(svc.kitchen.create(s,data).duplicate,true);assert.throws(()=>svc.kitchen.create(s,{...data,label:'Lain'}),/Kunci/);
 const other=store.session('budi',s.workspace_id);assert.equal(svc.kitchen.snapshot(other).orders.length,0);assert.throws(()=>step(svc,other,o.id,'cancel'));
 const name=svc.bootstrap(s).menu.find(m=>m.id==='ayam').name;
 assert.throws(()=>svc.kitchen.command(s,{text:'jangan siap '+name+' meja dua',revisions:{[o.id]:1}}),/negasi/);
 const command=svc.kitchen.command(s,{text:'mulai '+name+' meja dua',revisions:{[o.id]:1}});assert.equal(command.id,o.id);assert.equal(command.action,'start');
 assert.equal(svc.kitchen.snapshot(s).orders[0].status,'queued');
 svc.kitchen.change(s,o.id,{...command,idempotencyKey:randomUUID()});assert.throws(()=>svc.kitchen.command(s,{text:'siap '+name+' meja dua',revisions:{[o.id]:1}}),/berubah/);
 enter(svc,s);assert.throws(()=>svc.kitchen.command(s,{text:'siap '+name+' meja dua',revisions:{}}),/tepat satu/);
});
test('new catalog settings validate and no settings or kitchen history are fabricated',t=>{
 const {s,svc}=fresh(t);assert.equal(svc.kitchen.snapshot(s).settings.length,0);assert.throws(()=>enter(svc,s),/Atur waktu/);
 assert.throws(()=>configure(svc,s,'ayam',2,'dapur',3),/waktu total/);configure(svc,s);assert.equal(svc.kitchen.snapshot(s).orders.length,0);
});
test('aging prevents starvation and separate stations can work simultaneously',t=>{
 const {s,svc,store}=fresh(t);configure(svc,s,'ayam',20);configure(svc,s,'nasi',3,'dapur',0);configure(svc,s,'teh',2,'minuman',0);
 const older=enter(svc,s,'Meja lama'),short=enter(svc,s,'Meja baru','nasi'),drink=enter(svc,s,'Minuman','teh');
 store.run('UPDATE kitchen_orders SET created_at=? WHERE id=? AND workspace_id=? AND business_id=?',new Date(Date.now()-16*60000).toISOString(),older.id,s.workspace_id,s.business_id);
 const state=svc.kitchen.snapshot(s),task=id=>state.orders.find(o=>o.id===id).tasks[0];assert.equal(state.next.find(n=>n.station==='dapur').taskId,task(older.id).id);
 step(svc,s,older.id,'start',task(older.id).id);step(svc,s,drink.id,'start',task(drink.id).id);assert.throws(()=>step(svc,s,short.id,'start',task(short.id).id),/Stasiun/);
});
test('recipe availability closes intake when reservation exhausts one ingredient and reopens on cancellation',t=>{
 const {s,svc}=fresh(t);configure(svc,s,'teh',2,'minuman',0);const state=svc.bootstrap(s),menu=state.menu.find(m=>m.id==='teh'),capacity=svc.kitchen.snapshot(s).menus.find(m=>m.id==='teh').portions;
 assert.ok(capacity>0&&capacity<=99);const o=enter(svc,s,'Minuman','teh',capacity);const reserved=svc.bootstrap(s);
 assert.deepEqual(reserved.stock,state.stock);assert.equal(reserved.kitchen.menus.find(m=>m.id==='teh').portions,0);assert.throws(()=>enter(svc,s,'Tidak cukup','teh'),/tidak cukup/);
 assert.throws(()=>svc.transaction(s,{items:[{id:'teh',qty:1}],catalogRevision:reserved.catalogRevision,idempotencyKey:randomUUID()}),/tidak cukup/);
 step(svc,s,o.id,'cancel');assert.equal(svc.kitchen.snapshot(s).menus.find(m=>m.id==='teh').portions,capacity);assert.ok(Object.keys(menu.recipe).length>0);
});
