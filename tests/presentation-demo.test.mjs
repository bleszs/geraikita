import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, realpathSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createStore } from '../server/store.mjs';
import { createApp } from '../server/http.mjs';
import { createExtractor } from '../server/extractor.mjs';
import { createService } from '../server/service.mjs';
import { buildPresentationDemo, preparePresentationDemo, DEMO_ACCOUNT, inspectDemo } from '../scripts/presentation-demo.mjs';
const before = (store) => store.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").map(({name})=>[name,store.all('SELECT * FROM "'+name+'"')]);
function temp(t) {
  const directory=mkdtempSync(path.join(os.tmpdir(),'gerai-presentation-demo-')),cleanup=[];
  t.after(async()=>{for(const close of cleanup.reverse())await close();const resolved=realpathSync(directory);assert.equal(path.dirname(resolved),realpathSync(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('gerai-presentation-demo-'));rmSync(resolved,{recursive:true,force:true});});
  return {directory,close:operation=>cleanup.push(operation)};
}
test('opt-in presentation has one login, linked recipes/history/ledger, group and review scenarios without training',t=>{
  const temporary=temp(t),manifest=buildPresentationDemo(temporary.directory),store=createStore(manifest.filename);temporary.close(()=>store.close());
  const counts=inspectDemo(store,{workspace_id:manifest.owner.workspaceId,business_id:manifest.owner.businessId});
  assert.equal(counts.accounts,1);assert.equal(counts.simulatedMembersWithoutLogin,2);assert.equal(counts.ingredients,8);assert.equal(counts.menus,6);
  assert.equal(counts.historicalCompleteDays,84);assert.equal(counts.todayTransactions,6);assert.ok(counts.sales>160);assert.ok(counts.receipts>100);
  assert.equal(counts.reviewDecisions,2);assert.ok(counts.reviewCandidates>=2);assert.equal(counts.completedCollectiveCycles,1);
  assert.equal(counts.groupParticipants,3);assert.equal(counts.groupEligible,true);assert.equal(counts.activeSurplusOffers,2);
  assert.equal(counts.completedSurplusTransfers,1);assert.equal(counts.pendingSurplusTransfers,1);assert.equal(counts.trainedModelActivated,false);
  assert.ok(store.all('SELECT message FROM audit').some(row=>row.message.includes('2 kg surplus seharga Rp11000/kg')));
  assert.equal(manifest.trainingAllowed,false);assert.equal(manifest.productionDataTouched,false);
  const user=store.get('SELECT * FROM accounts');assert.equal(user.email,DEMO_ACCOUNT.email);assert.notEqual(user.password_hash,DEMO_ACCOUNT.password);
});
test('reopening the demo preserves edits and building over an existing demo is refused',t=>{
  const temporary=temp(t),directory=temporary.directory,manifest=buildPresentationDemo(directory),store=createStore(manifest.filename);
  const owner={workspace_id:manifest.owner.workspaceId,business_id:manifest.owner.businessId};
  store.run('UPDATE businesses SET name=? WHERE workspace_id=? AND id=?','[DEMO] Catatan presentasi yang diedit',owner.workspace_id,owner.business_id);
  const snapshot=before(store);store.close();
  assert.throws(()=>buildPresentationDemo(directory),/tidak ditimpa/);preparePresentationDemo(directory);
  const reopened=createStore(manifest.filename);temporary.close(()=>reopened.close());assert.deepEqual(before(reopened),snapshot);
});
test('demo HTTP supports actual login, extraction and recording while normal registration stays empty',async t=>{
  const temporary=temp(t),manifest=buildPresentationDemo(temporary.directory),app=createApp({filename:manifest.filename,extractor:createExtractor({provider:'rules'}),transcriber:{status:async()=>({available:false})}});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));temporary.close(()=>app.close());
  const base='http://127.0.0.1:'+app.server.address().port;
  assert.equal((await fetch(base+'/api/bootstrap')).status,401);
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(DEMO_ACCOUNT)});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0],state=await login.json();
  assert.equal(state.catalog.length,8);assert.equal(state.menu.length,6);assert.ok(state.recommendations.every(row=>row.amount!==null));
  const post=(url,payload)=>fetch(base+url,{method:'POST',headers:{'content-type':'application/json',origin:base,cookie},body:JSON.stringify({...payload,csrf:state.csrf})});
  const extracted=await post('/api/extractions',{text:'2 nasi ayam dan 1 kopi susu'});assert.equal(extracted.status,200);const details=await extracted.json();assert.equal(details.items.length,2);
  const saved=await post('/api/transactions',{items:details.items,catalogRevision:state.catalogRevision,idempotencyKey:crypto.randomUUID()});assert.equal(saved.status,201);
  assert.equal(app.store.get('SELECT COUNT(*) AS n FROM accounts').n,1);
  const normal=createStore(':memory:');try{assert.equal(normal.get('SELECT COUNT(*) AS n FROM accounts').n,0);assert.equal(normal.get('SELECT COUNT(*) AS n FROM daily_usage').n,0);}finally{normal.close();}
  assert.match(readFileSync('scripts/serve-presentation-demo.mjs','utf8'),/filename: demo.filename/);
});
