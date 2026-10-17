import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sha256,scoreSpeech} from './speech-evaluation.mjs';
import {selectFreshComparison,chooseAsr,comparisonMetrics,pairedSpeech} from './asr-comparison.mjs';
import {inferComparison,verifyCandidate} from './asr-comparison-runner.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const protocolPath='benchmarks/asr-comparison/protocol.json',protocol=read(protocolPath),pointer=read('datasets/public/fleurs/comparison/index.json'),manifestFile=path.join(pointer.directory,'manifest.json'),manifest=read(manifestFile);
const protocolSha256=sha256(readFileSync(protocolPath));assert.equal(sha256(readFileSync(manifestFile)),pointer.manifestSha256);assert.equal(manifest.protocolSha256,protocolSha256);
const previousFile=path.join(protocol.previousRun.directory,protocol.previousRun.predictions);assert.equal(sha256(readFileSync(previousFile)),manifest.previousPredictionsSha256);
assert.equal(manifest.previousPredictionsSha256,protocol.previousRun.predictionsSha256);
const selected=selectFreshComparison({validation:read(path.join(pointer.directory,'validation-metadata.json')),test:read(path.join(pointer.directory,'test-metadata.json')),previous:read(previousFile),selection:protocol.selection});
for(const split of ['validation','test']){
  assert.deepEqual(manifest.splits[split].records.map(r=>r.filename),selected[split].records.map(r=>r.filename));
  for(const [i,row] of manifest.splits[split].records.entries()){assert.equal(row.reference,selected[split].records[i].reference);scoreSpeech(row.reference,'');if(!row.preparationError)assert.equal(sha256(readFileSync(path.join(pointer.directory,row.audioPath))),row.audioSha256);}
}
const modelSources={};for(const candidate of protocol.candidates){modelSources[candidate.id]=verifyCandidate(candidate);await inferComparison(candidate.id,null,{check:true});}
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/asr-comparison',runId);mkdirSync(directory,{recursive:true});
const sourceFiles=['scripts/benchmark-asr-comparison.mjs','scripts/asr-comparison.mjs','scripts/asr-comparison-runner.mjs','scripts/comparison-transcribe.py','scripts/asr-comparison-data.py','scripts/prepare-asr-comparison.mjs','scripts/fetch-asr-comparison.py','scripts/speech-evaluation.mjs','scripts/prepare-fleurs-audio.py','server/transcriber.mjs','server/ml/transcribe.py','models/speech-source.json','models/speech-base-source.json','requirements-voice.txt','requirements-speech-data.txt'];
const probe=spawnSync(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['-c','import importlib.metadata as m,json,platform; print(json.dumps({"python":platform.python_version(),"os":platform.platform(),"packages":{p:m.version(p) for p in ["faster-whisper","ctranslate2","av","onnxruntime","numpy"]}}))'],{encoding:'utf8',windowsHide:true});assert.equal(probe.status,0);
const frozen={frozenAt:new Date().toISOString(),runId,protocol,protocolSha256,manifestFile,manifestSha256:pointer.manifestSha256,previousPredictionsSha256:manifest.previousPredictionsSha256,sourceSha256:Object.fromEntries(sourceFiles.map(f=>[f,sha256(readFileSync(f))])),modelSources,environment:{node:process.versions.node,...JSON.parse(probe.stdout),cpuThreads:2},selected:Object.fromEntries(['validation','test'].map(s=>[s,manifest.splits[s].records.map(r=>[r.filename,r.sentenceId,r.audioSha256??null])]))};
const writeNew=(filename,value)=>writeFileSync(path.join(directory,filename),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
writeNew('protocol.json',frozen);
const records=[];let decisionHash=null,testStartedAt=null;
async function evaluate(split){
  if(split==='test'){assert.ok(decisionHash,'Test cannot start before frozen validation decision.');assert.equal(sha256(readFileSync(path.join(directory,'decision.json'))),decisionHash);testStartedAt=new Date().toISOString();writeNew('test-start.json',{startedAt:testStartedAt,decisionSha256:decisionHash});}
  const rows=manifest.splits[split].records;
  for(const [index,row] of rows.entries())for(const model of index%2?['base','tiny']:['tiny','base']){
    const start=performance.now();let hypothesis='',status='accepted',errorCode=null,errorMessage=null;
    try{if(row.preparationError)throw Error(row.preparationError);const result=await inferComparison(model,{mimeType:'audio/wav',audio:readFileSync(path.join(pointer.directory,row.audioPath)).toString('base64')});hypothesis=result.text;}
    catch(error){status=[400,413,422].includes(error.status)?'rejected':'error';errorCode=error.status?`http_${error.status}`:'preparation_or_inference_error';errorMessage=error.message;}
    const record={split,model,filename:row.filename,sentenceId:row.sentenceId,reference:row.reference,hypothesis,status,errorCode,errorMessage,durationSeconds:row.durationSeconds??null,audioSha256:row.audioSha256??null,latencyMs:Math.round(performance.now()-start)};record.score=scoreSpeech(record.reference,record.hypothesis);records.push(record);
    writeFileSync(path.join(directory,'predictions.partial.json'),JSON.stringify(records,null,2)+'\n');console.log(`${split} ${index+1}/${rows.length} ${model}: ${status}, ${record.latencyMs}ms`);
  }
}
await evaluate('validation');
const validationMetrics=comparisonMetrics(records).validation;
const decision={decidedAt:new Date().toISOString(),runId,...chooseAsr(validationMetrics,protocol.decision.thresholds),validation:validationMetrics,validationPredictionsSha256:sha256(JSON.stringify(records))};writeNew('decision.json',decision);decisionHash=sha256(readFileSync(path.join(directory,'decision.json')));console.log('Validation selection frozen: '+decision.selectedModel);
await evaluate('test');
assert.equal(sha256(readFileSync(path.join(directory,'decision.json'))),decisionHash);
const metrics=comparisonMetrics(records),testRecords=model=>records.filter(r=>r.split==='test'&&r.model===model);
const report={schemaVersion:1,runId,evaluatedAt:new Date().toISOString(),protocolSha256,source:protocol.source,trainingPerformed:false,tuningPerformed:false,runtimeModelChanged:false,counts:{validation:manifest.splits.validation.records.length,test:manifest.splits.test.records.length,previousExcluded:protocol.previousRun.knownRecordings},metrics,decision,decisionSha256:decisionHash,testStartedAt,pairedTest:pairedSpeech(testRecords('tiny'),testRecords('base')),limitations:protocol.limitations};
writeNew('predictions.json',records);writeNew('report.json',report);
writeFileSync('models/benchmarks/asr-comparison/latest.json',JSON.stringify({directory,runId,reportSha256:sha256(readFileSync(path.join(directory,'report.json'))),predictionsSha256:sha256(readFileSync(path.join(directory,'predictions.json')))},null,2)+'\n');
console.log(JSON.stringify({directory,decision:decision.selectedModel,metrics},null,2));
