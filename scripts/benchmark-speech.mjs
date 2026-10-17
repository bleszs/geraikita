import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {localTranscriber} from '../server/transcriber.mjs';
import {sha256,scoreSpeech,summarizeSpeech,summarizeSpeechDurations,selectAudioRecords} from './speech-evaluation.mjs';

const read=file=>JSON.parse(readFileSync(file,'utf8'));
const protocolFile='benchmarks/fleurs/protocol.json',protocol=read(protocolFile),pointer=read('datasets/public/fleurs/processed/index.json');
const manifestPath=path.join(pointer.directory,'manifest.json'),manifest=read(manifestPath);
if(sha256(readFileSync(manifestPath))!==pointer.manifestSha256||manifest.protocolSha256!==sha256(readFileSync(protocolFile))||manifest.rawSha256!==protocol.raw.sha256||manifest.revision!==protocol.parquetRevision)throw Error('Protocol or source manifest changed; prepare the sample again before evaluating.');
const source=read(path.join(pointer.directory,'source-metadata.json')),selected=selectAudioRecords(source,protocol.selection);
if(JSON.stringify(selected.map(r=>r.filename))!==JSON.stringify(manifest.records.map(r=>r.filename)))throw Error('Sample selection mismatch.');
for(const row of manifest.records){
  const expected=selected.find(r=>r.filename===row.filename);
  if(row.reference!==expected.reference||row.numSamples!==expected.numSamples)throw Error('Reference metadata changed.');
  scoreSpeech(row.reference,'');
  if(!row.preparationError&&sha256(readFileSync(path.join(pointer.directory,row.audioPath)))!==row.audioSha256)throw Error('Prepared audio checksum mismatch.');
}
const status=await localTranscriber.status();if(!status.available)throw Error('Local voice model unavailable. Run npm run voice:setup.');
const environmentProbe=spawnSync(path.resolve('.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['-c','import importlib.metadata as m,json,platform; print(json.dumps({"python":platform.python_version(),"platform":platform.platform(),"machine":platform.machine(),"packages":{name:m.version(name) for name in ["faster-whisper","ctranslate2","av","onnxruntime","numpy"]}}))'],{encoding:'utf8',windowsHide:true});
if(environmentProbe.error||environmentProbe.status!==0)throw Error('Cannot record actual speech environment.');
const environment={node:process.versions.node,...JSON.parse(environmentProbe.stdout),inferenceCpuThreads:2};
const dataProbe=spawnSync(path.resolve('.venv-speech-data',process.platform==='win32'?'Scripts/python.exe':'bin/python'),['-c','import importlib.metadata as m,json,platform; print(json.dumps({"python":platform.python_version(),"pyarrow":m.version("pyarrow")}))'],{encoding:'utf8',windowsHide:true});
if(dataProbe.error||dataProbe.status!==0)throw Error('Cannot record data-preparation environment.');
environment.dataPreparation=JSON.parse(dataProbe.stdout);
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),directory=path.join('models/benchmarks/fleurs',runId);
mkdirSync(directory,{recursive:true});
writeFileSync(path.join(directory,'environment.json'),JSON.stringify(environment,null,2)+'\n',{flag:'wx'});
const sourceFiles=['server/transcriber.mjs','server/ml/transcribe.py','scripts/speech-evaluation.mjs','scripts/benchmark-speech.mjs','scripts/prepare-fleurs.mjs','scripts/prepare-fleurs.py','scripts/prepare-fleurs-audio.py','scripts/fetch-fleurs.py','requirements-voice.txt','requirements-speech-data.txt'];
const freeze={frozenAt:new Date().toISOString(),runId,protocol,protocolSha256:sha256(readFileSync(protocolFile)),manifestPath,manifestSha256:pointer.manifestSha256,sourceSha256:Object.fromEntries(sourceFiles.map(file=>[file,sha256(readFileSync(file))])),modelSource:read('models/speech-source.json'),modelManifest:read('models/speech/whisper-tiny/manifest.json'),status,selectedFilenames:manifest.records.map(r=>r.filename),sampleSelectionSha256:sha256(JSON.stringify(manifest.records.map(r=>[r.filename,r.originalSha256,r.audioSha256||null,r.reference])))};
writeFileSync(path.join(directory,'protocol.json'),JSON.stringify(freeze,null,2)+'\n',{flag:'wx'});
const records=[];
for(const row of manifest.records){
  const start=performance.now();let hypothesis='',status='accepted',errorCode=null;
  try{
    if(row.preparationError)throw Error('preparation_error');
    const audio=readFileSync(path.join(pointer.directory,row.audioPath));
    const result=await localTranscriber.transcribe({audio:audio.toString('base64'),mimeType:'audio/wav'});
    hypothesis=result.text;
  }catch(error){status=[400,413,422].includes(error.status)?'rejected':'error';errorCode=error.status?`http_${error.status}`:'preparation_or_inference_error';}
  const result={filename:row.filename,sentenceId:row.sentenceId,reference:row.reference,hypothesis,status,errorCode,durationSeconds:row.durationSeconds??null,audioSha256:row.audioSha256??null,latencyMs:Math.round(performance.now()-start)};
  result.score=scoreSpeech(result.reference,result.hypothesis);records.push(result);
  writeFileSync(path.join(directory,'predictions.partial.json'),JSON.stringify(records,null,2)+'\n');
  console.log(`Speech inference ${records.length}/${manifest.records.length}: ${status}, ${result.latencyMs} ms`);
}
const report={schemaVersion:1,evaluatedAt:new Date().toISOString(),runId,source:protocol.dataset,language:'id_id',split:'publisher_test',sampled:true,
  sourceRecordings:manifest.sourceRecords,selectedRecordings:records.length,distinctSentenceIds:new Set(records.map(r=>r.sentenceId)).size,
  trainingPerformed:false,tuningPerformed:false,model:'whisper-tiny',modelPretrained:true,protocolSha256:freeze.protocolSha256,sampleSelectionSha256:freeze.sampleSelectionSha256,
  metrics:summarizeSpeech(records),byDuration:summarizeSpeechDurations(records),durationSeconds:records.reduce((sum,r)=>sum+(r.durationSeconds||0),0),
  latencyScope:protocol.scoring.latency,normalization:protocol.scoring.normalization,limitations:protocol.limitations};
writeFileSync(path.join(directory,'predictions.json'),JSON.stringify(records,null,2)+'\n',{flag:'wx'});
writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
writeFileSync('models/benchmarks/fleurs/latest.json',JSON.stringify({directory,runId,reportSha256:sha256(readFileSync(path.join(directory,'report.json'))),predictionsSha256:sha256(readFileSync(path.join(directory,'predictions.json')))},null,2)+'\n');
console.log(JSON.stringify({directory,...report.metrics},null,2));
