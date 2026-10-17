import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
import {selectFreshComparison,uniqueKnown} from './asr-profile-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8')),protocolFile='benchmarks/asr-profiles/protocol.json',protocol=read(protocolFile);
const directory=path.join('datasets/public/fleurs/comparison','profiles-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));mkdirSync(directory,{recursive:true});
function run(env,mode){const result=spawnSync(path.resolve(env,process.platform==='win32'?'Scripts/python.exe':'bin/python'),['scripts/asr-profile-data.py',mode,path.resolve(directory)],{stdio:'inherit',windowsHide:true,env:{...process.env,PYTHONUTF8:'1'}});if(result.error)throw result.error;assert.equal(result.status,0,'Profile preparation failed.');}
const previous=[],previousHashes={},oldAudioHashes=new Set();
for(const old of protocol.previousRuns){
  const file=path.join(old.directory,old.predictions);assert.equal(sha256(readFileSync(file)),old.sha256);previous.push(...read(file));previousHashes[file]=old.sha256;
  const freeze=read(path.join(old.directory,'protocol.json')),manifest=read(freeze.manifestFile??freeze.manifestPath);
  const rows=manifest.records??Object.values(manifest.splits).flatMap(s=>s.records);
  for(const row of rows)if(row.audioSha256)oldAudioHashes.add(row.audioSha256);
}
run('.venv-speech-data','metadata');
const known=uniqueKnown(previous),splits=selectFreshComparison({validation:read(path.join(directory,'validation-metadata.json')),test:read(path.join(directory,'test-metadata.json')),previous:known,selection:protocol.selection});
writeFileSync(path.join(directory,'selection.json'),JSON.stringify({protocolSha256:sha256(readFileSync(protocolFile)),previousHashes,knownRecordings:known.length,splits},null,2)+'\n',{flag:'wx'});
run('.venv-speech-data','extract');run('.venv-voice','convert');
const manifest=read(path.join(directory,'manifest.json'));
for(const split of ['validation','test'])for(const row of manifest.splits[split].records)if(row.audioSha256)assert(!oldAudioHashes.has(row.audioSha256),'Previously scored audio selected.');
writeFileSync('datasets/public/fleurs/profiles-index.json',JSON.stringify({directory,manifestSha256:sha256(readFileSync(path.join(directory,'manifest.json')))},null,2)+'\n');
console.log(JSON.stringify({directory,previousUniqueRecordings:known.length,counts:Object.fromEntries(Object.entries(splits).map(([split,s])=>[split,{eligibleGroups:s.eligibleSentenceGroups,selected:s.records.length}]))},null,2));
