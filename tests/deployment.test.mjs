import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtempSync,existsSync,rmdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {request as httpRequest} from 'node:http';
import {deploymentConfig,validateRailwayStorage} from '../server/deployment.mjs';
import {createApp} from '../server/http.mjs';

const request=(host,origin,extra={})=>({headers:{host,...(origin?{origin}:{}),...extra},method:'GET',socket:{remoteAddress:'127.0.0.1'}});
const publicConfig=changes=>deploymentConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'https://gerai.example.test',...changes});

test('local default preserves host, origin, cookie and direct client identity',()=>{
  const c=deploymentConfig({}),r=request('localhost:4174','http://localhost:4174',{'x-real-ip':'1.2.3.4','x-forwarded-host':'evil.test'});
  assert.equal(c.publicMode,false);assert.equal(c.bindHost,'127.0.0.1');c.checkHost(r,'/');c.checkOrigin(r);assert.equal(c.clientAddress(r),'127.0.0.1');
  assert.doesNotMatch(c.sessionCookie('token'),/Secure/);assert.match(c.sessionCookie(null,true),/Max-Age=0/);
  for(const host of ['localhost.evil.test','evil@localhost:4174','localhost:4174/secret','localhost:4174?x','example.test',''])assert.throws(()=>c.checkHost(request(host),'/'),/Host/);
  assert.throws(()=>c.checkOrigin(request('localhost:4174','https://evil.test')),/Asal/);
});

test('public mode requires a canonical HTTPS origin and validates config before startup',()=>{
  for(const raw of ['', 'http://gerai.example.test','https://u:p@gerai.example.test','https://gerai.example.test/path','https://gerai.example.test?x','https://gerai.example.test#x'])assert.throws(()=>publicConfig({PUBLIC_ORIGIN:raw}));
  const c=deploymentConfig({RAILWAY_PUBLIC_DOMAIN:'gerai.up.railway.app'});assert.equal(c.origin,'https://gerai.up.railway.app');assert.equal(c.bindHost,'0.0.0.0');assert.match(c.sessionCookie('token'),/; Secure$/);
  assert.equal(publicConfig({RAILWAY_PUBLIC_DOMAIN:'other.up.railway.app'}).origin,'https://gerai.example.test');
  assert.throws(()=>deploymentConfig({TRUST_RAILWAY_PROXY:'true'}),/Proxy/);assert.throws(()=>publicConfig({TRUST_RAILWAY_PROXY:'yes'}),/true atau false/);assert.throws(()=>publicConfig({BIND_HOST:'evil.test'}),/BIND_HOST/);
});

test('Railway probe hostname is confined to GET health; forwarded host never grants application access',()=>{
  const c=publicConfig();c.checkHost(request('gerai.example.test'),'/');c.checkHost(request('healthcheck.railway.app'),'/api/health');
  for(const route of ['/','/api/bootstrap','/api/staff/screen'])assert.throws(()=>c.checkHost(request('healthcheck.railway.app'),route),/Host/);
  assert.throws(()=>c.checkHost({...request('healthcheck.railway.app'),method:'POST'},'/api/health'),/Host/);
  assert.throws(()=>c.checkHost(request('evil.test',null,{'x-forwarded-host':'gerai.example.test'}),'/'),/Host/);
  c.checkOrigin(request('gerai.example.test','https://gerai.example.test'));
  for(const origin of ['http://gerai.example.test','https://evil.test','null'])assert.throws(()=>c.checkOrigin(request('gerai.example.test',origin,{'x-forwarded-proto':'https','x-forwarded-host':'evil.test'})),/Asal/);
});

test('explicit Railway proxy trust accepts one valid X-Real-IP only, not a forwarded chain',()=>{
  const c=publicConfig({TRUST_RAILWAY_PROXY:'true'});
  assert.equal(c.clientAddress(request('gerai.example.test',null,{'x-real-ip':'192.0.2.10'})),'192.0.2.10');
  assert.equal(c.clientAddress(request('gerai.example.test',null,{'x-real-ip':'2001:db8::1'})),'2001:db8::1');
  for(const real of ['not-an-ip','192.0.2.1, 192.0.2.2',['192.0.2.1']])assert.equal(c.clientAddress(request('gerai.example.test',null,{'x-real-ip':real,'x-forwarded-for':'192.0.2.9'})),'127.0.0.1');
});

