import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { createStore } from './fixtures/store.mjs';
import { createService } from './fixtures/service.mjs';
import { createApp } from './fixtures/http.mjs';

function fixture(t) { const store=createStore(':memory:');t.after(()=>store.close());const s=store.session();return {store,s,service:createService(store)}; }
const payload = changes => ({productId:'beras',qty:250,inputUnit:'gram',unitPrice:13,supplier:'Pasar',idempotencyKey:randomUUID(),...changes});

test('metric receipts preserve input cost and canonical stock through recipes and reversal in both directions',t=>{
  const {store,s,service}=fixture(t),before=service.bootstrap(s);
  const receipt=service.receive(s,payload());let state=service.bootstrap(s),r=state.stockReceipts.find(r=>r.id===receipt.id);
  assert.equal(state.stock.beras,before.stock.beras+.25);assert.equal(r.qty,.25);assert.equal(r.unit_price,13000);assert.equal(r.total,3250);assert.equal(r.input_quantity,2500000);assert.equal(r.input_unit,'gram');assert.equal(r.input_unit_price,13);
  const sale=service.transaction(s,{items:[{id:'ayam',qty:1}],catalogRevision:1,idempotencyKey:randomUUID()});assert.equal(service.bootstrap(s).stock.beras,before.stock.beras+.1);
  service.cancelReceipt(s,receipt.id);assert.equal(service.cancelReceipt(s,receipt.id).duplicate,true);assert.equal(service.bootstrap(s).stock.beras,before.stock.beras-.15);
  service.cancelSale(s,sale.id);assert.equal(service.bootstrap(s).stock.beras,before.stock.beras);
  const ingredient=service.saveIngredient(s,null,{name:'Terigu halus',unit:'gram',min:10,storageNote:'',catalogRevision:1});
  const opposite=service.receive(s,payload({productId:ingredient.id,qty:.25,inputUnit:'kg',unitPrice:10500}));r=service.bootstrap(s).stockReceipts.find(r=>r.id===opposite.id);assert.equal(r.qty,250);assert.equal(r.unit_price,10.5);assert.equal(r.total,2625);
  const fluid=service.receive(s,payload({productId:'minyak',qty:125,inputUnit:'ml',unitPrice:21}));assert.equal(service.bootstrap(s).stock.minyak,before.stock.minyak+.125);assert.equal(fluid.total,2625);
  const ml=service.saveIngredient(s,null,{name:'Susu cair',unit:'ml',min:100,storageNote:'',catalogRevision:2});service.receive(s,payload({productId:ml.id,qty:.1,inputUnit:'liter',unitPrice:15001}));assert.equal(service.bootstrap(s).stock[ml.id],100);assert.equal(service.bootstrap(s).stockReceipts[0].total,1500);
  assert.equal(store.all("SELECT * FROM movements WHERE ref=? AND reason='receipt_reversal'",receipt.id).length,1);
});

test('incompatible units, unrepresentable precision and receipt limits leave all state unchanged',t=>{
  const {store,s,service}=fixture(t);const before=service.bootstrap(s);
  for(const bad of [
    {inputUnit:'liter'},{inputUnit:'papan'},{inputUnit:null},{inputUnit:5},{inputUnit:'GRAM'},
    {qty:.01},{qty:.0001},{qty:.10001},{qty:NaN},{qty:'250'},
    {qty:10001},{inputUnit:'kg',qty:10001},{unitPrice:1.2},{unitPrice:-1},{unitPrice:10000001},
    {inputUnit:'kg',qty:1000,unitPrice:10000000},{productId:'telur',inputUnit:'buah',qty:2},{productId:'telur',inputUnit:'butir',qty:1.5}
  ])assert.throws(()=>service.receive(s,payload(bad)),e=>e.status===400);
  const gram=service.saveIngredient(s,null,{name:'Terigu',unit:'gram',min:0,storageNote:'',catalogRevision:1});assert.throws(()=>service.receive(s,payload({productId:gram.id,inputUnit:'kg',qty:10.0001})),/Hasil konversi maksimal/);
  assert.deepEqual(service.bootstrap(s).stockReceipts,[]);assert.equal(service.bootstrap(s).stock.beras,before.stock.beras);assert.equal(store.all("SELECT * FROM movements WHERE reason='stock_receipt'").length,0);
  service.receive(s,payload({qty:.1,unitPrice:0}));assert.equal(service.bootstrap(s).stock.beras,before.stock.beras+.0001);
});

