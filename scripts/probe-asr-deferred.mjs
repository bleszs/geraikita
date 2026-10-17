import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
import {verifyCandidate} from './asr-comparison-runner.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const registry=read('benchmarks/asr-stability/evidence.json'),freeze=read(path.join(registry.previousRun,'protocol.json'));
for(const [file,hash] of Object.entries(freeze.sourceSha256))assert.equal(sha256(readFileSync(file)),hash,'Changed frozen source: '+file);
assert.equal(sha256(readFileSync(freeze.manifestFile)),freeze.manifestSha256);
for(const candidate of freeze.protocol.candidates)verifyCandidate(candidate);
const sample=read(freeze.manifestFile).splits.test.records[0],audio=readFileSync(path.join(path.dirname(freeze.manifestFile),sample.audioPath));
assert.equal(sha256(audio),sample.audioSha256);
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/asr-deferred',runId);
mkdirSync(directory,{recursive:true});
const protocol={schemaVersion:1,runId,frozenAt:new Date().toISOString(),previousRun:registry.previousRun,models:['tiny','base'],profiles:['baseline','openblas_one'],modes:['plain','deferred'],repeats:8,sample:{filename:sample.filename,audioSha256:sample.audioSha256},selection:'First already-seen FLEURS comparison test clip, chosen for repeat failures; not a new accuracy test.',policy:'All 64 cold inferences retained; no retry-until-pass, model promotion, WER tuning or business data changes.',instrumentation:'Plain Tiny calls the unchanged production transcribe directly. Deferred uses sys.setprofile to retain references to returned feature intermediates/encoder buffers; all tensor hashing occurs after complete inference. This still changes timing/allocation/lifetimes and cannot establish equivalence to plain mode.',environment:Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(CT2_|MKL_|OMP_|OPENBLAS_)/.test(k))),sourceSha256:Object.fromEntries(['scripts/probe-asr-deferred.py','scripts/probe-asr-deferred.mjs','server/ml/transcribe.py','requirements-voice.txt','.venv-voice/Lib/site-packages/faster_whisper/feature_extractor.py','.venv-voice/Lib/site-packages/faster_whisper/transcribe.py'].map(f=>[f,sha256(readFileSync(f))]))};
writeFileSync(path.join(directory,'protocol.json'),JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
function run(model,profile,mode){return new Promise((resolve,reject)=>{
  const child=spawn(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['scripts/probe-asr-deferred.py',model,profile,mode],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1'}});
  let stdout='',stderr='',settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){child.kill();reject(error);}else resolve(value);};
  const timer=setTimeout(()=>finish(Error('Deferred probe timed out.')),90000);
  child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>250000)finish(Error('Probe output limit exceeded.'));});
  child.stderr.on('data',chunk=>{if(stderr.length<10000)stderr+=chunk;});child.stdin.on('error',()=>{});
  child.once('error',error=>finish(error));child.once('close',exitCode=>{if(settled)return;try{finish(null,{trace:JSON.parse(stdout),stderr,exitCode});}catch{finish(Error('Probe returned invalid JSON: '+stderr.slice(-500)));}});child.stdin.end(audio);
});}
const traces=[];
// Alternate model and numerical setting inside each repeat to reduce order confounding.
for(let repeat=1;repeat<=protocol.repeats;repeat++)for(const mode of protocol.modes)for(const profile of repeat%2?protocol.profiles:[...protocol.profiles].reverse())for(const model of repeat%2?protocol.models:[...protocol.models].reverse()){
  const started=performance.now();const result=await run(model,profile,mode);traces.push({filename:sample.filename,repeat,elapsedMs:Math.round(performance.now()-started),...result});
  writeFileSync(path.join(directory,'traces.partial.json'),JSON.stringify(traces,null,2)+'\n');console.log(`${traces.length}/64 ${model} ${profile} ${mode} repeat ${repeat}: ${result.trace.status}${result.trace.traceError?' TRACE ERROR':''}`);
}
writeFileSync(path.join(directory,'traces.json'),JSON.stringify(traces,null,2)+'\n',{flag:'wx'});
writeFileSync('models/benchmarks/asr-deferred/latest.json',JSON.stringify({directory,runId,protocolSha256:sha256(readFileSync(path.join(directory,'protocol.json'))),tracesSha256:sha256(readFileSync(path.join(directory,'traces.json')))},null,2)+'\n');
console.log('Deferred probe evidence: '+directory);
