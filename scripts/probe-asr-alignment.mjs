import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const registry=read('benchmarks/asr-stability/evidence.json'),freeze=read(path.join(registry.previousRun,'protocol.json'));
assert.equal(sha256(readFileSync(freeze.manifestFile)),freeze.manifestSha256);
const sample=read(freeze.manifestFile).splits.test.records[0],audio=readFileSync(path.join(path.dirname(freeze.manifestFile),sample.audioPath));assert.equal(sha256(audio),sample.audioSha256);
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/asr-alignment',runId);mkdirSync(directory,{recursive:true});
const files=['scripts/probe-asr-alignment.py','scripts/probe-asr-alignment.mjs','server/ml/transcribe.py','.venv-voice/Lib/site-packages/faster_whisper/feature_extractor.py'];
const protocol={schemaVersion:1,runId,frozenAt:new Date().toISOString(),sample:{filename:sample.filename,audioSha256:sample.audioSha256},profiles:['baseline','openblas_one'],repeats:2,stftAlignments:[0,8,16,24,32,40,48,56],matrixAlignments:[0,16,32,48],purpose:'Controlled numerical sensitivity to buffer alignment, not a new WER test or proof of historical cause. Four complete Tiny captures plus 112 kernel checks. All attempts retained.',sourceSha256:Object.fromEntries(files.map(f=>[f,sha256(readFileSync(f))]))};
writeFileSync(path.join(directory,'protocol.json'),JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
const traces=[];
for(const profile of protocol.profiles)for(let repeat=1;repeat<=protocol.repeats;repeat++){
  const child=spawnSync(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['scripts/probe-asr-alignment.py',profile],{input:audio,encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:300000,env:{...process.env,PYTHONUTF8:'1'}});
  if(child.error)throw child.error;
  const trace=JSON.parse(child.stdout);traces.push({repeat,trace,exitCode:child.status,stderr:child.stderr.slice(0,10000)});writeFileSync(path.join(directory,'traces.partial.json'),JSON.stringify(traces,null,2)+'\n');console.log(`${traces.length}/4 ${profile}: ${trace.status}, different kernels ${trace.rows?.filter(r=>r.unequalValues>0).length}`);
}
writeFileSync(path.join(directory,'traces.json'),JSON.stringify(traces,null,2)+'\n',{flag:'wx'});
writeFileSync('models/benchmarks/asr-alignment/latest.json',JSON.stringify({directory,runId,protocolSha256:sha256(readFileSync(path.join(directory,'protocol.json'))),tracesSha256:sha256(readFileSync(path.join(directory,'traces.json')))},null,2)+'\n');console.log('Alignment evidence: '+directory);
