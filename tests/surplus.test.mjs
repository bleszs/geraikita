import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { createStore } from './fixtures/store.mjs';
import { createService } from './fixtures/service.mjs';
import { createApp } from './fixtures/http.mjs';

const offer = (changes={}) => ({productId:'telur',qty:6,unitPrice:1000,condition:'Utuh, disimpan dalam wadah kering.',expiresInHours:6,cycle:1,idempotencyKey:randomUUID(),...changes});
function setup(t) {const store=createStore(':memory:');t.after(()=>store.close());const s=store.session();return {store,s,service:createService(store),other:id=>store.session(id,s.workspace_id)};}

test('offer creation is scoped, replay safe, bounded and validates stock, canonical material, price, condition and expiry',t=>{
  const {service,s,other}=setup(t),b=other('budi');const body=offer();const first=service.createOffer(s,body);
  assert.equal(service.createOffer(s,body).id,first.id);assert.equal(service.createOffer(s,body).duplicate,true);
  assert.throws(()=>service.createOffer(s,{...body,unitPrice:2000}),/rincian berbeda/);
  assert.equal(service.bootstrap(s).stock.telur,8);assert.equal(service.bootstrap(s).availableStock.telur,8);
  assert.equal(service.bootstrap(b).offers.find(o=>o.id===first.id).idempotencyKey,undefined);
  assert.throws(()=>service.withdrawOffer(b,first.id),/milikmu/);
  assert.throws(()=>service.createOffer(s,offer({qty:9})),/Stok tersedia/);
  for(const changes of [{qty:.5},{unitPrice:-1},{unitPrice:1.5},{condition:'bagus'},{condition:'x'.repeat(241)},{expiresInHours:0},{expiresInHours:25},{expiresInHours:1.5},{productId:'beras'}])assert.throws(()=>service.createOffer(s,offer(changes)));
  for(let i=0;i<9;i++)service.createOffer(s,offer({qty:1}));
  assert.throws(()=>service.createOffer(s,offer({qty:1})),/Maksimal 10/);
  assert.equal(service.createOffer(s,body).duplicate,true);
  assert.equal(service.withdrawOffer(s,first.id).duplicate,false);assert.equal(service.withdrawOffer(s,first.id).duplicate,true);
  assert.equal(service.bootstrap(s).offers.find(o=>o.id===first.id).available,0);
  assert.throws(()=>service.requestTransfer(b,first.id,{qty:1}),/ditarik/);
  const d=other('dewi'),one=service.createOffer(d,offer({qty:10})),two=service.createOffer(d,offer({qty:10}));
  service.requestTransfer(b,one.id,{qty:10});assert.throws(()=>service.requestTransfer(b,two.id,{qty:9}),/Perbarui kebutuhan/);
});

test('multiple offers share reservations, allow partial requests and preserve completed costs after withdrawal',t=>{
  const {service,s,other}=setup(t),d=other('dewi'),b=other('budi'),r=other('rina');
  const a=service.createOffer(d,offer({qty:25})),c=service.createOffer(d,offer({qty:25,unitPrice:1500}));
  const first=service.requestTransfer(s,a.id,{qty:25});
  assert.throws(()=>service.requestTransfer(s,a.id,{qty:1}),/menunggu pemilik/);
  assert.throws(()=>service.requestTransfer(b,c.id,{qty:6}),/tawaran lain/);
  const second=service.requestTransfer(b,c.id,{qty:5});assert.equal(service.bootstrap(d).availableStock.telur,0);
  assert.equal(service.bootstrap(r).offers.find(o=>o.id===c.id).available,0);
  assert.throws(()=>service.withdrawOffer(d,a.id),/permintaan yang menunggu/);
  assert.throws(()=>service.transaction(d,{items:[{id:'ayam',qty:1}],catalogRevision:1,idempotencyKey:randomUUID()}),/tidak cukup/);
  service.transferDecision(d,first.id,true);assert.equal(service.bootstrap(d).stock.telur,5);
  service.transferDecision(d,second.id,true);assert.equal(service.bootstrap(d).stock.telur,0);assert.equal(service.bootstrap(s).stock.telur,33);
  service.demand(s,{qty:25,active:true});const cost=service.group(s).own.cost;
  service.withdrawOffer(d,a.id);service.withdrawOffer(d,c.id);assert.equal(service.group(s).own.cost,cost);assert.equal(service.group(s).own.surplus,25);
  assert.equal(service.bootstrap(d).offers.find(o=>o.id===c.id).completedQty,5);
});

