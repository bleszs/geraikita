import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {sha256,scoreSpeech,summarizeSpeech,summarizeSpeechDurations} from './speech-evaluation.mjs';
import {localTranscriber} from '../server/transcriber.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const pointer=read('models/benchmarks/fleurs/latest.json'),directory=pointer.directory,freeze=read(path.join(directory,'protocol.json')),report=read(path.join(directory,'report.json')),records=read(path.join(directory,'predictions.json'));
assert.equal(sha256(readFileSync(path.join(directory,'report.json'))),pointer.reportSha256);
assert.equal(sha256(readFileSync(path.join(directory,'predictions.json'))),pointer.predictionsSha256);
assert.equal(sha256(readFileSync('benchmarks/fleurs/protocol.json')),freeze.protocolSha256);
for(const [file,digest] of Object.entries(freeze.sourceSha256))assert.equal(sha256(readFileSync(file)),digest,'Frozen inference/preparation source changed: '+file);
for(const item of freeze.modelManifest.files)assert.equal(sha256(readFileSync('models/speech/whisper-tiny/'+item.name)),item.sha256);
const preparation=spawnSync(process.execPath,['scripts/prepare-fleurs.mjs'],{stdio:'inherit',windowsHide:true});
if(preparation.error)throw preparation.error;assert.equal(preparation.status,0,'Raw re-preparation failed.');
const preparedPointer=read('datasets/public/fleurs/processed/index.json'),manifest=read(path.join(preparedPointer.directory,'manifest.json'));
const oldManifest=read(freeze.manifestPath);
const key=rows=>rows.map(r=>[r.filename,r.originalSha256,r.audioSha256??null,r.reference,r.durationSeconds??null,r.preparationError??null]);
assert.deepEqual(key(manifest.records),key(oldManifest.records),'Raw audio preparation or selection changed.');
assert.deepEqual(manifest.records.map(r=>r.filename),records.map(r=>r.filename));
for(let i=0;i<records.length;i++){
  assert.equal(records[i].reference,manifest.records[i].reference);
  assert.equal(records[i].audioSha256,manifest.records[i].audioSha256??null);
  assert.deepEqual(scoreSpeech(records[i].reference,records[i].hypothesis),records[i].score);
}
assert.deepEqual(summarizeSpeech(records),report.metrics);
assert.deepEqual(summarizeSpeechDurations(records),report.byDuration);
assert.equal(report.selectedRecordings,records.length);
assert.equal(report.sourceRecordings,manifest.sourceRecords);
assert.equal(report.distinctSentenceIds,new Set(records.map(r=>r.sentenceId)).size);
assert.equal(report.durationSeconds,records.reduce((sum,r)=>sum+(r.durationSeconds||0),0));
assert.equal(report.trainingPerformed,false);assert.equal(report.tuningPerformed,false);
const repeated=[];
for(const row of manifest.records.slice(0,freeze.protocol.verification.repeatInferenceCount)){
  const expected=records.find(r=>r.filename===row.filename);let hypothesis='',status='accepted',errorMessage=null;
  try{if(row.preparationError)throw Error('preparation_error');const result=await localTranscriber.transcribe({audio:readFileSync(path.join(preparedPointer.directory,row.audioPath)).toString('base64'),mimeType:'audio/wav'});hypothesis=result.text;}
  catch(error){status=[400,413,422].includes(error.status)?'rejected':'error';errorMessage=error.message;}
  assert.equal(status,expected.status);assert.equal(hypothesis,expected.hypothesis);repeated.push({filename:row.filename,status,errorMessage,transcriptIdentical:true});
  console.log(`Repeated inference ${repeated.length}/${freeze.protocol.verification.repeatInferenceCount}`);
}
const result={verifiedAt:new Date().toISOString(),runId:report.runId,passed:true,rawParquetChecksumVerified:true,sourceHashesVerified:true,modelFileHashesVerified:true,repreparedFromRaw:true,recordingsCompared:records.length,allAudioAndReferencesIdentical:true,allStoredScoresRecomputed:true,aggregateMetricsIdentical:true,repeatedInference:repeated,repeatInferenceCount:repeated.length,allRepeatedTranscriptsIdentical:true,limitations:'Only the prespecified first eight selected clips were rerun through inference. Timing is measured, not expected to reproduce exactly; no claim that all 64 predictions were re-inferred.'};
writeFileSync('docs/evaluation/fleurs-asr-reproducibility.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
