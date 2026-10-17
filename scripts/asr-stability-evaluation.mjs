import assert from 'node:assert/strict';

const hashPattern=/^[a-f0-9]{64}$/;
const stages={pcm:t=>t.pcm,vad:t=>t.vadPcm,features:t=>t.features,encoder:t=>t.encoders?.map(e=>e.output)};
const key=values=>JSON.stringify(values);

/** Fail closed on incomplete/duplicated cohorts; rejected repeats never prove stability. */
export function summarizeRepeats(rows,cohort,{traced=false}={}){
  const {models,profiles,samples,repeats}=cohort;
  assert(Number.isInteger(repeats)&&repeats>=2,'At least two repeats are required.');
  for(const values of [models,profiles,samples.map(s=>s.filename)])assert(values.length>0&&new Set(values).size===values.length,'Invalid cohort values.');
  assert.equal(rows.length,models.length*profiles.length*samples.length*repeats,'Incomplete repeat cohort.');
  const seen=new Set();
  for(const row of rows){
    const sample=samples.find(s=>s.filename===row.filename);
    assert(sample&&models.includes(row.model)&&profiles.includes(row.profile),'Unexpected cohort member.');
    assert(Number.isInteger(row.repeat)&&row.repeat>=1&&row.repeat<=repeats,'Invalid repeat index.');
    const id=key([row.model,row.profile,row.filename,row.repeat]);assert(!seen.has(id),'Duplicate repeat.');seen.add(id);
    assert(hashPattern.test(row.inputSha256)&&row.inputSha256===sample.audioSha256,'Audio hash mismatch.');
    assert(['accepted','rejected','error'].includes(row.status),'Invalid status.');
    if(row.status==='accepted'){
      assert(typeof row.result?.text==='string'&&row.result.text.trim(),'Missing accepted transcript.');
      if(traced){
        for(const get of Object.values(stages)){
          const value=get(row);assert(value!==undefined,'Missing stage fingerprint.');
          const buffers=Array.isArray(value)?value:[value];assert(buffers.length>0,'Empty stage fingerprint.');
          for(const buffer of buffers)assert(hashPattern.test(buffer?.sha256)&&Array.isArray(buffer.shape)&&typeof buffer.dtype==='string','Invalid stage fingerprint.');
        }
      }
    }
  }
  const groups=[];
  for(const profile of profiles)for(const model of models)for(const sample of samples){
    const values=rows.filter(r=>r.profile===profile&&r.model===model&&r.filename===sample.filename);
    assert.equal(values.length,repeats);
    const accepted=values.every(r=>r.status==='accepted');
    const transcriptVariants=new Set(values.map(r=>key([r.status,r.result?.text??null,r.errorCode??r.errorType??null]))).size;
    const stageVariants=Object.fromEntries(Object.entries(stages).map(([name,get])=>[name,traced&&accepted?new Set(values.map(r=>key(get(r)))).size:null]));
    groups.push({profile,model,filename:sample.filename,repeats,accepted:values.filter(r=>r.status==='accepted').length,transcriptVariants,stageVariants,observedRepeatMatch:accepted&&transcriptVariants===1&&(!traced||Object.values(stageVariants).every(n=>n===1))});
  }
  return {inferences:rows.length,groups,groupsWithTextVariation:groups.filter(g=>g.transcriptVariants>1).length,allObservedRepeatsMatch:groups.every(g=>g.observedRepeatMatch)};
}

export function compareStageProfiles(rows,baseline,profile){
  const pairs=[];
  for(const first of rows.filter(r=>r.profile===baseline&&r.repeat===1)){
    const other=rows.find(r=>r.profile===profile&&r.repeat===1&&r.model===first.model&&r.filename===first.filename);
    assert(other,'Missing comparison profile.');
    pairs.push({model:first.model,filename:first.filename,baseline,profile,samePcm:key(first.pcm)===key(other.pcm),sameVad:key(first.vadPcm)===key(other.vadPcm),sameMelFilters:first.melFilters&&other.melFilters?key(first.melFilters)===key(other.melFilters):null,sameFeatures:key(first.features)===key(other.features),sameEncoder:key(stages.encoder(first))===key(stages.encoder(other)),sameTranscript:first.result?.text===other.result?.text});
  }
  return pairs;
}
