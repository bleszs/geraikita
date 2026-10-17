import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,unlinkSync,rmdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {addDays,dayAt} from '../server/common.mjs';
import {train,validateDataset,validateArtifact,features,fitRidge,predict,metrics,hash} from '../server/ml/forecast-model.mjs';
import {createForecastRegistry} from '../server/forecast-registry.mjs';
import {forecast} from '../server/forecast.mjs';
import {createStore} from '../server/store.mjs';
import {createIdentity} from '../server/identity.mjs';
import {createService} from '../server/service.mjs';
import {exportDatabase,importCsv} from '../scripts/forecast-data.mjs';

// Synthetic numerical cases exist only in this test process/temporary directory.
// They are not a real business evaluation and never enter the active database.
const dataset=(days=112,quantity=i=>10+i*.5)=>({schemaVersion:1,scope:{workspaceId:randomUUID(),businessId:randomUUID(),productId:randomUUID(),unit:'gram'},provenance:{source:'user_records',reference:'Isolated synthetic test of the input contract; not real records.',permissionConfirmed:true,completeDailyRecords:true},observations:Array.from({length:days},(_,i)=>({date:addDays('2026-01-01',i),quantity:quantity(i)}))});
function temp(t){const folder=mkdtempSync(path.join(os.tmpdir(),'gerai-ml-')),files=[];t.after(()=>{for(const f of files.reverse())try{unlinkSync(f);}catch{}try{rmdirSync(folder);}catch{}});return {folder,file(name){const f=path.join(folder,name);files.push(f);return f;}};}

const publicDataset=()=>{const d=dataset();d.scope.workspaceId='public-isolated-test';d.scope.unit='normalized_sales';d.provenance={...d.provenance,source:'public_dataset',usage:'benchmark_only',sourceUrl:'https://example.test/isolated-fixture',license:'CC-BY-4.0',sourceRevision:'a'.repeat(40),rawSha256:'b'.repeat(64)};return d;};

test('public data preserves source precision and requires separate identity, license, source hash and benchmark-only purpose',()=>{
  const data=publicDataset();data.observations[0].quantity=.123456789;validateDataset(data);assert.equal(data.observations[0].quantity,.123456789);
  for(const mutate of [d=>d.scope.workspaceId=randomUUID(),d=>d.provenance.usage='live',d=>d.provenance.license='',d=>d.provenance.rawSha256='',d=>d.provenance.sourceRevision='',d=>d.provenance.source='user_records']){const changed=structuredClone(data);mutate(changed);assert.throws(()=>validateDataset(changed));}
});

test('a trained public model cannot activate or load into the business registry even when it beats both baselines',t=>{
  const dir=temp(t),artifact=train(publicDataset()),file=dir.file('public-model.json'),registryFile=dir.file('registry.json');assert.ok(artifact.evaluation.qualified);validateArtifact(artifact);const raw=JSON.stringify(artifact);writeFileSync(file,raw);const registry=createForecastRegistry(dir.folder);assert.throws(()=>registry.activate(file),/benchmark publik/);
  const key=[artifact.scope.workspaceId,artifact.scope.businessId,artifact.scope.productId].join(':');writeFileSync(registryFile,JSON.stringify({version:1,models:{[key]:{file:'public-model.json',sha256:hash(raw)}}}));assert.equal(registry.get(artifact.scope).status,'unavailable');
});

test('dataset refuses missing permission, gaps, duplicate/future dates, invalid units and short or nonnumeric history',()=>{
  const original=dataset();assert.equal(validateDataset(original),original);
  for(const mutate of [d=>d.provenance.permissionConfirmed=false,d=>d.provenance.completeDailyRecords=false,d=>d.provenance.source='demo',d=>d.scope.unit='karung',d=>d.observations[2].date=d.observations[1].date,d=>d.observations.splice(2,1),d=>d.observations[0].date='2026-02-30',d=>d.observations[0].quantity='10',d=>d.observations[0].quantity=-1,d=>d.observations[0].quantity=.00001]){const d=structuredClone(original);mutate(d);assert.throws(()=>validateDataset(d));}
  assert.throws(()=>validateDataset(original,'2026-01-05'),/sebelum hari/);assert.throws(()=>train(dataset(83)),/84 hari/);
});

test('ridge learns coefficients, matches a known linear relationship and persists portable predictions',()=>{
  const samples=Array.from({length:40},(_,i)=>({date:addDays('2026-01-01',14+i),history:Array.from({length:14+i},(_,j)=>j),actual:2*(14+i)+1}));
  const model=fitRidge(samples,'lags',.01),sample=samples.at(-1),estimated=predict(model,sample.history,sample.date);assert.ok(Math.abs(estimated-sample.actual)<.1);assert.ok(model.weights.some(w=>Math.abs(w)>.01));assert.equal(predict(JSON.parse(JSON.stringify(model)),sample.history,sample.date),estimated);
});

