import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {unlinkSync} from 'node:fs';
import {createStore} from './fixtures/store.mjs';
import {createService} from './fixtures/service.mjs';
import {createApp} from './fixtures/http.mjs';
const incoming=changes=>({productId:'beras',qty:250,inputUnit:'gram',unitPrice:13,supplier:'Pasar Johor',idempotencyKey:randomUUID(),...changes});
const reason='Jumlah fisik belum diterima sesuai catatan.';

test('personal metric correction preserves reason and original receipt on reopen, with replay that never rewrites audit',()=>{
  const filename=`data/test-stock-cancel-${randomUUID()}.sqlite`;let store=createStore(filename);
  try{
    const s=store.session();let service=createService(store);const body=incoming(),r=service.receive(s,body);
    assert.equal(service.cancelReceipt(s,r.id,{reason:'  '+reason+'  '}).duplicate,false);assert.equal(service.cancelReceipt(s,r.id,{reason}).duplicate,true);assert.equal(service.cancelReceipt(s,r.id).duplicate,true);
    assert.throws(()=>service.cancelReceipt(s,r.id,{reason:'Alasan lain tidak boleh menimpa.'}),e=>e.status===409);
    let row=service.bootstrap(s).stockReceipts.find(x=>x.id===r.id);assert.equal(row.cancel_reason,reason);assert.equal(row.qty,.25);assert.equal(row.input_quantity,2500000);assert.equal(row.input_unit,'gram');assert.equal(row.total,3250);assert.equal(service.bootstrap(s).stock.beras,2.5);
    assert.equal(store.all("SELECT * FROM movements WHERE ref=? AND reason='receipt_reversal'",r.id).length,1);assert.equal(store.all('SELECT * FROM audit WHERE workspace_id=? AND message LIKE ?',s.workspace_id,'%Alasan: '+reason).length,1);
    store.close();store=createStore(filename);service=createService(store);row=service.bootstrap(s).stockReceipts.find(x=>x.id===r.id);assert.equal(row.cancel_reason,reason);assert.ok(row.cancelled_at);assert.equal(service.cancelReceipt(s,r.id,{reason}).duplicate,true);assert.equal(service.receive(s,body).cancelled,true);assert.equal(service.bootstrap(s).stock.beras,2.5);
  }finally{store.close();for(const suffix of ['', '-wal','-shm'])try{unlinkSync(filename+suffix);}catch{}}
});

test('invalid reason, owner scope and reserved or consumed stock reject personal correction atomically',t=>{
  const store=createStore(':memory:');t.after(()=>store.close());const s=store.session(),budi=store.session('budi',s.workspace_id),service=createService(store);const r=service.receive(s,incoming({productId:'telur',qty:30,inputUnit:'butir',unitPrice:1500}));
  for(const bad of ['', 'abc', '     ', 'x'.repeat(241),null,12])assert.throws(()=>service.cancelReceipt(s,r.id,{reason:bad}),e=>e.status===400);
  assert.throws(()=>service.cancelReceipt(budi,r.id,{reason}),e=>e.status===404);
  const offer=service.createOffer(s,{productId:'telur',qty:10,unitPrice:1000,condition:'Ambil hari ini',expiresInHours:6,cycle:1,idempotencyKey:randomUUID()});const transfer=service.requestTransfer(budi,offer.id,{qty:10});
  assert.throws(()=>service.cancelReceipt(s,r.id,{reason}),/terpakai atau dicadangkan/);assert.equal(service.bootstrap(s).stock.telur,38);assert.equal(store.get('SELECT cancel_reason FROM stock_receipts WHERE id=?',r.id).cancel_reason,null);
  service.transferDecision(budi,transfer.id,false);service.transaction(s,{items:[{id:'ayam',qty:9}],catalogRevision:1,idempotencyKey:randomUUID()});assert.equal(service.bootstrap(s).stock.telur,29);
  assert.throws(()=>service.cancelReceipt(s,r.id,{reason}),/terpakai atau dicadangkan/);assert.equal(store.all("SELECT * FROM movements WHERE ref=? AND reason='receipt_reversal'",r.id).length,0);assert.equal(store.get('SELECT cancelled_at FROM stock_receipts WHERE id=?',r.id).cancelled_at,null);
});

test('HTTP reason is scoped and CSRF protected; simultaneous retries create one correction while legacy omission remains supported',async t=>{
  const app=createApp({filename:':memory:',extractor:{status:async()=>({provider:'rules'})}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='',csrf='';
  async function post(path,body={},token=csrf){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',origin:base,cookie},body:JSON.stringify({...body,csrf:token})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();if(data.csrf)csrf=data.csrf;return {status:r.status,data};}
  await post('/api/demo/session',{businessId:'sari'});const r=(await post('/api/stock-receipts',incoming())).data,path=`/api/stock-receipts/${r.id}/cancel`;
  assert.equal((await post(path,{reason},'wrong')).status,403);assert.equal((await post(path,{reason:'x'})).status,400);await post('/api/demo/session',{businessId:'budi'});assert.equal((await post(path,{reason})).status,404);await post('/api/demo/session',{businessId:'sari'});
  const results=await Promise.all([post(path,{reason}),post(path,{reason})]);assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(results.filter(r=>r.data.duplicate).length,1);assert.equal((await post(path,{reason:'Alasan lain tidak boleh menimpa.'})).status,409);
  const state=await(await fetch(base+'/api/bootstrap',{headers:{cookie}})).json();assert.equal(state.stock.beras,2.5);assert.equal(state.stockReceipts[0].cancel_reason,reason);assert.equal((await post(path)).data.duplicate,true);
});