test('receipt retry keeps original unit snapshot, supports legacy same-unit keys and never restores cancelled receipts',t=>{
  const {s,service}=fixture(t);const body=payload(),a=service.receive(s,body);
  assert.equal(service.receive(s,body).duplicate,true);
  assert.throws(()=>service.receive(s,{...body,qty:.25,inputUnit:'kg',unitPrice:13000}),e=>e.status===409);
  assert.throws(()=>service.receive(s,{...body,unitPrice:14}),e=>e.status===409);
  service.cancelReceipt(s,a.id);const stock=service.bootstrap(s).stock.beras;assert.equal(service.receive(s,body).duplicate,true);assert.equal(service.receive(s,body).cancelled,true);assert.equal(service.bootstrap(s).stock.beras,stock);
  const old=payload({inputUnit:undefined,qty:1,unitPrice:12000});service.receive(s,old);assert.equal(service.receive(s,{...old,inputUnit:'kg'}).duplicate,true);
  const state=service.bootstrap(s);service.saveIngredient(s,'beras',{name:'Beras lokal',unit:'kg',min:3,storageNote:'',catalogRevision:state.catalogRevision});assert.equal(service.receive(s,body).duplicate,true);assert.equal(service.bootstrap(s).stockReceipts.find(r=>r.id===a.id).product_name,'Beras');
});

test('old receipt migration preserves existing columns and fingerprints, converted snapshots survive database reopen',()=>{
  const filename=`data/test-receipt-units-${randomUUID()}.sqlite`;let store=createStore(filename);
  try {
    const s=store.session();let service=createService(store);const old=payload({inputUnit:undefined,qty:1,unitPrice:12000});const saved=service.receive(s,old);
    for(const name of ['input_quantity','input_unit','input_unit_price'])store.db.exec(`ALTER TABLE stock_receipts DROP COLUMN ${name}`);
    const before=store.get('SELECT * FROM stock_receipts WHERE id=?',saved.id),stock=service.bootstrap(s).stock;
    store.close();store=createStore(filename);service=createService(store);const row=store.get('SELECT * FROM stock_receipts WHERE id=?',saved.id);
    for(const [key,value]of Object.entries(before))assert.equal(row[key],value);
    assert.equal(row.input_unit,null);assert.deepEqual(service.bootstrap(s).stock,stock);assert.equal(service.receive(s,old).duplicate,true);
    const receipt=service.receive(s,payload());store.close();store=createStore(filename);service=createService(store);
    const r=service.bootstrap(s).stockReceipts.find(r=>r.id===receipt.id);assert.equal(r.qty,.25);assert.equal(r.input_unit,'gram');assert.equal(r.input_quantity,2500000);assert.equal(r.input_unit_price,13);assert.equal(r.total,3250);service.cancelReceipt(s,r.id);assert.equal(service.bootstrap(s).stock.beras,stock.beras);
  }finally{store.close();for(const suffix of ['', '-wal','-shm'])try{unlinkSync(filename+suffix);}catch{}}
});

test('metric receipt HTTP retains CSRF, owner scope and exactly-once concurrent retry',async t=>{
  const app=createApp({filename:':memory:',extractor:{status:async()=>({provider:'rules'})}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());
  const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='',csrf='';
  async function post(path,body,token=csrf){const res=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',origin:base,cookie},body:JSON.stringify({...body,csrf:token})});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const data=await res.json();if(data.csrf)csrf=data.csrf;return {status:res.status,data};}
  await post('/api/demo/session',{businessId:'sari'});const body=payload();assert.equal((await post('/api/stock-receipts',body,'wrong')).status,403);assert.equal((await post('/api/stock-receipts',{...body,inputUnit:'ml'})).status,400);
  const results=await Promise.all([post('/api/stock-receipts',body),post('/api/stock-receipts',body)]);assert.deepEqual(results.map(r=>r.status),[201,201]);assert.equal(results.filter(r=>r.data.duplicate).length,1);
  const receipt=results[0].data.id;await post('/api/demo/session',{businessId:'budi'});assert.equal((await post(`/api/stock-receipts/${receipt}/cancel`,{})).status,404);
  const res=await fetch(base+'/api/bootstrap',{headers:{cookie}});assert.equal((await res.json()).stockReceipts.length,0);
  await post('/api/demo/session',{businessId:'sari'});assert.equal((await post(`/api/stock-receipts/${receipt}/cancel`,{})).status,200);
});
