import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRepeats,compareStageProfiles} from '../scripts/asr-stability-evaluation.mjs';
const hash='a'.repeat(64),buffer={sha256:hash,shape:[80,5],dtype:'float32'};
const cohort={models:['tiny'],profiles:['baseline'],samples:[{filename:'public.wav',audioSha256:hash}],repeats:2};
const rows=()=>[1,2].map(repeat=>({model:'tiny',profile:'baseline',filename:'public.wav',repeat,inputSha256:hash,status:'accepted',result:{text:'kalimat'},pcm:buffer,vadPcm:buffer,features:[buffer],encoders:[{output:buffer}]}));
test('reports within-cohort equality without fabricating unavailable stage evidence',()=>{
  const summary=summarizeRepeats(rows(),cohort);assert.equal(summary.allObservedRepeatsMatch,true);assert.equal(summary.groups[0].stageVariants.encoder,null);
});
test('detects transcript differences even when all audio and encoder fingerprints match',()=>{
  const input=rows();input[1].result.text='kalimat berubah';const result=summarizeRepeats(input,cohort,{traced:true});assert.equal(result.allObservedRepeatsMatch,false);assert.equal(result.groupsWithTextVariation,1);assert.equal(result.groups[0].stageVariants.encoder,1);
});
test('detects feature variation even when the transcript happens to match',()=>{
  const input=rows();input[1].features=[{...buffer,sha256:'b'.repeat(64)}];const result=summarizeRepeats(input,cohort,{traced:true});assert.equal(result.allObservedRepeatsMatch,false);assert.equal(result.groups[0].stageVariants.features,2);
});
test('missing or duplicate repeats fail the audit instead of passing a smaller cohort',()=>{
  assert.throws(()=>summarizeRepeats(rows().slice(0,1),cohort),/Incomplete/);const input=rows();input[1].repeat=1;assert.throws(()=>summarizeRepeats(input,cohort),/Duplicate/);
});
test('rejects changed input hashes and missing accepted stage fingerprints',()=>{
  const input=rows();input[1].inputSha256='b'.repeat(64);assert.throws(()=>summarizeRepeats(input,cohort),/hash mismatch/);const noStage=rows();delete noStage[1].features;assert.throws(()=>summarizeRepeats(noStage,cohort,{traced:true}),/Missing stage/);
});
test('identical rejections are retained but never count as stability success',()=>{
  const input=rows().map(row=>({...row,status:'rejected',result:undefined,errorCode:'no_speech'}));const result=summarizeRepeats(input,cohort,{traced:true});assert.equal(result.allObservedRepeatsMatch,false);assert.equal(result.groups[0].accepted,0);
});
test('single-factor comparison separates PCM equality from changed features and text',()=>{
  const first=rows()[0],other={...first,profile:'openblas_one',features:[{...buffer,sha256:'b'.repeat(64)}],result:{text:'teks berbeda'}};
  const [pair]=compareStageProfiles([first,other],'baseline','openblas_one');assert.equal(pair.samePcm,true);assert.equal(pair.sameFeatures,false);assert.equal(pair.sameTranscript,false);assert.equal(pair.sameMelFilters,null);
});
