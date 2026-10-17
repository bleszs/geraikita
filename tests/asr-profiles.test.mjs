import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {speechProfile,profileRunner,createProfileTranscriber} from '../server/speech-profiles.mjs';
import {uniqueKnown,selectFreshComparison,chooseProfile,summarizeProfileRepeats} from '../scripts/asr-profile-evaluation.mjs';
const result={text:'pesanan',durationSeconds:1,model:'whisper-base',profile:'base-pinned',openblasThreads:'1'};
function childFixture(){const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>child.emit('close',1);return child;}
test('only named profiles are accepted; prototype names cannot select code or models',()=>{
  for(const id of ['__proto__','constructor','../tiny','large',null])assert.throws(()=>speechProfile(id));
  assert.equal(speechProfile('tiny-pinned').openblasThreads,'1');assert.equal(speechProfile('tiny-current').openblasThreads,null);assert(Object.isFrozen(speechProfile('base-pinned')));
});
test('pinned runner sets its environment before startup and preserves bounded production transport',async()=>{
  const child=childFixture();let settings;
  const pending=profileRunner('base-pinned',{spawnProcess(exe,args,options){settings={exe,args,options};return child;}})(Buffer.from('public fixture'));
  assert.equal(settings.options.env.OPENBLAS_NUM_THREADS,'1');assert.equal(settings.options.windowsHide,true);assert.equal(settings.args[1],'base-pinned');assert(settings.args[0].endsWith('transcribe-profile.py'));
  child.stdout.end(JSON.stringify(result));child.emit('close',0);assert.deepEqual(await pending,result);
});
test('runner refuses results from another model or numerical profile',async()=>{
  for(const output of [{...result,model:'whisper-tiny'},{...result,profile:'tiny-pinned'},{...result,openblasThreads:'12'}]){
    const child=childFixture(),pending=profileRunner('base-pinned',{spawnProcess:()=>child})(Buffer.from('public fixture'));child.stdout.end(JSON.stringify(output));child.emit('close',0);await assert.rejects(pending,error=>error.status===503);
  }
});
test('profile status reports the selected model and caches readiness without replacing the live singleton',async()=>{
  let checks=0;const engine=createProfileTranscriber('base-pinned',{verifyFiles:async()=>{},runner:async(_,options)=>options.check?(checks++,{ready:true}):result});
  assert.equal((await engine.status()).model,'whisper-base');assert.equal((await engine.status()).openblasThreads,'1');assert.equal(checks,1);
  assert.equal((await engine.transcribe({mimeType:'audio/wav',audio:Buffer.from('audio').toString('base64')})).profile,'base-pinned');
});
test('new factory respects explicit disable and preserves single-inference concurrency',async()=>{
  assert.equal((await createProfileTranscriber('base-pinned',{disabled:true}).status()).available,false);
  let release;const engine=createProfileTranscriber('tiny-pinned',{disabled:false,verifyFiles:async()=>{},runner:async(_,options)=>options.check?{ready:true}:new Promise(resolve=>{release=resolve;})});
  await engine.status();const payload={mimeType:'audio/wav',audio:Buffer.from('a').toString('base64')},first=engine.transcribe(payload);await new Promise(resolve=>setImmediate(resolve));
  await assert.rejects(engine.transcribe(payload),error=>error.status===429);release({...result,model:'whisper-tiny',profile:'tiny-pinned'});await first;
});
test('historical model duplicates are merged, conflicting references fail closed',()=>{
  const row={filename:'seen.wav',sentenceId:1,reference:'sudah dilihat'};assert.equal(uniqueKnown([row,{...row}]).length,1);assert.throws(()=>uniqueKnown([row,{...row,reference:'diubah'}]),/Conflicting/);
});
test('fresh selection excludes all earlier scored identities/text and full validation identities from test',()=>{
  const row=(n,text='kalimat '+n)=>({filename:n+'.wav',sentenceId:n,reference:text});
  const selected=selectFreshComparison({validation:[row(1),row(2),row(3)],test:[row(4,'dilihat'),row(5),row(2),row(6)],previous:[row(10,'dilihat'),row(1)],selection:{validationCount:1,testCount:2,seed:'profile-test'}});
  assert(!selected.validation.records.some(r=>r.sentenceId===1));assert.deepEqual(new Set(selected.test.records.map(r=>r.sentenceId)),new Set([5,6]));
});
const metric=(wer,changes={})=>({observations:4,wer,errors:0,rejected:0,latencyMs:{p95:3000},...changes}),thresholds={relativeBaseWerReduction:.1,maxP95Ms:15000};
test('validation prioritizes Base only when every frozen gate passes; otherwise tests Tiny pin then current',()=>{
  const values={'tiny-current':metric(.5),'tiny-pinned':metric(.5),'base-pinned':metric(.4)};assert.equal(chooseProfile(values,thresholds).selectedProfile,'base-pinned');
  values['base-pinned']=metric(.4,{rejected:1});assert.equal(chooseProfile(values,thresholds).selectedProfile,'tiny-pinned');
  values['tiny-pinned']=metric(.51);assert.equal(chooseProfile(values,thresholds).selectedProfile,'tiny-current');
});
test('missing observations, infrastructure failure and slow candidate cannot pass selection',()=>{
  const values={'tiny-current':metric(.5),'tiny-pinned':metric(.4,{errors:1}),'base-pinned':metric(.3,{latencyMs:{p95:16000}})};assert.equal(chooseProfile(values,thresholds).selectedProfile,'tiny-current');
  values['tiny-pinned']=metric(.4,{observations:3});assert.throws(()=>chooseProfile(values,thresholds),/Incomplete/);
});
const original={profile:'tiny-pinned',filename:'clip.wav',audioSha256:'a'.repeat(64),status:'accepted',hypothesis:'asli'};
const cohort={profiles:['tiny-pinned'],filenames:['clip.wav'],repeats:2};
test('a first mismatch remains failed even if a later repeat agrees with the original',()=>{
  const rows=[{...original,repeat:1,hypothesis:'berubah'},{...original,repeat:2}];const summary=summarizeProfileRepeats(rows,[original],cohort)['tiny-pinned'];assert.equal(summary.changed,1);assert.equal(summary.observedRepeatMatch,false);
});
test('repeat cohort rejects duplication, missing attempts, changed audio and matching rejections as success',()=>{
  const rows=[{...original,repeat:1},{...original,repeat:2}];assert.throws(()=>summarizeProfileRepeats(rows.slice(1),[original],cohort),/Incomplete/);
  assert.throws(()=>summarizeProfileRepeats([rows[0],rows[0]],[original],cohort),/Duplicate/);assert.throws(()=>summarizeProfileRepeats([rows[0],{...rows[1],audioSha256:'b'.repeat(64)}],[original],cohort),/Changed/);
  const rejected={...original,status:'rejected',hypothesis:''},values=[{...rejected,repeat:1},{...rejected,repeat:2}];assert.equal(summarizeProfileRepeats(values,[rejected],cohort)['tiny-pinned'].observedRepeatMatch,false);
});
