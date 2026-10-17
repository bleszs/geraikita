// Real CLI -> HTTP -> pinned local worker, using only temporary databases/public audio.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,unlinkSync,rmdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256} from './speech-evaluation.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const pointer=read('models/benchmarks/asr-profiles/latest.json'),freeze=read(path.join(pointer.directory,'protocol.json')),manifest=read(freeze.manifestFile),predictions=read(path.join(pointer.directory,'predictions.json')),samples=manifest.splits.test.records.slice(0,2);
const directory=mkdtempSync(path.join(os.tmpdir(),'gerai-runtime-speech-')),files=[],cases=[],variations=[];
const firstFile='docs/evaluation/runtime-speech-smoke-first.json';
if(!existsSync(firstFile)&&existsSync('docs/evaluation/runtime-speech-smoke.json'))writeFileSync(firstFile,readFileSync('docs/evaluation/runtime-speech-smoke.json'),{flag:'wx'});
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),runDirectory=path.join('models/benchmarks/runtime-speech',runId);
mkdirSync(runDirectory,{recursive:true});
const protocol={runId,frozenAt:new Date().toISOString(),publicSourceRun:pointer.runId,manifestSha256:sha256(readFileSync(freeze.manifestFile)),firstEvidenceSha256:existsSync(firstFile)?sha256(readFileSync(firstFile)):null,scope:'CLI/HTTP integration check after startup-port support was added. Three already-seen public clip inferences; all earlier discrepancies retained. Not a new ASR accuracy benchmark.',sourceSha256:Object.fromEntries(['scripts/serve.mjs','scripts/start-options.mjs','server/runtime-speech.mjs','scripts/doctor.mjs','scripts/runtime-speech-health.mjs','scripts/smoke-runtime-speech.mjs'].map(f=>[f,sha256(readFileSync(f))]))};
writeFileSync(path.join(runDirectory,'protocol.json'),JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
const digestDatabase=filename=>{
  const db=new DatabaseSync(filename,{readOnly:true});
  try{db.exec('BEGIN');return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,sha256(JSON.stringify(db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all().map(r=>JSON.stringify(r)).sort()))]));}finally{db.close();}
};
function start(filename,profile){return new Promise((resolve,reject)=>{
  const env={...process.env,PORT:'0',DATABASE_PATH:filename,AI_PROVIDER:'rules'};delete env.SPEECH_PROFILE;delete env.SPEECH_PROVIDER;
  const child=spawn(process.execPath,['scripts/serve.mjs','--port','0',...(profile?['--speech-profile',profile]:[])],{windowsHide:true,stdio:['ignore','pipe','pipe'],env});
  let stdout='',stderr='',settled=false;
  const timer=setTimeout(()=>{child.kill();reject(Error('Temporary CLI server startup timed out.'));},15000);
  child.stderr.on('data',c=>{if(stderr.length<8000)stderr+=c;});
  child.stdout.on('data',c=>{stdout+=c;const match=stdout.match(/http:\/\/localhost:(\d+)/);if(match&&!settled){settled=true;clearTimeout(timer);resolve({child,url:'http://127.0.0.1:'+match[1]});}});
  child.once('error',error=>{if(!settled){settled=true;clearTimeout(timer);reject(error);}});
  child.once('exit',code=>{if(!settled){settled=true;clearTimeout(timer);reject(Error('Temporary CLI server exited '+code+': '+stderr.slice(-500)));}});
});}
async function stop(child){
  if(child.exitCode!==null||child.signalCode!==null)return;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Temporary server did not stop.')),5000);child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill('SIGTERM');});
}
try{
  for(const profile of [null,'base-pinned']){
    const filename=path.join(directory,profile?'base.sqlite':'default.sqlite');files.push(filename);
    assert(path.resolve(filename).startsWith(path.resolve(directory)+path.sep));
    const {child,url}=await start(filename,profile);
    try{
      const healthResponse=await fetch(url+'/api/health',{signal:AbortSignal.timeout(40000)}),health=await healthResponse.json();assert.equal(healthResponse.status,200);assert.equal(health.speech.available,true);assert.equal(health.speech.model,profile?'whisper-base':'whisper-tiny');assert.equal(health.speech.profile,profile??undefined);
      const post=(endpoint,body,headers={})=>fetch(url+endpoint,{method:'POST',headers:{'content-type':'application/json',origin:url,...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(100000)});
      const audioFor=row=>{const audio=readFileSync(path.join(path.dirname(freeze.manifestFile),row.audioPath));assert.equal(sha256(audio),row.audioSha256);return {mimeType:'audio/wav',audio:audio.toString('base64')};};
      const unauthorized=await post('/api/transcriptions',audioFor(samples[0]));assert.equal(unauthorized.status,401);await unauthorized.arrayBuffer();
      const registration=await post('/api/auth/register',{email:randomUUID()+'@example.test',password:'Isolated-runtime-voice-password',businessName:'Isolated technical test',communityName:'Temporary test'});assert.equal(registration.status,201);
      const cookie=registration.headers.get('set-cookie').split(';')[0],state=await registration.json();
      const before=digestDatabase(filename);
      const csrf=await post('/api/transcriptions',audioFor(samples[0]),{cookie});assert.equal(csrf.status,403);await csrf.arrayBuffer();
      const origin=await post('/api/transcriptions',{...audioFor(samples[0]),csrf:state.csrf},{cookie,origin:'https://other.test'});assert.equal(origin.status,403);await origin.arrayBuffer();
      const runs=[];
      for(const row of samples.slice(0,profile?2:1)){
        const started=performance.now(),response=await post('/api/transcriptions',{...audioFor(row),csrf:state.csrf},{cookie}),body=await response.json();
        assert.equal(response.status,200);assert.equal(body.model,profile?'whisper-base':'whisper-tiny');assert.equal(body.profile,profile??undefined);assert(typeof body.text==='string'&&body.text.trim());assert(body.durationSeconds>0&&body.durationSeconds<=30);
        const original=predictions.find(p=>p.split==='test'&&p.filename===row.filename&&p.profile===(profile??'tiny-current'));
        const identical=body.text===original.hypothesis;
        if(!identical)variations.push({profile:profile??'legacy-default',filename:row.filename,audioSha256:row.audioSha256,expectedHypothesis:original.hypothesis,actualHypothesis:body.text,scope:'Post-hoc HTTP parity check, not a new accuracy score or modification of frozen predictions.'});
        runs.push({filename:row.filename,audioSha256:row.audioSha256,httpStatus:response.status,model:body.model,profile:body.profile??null,transcriptSha256:sha256(body.text),identicalToFrozenPrediction:identical,elapsedMs:Math.round(performance.now()-started)});
      }
      const after=digestDatabase(filename);assert.deepEqual(after,before,'Transcription/security checks changed stored application data.');
      let doctorCheck=null;
      if(profile){
        const reportFile=path.join(directory,'doctor-base.json');files.push(reportFile);
        const doctor=spawnSync(process.execPath,['scripts/doctor.mjs','--url',url,'--database',filename,'--speech-profile',profile,'--report',reportFile],{encoding:'utf8',timeout:90000,windowsHide:true,env:{...process.env,AI_PROVIDER:'rules',SPEECH_PROFILE:profile}});
        if(doctor.error)throw doctor.error;assert.equal(doctor.status,0,doctor.stderr);const report=read(reportFile);assert.equal(report.ready,true);assert.equal(report.checks.find(c=>c.name==='Suara lokal').detail.model,'whisper-base');doctorCheck={passed:true,model:'whisper-base',localModelVerified:report.checks.find(c=>c.name==='Suara lokal').detail.localModelVerified};
        const mismatch=spawnSync(process.execPath,['scripts/doctor.mjs','--url',url,'--database',filename,'--speech-profile','tiny-pinned'],{encoding:'utf8',timeout:90000,windowsHide:true,env:{...process.env,AI_PROVIDER:'rules'}});if(mismatch.error)throw mismatch.error;assert.notEqual(mismatch.status,0);doctorCheck.wrongExpectedProfileRejected=true;
      }
      cases.push({profile:profile??'legacy-default',cliStartup:true,healthModel:health.speech.model,unauthenticatedStatus:401,missingCsrfStatus:403,wrongOriginStatus:403,tablesCompared:Object.keys(before).length,applicationDataUnchanged:true,runs,doctorCheck});console.log('Runtime smoke passed: '+(profile??'legacy-default'));
    }finally{await stop(child);}
  }
  const report={checkedAt:new Date().toISOString(),version:'0.25.0',runId,runDirectory,protocolSha256:sha256(readFileSync(path.join(runDirectory,'protocol.json'))),firstEvidenceSha256:protocol.firstEvidenceSha256,passed:true,realCliHttpPythonInference:true,isolatedTemporaryDatabases:true,publicSourceRun:pointer.runId,cases,variations,accuracyBenchmark:false,defaultModelChanged:false,scope:'Actual startup and authenticated HTTP transport on already-seen public clips, with test identities in temporary databases only. No user database, training, promotion or new accuracy/stability claim.'};
  writeFileSync(path.join(runDirectory,'smoke.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  writeFileSync('docs/evaluation/runtime-speech-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
  for(const filename of files){assert(path.resolve(filename).startsWith(path.resolve(directory)+path.sep));for(const suffix of ['','-wal','-shm'])if(existsSync(filename+suffix))unlinkSync(filename+suffix);}
  rmdirSync(directory);
}
