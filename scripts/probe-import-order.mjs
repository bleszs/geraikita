import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {sha256} from './speech-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8')),previous=read('models/benchmarks/asr-comparison/latest.json'),freeze=read(path.join(previous.directory,'protocol.json')),manifest=read(freeze.manifestFile),records=manifest.splits.test.records.slice(0,2);
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/asr-import-order',runId);mkdirSync(directory,{recursive:true});
const orders=['production','ct2_first','numpy_first','numpy_then_ct2','av_then_ct2'];
const protocol={frozenAt:new Date().toISOString(),runId,orders,models:['tiny','base'],repeats:2,selection:'The same first two already-seen comparison test clips, diagnostic only.',sourceSha256:Object.fromEntries(['scripts/probe-import-order.py','scripts/probe-import-order.mjs','server/ml/transcribe.py'].map(file=>[file,sha256(readFileSync(file))])),files:records.map(r=>[r.filename,r.audioSha256])};
writeFileSync(path.join(directory,'protocol.json'),JSON.stringify(protocol,null,2)+'\n');
function run(model,order,audio){return new Promise((resolve,reject)=>{const child=spawn(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['scripts/probe-import-order.py',model,order],{stdio:['pipe','pipe','pipe'],windowsHide:true,env:{...process.env,PYTHONUTF8:'1'}});let output='',stderr='';const timer=setTimeout(()=>{child.kill();reject(Error('Import-order probe timed out.'));},90000);child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>{if(stderr.length<4000)stderr+=c;});child.stdin.on('error',()=>{});child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',()=>{clearTimeout(timer);try{resolve(JSON.parse(output));}catch{reject(Error(stderr));}});child.stdin.end(audio);});}
const rows=[];
for(const order of orders)for(const model of protocol.models)for(const row of records)for(let repeat=1;repeat<=2;repeat++){
  const result=await run(model,order,readFileSync(path.join(path.dirname(freeze.manifestFile),row.audioPath)));rows.push({filename:row.filename,repeat,...result});writeFileSync(path.join(directory,'results.partial.json'),JSON.stringify(rows,null,2)+'\n');console.log(`${rows.length}/40 ${order} ${model} repeat ${repeat}: ${result.status}`);
}
writeFileSync(path.join(directory,'results.json'),JSON.stringify(rows,null,2)+'\n');
writeFileSync('models/benchmarks/asr-import-order/latest.json',JSON.stringify({directory,runId,resultsSha256:sha256(readFileSync(path.join(directory,'results.json')))},null,2)+'\n');
console.log('Import-order evidence: '+directory);
