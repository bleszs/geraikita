import assert from 'node:assert/strict';
import {normalizeSpeech,sha256,summarizeSpeech} from './speech-evaluation.mjs';
const id=row=>String(row.sentenceId);
function checkRows(rows){
  assert.ok(Array.isArray(rows)&&rows.length>0,'Source metadata must be nonempty.');const filenames=new Set();
  for(const row of rows){assert.ok(Number.isSafeInteger(row.sentenceId)&&row.sentenceId>=0,'Invalid sentence identity.');assert.match(row.filename,/^[a-zA-Z0-9_-]+\.(wav|flac)$/i);assert.ok(!filenames.has(row.filename),'Duplicate source audio filename.');filenames.add(row.filename);assert.ok(normalizeSpeech(row.reference),'Empty normalized source reference.');}
}
export function selectFreshComparison({validation,test,previous,selection}){
  checkRows(validation);checkRows(test);checkRows(previous);
  assert.ok(Number.isInteger(selection.validationCount)&&selection.validationCount>0&&Number.isInteger(selection.testCount)&&selection.testCount>0&&selection.seed);
  const oldIds=new Set(previous.map(id)),oldNames=new Set(previous.map(r=>r.filename)),oldTexts=new Set(previous.map(r=>normalizeSpeech(r.reference)));
  const valIds=new Set(validation.map(id)),valTexts=new Set(validation.map(r=>normalizeSpeech(r.reference)));
  const fresh=row=>!oldIds.has(id(row))&&!oldNames.has(row.filename)&&!oldTexts.has(normalizeSpeech(row.reference));
  function pick(rows,split,count){
    const eligible=rows.filter(row=>fresh(row)&&(split==='validation'||!valIds.has(id(row))&&!valTexts.has(normalizeSpeech(row.reference))));
    const groups=new Map();
    for(const row of eligible){const candidate={...row,split,clipHash:sha256(selection.seed+'|clip|'+row.filename),selectionHash:sha256(selection.seed+'|'+split+'|sentence|'+id(row))};const old=groups.get(id(row));if(!old||candidate.clipHash<old.clipHash)groups.set(id(row),candidate);}
    assert.ok(groups.size>=count,'Not enough untouched sentence groups; do not replace/relax selection.');
    return {sourceRecordings:rows.length,eligibleRecordings:eligible.length,eligibleSentenceGroups:groups.size,records:[...groups.values()].sort((a,b)=>a.selectionHash.localeCompare(b.selectionHash)||a.filename.localeCompare(b.filename)).slice(0,count)};
  }
  const result={validation:pick(validation,'validation',selection.validationCount),test:pick(test,'test',selection.testCount)};
  const seenIds=new Set(),seenNames=new Set(),seenTexts=new Set();
  for(const row of [...result.validation.records,...result.test.records]){
    assert.ok(!seenIds.has(id(row))&&!seenNames.has(row.filename)&&!seenTexts.has(normalizeSpeech(row.reference)),'Selected groups/references leak or duplicate.');seenIds.add(id(row));seenNames.add(row.filename);seenTexts.add(normalizeSpeech(row.reference));
  }
  return result;
}
export function chooseAsr(validation,thresholds){
  const {tiny,base}=validation;
  for(const value of [tiny,base])assert.ok(value&&value.observations>0&&Number.isFinite(value.wer)&&Number.isFinite(value.latencyMs.p95),'Incomplete validation metrics.');
  assert.equal(tiny.observations,base.observations,'Validation must use identical sample counts.');
  assert.ok(Number.isFinite(thresholds.relativeWerReduction)&&thresholds.relativeWerReduction>0&&thresholds.relativeWerReduction<1&&Number.isFinite(thresholds.maxP95Ms)&&thresholds.maxP95Ms>0);
  const relativeReduction=tiny.wer>0?(tiny.wer-base.wer)/tiny.wer:null;
  const gates={wordErrorImproved:tiny.wer>0&&base.wer<=tiny.wer*(1-thresholds.relativeWerReduction),noBaseInfrastructureErrors:base.errors===0,noExtraRejections:base.rejected<=tiny.rejected,latencyWithinBound:base.latencyMs.p95<=thresholds.maxP95Ms};
  return {selectedModel:Object.values(gates).every(Boolean)?'base':'tiny',source:'validation_only',thresholds,relativeWerReduction:relativeReduction,gates};
}
export function pairedSpeech(tiny,base){
  assert.equal(tiny.length,base.length);const byName=new Map(base.map(r=>[r.filename,r]));assert.equal(byName.size,base.length);
  const rows=tiny.map(a=>{const b=byName.get(a.filename);assert.ok(b&&a.reference===b.reference&&a.sentenceId===b.sentenceId,'Paired reference/identity differs.');return {filename:a.filename,sentenceId:a.sentenceId,tinyWordErrors:a.score.errors,baseWordErrors:b.score.errors,baseMinusTiny:b.score.errors-a.score.errors};});
  return {clips:rows.length,baseFewerErrors:rows.filter(r=>r.baseMinusTiny<0).length,tinyFewerErrors:rows.filter(r=>r.baseMinusTiny>0).length,ties:rows.filter(r=>r.baseMinusTiny===0).length,rows};
}
export function comparisonMetrics(records){
  const result={};for(const split of ['validation','test']){result[split]={};for(const model of ['tiny','base']){const rows=records.filter(r=>r.split===split&&r.model===model);if(rows.length)result[split][model]=summarizeSpeech(rows);}}
  return result;
}
