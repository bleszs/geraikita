import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSpeech,distance,scoreSpeech,summarizeSpeech,summarizeSpeechDurations,selectAudioRecords} from '../scripts/speech-evaluation.mjs';

test('speech normalization is fixed: punctuation/case/compatibility normalize while digits and accents remain',()=>{
  assert.equal(normalizeSpeech('  DUA—roti, Ａ ２!  '),'dua roti a 2');
  assert.notEqual(normalizeSpeech('2 roti'),normalizeSpeech('dua roti'));
  assert.notEqual(normalizeSpeech('é'),normalizeSpeech('e'));assert.throws(()=>normalizeSpeech(null));
});
test('word scoring counts insertions/deletions/substitutions and can exceed 100 percent',()=>{
  const a=scoreSpeech('satu dua tiga','satu empat');assert.equal(a.errors,2);assert.equal(a.substitutions,1);assert.equal(a.deletions,1);assert.equal(a.hits,1);assert.equal(a.wer,2/3);
  const b=scoreSpeech('roti','satu dua tiga');assert.equal(b.errors,3);assert.equal(b.wer,3);assert.equal(b.insertions,2);assert.equal(b.substitutions,1);
});
test('a rejected transcript is evaluated as deletions, never removed from the ASR denominator',()=>{
  const metrics=summarizeSpeech([{reference:'dua roti',hypothesis:'',status:'rejected',latencyMs:100,durationSeconds:2},{reference:'satu teh',hypothesis:'satu teh',status:'accepted',latencyMs:300,durationSeconds:2}]);
  assert.equal(metrics.observations,2);assert.equal(metrics.accepted,1);assert.equal(metrics.rejected,1);assert.equal(metrics.deletions,2);assert.equal(metrics.wer,.5);assert.equal(metrics.exactMatchRate,.5);assert.deepEqual(metrics.latencyMs,{p50:100,p95:300});
  assert.throws(()=>summarizeSpeech([{reference:'dua roti',hypothesis:'dua roti',status:'error',latencyMs:3}]),/kosong/);
});
test('micro WER uses total reference words, not a mean of unequal sentence rates',()=>{
  const result=summarizeSpeech([{reference:'a',hypothesis:'',status:'error',latencyMs:4},{reference:'a b c d',hypothesis:'a b c d',status:'accepted',latencyMs:6}]);assert.equal(result.wer,.2);assert.equal(result.errors,1);assert.equal(result.exactMatchRate,.5);
});
test('character score removes whitespace, preserves Unicode code points and rejects empty reference',()=>{
  assert.equal(scoreSpeech('dua roti','duaroti').cer,0);assert.equal(scoreSpeech('😀 roti','roti').exactMatch,true);
  assert.equal(distance([... 'éa'],[... 'éb']),1);assert.equal(scoreSpeech('éa','éb').cer,.5);
  assert.throws(()=>scoreSpeech('!!!','a'));assert.throws(()=>summarizeSpeech([]));assert.throws(()=>summarizeSpeech([{reference:'a',hypothesis:'a',status:'accepted',latencyMs:NaN}]));
});
test('deterministic sample selection ignores transcript, duration and original row order',()=>{
  const input=Array.from({length:20},(_,i)=>({filename:`audio-${i}.wav`,reference:'unseen',durationSeconds:i}));
  const a=selectAudioRecords(input,{count:8,seed:'fixed'}),b=selectAudioRecords([...input].reverse().map(r=>({...r,reference:'changed',durationSeconds:999})),{count:8,seed:'fixed'});
  assert.deepEqual(a.map(r=>r.filename),b.map(r=>r.filename));assert.equal(a.length,8);assert.throws(()=>selectAudioRecords([...input,input[0]],{count:8,seed:'fixed'}));assert.throws(()=>selectAudioRecords([{filename:'../x.wav'}],{count:1,seed:'fixed'}));assert.throws(()=>selectAudioRecords(input,{count:21,seed:'fixed'}));
});
test('Levenshtein edit totals agree with independent exhaustive recursion on short token sequences',()=>{
  function recursive(a,b){if(!a.length)return b.length;if(!b.length)return a.length;return Math.min(recursive(a.slice(1),b)+1,recursive(a,b.slice(1))+1,recursive(a.slice(1),b.slice(1))+Number(a[0]!==b[0]));}
  const strings=['a','b','a a','a b','b a','b b','a b a'];
  for(const ref of strings)for(const hyp of ['',...strings]){const expected=recursive(ref.split(' '),hyp?hyp.split(' '):[]),result=scoreSpeech(ref,hyp);assert.equal(result.errors,expected);assert.equal(result.errors,result.substitutions+result.deletions+result.insertions);assert.equal(result.referenceWords,result.hits+result.substitutions+result.deletions);}
});
test('duration analysis keeps each clip once and does not hide failed or unknown-duration records',()=>{
  const rows=[null,4.99,5,9.99,10,19.99,20,31].map((durationSeconds,i)=>({reference:'a b',hypothesis:i?'a b':'',status:i?'accepted':'error',durationSeconds,latencyMs:10}));
  const result=summarizeSpeechDurations(rows);assert.equal(result.unknown.errors,1);assert.equal(result.unknown.wer,1);assert.equal(result.under_5.observations,1);assert.equal(result.from_5_to_10.observations,2);assert.equal(result.from_10_to_20.observations,2);assert.equal(result.at_least_20.observations,2);assert.equal(Object.values(result).reduce((sum,g)=>sum+(g?.observations||0),0),8);
});
