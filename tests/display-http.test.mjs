import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createApp} from '../server/http.mjs';
test('public bearer token is read-only, isolated, omits secrets and revocation closes an active stream',async t=>{
 const app=createApp({filename:':memory:',extractor:{status:async()=>({provider:'rules'})},transcriber:{status:async()=>({available:false})}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());
 const base='http://127.0.0.1:'+app.server.address().port;
 async function register(){const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:randomUUID()+'@example.test',password:'DisplayTesting2026!',businessName:'Usaha',communityName:'Kelompok'})});return {data:await r.json(),cookie:r.headers.get('set-cookie').split(';')[0]};}
 const a=await register(),b=await register(),token=randomBytes(32).toString('hex'),payload={label:'TV uji',durationHours:1,token,idempotencyKey:randomUUID(),confirmed:true};
 const post=(url,body,cookie=a.cookie)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 assert.equal((await post('/api/displays',payload)).status,403);
 const made=await post('/api/displays',{...payload,csrf:a.data.csrf});assert.equal(made.status,201);const display=await made.json();
 assert.equal((await fetch(base+'/api/display/snapshot')).status,401);
 const headers={Authorization:'Bearer '+token};const data=await(await fetch(base+'/api/display/snapshot',{headers})).json();assert.deepEqual(data.orders,[]);
 for(const url of ['/api/bootstrap','/api/kitchen','/api/displays'])assert.equal((await fetch(base+url,{headers})).status,401);
 assert.equal((await fetch(base+'/api/display/snapshot',{method:'POST',headers})).status,405);
 const screen=await fetch(base+'/api/display/screen');assert.equal(screen.status,200);assert.equal(screen.headers.get('cache-control'),'no-store');assert.equal(screen.headers.get('referrer-policy'),'no-referrer');
 const controller=new AbortController(),r=await fetch(base+'/api/display/events',{headers,signal:controller.signal}),reader=r.body.getReader();assert.match(new TextDecoder().decode((await reader.read()).value),/orders/);
 assert.equal((await post(`/api/displays/${display.id}/revoke`,{csrf:b.data.csrf},b.cookie)).status,404);
 assert.equal((await post(`/api/displays/${display.id}/revoke`,{csrf:a.data.csrf})).status,200);
 assert.match(new TextDecoder().decode((await reader.read()).value),/event: revoked/);assert.equal((await reader.read()).done,true);
 assert.equal((await fetch(base+'/api/display/snapshot',{headers})).status,401);controller.abort();await reader.cancel().catch(()=>{});
 const boot=await(await fetch(base+'/api/bootstrap',{headers:{cookie:a.cookie}})).json();assert.equal(JSON.stringify(boot).includes(token),false);
});
