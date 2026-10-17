import assert from 'node:assert/strict';
import {summarizeSpeech} from './speech-evaluation.mjs';
import {selectFreshComparison} from './asr-comparison.mjs';
export {selectFreshComparison};

export function uniqueKnown(rows){
  const byName=new Map();
  for(const row of rows){const old=byName.get(row.filename);if(old)assert(old.sentenceId===row.sentenceId&&old.reference===row.reference,'Conflicting historical recording.');else byName.set(row.filename,row);}
  return [...byName.values()];
}
export function profileMetrics(records,profiles){
  return Object.fromEntries(profiles.map(profile=>[profile,summarizeSpeech(records.filter(r=>r.profile===profile))]));
}
export function chooseProfile(metrics,thresholds){
  const original=metrics['tiny-current'];
  assert(original&&original.observations>0&&Number.isFinite(original.wer),'Missing baseline.');
  assert(thresholds.relativeBaseWerReduction>0&&thresholds.relativeBaseWerReduction<1&&thresholds.maxP95Ms>0);
  const gates={};
  for(const id of ['base-pinned','tiny-pinned']){
    const value=metrics[id];assert(value&&value.observations===original.observations&&Number.isFinite(value.wer)&&Number.isFinite(value.latencyMs?.p95)&&Number.isInteger(value.errors)&&Number.isInteger(value.rejected),'Incomplete candidate comparison.');
    gates[id]={accuracy:id==='base-pinned'?original.wer>0&&value.wer<=original.wer*(1-thresholds.relativeBaseWerReduction):value.wer<=original.wer,noErrors:value.errors===0,noExtraRejections:value.rejected<=original.rejected,latency:value.latencyMs.p95<=thresholds.maxP95Ms};
  }
  return {selectedProfile:['base-pinned','tiny-pinned'].find(id=>Object.values(gates[id]).every(Boolean))??'tiny-current',source:'validation_only',gates,thresholds};
}
export function summarizeProfileRepeats(repeats,originals,{profiles,filenames,repeats:count}){
  assert.equal(repeats.length,profiles.length*filenames.length*count,'Incomplete repeat cohort.');const keys=new Set();
  for(const row of repeats){
    assert(profiles.includes(row.profile)&&filenames.includes(row.filename)&&Number.isInteger(row.repeat)&&row.repeat>=1&&row.repeat<=count,'Unexpected repeat.');
    const key=JSON.stringify([row.profile,row.filename,row.repeat]);assert(!keys.has(key),'Duplicate repeat.');keys.add(key);
    const original=originals.find(r=>r.profile===row.profile&&r.filename===row.filename);assert(original,'Missing original inference.');assert.equal(row.audioSha256,original.audioSha256,'Changed repeat audio.');
    assert(['accepted','rejected','error'].includes(row.status),'Invalid repeat status.');
    assert(row.status==='accepted'?typeof row.hypothesis==='string'&&row.hypothesis.trim():row.hypothesis==='','Invalid repeat hypothesis.');
  }
  return Object.fromEntries(profiles.map(profile=>{
    const values=repeats.filter(r=>r.profile===profile);
    const changed=values.filter(r=>{const original=originals.find(o=>o.profile===profile&&o.filename===r.filename);return r.status!==original.status||r.hypothesis!==original.hypothesis;});
    return [profile,{repeated:values.length,changed:changed.length,allAccepted:values.every(r=>r.status==='accepted'),observedRepeatMatch:changed.length===0&&values.every(r=>r.status==='accepted')}];
  }));
}
