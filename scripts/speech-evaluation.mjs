import {createHash} from 'node:crypto';

export const normalizeSpeech=text=>{
  if(typeof text!=='string')throw Error('Transkrip harus berupa teks.');
  return text.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/gu,' ').trim();
};
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function distance(reference,hypothesis){
  let prev=Uint32Array.from({length:hypothesis.length+1},(_,i)=>i);
  for(let i=1;i<=reference.length;i++){
    const next=new Uint32Array(hypothesis.length+1);next[0]=i;
    for(let j=1;j<=hypothesis.length;j++)next[j]=Math.min(prev[j]+1,next[j-1]+1,prev[j-1]+Number(reference[i-1]!==hypothesis[j-1]));
    prev=next;
  }
  return prev[hypothesis.length];
}
function wordAlignment(ref,hyp){
  const matrix=Array.from({length:ref.length+1},()=>new Uint32Array(hyp.length+1));
  for(let i=0;i<=ref.length;i++)matrix[i][0]=i;
  for(let j=0;j<=hyp.length;j++)matrix[0][j]=j;
  for(let i=1;i<=ref.length;i++)for(let j=1;j<=hyp.length;j++)matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+Number(ref[i-1]!==hyp[j-1]));
  const counts={substitutions:0,deletions:0,insertions:0,hits:0};let i=ref.length,j=hyp.length;
  while(i||j){
    if(i&&j&&matrix[i][j]===matrix[i-1][j-1]+Number(ref[i-1]!==hyp[j-1])){counts[ref[i-1]===hyp[j-1]?'hits':'substitutions']++;i--;j--;}
    else if(i&&matrix[i][j]===matrix[i-1][j]+1){counts.deletions++;i--;}
    else{counts.insertions++;j--;}
  }
  return {...counts,errors:matrix[ref.length][hyp.length]};
}
export function scoreSpeech(reference,hypothesis){
  const ref=normalizeSpeech(reference),hyp=normalizeSpeech(hypothesis);
  if(!ref||reference.length>10000||hypothesis.length>10000)throw Error('Referensi kosong setelah normalisasi atau transkrip terlalu panjang.');
  const words=ref.split(' '),pred=hyp?hyp.split(' '):[],chars=[...ref.replaceAll(' ','')],hypChars=[...hyp.replaceAll(' ','')];
  const word=wordAlignment(words,pred),charErrors=distance(chars,hypChars);
  return {referenceWords:words.length,referenceCharacters:chars.length,...word,characterErrors:charErrors,wer:word.errors/words.length,cer:charErrors/chars.length,exactMatch:ref===hyp};
}
export function summarizeSpeech(records){
  if(!Array.isArray(records)||!records.length)throw Error('Belum ada hasil suara; tidak membuat metrik kosong.');
  const total={observations:records.length,accepted:0,rejected:0,errors:0,referenceWords:0,referenceCharacters:0,wordErrors:0,characterErrors:0,substitutions:0,deletions:0,insertions:0,hits:0,exactMatches:0};
  const times=[],realTime=[];
  for(const row of records){
    if(!['accepted','rejected','error'].includes(row.status)||!Number.isFinite(row.latencyMs)||row.latencyMs<0)throw Error('Status atau latensi hasil tidak valid.');
    if(row.status!=='accepted'&&row.hypothesis!=='')throw Error('Inferensi gagal harus dinilai dengan hipotesis kosong.');
    const score=scoreSpeech(row.reference,row.hypothesis);total[row.status==='error'?'errors':row.status]++;
    for(const key of ['referenceWords','referenceCharacters','characterErrors','substitutions','deletions','insertions','hits'])total[key]+=score[key];
    total.wordErrors+=score.errors;total.exactMatches+=Number(score.exactMatch);times.push(row.latencyMs);
    if(Number.isFinite(row.durationSeconds)&&row.durationSeconds>0)realTime.push(row.latencyMs/1000/row.durationSeconds);
  }
  const quantile=(values,q)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1]:null;
  return {...total,wer:total.wordErrors/total.referenceWords,cer:total.characterErrors/total.referenceCharacters,exactMatchRate:total.exactMatches/total.observations,
    latencyMs:{p50:quantile(times,.5),p95:quantile(times,.95)},realTimeFactor:{p50:quantile(realTime,.5),p95:quantile(realTime,.95)}};
}
export function selectAudioRecords(records,{count,seed}){
  if(!Number.isInteger(count)||count<1||typeof seed!=='string'||!seed||records.length<count)throw Error('Pemilihan sampel suara tidak valid.');
  const names=new Set();
  const ranked=records.map(row=>{
    if(!row||typeof row.filename!=='string'||!/^[a-zA-Z0-9_-]+\.(wav|flac)$/i.test(row.filename)||names.has(row.filename))throw Error('Nama audio sumber tidak valid/duplikat.');
    names.add(row.filename);return {...row,selectionHash:sha256(seed+'|'+row.filename)};
  });
  return ranked.sort((a,b)=>a.selectionHash.localeCompare(b.selectionHash)||a.filename.localeCompare(b.filename)).slice(0,count);
}
export function summarizeSpeechDurations(records){
  const groups={under_5:[],from_5_to_10:[],from_10_to_20:[],at_least_20:[],unknown:[]};
  for(const row of records){const d=row.durationSeconds,name=!Number.isFinite(d)?'unknown':d<5?'under_5':d<10?'from_5_to_10':d<20?'from_10_to_20':'at_least_20';groups[name].push(row);}
  return Object.fromEntries(Object.entries(groups).map(([name,rows])=>[name,rows.length?summarizeSpeech(rows):null]));
}
