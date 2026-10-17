import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha256,scoreSpeech} from './speech-evaluation.mjs';
import {chooseAsr,comparisonMetrics,pairedSpeech} from './asr-comparison.mjs';
import {verifyCandidate,inferComparison} from './asr-comparison-runner.mjs';
import {localTranscriber} from '../server/transcriber.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const pointer=read('models/benchmarks/asr-comparison/latest.json'),directory=pointer.directory,freeze=read(path.join(directory,'protocol.json')),report=read(path.join(directory,'report.json')),records=read(path.join(directory,'predictions.json')),decision=read(path.join(directory,'decision.json')),testStart=read(path.join(directory,'test-start.json'));
assert.equal(sha256(readFileSync(path.join(directory,'report.json'))),pointer.reportSha256);assert.equal(sha256(readFileSync(path.join(directory,'predictions.json'))),pointer.predictionsSha256);
assert.equal(sha256(readFileSync('benchmarks/asr-comparison/protocol.json')),freeze.protocolSha256);
for(const [file,expected] of Object.entries(freeze.sourceSha256))assert.equal(sha256(readFileSync(file)),expected,'Frozen source changed: '+file);
for(const candidate of freeze.protocol.candidates)assert.deepEqual(verifyCandidate(candidate),freeze.modelSources[candidate.id]);
assert.equal(sha256(readFileSync(freeze.manifestFile)),freeze.manifestSha256);
const rawPrepare=spawnSync(process.execPath,['scripts/prepare-asr-comparison.mjs'],{stdio:'inherit',windowsHide:true});if(rawPrepare.error)throw rawPrepare.error;assert.equal(rawPrepare.status,0);
const prepared=read('datasets/public/fleurs/comparison/index.json'),manifest=read(path.join(prepared.directory,'manifest.json')),oldManifest=read(freeze.manifestFile);
const projection=rows=>rows.map(r=>[r.filename,r.sentenceId,r.reference,r.originalSha256,r.audioSha256??null,r.durationSeconds??null,r.preparationError??null]);
for(const split of ['validation','test'])assert.deepEqual(projection(manifest.splits[split].records),projection(oldManifest.splits[split].records));
assert.equal(records.length,2*(freeze.protocol.selection.validationCount+freeze.protocol.selection.testCount));
for(const row of records){const original=manifest.splits[row.split].records.find(r=>r.filename===row.filename);assert.ok(original);assert.equal(row.reference,original.reference);assert.equal(row.audioSha256,original.audioSha256??null);assert.deepEqual(scoreSpeech(row.reference,row.hypothesis),row.score);}
const metrics=comparisonMetrics(records);assert.deepEqual(metrics,report.metrics);
const selection=chooseAsr(metrics.validation,freeze.protocol.decision.thresholds);
for(const [key,value] of Object.entries(selection))assert.deepEqual(decision[key],value);
assert.deepEqual(decision.validation,metrics.validation);
assert.equal(sha256(JSON.stringify(records.filter(r=>r.split==='validation'))),decision.validationPredictionsSha256);
assert.equal(report.decisionSha256,sha256(readFileSync(path.join(directory,'decision.json'))));assert.equal(report.decisionSha256,testStart.decisionSha256);
assert.deepEqual(report.decision,decision);assert.equal(report.testStartedAt,testStart.startedAt);assert.ok(Date.parse(decision.decidedAt)<=Date.parse(testStart.startedAt));
const only=model=>records.filter(r=>r.split==='test'&&r.model===model);assert.deepEqual(pairedSpeech(only('tiny'),only('base')),report.pairedTest);
const repeated=[];
const productionParity=[];
for(const original of manifest.splits.test.records.slice(0,freeze.protocol.verification.repeatPerModel))for(const model of ['tiny','base']){
  const expected=records.find(r=>r.split==='test'&&r.model===model&&r.filename===original.filename);let hypothesis='',status='accepted';
  try{if(original.preparationError)throw Error(original.preparationError);const result=await inferComparison(model,{mimeType:'audio/wav',audio:readFileSync(path.join(prepared.directory,original.audioPath)).toString('base64')});hypothesis=result.text;}
  catch(error){status=[400,413,422].includes(error.status)?'rejected':'error';}
  repeated.push({model,filename:original.filename,status,statusIdentical:status===expected.status,transcriptIdentical:hypothesis===expected.hypothesis,expectedHypothesis:expected.hypothesis,repeatedHypothesis:hypothesis,expectedScore:expected.score,repeatedScore:scoreSpeech(original.reference,hypothesis)});console.log(`Repeated ${repeated.length}/${2*freeze.protocol.verification.repeatPerModel}, identical=${hypothesis===expected.hypothesis}`);
  if(model==='tiny'){
    let text='',productionStatus='accepted';
    try{const value=await localTranscriber.transcribe({mimeType:'audio/wav',audio:readFileSync(path.join(prepared.directory,original.audioPath)).toString('base64')});text=value.text;}
    catch(error){productionStatus=[400,413,422].includes(error.status)?'rejected':'error';}
    productionParity.push({filename:original.filename,identicalToOriginal:text===expected.hypothesis&&productionStatus===expected.status,identicalToRepeatedComparison:text===hypothesis&&productionStatus===status,productionHypothesis:text,productionStatus,productionScore:scoreSpeech(original.reference,text)});
  }
}
const initialFailure=existsSync(path.join(directory,'first-repeat-failure.json'))?read(path.join(directory,'first-repeat-failure.json')):null;
const predictionsIdentical=(!initialFailure||!initialFailure.hypothesesDiffer)&&repeated.every(r=>r.transcriptIdentical&&r.statusIdentical);
const verification={verifiedAt:new Date().toISOString(),runId:report.runId,passed:predictionsIdentical,auditPassed:true,inferenceRepeatPassed:predictionsIdentical,initialRepeatFailurePreserved:initialFailure,frozenSourceAndModelHashesVerified:true,repreparedFromRaw:true,allAudioReferencesIdentical:true,validationRecordings:manifest.splits.validation.records.length,testRecordings:manifest.splits.test.records.length,allScoresAndMetricsRecomputed:true,validationDecisionRecomputed:true,decisionHashFrozenBeforeTest:true,pairedTestRecomputed:true,repeatInferences:repeated,additionalProductionTinyParity:productionParity,readyForPromotion:false,limitations:'Initial repeat mismatch is preserved even if a later repeat agrees. Repeated two test clips per model; an additional post-hoc equivalence check calls unchanged production Tiny on these same two clips. No claim of stable repeated transcription, inference equivalence or identical timing. Cause of variability not established. Fresh sentence groups are not an independently audited speaker split or a business-order pilot.'};
writeFileSync('docs/evaluation/asr-comparison-reproducibility.json',JSON.stringify(verification,null,2)+'\n');console.log(JSON.stringify(verification,null,2));
if(!verification.passed)process.exitCode=1;
