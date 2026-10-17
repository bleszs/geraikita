import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
import {verifyCandidate} from './asr-comparison-runner.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const previous=read('models/benchmarks/asr-comparison/latest.json'),freeze=read(path.join(previous.directory,'protocol.json'));
assert.equal(sha256(readFileSync(freeze.manifestFile)),freeze.manifestSha256);
for(const [file,hash] of Object.entries(freeze.sourceSha256))assert.equal(sha256(readFileSync(file)),hash,'Changed frozen source: '+file);
for(const candidate of freeze.protocol.candidates)verifyCandidate(candidate);
const records=read(freeze.manifestFile).splits.test.records.slice(0,1),base=path.dirname(freeze.manifestFile);
for(const row of records)assert.equal(sha256(readFileSync(path.join(base,row.audioPath))),row.audioSha256);
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/asr-numerics',runId);
mkdirSync(directory,{recursive:true});
const protocol={runId,frozenAt:new Date().toISOString(),previousRun:previous.directory,profiles:['baseline','openblas_one','unpacked_gemm'],models:['tiny','base'],repeats:8,samples:records.map(r=>({filename:r.filename,audioSha256:r.audioSha256})),selection:'First already-seen comparison test clip; known repeat failure. Diagnostic only, no accuracy claim or model promotion.',changes:{baseline:'Unchanged production import order and model configuration; fingerprints after PCM decoding.',openblas_one:'Only OPENBLAS_NUM_THREADS=1 before native libraries are imported.',unpacked_gemm:'Only CT2_PACKED_GEMM=0 before native libraries are imported.'},sourceSha256:Object.fromEntries(['scripts/probe-asr-numerics.py','scripts/probe-asr-numerics.mjs','server/ml/transcribe.py'].map(f=>[f,sha256(readFileSync(f))]))};
writeFileSync(path.join(directory,'protocol.json'),JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
function run(model,profile,audio){return new Promise((resolve,reject)=>{
  const child=spawn(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['scripts/probe-asr-numerics.py',model,profile],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1'}});
  let stdout='',stderr='',settled=false;
  const fail=error=>{if(settled)return;settled=true;clearTimeout(timer);child.kill();reject(error);};
  const timer=setTimeout(()=>fail(Error('Numerical probe timed out.')),90000);
  child.stdout.on('data',data=>{stdout+=data;if(stdout.length>200000)fail(Error('Probe output limit exceeded.'));});
  child.stderr.on('data',data=>{if(stderr.length<10000)stderr+=data;});child.stdin.on('error',()=>{});
  child.on('error',fail);child.on('close',code=>{if(settled)return;settled=true;clearTimeout(timer);try{resolve({trace:JSON.parse(stdout),stderr,exitCode:code});}catch{reject(Error('Invalid numerical probe JSON: '+stderr.slice(-500)));}});
  child.stdin.end(audio);
});}
const traces=[];
for(const profile of protocol.profiles)for(const model of protocol.models)for(const row of records)for(let repeat=1;repeat<=protocol.repeats;repeat++){
  const result=await run(model,profile,readFileSync(path.join(base,row.audioPath)));traces.push({filename:row.filename,repeat,...result});
  writeFileSync(path.join(directory,'traces.partial.json'),JSON.stringify(traces,null,2)+'\n');console.log(`${traces.length}/48 ${profile} ${model} ${repeat}: ${result.trace.status}`);
}
writeFileSync(path.join(directory,'traces.json'),JSON.stringify(traces,null,2)+'\n',{flag:'wx'});
writeFileSync('models/benchmarks/asr-numerics/latest.json',JSON.stringify({directory,runId,tracesSha256:sha256(readFileSync(path.join(directory,'traces.json')))},null,2)+'\n');
console.log('Numerical evidence: '+directory);
