import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/http.mjs';
test('kitchen HTTP scopes events, checks CSRF, observes updates and closes active streams',async t=>{
 const app=createApp({filename:':memory:',extractor:{status:async()=>({provider:'rules'}),extract:async()=>({items:[]})},transcriber:{status:async()=>({available:false})}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 async function register(email){const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'KitchenTest2026!',businessName:'Usaha pengujian',communityName:'Kelompok pengujian'})});return {data:await r.json(),cookie:r.headers.get('set-cookie').split(';')[0]};}
 const a=await register('kitchen-'+randomUUID()+'@example.test'),b=await register('kitchen-'+randomUUID()+'@example.test');
 const s=app.store.get('SELECT * FROM sessions WHERE csrf=?',a.data.csrf),svc=app.service;
 const ingredient=svc.saveIngredient(s,null,{name:'Tepung pengujian',unit:'gram',min:0,storageNote:'',catalogRevision:1});
 svc.receive(s,{productId:ingredient.id,qty:100,unitPrice:1,supplier:'',idempotencyKey:randomUUID()});
 const menu=svc.saveMenu(s,null,{name:'Roti pengujian',price:5000,aliases:[],recipe:{[ingredient.id]:10},catalogRevision:2,preparation:{minutes:4,passiveMinutes:1,station:'pemanggang'}});
 assert.equal((await fetch(base+'/api/kitchen')).status,401);
 const controller=new AbortController(),stream=await fetch(base+'/api/kitchen/events',{headers:{cookie:a.cookie},signal:controller.signal}),reader=stream.body.getReader();
 assert.match(new TextDecoder().decode((await reader.read()).value),/revision/);
 const payload={label:'Meja 1',channel:'dine_in',items:[{id:menu.id,qty:1}],catalogRevision:3,idempotencyKey:randomUUID()};
 const post=body=>fetch(base+'/api/kitchen/orders',{method:'POST',headers:{cookie:a.cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post(payload)).status,403);assert.equal((await post({...payload,csrf:a.data.csrf})).status,201);
 const next=await reader.read();assert.match(new TextDecoder().decode(next.value),/revision/);
 const others=await(await fetch(base+'/api/kitchen',{headers:{cookie:b.cookie}})).json();assert.equal(others.orders.length,0);
 controller.abort();await reader.cancel().catch(()=>{});
});
