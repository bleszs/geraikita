import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256,scoreSpeech} from './speech-evaluation.mjs';
import {profileMetrics,chooseProfile,uniqueKnown,selectFreshComparison,summarizeProfileRepeats} from './asr-profile-evaluation.mjs';
import {createProfileTranscriber,speechProfile} from '../server/speech-profiles.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8')),protocolFile='benchmarks/asr-profiles/protocol.json',protocol=read(protocolFile),pointer=read('datasets/public/fleurs/profiles-index.json'),manifestFile=path.join(pointer.directory,'manifest.json'),manifest=read(manifestFile);
assert.equal(sha256(readFileSync(manifestFile)),pointer.manifestSha256);assert.equal(manifest.protocolSha256,sha256(readFileSync(protocolFile)));
const known=[];
for(const old of protocol.previousRuns){const file=path.join(old.directory,old.predictions);assert.equal(sha256(readFileSync(file)),old.sha256);known.push(...read(file));}
const selected=selectFreshComparison({validation:read(path.join(pointer.directory,'validation-metadata.json')),test:read(path.join(pointer.directory,'test-metadata.json')),previous:uniqueKnown(known),selection:protocol.selection});
for(const split of ['validation','test']){
  assert.deepEqual(manifest.splits[split].records.map(r=>[r.filename,r.sentenceId,r.reference]),selected[split].records.map(r=>[r.filename,r.sentenceId,r.reference]));
  for(const row of manifest.splits[split].records)if(!row.preparationError)assert.equal(sha256(readFileSync(path.join(pointer.directory,row.audioPath))),row.audioSha256);
}
const engines=Object.fromEntries(protocol.profiles.map(id=>[id,createProfileTranscriber(id)]));
for(const [id,engine] of Object.entries(engines))assert.equal((await engine.status()).available,true,'Profile unavailable: '+id);
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/asr-profiles',runId);mkdirSync(directory,{recursive:true});
const sourceFiles=[protocolFile,'server/speech-profiles.mjs','server/ml/transcribe-profile.py','server/transcriber.mjs','server/ml/transcribe.py','scripts/benchmark-asr-profiles.mjs','scripts/asr-profile-evaluation.mjs','scripts/prepare-asr-profiles.mjs','scripts/asr-profile-data.py','scripts/asr-comparison-data.py','scripts/asr-comparison.mjs','scripts/speech-evaluation.mjs','scripts/prepare-fleurs-audio.py','scripts/probe-asr-deferred.py','requirements-voice.txt','models/speech-source.json','models/speech-base-source.json'];
const probe=spawnSync(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['-c','import importlib.metadata as m,json,platform; print(json.dumps({"python":platform.python_version(),"os":platform.platform(),"packages":{p:m.version(p) for p in ["faster-whisper","ctranslate2","av","onnxruntime","numpy"]}}))'],{encoding:'utf8',windowsHide:true});assert.equal(probe.status,0);
const frozen={runId,frozenAt:new Date().toISOString(),protocol,manifestFile,manifestSha256:pointer.manifestSha256,sourceSha256:Object.fromEntries(sourceFiles.map(f=>[f,sha256(readFileSync(f))])),environment:{node:process.versions.node,...JSON.parse(probe.stdout),inheritedNumericalVariables:Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(OPENBLAS_|OMP_|MKL_|CT2_|NPY_)/.test(k)))}};
const writeNew=(name,value)=>writeFileSync(path.join(directory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});writeNew('protocol.json',frozen);
async function infer(row,profile){
  let status='accepted',hypothesis='',errorCode=null;const start=performance.now();
  try{if(row.preparationError){status='rejected';throw Error(row.preparationError);}const result=await engines[profile].transcribe({mimeType:'audio/wav',audio:readFileSync(path.join(pointer.directory,row.audioPath)).toString('base64')});hypothesis=result.text;}
  catch(error){if(status!=='rejected')status=[400,413,422].includes(error.status)?'rejected':'error';errorCode=error.status??row.preparationError??'inference_error';}
  return {split:row.split,profile,filename:row.filename,sentenceId:row.sentenceId,reference:row.reference,hypothesis,status,errorCode,audioSha256:row.audioSha256??null,durationSeconds:row.durationSeconds??null,latencyMs:Math.round(performance.now()-start),score:scoreSpeech(row.reference,hypothesis)};
}
const predictions=[];
for(const [index,row] of manifest.splits.validation.records.entries())for(const profile of index%2?[...protocol.profiles].reverse():protocol.profiles){predictions.push(await infer(row,profile));writeFileSync(path.join(directory,'predictions.partial.json'),JSON.stringify(predictions,null,2)+'\n');console.log(`validation ${index+1}/16 ${profile}: ${predictions.at(-1).status}`);}
const validation=profileMetrics(predictions,protocol.profiles),thresholds={relativeBaseWerReduction:protocol.decision.relativeBaseWerReduction,maxP95Ms:protocol.decision.maxP95Ms};
const decision={runId,decidedAt:new Date().toISOString(),...chooseProfile(validation,thresholds),validation,validationPredictionsSha256:sha256(JSON.stringify(predictions))};writeNew('decision.json',decision);const decisionSha256=sha256(readFileSync(path.join(directory,'decision.json')));
writeNew('test-start.json',{startedAt:new Date().toISOString(),decisionSha256});console.log('Frozen validation decision: '+decision.selectedProfile);
for(const [index,row] of manifest.splits.test.records.entries())for(const profile of index%2?[...protocol.profiles].reverse():protocol.profiles){predictions.push(await infer(row,profile));writeFileSync(path.join(directory,'predictions.partial.json'),JSON.stringify(predictions,null,2)+'\n');console.log(`test ${index+1}/24 ${profile}: ${predictions.at(-1).status}`);}
assert.equal(sha256(readFileSync(path.join(directory,'decision.json'))),decisionSha256);writeNew('predictions.json',predictions);
const repeated=[],captures=[],triggered=new Set(),repeatRows=manifest.splits.test.records.slice(0,protocol.verification.firstTestClips);
function capture(row,profile){return new Promise((resolve,reject)=>{
  const config=speechProfile(profile),child=spawn(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['scripts/probe-asr-deferred.py',config.model,config.openblasThreads?'openblas_one':'baseline','deferred'],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1'}});let stdout='',stderr='',done=false;
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);if(error){child.kill();reject(error);}else resolve(value);};const timer=setTimeout(()=>finish(Error('Triggered trace timed out.')),90000);
  child.stdout.on('data',c=>{stdout+=c;if(stdout.length>250000)finish(Error('Trace output limit.'));});child.stderr.on('data',c=>{if(stderr.length<10000)stderr+=c;});child.stdin.on('error',()=>{});child.once('error',e=>finish(e));child.once('close',exitCode=>{if(done)return;try{finish(null,{trace:JSON.parse(stdout),exitCode,stderr});}catch{finish(Error('Invalid trace JSON.'));}});child.stdin.end(readFileSync(path.join(pointer.directory,row.audioPath)));
});}
for(let repeat=1;repeat<=protocol.verification.additionalRepeats;repeat++)for(const row of repeatRows)for(const profile of repeat%2?protocol.profiles:[...protocol.profiles].reverse()){
  const result={...await infer(row,profile),repeat};repeated.push(result);writeFileSync(path.join(directory,'repeats.partial.json'),JSON.stringify(repeated,null,2)+'\n');
  const original=predictions.find(p=>p.split==='test'&&p.filename===row.filename&&p.profile===profile),different=result.hypothesis!==original.hypothesis||result.status!==original.status;
  console.log(`repeat ${repeated.length}/24 ${profile}: different=${different}`);
  if(different&&!triggered.has(profile)){
    triggered.add(profile);writeNew(`first-failure-${profile}.json`,{detectedAt:new Date().toISOString(),original,repeated:result});
    for(let traceRepeat=1;traceRepeat<=protocol.verification.firstMismatchCaptures;traceRepeat++){
      try{captures.push({profile,filename:row.filename,traceRepeat,...await capture(row,profile)});}catch(error){captures.push({profile,filename:row.filename,traceRepeat,captureError:error.message});}
      writeFileSync(path.join(directory,'captures.partial.json'),JSON.stringify(captures,null,2)+'\n');
    }
  }
}
writeNew('repeats.json',repeated);writeNew('captures.json',captures);
const repeatSummary=summarizeProfileRepeats(repeated,predictions.filter(r=>r.split==='test'),{profiles:protocol.profiles,filenames:repeatRows.map(r=>r.filename),repeats:protocol.verification.additionalRepeats});
const report={runId,completedAt:new Date().toISOString(),counts:{validation:16,test:24,mainInferences:predictions.length,repeatedInferences:repeated.length,triggeredCaptures:captures.length},decision,decisionSha256,metrics:{validation,test:profileMetrics(predictions.filter(r=>r.split==='test'),protocol.profiles)},repeatSummary,causeEstablished:false,fixValidated:false,readyForPromotion:false,activeModelChanged:false,trainingPerformed:false,limitations:protocol.policy};writeNew('report.json',report);
writeFileSync('models/benchmarks/asr-profiles/latest.json',JSON.stringify({directory,runId,reportSha256:sha256(readFileSync(path.join(directory,'report.json'))),predictionsSha256:sha256(readFileSync(path.join(directory,'predictions.json')))},null,2)+'\n');console.log(JSON.stringify({directory,...report},null,2));
