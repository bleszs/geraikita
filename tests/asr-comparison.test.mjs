import test from 'node:test';
import assert from 'node:assert/strict';
import {selectFreshComparison,chooseAsr,pairedSpeech,comparisonMetrics} from '../scripts/asr-comparison.mjs';
import {scoreSpeech} from '../scripts/speech-evaluation.mjs';
const rows=(start,n)=>Array.from({length:n},(_,i)=>({sentenceId:start+i,filename:`clip-${start+i}.wav`,reference:`kalimat ${start+i}`}));
const selection={validationCount:3,testCount:4,seed:'fixed'};
test('fresh ASR selection removes all known IDs/texts/files and all validation groups from test',()=>{
  const previous=rows(0,2),validation=rows(0,10),testRows=[...rows(0,15),{sentenceId:100,filename:'copy.wav',reference:'KALIMAT 0!'}];
  const result=selectFreshComparison({validation,test:testRows,previous,selection});assert.equal(result.validation.records.length,3);assert.equal(result.test.records.length,4);assert.ok(result.validation.records.every(r=>r.sentenceId>=2));assert.ok(result.test.records.every(r=>r.sentenceId>=10&&r.sentenceId<100));
});
test('one clip per sentence, input-order invariance and no duration/quality-based sampling',()=>{
  const validation=[...rows(10,8),{sentenceId:10,filename:'alternate.wav',reference:'kalimat 10'}],testRows=rows(30,8),previous=rows(0,2);
  const first=selectFreshComparison({validation,test:testRows,previous,selection}),again=selectFreshComparison({validation:[...validation].reverse().map(r=>({...r,durationSeconds:999})),test:[...testRows].reverse(),previous,selection});
  for(const split of ['validation','test']){assert.deepEqual(first[split].records.map(r=>r.filename),again[split].records.map(r=>r.filename));assert.equal(new Set(first[split].records.map(r=>r.sentenceId)).size,first[split].records.length);}
});
test('not enough fresh groups fails instead of relaxing exclusions or replacing cases',()=>{
  assert.throws(()=>selectFreshComparison({validation:rows(0,3),test:rows(0,5),previous:rows(0,2),selection}),/Not enough/);
  assert.throws(()=>selectFreshComparison({validation:[...rows(10,8),rows(10,1)[0]],test:rows(30,8),previous:rows(0,2),selection}),/Duplicate/);
});
const metric=(wer,extra={})=>({observations:16,wer,errors:0,rejected:0,latencyMs:{p95:6000},...extra}),thresholds={relativeWerReduction:.1,maxP95Ms:15000};
test('validation selection requires meaningful WER improvement and all fixed operational gates',()=>{
  assert.equal(chooseAsr({tiny:metric(.5),base:metric(.4)},thresholds).selectedModel,'base');
  for(const base of [metric(.46),metric(.5),metric(.6),metric(.4,{errors:1}),metric(.4,{rejected:1}),metric(.4,{latencyMs:{p95:15001}})])assert.equal(chooseAsr({tiny:metric(.5),base},thresholds).selectedModel,'tiny');
});
test('ties, perfect Tiny and invalid validation metrics never manufacture a Base win',()=>{
  assert.equal(chooseAsr({tiny:metric(0),base:metric(0)},thresholds).selectedModel,'tiny');
  assert.throws(()=>chooseAsr({tiny:metric(.5),base:metric(NaN)},thresholds));assert.throws(()=>chooseAsr({tiny:metric(.5),base:metric(.4,{observations:15})},thresholds));
});
test('exact validation threshold passes without floating point subtraction turning ten percent into a failure',()=>{
  assert.equal(chooseAsr({tiny:metric(.5),base:metric(.45)},thresholds).selectedModel,'base');
  assert.equal(chooseAsr({tiny:metric(.5),base:metric(.450001)},thresholds).selectedModel,'tiny');
});
test('paired error counts compare identical references and retain failed hypotheses',()=>{
  const reference='dua roti',record=h=>({filename:'one.wav',sentenceId:1,reference,hypothesis:h,score:scoreSpeech(reference,h)});
  const compared=pairedSpeech([record('')],[record('dua roti')]);assert.equal(compared.baseFewerErrors,1);assert.equal(compared.rows[0].baseMinusTiny,-2);assert.throws(()=>pairedSpeech([record('')],[{...record('dua roti'),reference:'different'}]));
});
test('comparison metrics preserve split/model separation and rejection denominators',()=>{
  const records=[{split:'validation',model:'tiny',reference:'a b',hypothesis:'',status:'rejected',latencyMs:4},{split:'validation',model:'base',reference:'a b',hypothesis:'a b',status:'accepted',latencyMs:9}];
  const result=comparisonMetrics(records);assert.equal(result.validation.tiny.wer,1);assert.equal(result.validation.base.wer,0);assert.deepEqual(result.test,{});
});