test('offer expiry releases reservations but refuses approval; frozen plans and new cycles reject obsolete offers',t=>{
  const {service,s,store,other}=setup(t),d=other('dewi'),b=other('budi'),r=other('rina');
  const body=offer({qty:10}),a=service.createOffer(d,body);const transfer=service.requestTransfer(s,a.id,{qty:3});
  store.run('UPDATE offers SET expires_at=? WHERE id=?',Date.now()-1,a.id);
  assert.equal(service.bootstrap(d).availableStock.telur,30);assert.equal(service.bootstrap(s).offers.find(o=>o.id===a.id).available,0);
  assert.throws(()=>service.transferDecision(d,transfer.id,true),/kedaluwarsa/);assert.throws(()=>service.withdrawOffer(d,a.id),/permintaan yang menunggu/);
  service.transferDecision(s,transfer.id,false);service.withdrawOffer(d,a.id);
  service.demand(s,{qty:22,active:true});let group=service.group(s);
  for(const member of [s,b,r])service.approval(member,{version:group.version,decision:'accepted'});
  const plan=service.finalizeCollective(s,{cycle:1,version:group.version});assert.throws(()=>service.createOffer(d,offer()),/siklus berikutnya/);
  assert.equal(service.createOffer(d,body).id,a.id);service.cancelCollective(s,plan.id);
  store.run('UPDATE workspaces SET quote_expires=? WHERE id=?',Date.now()-1,s.workspace_id);
  assert.throws(()=>service.requestTransfer(s,service.bootstrap(d).offers.find(o=>!o.idempotencyKey).id,{qty:1}),/Siklus kulakan kedaluwarsa/);
  group=service.group(s);service.nextCycle(s,{cycle:1,version:group.version});
  assert.throws(()=>service.requestTransfer(s,service.bootstrap(d).offers.find(o=>!o.idempotencyKey).id,{qty:1}),/siklus sebelumnya/);
  assert.throws(()=>service.createOffer(d,offer()),/Siklus berubah/);
  assert.throws(()=>service.createOffer(d,offer({cycle:2})),/kedaluwarsa/);
  assert.equal(service.createOffer(d,body).duplicate,true);
});

test('offer migrations and persistent withdrawal preserve old transfer stock and immutable price across reopen',()=>{
  const filename=`data/test-surplus-${randomUUID()}.sqlite`;let store=createStore(filename);
  try {
    const s=store.session(),d=store.session('dewi',s.workspace_id);let service=createService(store);const seed=service.bootstrap(s).offers[0];
    const transfer=service.requestTransfer(s,seed.id,{qty:10});service.transferDecision(d,transfer.id,true);
    store.db.exec('DROP INDEX offers_idem');for(const column of ['cycle','created_at','cancelled_at','idem','fingerprint'])store.db.exec('ALTER TABLE offers DROP COLUMN '+column);
    store.close();store=createStore(filename);service=createService(store);
    assert.equal(service.bootstrap(s).stock.telur,18);assert.equal(service.bootstrap(s).offers[0].unitPrice,1000);assert.equal(service.bootstrap(s).offers[0].completedQty,10);
    const body=offer({qty:8}),a=service.createOffer(d,body);service.withdrawOffer(d,a.id);store.close();store=createStore(filename);service=createService(store);
    assert.equal(service.createOffer(d,body).id,a.id);assert.ok(service.bootstrap(d).offers.find(o=>o.id===a.id).cancelledAt);assert.equal(service.bootstrap(d).stock.telur,20);
  }finally{store.close();for(const suffix of ['','-wal','-shm'])try{unlinkSync(filename+suffix);}catch{}}
});

test('HTTP create and withdraw require cookie/CSRF/owner; simultaneous creation retry stores one offer',async t=>{
  const app=createApp({filename:':memory:',extractor:{status:async()=>({provider:'rules',available:false})}});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>app.close());
  const url='http://127.0.0.1:'+app.server.address().port;
  const post=(route,body,cookie)=>fetch(url+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
  assert.equal((await post('offers',offer())).status,401);
  let response=await post('demo/session',{});let cookie=response.headers.get('set-cookie').split(';')[0],state=await response.json();const body=offer({csrf:state.csrf,ownerId:'dewi'});
  assert.equal((await post('offers',{...body,csrf:'wrong'},cookie)).status,403);
  const results=await Promise.all([post('offers',body,cookie),post('offers',body,cookie)]);for(const r of results)assert.equal(r.status,201);const created=await Promise.all(results.map(r=>r.json()));assert.equal(created[0].id,created[1].id);
  response=await fetch(url+'/api/bootstrap',{headers:{cookie}});state=await response.json();assert.equal(state.offers.find(o=>o.id===created[0].id).ownerId,'sari');
  response=await post('demo/session',{businessId:'budi',csrf:state.csrf},cookie);cookie=response.headers.get('set-cookie').split(';')[0];state=await response.json();assert.equal((await post('offers/'+created[0].id+'/withdraw',{csrf:state.csrf},cookie)).status,404);
  response=await post('demo/session',{businessId:'sari',csrf:state.csrf},cookie);cookie=response.headers.get('set-cookie').split(';')[0];state=await response.json();assert.equal((await post('offers/'+created[0].id+'/withdraw',{csrf:state.csrf},cookie)).status,200);
});
