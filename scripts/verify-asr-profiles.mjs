import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha256,scoreSpeech} from './speech-evaluation.mjs';
import {chooseProfile,profileMetrics,uniqueKnown,selectFreshComparison,summarizeProfileRepeats} from './asr-profile-evaluation.mjs';
import {verifySpeechProfile,speechProfile} from '../server/speech-profiles.mjs';
import {featureStageOrder} from './asr-followup-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8')),pointer=read('models/benchmarks/asr-profiles/latest.json'),directory=pointer.directory,freeze=read(path.join(directory,'protocol.json')),protocol=freeze.protocol,manifest=read(freeze.manifestFile),predictions=read(path.join(directory,'predictions.json')),report=read(path.join(directory,'report.json')),repeats=read(path.join(directory,'repeats.json')),captures=read(path.join(directory,'captures.json'));
assert.equal(sha256(readFileSync(path.join(directory,'report.json'))),pointer.reportSha256);assert.equal(sha256(readFileSync(path.join(directory,'predictions.json'))),pointer.predictionsSha256);assert.equal(sha256(readFileSync(freeze.manifestFile)),freeze.manifestSha256);
for(const [file,hash] of Object.entries(freeze.sourceSha256))assert.equal(sha256(readFileSync(file)),hash,'Changed frozen profile source: '+file);
for(const id of protocol.profiles)await verifySpeechProfile(id);
const known=[],oldHashes=new Set();
for(const old of protocol.previousRuns){
  const file=path.join(old.directory,old.predictions);assert.equal(sha256(readFileSync(file)),old.sha256);known.push(...read(file));
  const frozen=read(path.join(old.directory,'protocol.json')),oldManifest=read(frozen.manifestFile??frozen.manifestPath);
  for(const row of oldManifest.records??Object.values(oldManifest.splits).flatMap(s=>s.records))if(row.audioSha256)oldHashes.add(row.audioSha256);
}
const sourceBase=path.dirname(freeze.manifestFile),selected=selectFreshComparison({validation:read(path.join(sourceBase,'validation-metadata.json')),test:read(path.join(sourceBase,'test-metadata.json')),previous:uniqueKnown(known),selection:protocol.selection});
const identity=row=>[row.filename,row.sentenceId,row.reference,row.originalSha256??null,row.audioSha256??null,row.preparationError??null];
for(const split of ['validation','test']){
  assert.deepEqual(manifest.splits[split].records.map(r=>[r.filename,r.sentenceId,r.reference]),selected[split].records.map(r=>[r.filename,r.sentenceId,r.reference]));
  for(const row of manifest.splits[split].records)if(!row.preparationError){assert.equal(sha256(readFileSync(path.join(sourceBase,row.audioPath))),row.audioSha256);assert(!oldHashes.has(row.audioSha256));}
}
// Reconstruct from pinned Parquet; this verification does not run inference.
const preparation=spawnSync(process.execPath,['scripts/prepare-asr-profiles.mjs'],{stdio:'inherit',windowsHide:true});if(preparation.error)throw preparation.error;assert.equal(preparation.status,0);
const newPointer=read('datasets/public/fleurs/profiles-index.json'),reprepared=read(path.join(newPointer.directory,'manifest.json'));
for(const split of ['validation','test'])assert.deepEqual(reprepared.splits[split].records.map(identity),manifest.splits[split].records.map(identity),'Repreparation changed audio/reference.');
const expected=protocol.profiles.length*(protocol.selection.validationCount+protocol.selection.testCount),seen=new Set();assert.equal(predictions.length,expected);
for(const row of predictions){
  assert(protocol.profiles.includes(row.profile)&&['validation','test'].includes(row.split));const original=manifest.splits[row.split].records.find(r=>r.filename===row.filename);assert(original);assert.equal(row.sentenceId,original.sentenceId);assert.equal(row.reference,original.reference);assert.equal(row.audioSha256,original.audioSha256??null);assert.deepEqual(row.score,scoreSpeech(row.reference,row.hypothesis));
  const key=JSON.stringify([row.split,row.profile,row.filename]);assert(!seen.has(key),'Duplicate prediction.');seen.add(key);
}
const validationRows=predictions.filter(r=>r.split==='validation'),testRows=predictions.filter(r=>r.split==='test'),validation=profileMetrics(validationRows,protocol.profiles),test=profileMetrics(testRows,protocol.profiles);
assert.deepEqual(report.metrics,{validation,test});const decision=read(path.join(directory,'decision.json'));
assert.equal(decision.validationPredictionsSha256,sha256(JSON.stringify(validationRows)));assert.deepEqual(decision.validation,validation);
for(const [key,value] of Object.entries(chooseProfile(validation,{relativeBaseWerReduction:protocol.decision.relativeBaseWerReduction,maxP95Ms:protocol.decision.maxP95Ms})))assert.deepEqual(decision[key],value);
const decisionSha256=sha256(readFileSync(path.join(directory,'decision.json'))),start=read(path.join(directory,'test-start.json'));assert.equal(start.decisionSha256,decisionSha256);assert.equal(report.decisionSha256,decisionSha256);assert(Date.parse(decision.decidedAt)<=Date.parse(start.startedAt));assert.deepEqual(report.decision,decision);
const repeatRows=manifest.splits.test.records.slice(0,protocol.verification.firstTestClips),summary=summarizeProfileRepeats(repeats,testRows,{profiles:protocol.profiles,filenames:repeatRows.map(r=>r.filename),repeats:protocol.verification.additionalRepeats});assert.deepEqual(summary,report.repeatSummary);
for(const row of repeats){
  const original=testRows.find(r=>r.profile===row.profile&&r.filename===row.filename);
  assert.equal(row.split,'test');assert.equal(row.reference,original.reference);assert.equal(row.sentenceId,original.sentenceId);assert.deepEqual(row.score,scoreSpeech(row.reference,row.hypothesis));assert(Number.isFinite(row.latencyMs)&&row.latencyMs>=0);
}
assert.equal(report.counts.mainInferences,predictions.length);assert.equal(report.counts.repeatedInferences,repeats.length);assert.equal(report.counts.triggeredCaptures,captures.length);
const captureAnalysis=[];
for(const profile of protocol.profiles){
  const first=repeats.find(r=>r.profile===profile&&testRows.some(o=>o.profile===profile&&o.filename===r.filename&&(o.hypothesis!==r.hypothesis||o.status!==r.status))),failureFile=path.join(directory,`first-failure-${profile}.json`),values=captures.filter(c=>c.profile===profile);
  assert.equal(existsSync(failureFile),Boolean(first));assert.equal(values.length,first?protocol.verification.firstMismatchCaptures:0);
  if(!first)continue;
  const failure=read(failureFile);assert.deepEqual(failure.repeated,first);assert.deepEqual(failure.original,testRows.find(r=>r.profile===profile&&r.filename===first.filename));
  for(const [i,row] of values.entries()){
    assert.equal(row.filename,first.filename);assert.equal(row.traceRepeat,i+1);
    if(!row.captureError){assert.equal(row.trace.inputSha256,first.audioSha256);assert.equal(row.trace.model,speechProfile(profile).model);}
  }
  const usable=values.filter(c=>!c.captureError&&c.exitCode===0&&c.trace.status==='accepted'&&!c.trace.traceError),stages={};
  const buffer=b=>{assert(b&&/^[a-f0-9]{64}$/.test(b.sha256));return [b.sha256,b.shape,b.dtype];};
  const get=(t,name)=>name==='pcm'?[buffer(t.stages.pcm)]:name.startsWith('encoder_')?t.stages.encoders.map(e=>buffer(e[name==='encoder_input'?'input':'output'])):t.stages.features.map(f=>buffer(f[name]));
  for(const name of featureStageOrder)stages[name]=usable.length?new Set(usable.map(c=>JSON.stringify(get(c.trace,name)))).size:null;
  const textVariants=usable.length?new Set(usable.map(c=>c.trace.result.text)).size:null;
  captureAnalysis.push({profile,filename:first.filename,captures:values.length,usable:usable.length,stageVariants:stages,transcriptVariants:textVariants,firstChangedStage:usable.length>=2?featureStageOrder.find(name=>stages[name]>1)??(textVariants>1?'text_after_encoder':null):null});
}
assert.equal(captures.length,captureAnalysis.reduce((n,c)=>n+c.captures,0));
const audit={checkedAt:new Date().toISOString(),runId:report.runId,directory,auditPassed:true,repreparedFromPinnedRaw:true,allSourceModelAudioHashesVerified:true,allMetricsAndDecisionRecomputed:true,decisionFrozenBeforeTest:true,repeatResultsRetained:true,repeatSummary:summary,captureAnalysis,causeEstablished:false,fixValidated:false,readyForPromotion:false,activeModelChanged:false,scope:'Audit and scoped profile experiment only. No additional repeat-until-pass inference or rewriting historical results.'};
writeFileSync('docs/evaluation/asr-profile-audit.json',JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit,null,2));