test('chronological split has no target overlap; changing test targets never changes selected features, scaler or coefficients',()=>{
  const d=dataset(),a=train(d),altered=structuredClone(d);const start=a.evaluation.split.test.from;
  for(const row of altered.observations)if(row.date>=start)row.quantity+=200;
  const b=train(altered);assert.deepEqual(a.model,b.model);assert.deepEqual(a.evaluation.selection,b.evaluation.selection);assert.deepEqual(a.evaluation.experiments,b.evaluation.experiments);assert.notDeepEqual(a.evaluation.test,b.evaluation.test);
  const s=a.evaluation.split;assert.ok(s.train.to<s.validation.from);assert.ok(s.validation.to<s.test.from);assert.equal(a.training.to,s.validation.to);assert.equal(a.evaluation.rows.length,7);for(let i=1;i<7;i++)assert.ok(a.evaluation.rows[i-1].targetThrough<a.evaluation.rows[i].date);
});

test('calendar ablation and both baselines use the same two-day targets; zero-demand WAPE remains undefined',()=>{
  const a=train(dataset());assert.equal(a.evaluation.experiments.length,10);assert.ok(Number.isFinite(a.evaluation.ablation.lags));assert.ok(Number.isFinite(a.evaluation.ablation.calendar));for(const m of Object.values(a.evaluation.test))assert.equal(m.observations,7);assert.ok(a.evaluation.qualified);assert.equal(validateArtifact(a),a);
  const zero=train(dataset(84,()=>0));assert.equal(zero.evaluation.test.ridge.mae,0);assert.equal(zero.evaluation.test.ridge.wape,null);assert.equal(zero.evaluation.qualified,false);assert.equal(metrics([{actual:0,predicted:0}],'predicted').wape,null);
});

test('registry activates only qualified artifacts, isolates businesses/units and refuses changed or external files',t=>{
  const dir=temp(t),artifact=train(dataset()),file=dir.file('model.json'),registryFile=dir.file('registry.json');writeFileSync(file,JSON.stringify(artifact));const registry=createForecastRegistry(dir.folder);assert.equal(registry.get(artifact.scope).status,'not_trained');assert.equal(registry.activate(file).activated,true);assert.equal(registry.get(artifact.scope).status,'active');assert.equal(registry.get({...artifact.scope,businessId:randomUUID()}).status,'not_trained');assert.equal(registry.get({...artifact.scope,unit:'kg'}).status,'unavailable');
  writeFileSync(file,JSON.stringify({...artifact,createdAt:'changed'}));assert.equal(registry.get(artifact.scope).status,'unavailable');writeFileSync(file,JSON.stringify(train(dataset(84,()=>10))));assert.throws(()=>registry.activate(file),/tidak mengalahkan/);assert.ok(readFileSync(registryFile,'utf8').includes('sha256'));assert.throws(()=>registry.activate('package.json'),/di dalam/);
});

test('runtime uses qualified ridge only after evaluation period and with sufficient recent history; invalid models fall back',()=>{
  const data=dataset(),artifact=train(data),series=data.observations.map(r=>({date:r.date,qty:r.quantity})),asOf=addDays(data.observations.at(-1).date,1),active={status:'active',artifact};
  const result=forecast(series,7,asOf,2,'gram',active);assert.equal(result.method,'ridge_two_day');assert.equal(result.trainedModel.status,'active');assert.equal(result.predicted,Math.ceil(predict(artifact.model,series.map(r=>r.qty),asOf)*100)/100);assert.equal(result.amount,Math.ceil(Math.max(0,predict(artifact.model,series.map(r=>r.qty),asOf)-7)*100)/100);
  assert.notEqual(forecast(series,7,data.observations.at(-1).date,2,'gram',active).method,'ridge_two_day');assert.notEqual(forecast(series.slice(-10),7,asOf,2,'gram',active).method,'ridge_two_day');assert.notEqual(forecast(series,7,asOf,2,'kg',active).method,'ridge_two_day');const bad=structuredClone(active);bad.artifact.model.weights[0]=null;assert.equal(forecast(series,7,asOf,2,'gram',bad).trainedModel.status,'unavailable');
  const future=[...series,{date:asOf,qty:99999}];assert.deepEqual(forecast(future,7,asOf,2,'gram',active),result);
});

