import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {unlinkSync} from 'node:fs';
import {createStore} from './fixtures/store.mjs';
import {createService} from './fixtures/service.mjs';
import {createApp} from './fixtures/http.mjs';

const reason={reason:'Salah mencatat jumlah yang diterima.'};
function plan(store){const s=store.session(),service=createService(store),b=store.session('budi',s.workspace_id),r=store.session('rina',s.workspace_id),d=store.session('dewi',s.workspace_id);service.demand(s,{qty:22,active:true});const transfer=service.requestTransfer(s,service.bootstrap(s).offers[0].id,{qty:10});service.transferDecision(d,transfer.id,true);const version=service.group(s).version;for(const owner of[s,b,r])service.approval(owner,{version,decision:'accepted'});const order=service.finalizeCollective(s,{cycle:1,version});return{store,service,s,b,r,d,version,order};}
function fixture(t){const store=createStore(':memory:');t.after(()=>store.close());return plan(store);}
const receipt=(service,s,order,qty,key=randomUUID())=>service.receiveCollective(s,order.id,{qty,idempotencyKey:key});

test('collective reversal is LIFO, preserves original amounts and reasons, and charges shipping once among active batches',t=>{
 const{service,s,store,order}=fixture(t);const first=receipt(service,s,order,5),key=randomUUID(),last=receipt(service,s,order,7,key);
 store.run('UPDATE stock_receipts SET created_at=? WHERE collective_order_id=?','2026-10-15T00:00:00Z',order.id);
 assert.throws(()=>service.cancelCollectiveReceipt(s,order.id,first.id,reason),/batch paling akhir/);
 assert.equal(service.group(s).receiptHistory[0].id,last.id);assert.equal(service.group(s).receiptHistory[1].canCancel,false);
 service.cancelCollectiveReceipt(s,order.id,last.id,reason);assert.equal(service.bootstrap(s).stock.telur,23);assert.equal(service.group(s).own.receivedCost,7800);assert.equal(service.group(s).own.remaining,7);
 assert.equal(service.cancelCollectiveReceipt(s,order.id,last.id,reason).duplicate,true);assert.throws(()=>service.cancelCollectiveReceipt(s,order.id,last.id,{reason:'Alasan pengganti tidak boleh menulis ulang.'}),/alasan lain/);
 assert.equal(receipt(service,s,order,7,key).cancelled,true);assert.equal(service.bootstrap(s).stock.telur,23);
 service.cancelCollectiveReceipt(s,order.id,first.id,reason);assert.equal(service.bootstrap(s).stock.telur,18);assert.equal(service.group(s).own.receivedCost,0);
 const replacement=receipt(service,s,order,12);assert.equal(replacement.shipping,1800);assert.equal(replacement.total,16200);const ledger=service.group(s).receiptHistory;assert.equal(ledger.length,3);assert.equal(ledger.filter(r=>r.cancelled_at).length,2);assert.equal(ledger.find(r=>r.id===first.id).shipping,1800);assert.equal(ledger.find(r=>r.id===last.id).total,8400);
});

test('reversing a completed current cycle reopens receiving; advance waits for replacement and old-cycle correction is rejected',t=>{
 const{service,s,b,r,order,version}=fixture(t);const a=receipt(service,s,order,12);receipt(service,b,order,18);receipt(service,r,order,10);assert.equal(service.group(s).cycle.canAdvance,true);
 service.cancelCollectiveReceipt(s,order.id,a.id,reason);let g=service.group(s);assert.equal(g.version,version);assert.equal(g.purchase.status,'receiving');assert.equal(g.cycle.canAdvance,false);assert.equal(g.own.remaining,12);assert.equal(g.participants.find(p=>p.businessId==='budi').receivedFromSupplier,18);assert.throws(()=>service.nextCycle(s,{cycle:1,version}),/harus diterima/);
 const replacement=receipt(service,s,order,12);assert.equal(replacement.total,16200);assert.equal(service.group(s).purchase.status,'completed');service.nextCycle(s,{cycle:1,version});assert.throws(()=>service.cancelCollectiveReceipt(s,order.id,replacement.id,reason),/Siklus berikutnya/);assert.equal(service.cancelCollectiveReceipt(s,order.id,a.id,reason).duplicate,true);assert.equal(service.bootstrap(s).stock.telur,30);
});