test('Railway startup refuses an ephemeral or escaping database path',()=>{
  const mount=path.join(tmpdir(),'gerai-volume'),base={RAILWAY_ENVIRONMENT_ID:'isolated-contract',RAILWAY_VOLUME_MOUNT_PATH:mount};
  validateRailwayStorage({...base,DATABASE_PATH:path.join(mount,'store.sqlite')});validateRailwayStorage({});
  for(const filename of [undefined,'relative.sqlite',mount,path.join(mount,'..','other.sqlite'),mount+'-other/store.sqlite'])assert.throws(()=>validateRailwayStorage({...base,DATABASE_PATH:filename}));
  assert.throws(()=>validateRailwayStorage({RAILWAY_ENVIRONMENT_ID:'contract',DATABASE_PATH:path.join(mount,'store.sqlite')}),/volume/);
  const dir=mkdtempSync(path.join(tmpdir(),'gerai-public-config-')),filename=path.join(dir,'never.sqlite');
  try{const r=spawnSync(process.execPath,['scripts/serve.mjs'],{encoding:'utf8',timeout:15000,windowsHide:true,env:{...process.env,NODE_ENV:'production',PUBLIC_ORIGIN:'http://invalid.test',RAILWAY_PUBLIC_DOMAIN:'',DATABASE_PATH:filename}});assert.notEqual(r.status,0);assert.match(r.stderr,/HTTPS/);assert.equal(existsSync(filename),false);}finally{rmdirSync(dir);}
});

async function fixture(t){
  const app=createApp({filename:':memory:',deployment:publicConfig({TRUST_RAILWAY_PROXY:'true'}),extractor:{status:async()=>({available:false})},transcriber:{status:async()=>({available:false})}});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>app.close());
  const base='http://127.0.0.1:'+app.server.address().port;
  // Send a real reverse-proxy Host header; fetch may replace this forbidden header.
  const send=(url,body,{host='gerai.example.test',origin='https://gerai.example.test',cookie,ip='192.0.2.1'}={})=>new Promise((resolve,reject)=>{
    const req=httpRequest(base+url,{method:body===undefined?'GET':'POST',headers:{host,origin,'Content-Type':'application/json','X-Real-IP':ip,...(cookie?{cookie}:{})}},res=>{
      const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));
    });req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });
  return {app,send};
}

test('public HTTP register, authenticated mutation and logout use canonical origin and Secure cookies',async t=>{
  const {send}=await fixture(t);
  const credentials={email:randomUUID()+'@example.test',password:'RailwayContract2026!',businessName:'Usaha kontrak publik',communityName:'Kelompok kontrak'};
  const blocked=await send('/api/auth/register',credentials,{origin:'https://evil.test'});assert.equal(blocked.status,403);
  const r=await send('/api/auth/register',credentials);assert.equal(r.status,201);assert.match(r.headers.get('set-cookie'),/; Secure$/);assert.equal(r.headers.get('strict-transport-security'),'max-age=31536000');
  const cookie=r.headers.get('set-cookie').split(';')[0],state=await r.json();assert.equal(state.account.role,'owner');
  const create={name:'Kasir kontrak',role:'cashier',code:'ABCD2345',idempotencyKey:randomUUID(),confirmed:true,csrf:state.csrf};
  assert.equal((await send('/api/staff-invites',create,{cookie,origin:'http://gerai.example.test'})).status,403);
  assert.equal((await send('/api/staff-invites',create,{cookie})).status,201);
  const paired=await send('/api/auth/staff-code',{code:create.code},{ip:'192.0.2.2'});assert.equal(paired.status,200);assert.match(paired.headers.get('set-cookie'),/; Secure$/);assert.equal((await paired.json()).account.role,'cashier');
  assert.equal((await send('/api/health',undefined,{host:'healthcheck.railway.app'})).status,200);assert.equal((await send('/api/bootstrap',undefined,{host:'healthcheck.railway.app',cookie})).status,403);
  const logout=await send('/api/auth/logout',{csrf:state.csrf},{cookie});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0; Secure$/);assert.equal((await send('/api/bootstrap',undefined,{cookie})).status,401);
});

test('staff-code limiter separates clients behind an explicitly trusted Railway edge',async t=>{
  const {app,send}=await fixture(t);
  for(let i=0;i<8;i++)assert.equal((await send('/api/auth/staff-code',{code:'ZZZZ9999'},{ip:'192.0.2.10'})).status,401);
  assert.equal((await send('/api/auth/staff-code',{code:'ABCD2345'},{ip:'192.0.2.10'})).status,429);
  assert.equal((await send('/api/auth/staff-code',{code:'ABCD2345'},{ip:'192.0.2.11'})).status,401);
  assert.equal(app.store.get('SELECT COUNT(*) AS n FROM accounts').n,0);
});
