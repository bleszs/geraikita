import assert from 'node:assert/strict';
import {summarizeRepeats} from './asr-stability-evaluation.mjs';

export const featureStageOrder=['pcm','waveform','window','mel_filters','stft','magnitudes','mel_spec','log_spec','encoder_input','encoder_output'];
const key=value=>JSON.stringify(value);
const content=buffer=>{
  assert(buffer&&/^[a-f0-9]{64}$/.test(buffer.sha256)&&Array.isArray(buffer.shape)&&buffer.shape.every(n=>Number.isInteger(n)&&n>0)&&typeof buffer.dtype==='string','Invalid content fingerprint.');
  // Addresses and strides describe storage, not tensor values.
  return {sha256:buffer.sha256,shape:buffer.shape,dtype:buffer.dtype};
};
const stage=(trace,name)=>{
  if(name==='pcm')return [content(trace.stages.pcm)];
  if(name==='encoder_input'||name==='encoder_output')return trace.stages.encoders.map(e=>content(e[name==='encoder_input'?'input':'output']));
  return trace.stages.features.map(f=>content(f[name]));
};

export function summarizeDeferred(rows,protocol){
  const normalized=rows.map(row=>({...row.trace,repeat:row.repeat,filename:row.filename,profile:row.trace.profile+':'+row.trace.mode}));
  const cohort={models:protocol.models,profiles:protocol.profiles.flatMap(p=>protocol.modes.map(m=>p+':'+m)),samples:[protocol.sample],repeats:protocol.repeats};
  const base=summarizeRepeats(normalized,cohort);
  const traced=rows.filter(r=>r.trace.mode==='deferred');
  for(const {trace} of traced){
    assert(!trace.traceError,'Deferred trace failed.');
    if(trace.status!=='accepted')continue;
    assert(trace.stages?.features.length>0&&trace.stages?.encoders.length>0,'Missing deferred stages.');
    for(const name of featureStageOrder)stage(trace,name);
  }
  const groups=base.groups.map(group=>{
    const values=rows.filter(r=>r.trace.model===group.model&&r.trace.profile+':'+r.trace.mode===group.profile);
    const available=values.every(r=>r.trace.mode==='deferred'&&r.trace.status==='accepted');
    const stages=available?Object.fromEntries(featureStageOrder.map(name=>[name,new Set(values.map(r=>key(stage(r.trace,name)))).size])):null;
    return {...group,stageVariants:stages,firstChangedStage:stages?featureStageOrder.find(name=>stages[name]>1)??(group.transcriptVariants>1?'text_after_encoder':null):null};
  });
  const crossProfiles=[];
  for(const model of protocol.models)for(let repeat=1;repeat<=protocol.repeats;repeat++){
    const find=profile=>rows.find(r=>r.repeat===repeat&&r.trace.mode==='deferred'&&r.trace.model===model&&r.trace.profile===profile)?.trace;
    const a=find('baseline'),b=find('openblas_one');assert(a&&b,'Missing paired profile.');
    if(a.status!=='accepted'||b.status!=='accepted'){crossProfiles.push({model,repeat,comparable:false,firstChangedStage:null});continue;}
    const equalStages=Object.fromEntries(featureStageOrder.map(name=>[name,key(stage(a,name))===key(stage(b,name))]));
    crossProfiles.push({model,repeat,comparable:true,equalStages,firstChangedStage:featureStageOrder.find(name=>!equalStages[name])??null,sameTranscript:a.result.text===b.result.text});
  }
  return {inferences:rows.length,groups,crossProfiles,allObservedTextRepeatsMatch:groups.every(g=>g.accepted===g.repeats&&g.transcriptVariants===1),withinConfigurationFailureLocalized:groups.some(g=>g.transcriptVariants>1&&g.firstChangedStage!==null)};
}

export function summarizeAlignment(rows,protocol){
  assert.equal(rows.length,protocol.profiles.length*protocol.repeats,'Incomplete alignment cohort.');
  const seen=new Set();let kernelChecks=0,differentKernels=0;
  const groups=[];
  for(const row of rows){
    const {trace}=row;
    assert(protocol.profiles.includes(trace.profile)&&Number.isInteger(row.repeat)&&row.repeat>=1&&row.repeat<=protocol.repeats,'Unexpected alignment member.');
    const id=key([trace.profile,row.repeat]);assert(!seen.has(id),'Duplicate alignment member.');seen.add(id);
    assert.equal(trace.inputSha256,protocol.sample.audioSha256,'Changed alignment audio.');
    assert.equal(trace.status,'accepted','Alignment worker failed.');
    const expected=[...protocol.stftAlignments.map(alignment=>key(['magnitudes',alignment])),...protocol.matrixAlignments.flatMap(a=>protocol.matrixAlignments.map(b=>key(['mel_spec',a,b]))),...protocol.matrixAlignments.map(alignment=>key(['log_spec',alignment]))];
    const actual=trace.rows.map(r=>r.stage==='mel_spec'?key([r.stage,r.filterAlignment,r.magnitudeAlignment]):key([r.stage,r.alignment]));
    assert.deepEqual([...actual].sort(),[...expected].sort(),'Incomplete or duplicate kernel coverage.');
    for(const r of trace.rows){
      assert(r.finite&&Number.isInteger(r.unequalValues)&&r.unequalValues>=0&&Number.isFinite(r.maxAbsoluteDifference)&&r.maxAbsoluteDifference>=0,'Invalid numerical result.');
      for(const hash of [r.outputSha256,r.referenceSha256,...(r.stage==='mel_spec'?[r.filterSha256,r.magnitudeSha256]:[r.inputSha256])])assert(/^[a-f0-9]{64}$/.test(hash),'Missing kernel hash.');
      assert.equal(r.outputSha256===r.referenceSha256,r.unequalValues===0,'Inconsistent kernel equality.');
    }
    const changed=trace.rows.filter(r=>r.unequalValues>0).length;
    groups.push({profile:trace.profile,repeat:row.repeat,kernelChecks:trace.rows.length,differentKernels:changed});kernelChecks+=trace.rows.length;differentKernels+=changed;
  }
  return {captureInferences:rows.length,kernelChecks,differentKernels,groups,scope:'Only the frozen STFT/magnitude/mel/log inputs, offsets and shapes on one seen clip; negative results do not rule out other alignment effects.'};
}
