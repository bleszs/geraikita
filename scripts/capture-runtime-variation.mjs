import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
import {verifySpeechProfile} from '../server/speech-profiles.mjs';
import {featureStageOrder} from './asr-followup-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8')),firstFile='docs/evaluation/runtime-speech-smoke-first.json',first=read(firstFile),variation=first.variations.find(v=>v.profile==='base-pinned');assert(variation,'No first Base discrepancy to investigate.');
const pointer=read('models/benchmarks/asr-profiles/latest.json'),freeze=read(path.join(pointer.directory,'protocol.json'));assert.equal(first.publicSourceRun,pointer.runId);assert.equal(sha256(readFileSync(freeze.manifestFile)),freeze.manifestSha256);
const row=read(freeze.manifestFile).splits.test.records.find(r=>r.filename===variation.filename);assert(row);const audio=readFileSync(path.join(path.dirname(freeze.manifestFile),row.audioPath));assert.equal(sha256(audio),variation.audioSha256);await verifySpeechProfile('base-pinned');
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/runtime-speech-capture',runId);mkdirSync(directory,{recursive:true});
const protocol={runId,frozenAt:new Date().toISOString(),firstFile,firstSha256:sha256(readFileSync(firstFile)),selection:'First Base pinned discrepancy from the first real-HTTP integration smoke; known public clip only.',filename:row.filename,audioSha256:row.audioSha256,repeats:4,mode:'deferred',profile:'base-pinned',policy:'Four captures once; preserve all attempts and original/HTTP text; no score replacement or retry until match. Profiling changes timing/lifetime; no equivalence to unprofiled HTTP is assumed.',sourceSha256:Object.fromEntries(['scripts/capture-runtime-variation.mjs','scripts/probe-asr-deferred.py','server/ml/transcribe.py','server/ml/transcribe-profile.py'].map(f=>[f,sha256(readFileSync(f))]))};
writeFileSync(path.join(directory,'protocol.json'),JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
function capture(){return new Promise((resolve,reject)=>{
  const child=spawn(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['scripts/probe-asr-deferred.py','base','openblas_one','deferred'],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1'}});let stdout='',stderr='',done=false;
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);if(error){child.kill();reject(error);}else resolve(value);};const timer=setTimeout(()=>finish(Error('Capture timed out.')),90000);
  child.stdout.on('data',c=>{stdout+=c;if(stdout.length>250000)finish(Error('Capture output too large.'));});child.stderr.on('data',c=>{if(stderr.length<10000)stderr+=c;});child.stdin.on('error',()=>{});child.once('error',e=>finish(e));child.once('close',exitCode=>{if(done)return;try{finish(null,{trace:JSON.parse(stdout),exitCode,stderr});}catch{finish(Error('Capture output invalid.'));}});child.stdin.end(audio);
});}
const traces=[];
for(let repeat=1;repeat<=protocol.repeats;repeat++){
  try{traces.push({repeat,...await capture()});}catch(error){traces.push({repeat,captureError:error.message});}
  writeFileSync(path.join(directory,'traces.partial.json'),JSON.stringify(traces,null,2)+'\n');console.log(`Capture ${repeat}/4: ${traces.at(-1).trace?.status??'error'}`);
}
writeFileSync(path.join(directory,'traces.json'),JSON.stringify(traces,null,2)+'\n',{flag:'wx'});
const usable=traces.filter(t=>!t.captureError&&t.exitCode===0&&t.trace.status==='accepted'&&!t.trace.traceError);
for(const item of usable)assert.equal(item.trace.inputSha256,row.audioSha256);
const buffer=b=>{assert(b&&/^[a-f0-9]{64}$/.test(b.sha256));return [b.sha256,b.shape,b.dtype];};
const get=(t,name)=>name==='pcm'?[buffer(t.stages.pcm)]:name.startsWith('encoder_')?t.stages.encoders.map(e=>buffer(e[name==='encoder_input'?'input':'output'])):t.stages.features.map(f=>buffer(f[name]));
const stageVariants=Object.fromEntries(featureStageOrder.map(name=>[name,usable.length?new Set(usable.map(t=>JSON.stringify(get(t.trace,name)))).size:null]));
const transcriptVariants=usable.length?new Set(usable.map(t=>t.trace.result.text)).size:null;
const report={checkedAt:new Date().toISOString(),directory,runId,protocolSha256:sha256(readFileSync(path.join(directory,'protocol.json'))),tracesSha256:sha256(readFileSync(path.join(directory,'traces.json'))),firstEvidenceSha256:protocol.firstSha256,firstDiscrepancy:variation,captures:traces.length,usable:usable.length,stageVariants,transcriptVariants,firstChangedStage:usable.length>=2?featureStageOrder.find(n=>stageVariants[n]>1)??(transcriptVariants>1?'text_after_encoder':null):null,causeEstablished:false,fixValidated:false,readyForPromotion:false,scope:protocol.policy};
writeFileSync('docs/evaluation/runtime-speech-capture.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
