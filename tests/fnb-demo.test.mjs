import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildFnbDemo,prepareFnbDemo,FNB_DEMO_ACCOUNTS,inspectFnbDemo} from '../scripts/fnb-demo.mjs';
import {createStore} from '../server/store.mjs';
import {createIdentity} from '../server/identity.mjs';
import {createService} from '../server/service.mjs';
import {staffBootstrap} from '../server/roles.mjs';
function temp(t){const directory=mkdtempSync(path.join(tmpdir(),'gerai-fnb-demo-'));t.after(()=>{assert.equal(path.dirname(path.resolve(directory)),path.resolve(tmpdir()));assert.ok(path.basename(directory).startsWith('gerai-fnb-demo-'));rmSync(directory,{recursive:true,force:true});});return path.join(directory,'scenario');}
test('opt-in F&B demo includes three roles, real ledger scenarios and no cashier portions',t=>{
 const manifest=buildFnbDemo(temp(t)),store=createStore(manifest.filename);try{
  const identity=createIdentity(store),service=createService(store),owner=identity.login(FNB_DEMO_ACCOUNTS.owner),cashier=identity.login(FNB_DEMO_ACCOUNTS.cashier),kitchen=identity.login(FNB_DEMO_ACCOUNTS.kitchen);
  assert.deepEqual(inspectFnbDemo(store,owner).menuStatuses,['low','ok','out']);assert.equal(owner.role,'owner');assert.equal(cashier.role,'cashier');assert.equal(kitchen.role,'kitchen');assert.equal(cashier.business_id,owner.business_id);assert.equal(kitchen.business_id,owner.business_id);
  const c=staffBootstrap(store,service,cashier,identity.details(cashier));assert.equal(JSON.stringify(c).includes('portions'),false);
  const state=service.bootstrap(owner);assert.equal(state.catalog.length,9);assert.equal(state.menu.length,7);assert.equal(state.kitchen.orders.filter(o=>!['completed','cancelled','discarded'].includes(o.status)).length,4);assert.ok(state.kitchen.orders.some(o=>o.tasks.some(t=>t.status==='voided')));assert.ok(state.audit.some(a=>a.actor?.role==='cashier'));assert.ok(state.audit.some(a=>a.actor?.role==='kitchen'));assert.equal(manifest.trainingAllowed,false);assert.equal(manifest.productionDataTouched,false);
 }finally{store.close();}
});
test('F&B demo reuses existing data and refuses overwrite or silently replacing a missing database',t=>{
 const folder=temp(t),manifest=buildFnbDemo(folder),file=path.join(folder,'fnb-account.json'),original=readFileSync(file,'utf8'),store=createStore(manifest.filename);
 const before=store.all('SELECT id,message,actor_id FROM audit');store.close();assert.equal(prepareFnbDemo(folder).filename,manifest.filename);assert.equal(readFileSync(file,'utf8'),original);
 const reopened=createStore(manifest.filename);assert.deepEqual(reopened.all('SELECT id,message,actor_id FROM audit'),before);reopened.close();assert.throws(()=>buildFnbDemo(folder),/ditimpa/);
 rmSync(manifest.filename);assert.throws(()=>prepareFnbDemo(folder),/hilang/);
});
test('existing F&B demo retains owner-created code-only staff when prepared again',t=>{
 const folder=temp(t),manifest=buildFnbDemo(folder),store=createStore(manifest.filename);let id;
 try{const identity=createIdentity(store),owner=identity.login(FNB_DEMO_ACCOUNTS.owner);id=identity.createStaffInvite(owner,{name:'Staf tambahan demo',role:'cashier',code:'ABCD2345',confirmed:true,idempotencyKey:'demo-staff-additional-key'}).accountId;store.run('DELETE FROM sessions WHERE id=?',owner.id);}finally{store.close();}
 assert.equal(prepareFnbDemo(folder).filename,manifest.filename);const reopened=createStore(manifest.filename);try{assert.equal(reopened.get('SELECT COUNT(*) AS n FROM accounts').n,4);assert.equal(reopened.get('SELECT email FROM accounts WHERE id=?',id).email,null);}finally{reopened.close();}
});
