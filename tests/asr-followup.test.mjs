import test from 'node:test';
import assert from 'node:assert/strict';
import {featureStageOrder,summarizeDeferred,summarizeAlignment} from '../scripts/asr-followup-evaluation.mjs';
const hash='a'.repeat(64),otherHash='b'.repeat(64),buffer={sha256:hash,shape:[2,3],dtype:'float32',alignment64:0,strides:[12,4]};
const protocol={models:['tiny'],profiles:['baseline','openblas_one'],modes:['plain','deferred'],repeats:2,sample:{filename:'public.wav',audioSha256:hash}};
function rows(){
  return protocol.profiles.flatMap(profile=>protocol.modes.flatMap(mode=>[1,2].map(repeat=>({filename:'public.wav',repeat,trace:{model:'tiny',profile,mode,inputSha256:hash,status:'accepted',result:{text:'kalimat'},...(mode==='deferred'?{stages:{pcm:buffer,features:[Object.fromEntries(featureStageOrder.slice(1,-2).map(name=>[name,{...buffer}]))],encoders:[{input:buffer,output:buffer}]}}:{})}}))));
}
test('does not mistake changed buffer addresses for changed tensor values',()=>{
  const input=rows();input.find(r=>r.trace.mode==='deferred').trace.stages.features[0].mel_spec.alignment64=32;
  assert(summarizeDeferred(input,protocol).groups.every(g=>g.firstChangedStage===null));
});
test('locates a changed projection after identical earlier stages',()=>{
  const input=rows();input.find(r=>r.trace.mode==='deferred'&&r.trace.profile==='openblas_one').trace.stages.features[0].mel_spec.sha256=otherHash;
  assert.equal(summarizeDeferred(input,protocol).crossProfiles[0].firstChangedStage,'mel_spec');
  const outputOnly=rows();outputOnly.find(r=>r.trace.mode==='deferred'&&r.repeat===2).trace.result.text='keluaran berbeda';
  assert.equal(summarizeDeferred(outputOnly,protocol).groups.find(g=>g.profile==='baseline:deferred').firstChangedStage,'text_after_encoder');
});
test('matching new repeats do not localize a historical failure',()=>{
  const result=summarizeDeferred(rows(),protocol);assert.equal(result.allObservedTextRepeatsMatch,true);assert.equal(result.withinConfigurationFailureLocalized,false);
});
test('missing deferred data and explicit trace errors fail closed',()=>{
  const input=rows();delete input.find(r=>r.trace.mode==='deferred').trace.stages.features[0].stft;assert.throws(()=>summarizeDeferred(input,protocol),/fingerprint/);
  const failed=rows();failed.find(r=>r.trace.mode==='deferred').trace.traceError='RuntimeError';assert.throws(()=>summarizeDeferred(failed,protocol),/trace failed/);
});
const alignmentProtocol={profiles:['baseline'],repeats:1,sample:{audioSha256:hash},stftAlignments:[0],matrixAlignments:[0]};
const alignmentRows=()=>[{repeat:1,trace:{profile:'baseline',inputSha256:hash,status:'accepted',rows:['magnitudes','mel_spec','log_spec'].map(stage=>({stage,alignment:0,filterAlignment:0,magnitudeAlignment:0,inputSha256:hash,filterSha256:hash,magnitudeSha256:hash,outputSha256:hash,referenceSha256:hash,unequalValues:0,maxAbsoluteDifference:0,finite:true}))}}];
test('keeps all kernel checks and refuses duplicate/missing alignment cases',()=>{
  assert.equal(summarizeAlignment(alignmentRows(),alignmentProtocol).kernelChecks,3);
  const input=alignmentRows();input[0].trace.rows[2]=input[0].trace.rows[0];assert.throws(()=>summarizeAlignment(input,alignmentProtocol),/coverage/);
});
test('refuses contradictory equality and non-finite numerical results',()=>{
  const input=alignmentRows();input[0].trace.rows[0].unequalValues=1;assert.throws(()=>summarizeAlignment(input,alignmentProtocol),/equality/);
  const bad=alignmentRows();bad[0].trace.rows[0].finite=false;assert.throws(()=>summarizeAlignment(bad,alignmentProtocol),/numerical/);
});
test('incomplete deferred and alignment cohorts cannot pass the audit',()=>{
  assert.throws(()=>summarizeDeferred(rows().slice(1),protocol),/Incomplete/);assert.throws(()=>summarizeAlignment([],alignmentProtocol),/Incomplete/);
});