test('reason and ownership are mandatory; insufficient stock leaves receipt, costs and movements unchanged',t=>{
 const{service,s,b,d,store,order}=fixture(t);receipt(service,s,order,5);const last=receipt(service,s,order,7);
 for(const invalid of [{},{reason:''},{reason:'x'.repeat(241)},{reason:123}])assert.throws(()=>service.cancelCollectiveReceipt(s,order.id,last.id,invalid),/alasan pembatalan/);
 assert.throws(()=>service.cancelCollectiveReceipt(b,order.id,last.id,reason),/milikmu/);assert.throws(()=>service.cancelCollectiveReceipt(d,order.id,last.id,reason),/tidak ikut/);assert.throws(()=>service.cancelCollectiveReceipt(store.session(),order.id,last.id,reason),/tidak ditemukan/);
 const m=service.saveMenu(s,null,{name:'Telur uji',aliases:[],price:1000,recipe:{telur:1},catalogRevision:1});service.transaction(s,{items:[{id:m.id,qty:24}],catalogRevision:m.catalogRevision,idempotencyKey:randomUUID()});assert.equal(service.bootstrap(s).stock.telur,6);
 const before=service.bootstrap(s);assert.throws(()=>service.cancelCollectiveReceipt(s,order.id,last.id,reason),/Saldo tersedia/);const after=service.bootstrap(s);assert.equal(after.stock.telur,6);assert.deepEqual(after.movements,before.movements);assert.equal(after.group.own.receivedCost,16200);assert.equal(after.group.receiptHistory[0].cancelled_at,null);assert.equal(after.group.receiptHistory[0].canCancel,false);
});

test('a plan with only cancelled batches can be cancelled and approved again without reviving old receipts',t=>{
 const{service,s,b,r,order,store}=fixture(t);const key=randomUUID(),first=receipt(service,s,order,5,key);service.cancelCollectiveReceipt(s,order.id,first.id,reason);service.cancelCollective(s,order.id);assert.equal(service.group(s).frozen,false);assert.equal(service.bootstrap(s).collectiveHistory[0].status,'cancelled');assert.equal(service.bootstrap(s).collectiveHistory[0].receivedCost,0);
 service.demand(s,{qty:22,active:true});const version=service.group(s).version;for(const owner of[s,b,r])service.approval(owner,{version,decision:'accepted'});const replacement=service.finalizeCollective(s,{cycle:1,version});assert.notEqual(replacement.id,order.id);assert.equal(receipt(service,s,order,5,key).cancelled,true);assert.equal(service.bootstrap(s).stock.telur,18);assert.equal(receipt(service,s,replacement,12).shipping,1800);assert.equal(store.get('SELECT cancel_reason FROM stock_receipts WHERE id=?',first.id).cancel_reason,reason.reason);
});

test('additive migration and reopen retain cancellation reason, original fee, restored stock and replay result',()=>{
 const filename=`data/test-correction-${randomUUID()}.sqlite`;let store=createStore(filename);
 try{let f=plan(store);const key=randomUUID(),first=receipt(f.service,f.s,f.order,5,key);store.db.exec('ALTER TABLE stock_receipts DROP COLUMN cancel_reason');store.close();store=createStore(filename);let service=createService(store);assert.equal(service.bootstrap(f.s).stock.telur,23);assert.equal(service.group(f.s).receiptHistory[0].total,7800);service.cancelCollectiveReceipt(f.s,f.order.id,first.id,reason);store.close();store=createStore(filename);service=createService(store);const state=service.bootstrap(f.s);assert.equal(state.stock.telur,18);assert.equal(state.group.own.receivedCost,0);assert.equal(state.group.receiptHistory[0].cancel_reason,reason.reason);assert.equal(state.group.receiptHistory[0].shipping,1800);assert.equal(receipt(service,f.s,f.order,5,key).cancelled,true);}
 finally{store.close();for(const suffix of['','-wal','-shm'])try{unlinkSync(filename+suffix);}catch{}}
});

test('HTTP cancellation enforces CSRF and owner, and concurrent cancellation versus advance has one valid outcome',async t=>{
 const app=createApp({filename:':memory:',extractor:{status:async()=>({provider:'rules',available:false})}});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>app.close());const f=plan(app.store),{service,s,b,r,order,version}=f;const a=receipt(service,s,order,12);receipt(service,b,order,18);receipt(service,r,order,10);
 const base='http://127.0.0.1:'+app.server.address().port;const route='/api/collective-orders/'+order.id+'/receipts/'+a.id+'/cancel';const post=(path,body,session=s)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{cookie:'gerai_session='+session.id}:{})},body:JSON.stringify({...body,csrf:session?.csrf})});
 assert.equal((await post(route,reason,null)).status,401);assert.equal((await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',cookie:'gerai_session='+s.id},body:JSON.stringify({...reason,csrf:'wrong'})})).status,403);assert.equal((await post(route,reason,b)).status,404);
 const results=await Promise.all([post(route,reason),post('/api/collective-cycles/next',{cycle:1,version})]);const statuses=results.map(r=>r.status);assert.equal(statuses.filter(s=>s===200).length,1);assert.equal(statuses.filter(s=>s===409).length,1);
 if(results[0].status===200){assert.equal(service.bootstrap(s).stock.telur,18);assert.equal(service.group(s).purchase.status,'receiving');const retries=await Promise.all([post(route,reason),post(route,reason)]);assert.ok(retries.every(r=>r.status===200));assert.equal(service.bootstrap(s).stock.telur,18);}else{assert.equal(service.group(s).cycle.id,2);assert.equal(service.bootstrap(s).stock.telur,30);}
 assert.ok(app.store.get("SELECT COUNT(*) AS n FROM movements WHERE reason='collective_receipt_reversal'").n<=1);
});
