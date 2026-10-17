import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
import {verifyCandidate} from './asr-comparison-runner.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8')),protocolFile='benchmarks/asr-stability/protocol.json',protocol=read(protocolFile),oldFreeze=read(path.join(protocol.previousRun,'protocol.json')),manifest=read(oldFreeze.manifestFile);
assert.equal(sha256(readFileSync(oldFreeze.manifestFile)),oldFreeze.manifestSha256);
for(const [file,expected] of Object.entries(oldFreeze.sourceSha256))assert.equal(sha256(readFileSync(file)),expected,'Frozen source was changed: '+file);
for(const candidate of oldFreeze.protocol.candidates)verifyCandidate(candidate);
const records=manifest.splits.test.records.slice(0,2),base=path.dirname(oldFreeze.manifestFile);
for(const row of records)assert.equal(sha256(readFileSync(path.join(base,row.audioPath))),row.audioSha256);
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/asr-stability',runId);mkdirSync(directory,{recursive:true});
const frozen={frozenAt:new Date().toISOString(),runId,protocol,sourceSha256:Object.fromEntries([protocolFile,'scripts/probe-asr-stability.py','scripts/probe-asr-stability.mjs','server/ml/transcribe.py'].map(f=>[f,sha256(readFileSync(f))])),samples:records.map(r=>({filename:r.filename,audioSha256:r.audioSha256})),previousInferenceSource:oldFreeze.sourceSha256};
writeFileSync(path.join(directory,'protocol.json'),JSON.stringify(frozen,null,2)+'\n',{flag:'wx'});
function run(model,profile,audio){return new Promise((resolve,reject)=>{
  const python=path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),child=spawn(python,['scripts/probe-asr-stability.py',model,profile],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1'}});
  let output='',stderr='',finished=false;const timer=setTimeout(()=>{child.kill();reject(Error('Diagnostic subprocess timeout.'));},90000);
  child.stdout.on('data',c=>{output+=c;if(output.length>200000){child.kill();reject(Error('Unexpected diagnostic output size.'));}});child.stderr.on('data',c=>{if(stderr.length<10000)stderr+=c;});child.stdin.on('error',()=>{});
  child.once('error',error=>{finished=true;clearTimeout(timer);reject(error);});child.once('close',code=>{clearTimeout(timer);if(finished)return;try{const trace=JSON.parse(output);resolve({trace,stderr,exitCode:code});}catch{reject(Error('Diagnostic worker did not return JSON. '+stderr.slice(-500)));}});child.stdin.end(audio);
});}
const rows=[];
for(const profile of protocol.profiles)for(const model of protocol.models)for(const row of records)for(let repeat=1;repeat<=protocol.repeats;repeat++){
  const started=performance.now(),result=await run(model,profile,readFileSync(path.join(base,row.audioPath)));
  rows.push({filename:row.filename,repeat,elapsedMs:Math.round(performance.now()-started),...result});
  writeFileSync(path.join(directory,'traces.partial.json'),JSON.stringify(rows,null,2)+'\n');console.log(`${rows.length}/${protocol.profiles.length*protocol.models.length*records.length*protocol.repeats} ${profile} ${model} repeat ${repeat}: ${result.trace.status}`);
}
writeFileSync(path.join(directory,'traces.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
const groups=[];
for(const profile of protocol.profiles)for(const model of protocol.models)for(const sample of records){
  const values=rows.filter(r=>r.trace.profile===profile&&r.trace.model===model&&r.filename===sample.filename),unique=fn=>new Set(values.map(r=>JSON.stringify(fn(r.trace)))).size;
  groups.push({profile,model,filename:sample.filename,repeats:values.length,pcmVariants:unique(t=>t.pcm),vadVariants:unique(t=>t.vadPcm),featureVariants:unique(t=>t.features),encoderVariants:unique(t=>t.encoders.map(e=>e.output)),transcriptVariants:unique(t=>t.result?.text??t.errorCode??t.errorType),statusVariants:unique(t=>t.status)});
}
const report={completedAt:new Date().toISOString(),runId,groups,inferences:rows.length,scope:'Diagnostic traces on two already-observed public clips. No new accuracy benchmark, training or active model change.'};
writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');writeFileSync('models/benchmarks/asr-stability/latest.json',JSON.stringify({directory,runId,reportSha256:sha256(readFileSync(path.join(directory,'report.json')))},null,2)+'\n');console.log(JSON.stringify(report,null,2));
