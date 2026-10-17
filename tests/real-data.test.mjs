import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {unlinkSync} from 'node:fs';
import {createApp} from '../server/http.mjs';
import {createExtractor} from '../server/extractor.mjs';
import {createStore} from '../server/store.mjs';
import {createIdentity} from '../server/identity.mjs';
import {createService} from '../server/service.mjs';
const password='A-long-password-for-tests-773';
async function fixture(t){const app=createApp({filename:':memory:',extractor:createExtractor({provider:'rules'})});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
  function client(){let cookie='',csrf='';return {async post(path,body={},expected=200){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',cookie,origin:base},body:JSON.stringify({...body,csrf:body.csrf??csrf})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));if(d.csrf)csrf=d.csrf;return d;},async state(expected=200){const r=await fetch(base+'/api/bootstrap',{headers:{cookie}});assert.equal(r.status,expected);return r.json();}};}
  return {app,client};
}
const registration=(name,extra={})=>({businessName:name,communityName:'Kelompok pengujian terisolasi',email:randomUUID()+'@example.test',password,...extra});
const quote=extra=>({productName:'Tepung kelompok',unit:'kg',supplier:'Pemasok dari input pengujian',unitPrice:7000,shipping:11000,minimum:4,individualPrice:null,individualShipping:null,expiresAt:new Date(Date.now()+3600000).toISOString(),...extra});

test('account identity changes remain scoped and never invent catalog, stock or sales',async t=>{
  const {app,client}=await fixture(t),owner=client(),member=client(),outside=client();const a=await owner.post('/api/auth/register',registration('Nama awal pemilik'),201);const b=await member.post('/api/auth/register',registration('Anggota tetap',{inviteCode:a.community.inviteCode}),201);await outside.post('/api/auth/register',registration('Usaha kelompok lain'),201);
  await owner.post('/api/account/profile',{businessName:'x'},400);await owner.post('/api/account/profile',{businessName:'Nama ditolak',csrf:'wrong'},403);await owner.post('/api/account/profile',{businessName:'  Nama usaha diperbarui  ',businessId:b.business.id});await owner.post('/api/community/settings',{communityName:'Kelompok dengan nama sendiri'});
  let state=await owner.state();assert.equal(state.business.name,'Nama usaha diperbarui');assert.equal(state.business.id,a.business.id);assert.equal(state.community.name,'Kelompok dengan nama sendiri');assert.deepEqual(state.stock,{});assert.equal(state.catalog.length,0);assert.equal((await member.state()).business.name,'Anggota tetap');assert.equal((await member.state()).community.name,state.community.name);assert.notEqual((await outside.state()).community.name,state.community.name);
  assert.ok(state.account.email);assert.equal('password_hash' in state.account,false);assert.equal('salt' in state.account,false);await member.post('/api/community/settings',{communityName:'Tidak boleh'},403);await member.post('/api/community/invite',{expectedCode:a.community.inviteCode},403);
  assert.equal(app.store.get('SELECT COUNT(*) AS n FROM sales').n,0);
});

test('password change verifies old credentials, revokes only other sessions and never exposes credentials in stored audit',async t=>{
  const {app,client}=await fixture(t),owner=client(),second=client(),member=client();const body=registration('Pemilik kata sandi'),a=await owner.post('/api/auth/register',body,201);await second.post('/api/auth/login',{email:body.email,password});await member.post('/api/auth/register',registration('Akun anggota aman',{inviteCode:a.community.inviteCode}),201);
  const next='Different-new-password-918';await owner.post('/api/account/password',{currentPassword:'Wrong-password-777',newPassword:next},403);await second.state();await owner.post('/api/account/password',{currentPassword:password,newPassword:'short'},400);await owner.post('/api/account/password',{currentPassword:password,newPassword:password},400);await owner.post('/api/account/password',{currentPassword:password,newPassword:next,csrf:'invalid'},403);
  const changed=await owner.post('/api/account/password',{currentPassword:password,newPassword:next});assert.equal(changed.revokedSessions,1);await owner.state();await second.state(401);await member.state();await second.post('/api/auth/login',{email:body.email,password},401);await second.post('/api/auth/login',{email:body.email,password:next});
  const account=app.store.get('SELECT * FROM accounts WHERE email=?',body.email);assert.notEqual(account.password_hash,next);for(const row of app.store.all('SELECT message FROM audit')){assert.ok(!row.message.includes(password));assert.ok(!row.message.includes(next));}
});

test('password verification is rate limited per account across sessions without locking other accounts',async t=>{
  const {client}=await fixture(t),a=client(),b=client(),other=client(),body=registration('Akun dibatasi');await a.post('/api/auth/register',body,201);await b.post('/api/auth/login',{email:body.email,password});await other.post('/api/auth/register',registration('Akun independen'),201);
  for(let i=0;i<8;i++)await (i%2?a:b).post('/api/account/password',{currentPassword:'Wrong-password-773',newPassword:'New-password-773'},403);
  await b.post('/api/account/password',{currentPassword:password,newPassword:'New-password-773'},429);await other.post('/api/account/password',{currentPassword:password,newPassword:'Different-password-775'});await a.state();
});

test('rotated invitation rejects the old code, preserves existing membership and refuses duplicate rotation',async t=>{
  const {app,client}=await fixture(t),owner=client(),member=client(),joiner=client();const a=await owner.post('/api/auth/register',registration('Pengelola undangan'),201);await member.post('/api/auth/register',registration('Anggota sebelum rotasi',{inviteCode:a.community.inviteCode}),201);
  await owner.post('/api/community/invite',{expectedCode:a.community.inviteCode});const after=await owner.state();assert.notEqual(after.community.inviteCode,a.community.inviteCode);await owner.post('/api/community/invite',{expectedCode:a.community.inviteCode},409);assert.equal((await owner.state()).community.inviteCode,after.community.inviteCode);assert.equal((await member.state()).workspaceId,a.workspaceId);
  await joiner.post('/api/auth/register',registration('Kode lama gagal',{inviteCode:a.community.inviteCode}),404);const joined=await joiner.post('/api/auth/register',registration('Anggota setelah rotasi',{inviteCode:after.community.inviteCode}),201);assert.equal(joined.workspaceId,a.workspaceId);assert.equal(app.store.get('SELECT COUNT(*) AS n FROM businesses').n,3);
});

test('live store is empty and registration never seeds catalog, stock, sales, demand, offers or history',async t=>{
  const {app,client}=await fixture(t);for(const table of ['businesses','accounts','inventory','menus','sales','daily_usage','offers','transfers'])assert.equal(app.store.get(`SELECT COUNT(*) AS n FROM ${table}`).n,0);
  const c=client();await c.state(401);await c.post('/api/demo/session',{},401);const state=await c.post('/api/auth/register',registration('Usaha dari formulir'),201);
  assert.equal(state.business.name,'Usaha dari formulir');for(const field of ['catalog','menu','transactions','recommendations','stockReceipts','offers','transfers'])assert.deepEqual(state[field],[]);assert.deepEqual(state.stock,{});assert.equal(state.demand,null);assert.equal(state.shared,false);assert.equal(state.group.quote.configured,false);assert.equal(state.group.totalCost,null);assert.equal(state.community.canManage,true);assert.ok(state.community.inviteCode);assert.equal('profiles' in state,false);
  await c.post('/api/demo/reset',{},404);await c.post('/api/extractions',{text:'menu tidak terdaftar'},400);
});

test('real accounts enforce login/logout, CSRF, membership and owner-only supplier configuration',async t=>{
  const {app,client}=await fixture(t),owner=client(),member=client(),outsider=client();const body=registration('Pemilik kelompok'),a=await owner.post('/api/auth/register',body,201);
  const b=await member.post('/api/auth/register',registration('Anggota kelompok',{inviteCode:a.community.inviteCode}),201);assert.equal(b.community.canManage,false);assert.equal(b.community.inviteCode,null);
  await member.post('/api/community/quote',quote(),403);await owner.post('/api/community/quote',{...quote(),csrf:'wrong'},403);await owner.post('/api/community/quote',quote());
  const memberState=await member.state();assert.equal(memberState.catalog.length,1);assert.equal(memberState.catalog[0].name,'Tepung kelompok');assert.equal(memberState.stock[memberState.catalog[0].id],0);
  const o=await outsider.post('/api/auth/register',registration('Kelompok terpisah'),201);assert.notEqual(o.workspaceId,a.workspaceId);assert.equal(o.catalog.length,0);
  await owner.post('/api/auth/logout');await owner.state(401);await owner.post('/api/auth/login',{email:body.email,password:'wrong-password-value'},401);const back=await owner.post('/api/auth/login',{email:body.email,password});assert.equal(back.business.id,a.business.id);
  const account=app.store.get('SELECT * FROM accounts WHERE email=?',body.email);assert.notEqual(account.password_hash,password);assert.equal(account.password_hash.length,128);assert.equal(app.store.get('SELECT COUNT(*) AS n FROM accounts').n,3);
});

test('three independently registered businesses use entered product, price and shipping; new cycles never renew supplier prices',async t=>{
  const {client}=await fixture(t),clients=[client(),client(),client()];const a=await clients[0].post('/api/auth/register',registration('Pemilik'),201);await clients[0].post('/api/community/quote',quote());
  for(let i=1;i<3;i++)await clients[i].post('/api/auth/register',registration('Anggota '+i,{inviteCode:a.community.inviteCode}),201);
  for(let i=0;i<3;i++)await clients[i].post('/api/demand-consents',{qty:i+2,active:true});let g=(await clients[0].state()).group;assert.equal(g.order,9);assert.equal(g.totalCost,74000);assert.equal(g.own.individual,null);assert.equal(g.own.savings,null);
  for(const c of clients)await c.post('/api/proposal/approval',{version:g.version,decision:'accepted'});g=(await clients[0].state()).group;assert.equal(g.ready,true);const plan=await clients[0].post('/api/collective-orders',{cycle:g.cycle.id,version:g.version},201);await clients[0].post('/api/community/quote',quote({unitPrice:999}),409);
  let first;for(let i=0;i<3;i++){const r=await clients[i].post(`/api/collective-orders/${plan.id}/receipts`,{qty:i+2,idempotencyKey:randomUUID()},201);if(!i)first=r;}
  let s=await clients[0].state();assert.equal(s.stock[s.sharedProduct.id],2);assert.equal(s.stockReceipts[0].product_name,'Tepung kelompok');assert.equal(s.stockReceipts[0].product_unit,'kg');assert.equal(s.group.purchase.status,'completed');assert.equal(s.recommendations[0].amount,null);
  await clients[0].post(`/api/collective-orders/${plan.id}/receipts/${first.id}/cancel`,{reason:'Salah mencatat penerimaan sebenarnya.'});s=await clients[0].state();assert.equal(s.stock[s.sharedProduct.id],0);assert.equal(s.group.purchase.status,'receiving');const replacement=await clients[0].post(`/api/collective-orders/${plan.id}/receipts`,{qty:2,idempotencyKey:randomUUID()},201);assert.equal(replacement.shipping,2444);
  s=await clients[0].state();await clients[0].post('/api/collective-cycles/next',{cycle:s.group.cycle.id,version:s.group.version});s=await clients[0].state();assert.equal(s.group.quote.configured,false);assert.equal(s.group.quote.expiresAt,0);assert.equal(s.shared,false);assert.equal(s.stock[s.sharedProduct.id],2);assert.equal(s.collectiveHistory.length,1);
});

test('configured arbitrary surplus product transfers only after owner approval and isolates unrelated workspaces',async t=>{
  const {client}=await fixture(t),owner=client(),buyer=client();const a=await owner.post('/api/auth/register',registration('Pemilik bahan'),201);await owner.post('/api/community/quote',quote({productName:'Kemasan milik kelompok',unit:'buah',unitPrice:500,minimum:1}));await buyer.post('/api/auth/register',registration('Penerima bahan',{inviteCode:a.community.inviteCode}),201);let s=await owner.state();const productId=s.sharedProduct.id;
  await owner.post('/api/stock-receipts',{productId,qty:10,inputUnit:'buah',unitPrice:450,supplier:'Pemasok yang dicatat',idempotencyKey:randomUUID()},201);const offer=await owner.post('/api/offers',{productId,qty:4,unitPrice:400,condition:'Disimpan bersih dan belum digunakan',expiresInHours:2,cycle:1,idempotencyKey:randomUUID()},201);
  const request=await buyer.post(`/api/offers/${offer.id}/request`,{qty:2},201);s=await owner.state();assert.equal(s.stock[productId],10);assert.equal(s.availableStock[productId],8);assert.equal((await buyer.state()).stock[productId],0);await buyer.post(`/api/transfers/${request.id}/approval`,{},403);await owner.post(`/api/transfers/${request.id}/approval`);assert.equal((await owner.state()).stock[productId],8);assert.equal((await buyer.state()).stock[productId],2);
});

test('live account and user-created data survive restart without repopulating any default records',()=>{
  const filename=`data/test-live-${randomUUID()}.sqlite`;let store=createStore(filename);
  try{
    let identity=createIdentity(store),service=createService(store);const body=registration('Usaha persisten'),s=identity.register(body);const p=service.saveIngredient(s,null,{name:'Bahan yang dimasukkan',unit:'gram',min:20,storageNote:'Wadah tertutup',catalogRevision:1});service.receive(s,{productId:p.id,qty:.5,inputUnit:'kg',unitPrice:17000,supplier:'',idempotencyKey:randomUUID()});
    const next='Persistent-new-password-778',oldCode=service.bootstrap(s).community.inviteCode;identity.saveBusiness(s,{businessName:'Usaha persisten diperbarui'});identity.saveCommunity(s,{communityName:'Kelompok persisten diperbarui'});identity.rotateInvite(s,{expectedCode:oldCode});identity.changePassword(s,{currentPassword:password,newPassword:next});const newCode=service.bootstrap(s).community.inviteCode;
    store.close();store=createStore(filename);identity=createIdentity(store);service=createService(store);assert.throws(()=>identity.login({email:body.email,password}),/tidak sesuai/);const reopened=identity.login({email:body.email,password:next}),state=service.bootstrap(reopened);assert.equal(state.business.name,'Usaha persisten diperbarui');assert.equal(state.community.name,'Kelompok persisten diperbarui');assert.equal(state.community.inviteCode,newCode);assert.notEqual(newCode,oldCode);assert.equal(state.catalog.length,1);assert.equal(state.stock[p.id],500);assert.equal(state.transactions.length,0);assert.equal(state.offers.length,0);assert.equal(state.menu.length,0);assert.equal(state.group.quote.configured,false);assert.equal(state.recommendations[0].predicted,null);
  }finally{store.close();for(const suffix of ['', '-wal','-shm'])try{unlinkSync(filename+suffix);}catch{}}
});