test('real-record export is read-only, scoped and requires explicit completeness; CSV import never fills missing dates',t=>{
  const dir=temp(t),file=dir.file('source.sqlite');dir.file('source.sqlite-wal');dir.file('source.sqlite-shm');const store=createStore(file),identity=createIdentity(store),service=createService(store);const s=identity.register({businessName:'Isolated export test',communityName:'Isolated export community',email:randomUUID()+'@example.test',password:'Only-test-password-919'}),p=service.saveIngredient(s,null,{name:'Material test',unit:'gram',min:0,storageNote:'',catalogRevision:1});store.run('INSERT INTO daily_usage VALUES(?,?,?,?,?)',s.workspace_id,s.business_id,p.id,'2026-01-01',120000);store.run('INSERT INTO daily_usage VALUES(?,?,?,?,?)',s.workspace_id,s.business_id,p.id,'2026-01-03',170000);store.close();
  const options={filename:file,workspaceId:s.workspace_id,businessId:s.business_id,productId:p.id,from:'2026-01-01',to:'2026-01-03',reference:'Synthetic test of export permission handling',confirmed:true};const result=exportDatabase(options);assert.deepEqual(result.observations.map(r=>r.quantity),[12,0,17]);assert.throws(()=>exportDatabase({...options,confirmed:false}),/Konfirmasi/);assert.throws(()=>exportDatabase({...options,businessId:randomUUID()}),/tidak ditemukan/);assert.throws(()=>exportDatabase({...options,from:'2025-12-01'}),/mendahului/);const db=new DatabaseSync(file,{readOnly:true});assert.equal(db.prepare('SELECT COUNT(*) AS n FROM daily_usage').get().n,2);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sales').get().n,0);db.close();
  const csv=dir.file('input.csv');writeFileSync(csv,'date,quantity\n2026-01-01,12\n2026-01-03,17\n');assert.throws(()=>importCsv(csv,{...result,observations:undefined}),/tanggal hilang/);writeFileSync(csv,'date,quantity\n2026-01-01,12\n2026-01-02,0\n2026-01-03,17\n');assert.equal(importCsv(csv,result).observations.length,3);
});

test('training CLI refuses absent user data, produces files for a supplied isolated dataset, and never activates automatically',t=>{
  const dir=temp(t),input=dir.file('dataset.json');writeFileSync(input,JSON.stringify(dataset()));const output=path.join(dir.folder,'run');mkdirSync(output);const model=path.join(output,'model.json'),evaluation=path.join(output,'evaluation.json');t.after(()=>{try{rmdirSync(output);}catch{}});dir.file('run/evaluation.json');dir.file('run/model.json');
  const empty=spawnSync(process.execPath,['scripts/forecast.mjs','train'],{encoding:'utf8'});assert.equal(empty.status,1);assert.match(empty.stderr,/Tidak ada dataset bawaan/);
  const trained=spawnSync(process.execPath,['scripts/forecast.mjs','train','--dataset',input,'--out',output],{encoding:'utf8'});assert.equal(trained.status,0,trained.stderr);assert.ok(validateArtifact(JSON.parse(readFileSync(model,'utf8'))));assert.ok(JSON.parse(readFileSync(evaluation,'utf8')).rows.length);assert.equal(JSON.parse(trained.stdout).activated,false);const repeat=spawnSync(process.execPath,['scripts/forecast.mjs','train','--dataset',input,'--out',output],{encoding:'utf8'});assert.equal(repeat.status,1);assert.match(repeat.stderr,/EEXIST/);
});

test('bootstrap loads only the active business model and falls back when its artifact disappears',t=>{
  const dir=temp(t),file=dir.file('model.json');dir.file('registry.json');const old=process.env.FORECAST_MODEL_DIR;process.env.FORECAST_MODEL_DIR=dir.folder;t.after(()=>{if(old===undefined)delete process.env.FORECAST_MODEL_DIR;else process.env.FORECAST_MODEL_DIR=old;});
  const store=createStore(':memory:');t.after(()=>store.close());const identity=createIdentity(store),service=createService(store),s=identity.register({businessName:'Isolated model owner',communityName:'Isolated model community',email:randomUUID()+'@example.test',password:'Only-test-password-900'}),p=service.saveIngredient(s,null,{name:'Isolated model material',unit:'gram',min:0,storageNote:'',catalogRevision:1});
  const data=dataset();data.scope={workspaceId:s.workspace_id,businessId:s.business_id,productId:p.id,unit:'gram'};data.observations.forEach((row,i)=>{row.date=addDays(dayAt(),i-data.observations.length);store.run('INSERT INTO daily_usage VALUES(?,?,?,?,?)',s.workspace_id,s.business_id,p.id,row.date,Math.round(row.quantity*10000));});const artifact=train(data);writeFileSync(file,JSON.stringify(artifact));createForecastRegistry(dir.folder).activate(file);
  assert.equal(service.bootstrap(s).recommendations[0].method,'ridge_two_day');const member=identity.register({businessName:'Isolated other member',inviteCode:service.bootstrap(s).community.inviteCode,email:randomUUID()+'@example.test',password:'Only-test-password-901'});service.saveIngredient(member,null,{name:'Isolated model material',unit:'gram',min:0,storageNote:'',catalogRevision:1});assert.equal(service.bootstrap(member).recommendations[0].trainedModel.status,'not_trained');unlinkSync(file);assert.equal(service.bootstrap(s).recommendations[0].trainedModel.status,'unavailable');assert.notEqual(service.bootstrap(s).recommendations[0].method,'ridge_two_day');
});
