import {createHash} from 'node:crypto';
import {addDays,dayAt} from '../common.mjs';

export const MODEL_KIND='gerai-ridge-two-day-v1';
export const MIN_DAYS=84;
const BASE_FEATURES=['lag1','lag2','lag7','lag14','mean7','mean14','std7','trend7','zeroRatio7'];
const CALENDAR_FEATURES=['weekdaySin','weekdayCos','weekendDays'];
const avg=x=>x.reduce((a,b)=>a+b,0)/x.length;
export function ensure(condition,message){if(!condition)throw new Error(message);}
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function validDate(value){return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function validateProvenance(scope,p){
  ensure(p?.permissionConfirmed===true && p.completeDailyRecords===true && typeof p.reference==='string' && p.reference.trim().length>=5 && p.reference.length<=500,'Dataset memerlukan sumber/izin serta pencatatan harian lengkap.');
  if(p.source==='public_dataset'){
    ensure(scope.workspaceId.startsWith('public-') && scope.unit==='normalized_sales' && p.usage==='benchmark_only' && p.license==='CC-BY-4.0' && typeof p.sourceUrl==='string' && p.sourceUrl.startsWith('https://') && /^[a-f0-9]{40}$/.test(p.sourceRevision) && /^[a-f0-9]{64}$/.test(p.rawSha256),'Dataset publik memerlukan scope terpisah, satuan asli, URL/lisensi/revisi/checksum dan tujuan benchmark_only.');
  }else{
    ensure(p.source==='user_records' && ['kg','gram','liter','ml','butir','buah'].includes(scope.unit),'Sumber catatan usaha atau satuan dataset tidak didukung.');
  }
}
export function validateDataset(data,asOf=dayAt()){
  ensure(data?.schemaVersion===1,'Dataset harus memakai schemaVersion 1.');
  ensure(data.scope && ['workspaceId','businessId','productId'].every(k=>typeof data.scope[k]==='string' && /^[a-zA-Z0-9-]{1,100}$/.test(data.scope[k])),'Isi identitas kelompok, usaha dan bahan yang sebenarnya.');
  const p=data.provenance;
  validateProvenance(data.scope,p);
  ensure(Array.isArray(data.observations) && data.observations.length>0 && data.observations.length<=3660,'Isi 1–3660 observasi harian.');
  for(let i=0;i<data.observations.length;i++){
    const row=data.observations[i];
    ensure(validDate(row?.date) && row.date<asOf,'Tanggal harus valid dan sebelum hari berjalan.');
    ensure(typeof row.quantity==='number' && Number.isFinite(row.quantity) && row.quantity>=0 && row.quantity<=10000000 && (p.source==='public_dataset' || Math.abs(row.quantity*10000-Math.round(row.quantity*10000))<0.00001),'Jumlah harus numerik dan tidak negatif; catatan usaha maksimal empat angka desimal. Nilai publik dinormalisasi dipertahankan sesuai sumber.');
    if(i)ensure(row.date===addDays(data.observations[i-1].date,1),'Tanggal harus berurutan setiap hari tanpa duplikasi atau tanggal hilang. Isi nol hanya jika sudah dipastikan tidak ada pemakaian.');
  }
  return data;
}
export function featureNames(variant){ensure(['lags','calendar'].includes(variant),'Varian fitur tidak valid.');return [...BASE_FEATURES,...(variant==='calendar'?CALENDAR_FEATURES:[])];}
export function features(history,date,variant){
  ensure(history.length>=14,'Model membutuhkan 14 hari histori sebelumnya.');
  const tail=history.slice(-14),last=tail.slice(-7),mean7=avg(last),mean14=avg(tail),day=new Date(date+'T12:00:00Z').getUTCDay();
  const x=[tail.at(-1),tail.at(-2),tail.at(-7),tail[0],mean7,mean14,Math.sqrt(avg(last.map(v=>(v-mean7)**2))),mean7-avg(tail.slice(0,7)),last.filter(v=>v===0).length/7];
  if(variant==='calendar')x.push(Math.sin(2*Math.PI*day/7),Math.cos(2*Math.PI*day/7),[day,(day+1)%7].filter(d=>d===0 || d===6).length);
  return x;
}
function solve(matrix,target){
  const a=matrix.map((r,i)=>[...r,target[i]]),n=target.length;
  for(let col=0;col<n;col++){
    let pivot=col;for(let r=col+1;r<n;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;
    [a[col],a[pivot]]=[a[pivot],a[col]];ensure(Math.abs(a[col][col])>1e-12,'Sistem regresi tidak stabil.');
    const divisor=a[col][col];for(let c=col;c<=n;c++)a[col][c]/=divisor;
    for(let r=0;r<n;r++)if(r!==col){const f=a[r][col];for(let c=col;c<=n;c++)a[r][c]-=f*a[col][c];}
  }
  return a.map(r=>r[n]);
}
export function fitRidge(samples,variant,alpha){
  const rows=samples.map(s=>features(s.history,s.date,variant)),n=rows[0].length;
  const means=Array.from({length:n},(_,j)=>avg(rows.map(x=>x[j]))),scales=means.map((m,j)=>Math.sqrt(avg(rows.map(x=>(x[j]-m)**2)))||1),intercept=avg(samples.map(s=>s.actual));
  const x=rows.map(r=>r.map((v,j)=>(v-means[j])/scales[j]));
  const matrix=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>x.reduce((sum,r)=>sum+r[i]*r[j],0)+(i===j?alpha:0)));
  const target=Array.from({length:n},(_,j)=>x.reduce((sum,r,i)=>sum+r[j]*(samples[i].actual-intercept),0));
  return {variant,alpha,featureNames:featureNames(variant),means,scales,intercept,weights:solve(matrix,target)};
}
export function predict(model,history,date){
  const x=features(history,date,model.variant);
  const value=model.intercept+x.reduce((sum,v,j)=>sum+((v-model.means[j])/model.scales[j])*model.weights[j],0);
  ensure(Number.isFinite(value),'Hasil model tidak valid.');return Math.max(0,value);
}
export function metrics(rows,key){const error=rows.reduce((s,r)=>s+Math.abs(r.actual-r[key]),0),actual=rows.reduce((s,r)=>s+r.actual,0);return {mae:rows.length?error/rows.length:null,wape:actual?error/actual:null,observations:rows.length};}
function evaluate(samples,model){return samples.map(s=>({date:s.date,targetThrough:addDays(s.date,1),actual:s.actual,ridge:predict(model,s.history,s.date),naive:2*s.history.at(-1),moving_average_7:2*avg(s.history.slice(-7))}));}
export function train(data,{asOf=dayAt()}={}){
  validateDataset(data,asOf);ensure(data.observations.length>=MIN_DAYS,`Pelatihan memerlukan minimal ${MIN_DAYS} hari lengkap; tersedia ${data.observations.length}.`);
  const observations=data.observations,values=observations.map(r=>r.quantity),samples=[];
  // Two-day targets do not overlap; all feature dates precede the target.
  for(let i=14;i+1<values.length;i+=2)samples.push({date:observations[i].date,history:values.slice(0,i),actual:values[i]+values[i+1]});
  const training=samples.slice(0,-14),validation=samples.slice(-14,-7),testing=samples.slice(-7);
  const experiments=[];
  for(const variant of ['lags','calendar'])for(const alpha of [.01,.1,1,10,100]){const model=fitRidge(training,variant,alpha),rows=evaluate(validation,model);experiments.push({variant,alpha,...metrics(rows,'ridge')});}
  const selected=[...experiments].sort((a,b)=>a.mae-b.mae || ['lags','calendar'].indexOf(a.variant)-['lags','calendar'].indexOf(b.variant) || b.alpha-a.alpha)[0];
  const validationModel=fitRidge(training,selected.variant,selected.alpha),validationRows=evaluate(validation,validationModel);
  // Hyperparameters are chosen on validation only. Test targets never fit weights.
  const model=fitRidge([...training,...validation],selected.variant,selected.alpha),rows=evaluate(testing,model);
  const comparison=Object.fromEntries(['ridge','naive','moving_average_7'].map(k=>[k,metrics(rows,k)]));
  const qualified=comparison.ridge.mae+1e-9<Math.min(comparison.naive.mae,comparison.moving_average_7.mae);
  const range=part=>({from:part[0].date,to:addDays(part.at(-1).date,1),origins:part.length});
  const artifact={kind:MODEL_KIND,scope:{...data.scope},horizon:2,createdAt:new Date().toISOString(),datasetHash:hash(data),dataset:{from:observations[0].date,to:observations.at(-1).date,days:observations.length,provenance:{...data.provenance}},model,training:range([...training,...validation]),evaluation:{protocol:'Chronological train/validation/test; fixed fit per block, non-overlapping two-day targets; features use earlier observed days; no random shuffle or fitting on test targets.',split:{train:range(training),validation:range(validation),test:range(testing)},selection:{variant:selected.variant,alpha:selected.alpha,validationMae:selected.mae},experiments,ablation:Object.fromEntries(['lags','calendar'].map(v=>[v,Math.min(...experiments.filter(e=>e.variant===v).map(e=>e.mae))])),validation:metrics(validationRows,'ridge'),test:comparison,rows,qualified,qualification:'Strictly lower holdout MAE than both naive and moving_average_7, same two-day targets. No claim of field generalization.'}};
  return artifact;
}
export function validateArtifact(a){
  ensure(a?.kind===MODEL_KIND && a.horizon===2,'Format model forecasting tidak didukung.');
  ensure(a.scope && ['workspaceId','businessId','productId'].every(k=>typeof a.scope[k]==='string' && /^[a-zA-Z0-9-]{1,100}$/.test(a.scope[k])),'Identitas model tidak valid.');
  validateProvenance(a.scope,a.dataset?.provenance);
  const names=featureNames(a.model?.variant),m=a.model;
  ensure(JSON.stringify(m.featureNames)===JSON.stringify(names) && ['means','scales','weights'].every(k=>Array.isArray(m[k]) && m[k].length===names.length && m[k].every(Number.isFinite)) && m.scales.every(v=>v>0) && Number.isFinite(m.intercept) && Number.isFinite(m.alpha) && m.alpha>0,'Koefisien atau normalisasi model tidak valid.');
  ensure(validDate(a.dataset?.to) && validDate(a.training?.to) && validDate(a.evaluation?.split?.test?.to) && a.training.to<a.evaluation.split.test.from && a.evaluation.split.test.to<=a.dataset.to,'Urutan tanggal artefak tidak valid.');
  const scores=a.evaluation.test;
  ensure(['ridge','naive','moving_average_7'].every(k=>Number.isFinite(scores?.[k]?.mae) && scores[k].mae>=0 && scores[k].observations>=7),'Metrik holdout model tidak valid.');
  ensure(Array.isArray(a.evaluation.rows) && a.evaluation.rows.length>=7 && a.evaluation.rows.every((r,i,rows)=>validDate(r.date) && r.targetThrough===addDays(r.date,1) && (!i || rows[i-1].targetThrough<r.date) && ['actual','ridge','naive','moving_average_7'].every(k=>Number.isFinite(r[k]) && r[k]>=0)),'Rincian evaluasi holdout tidak valid.');
  for(const key of ['ridge','naive','moving_average_7']){const calculated=metrics(a.evaluation.rows,key);ensure(Math.abs(calculated.mae-scores[key].mae)<1e-8 && calculated.observations===scores[key].observations && (calculated.wape==null?scores[key].wape==null:Number.isFinite(scores[key].wape) && Math.abs(calculated.wape-scores[key].wape)<1e-8),'Metrik berbeda dari rincian error holdout.');}
  const qualified=scores.ridge.mae+1e-9<Math.min(scores.naive.mae,scores.moving_average_7.mae);
  ensure(a.evaluation.qualified===qualified,'Status kelulusan model berbeda dari metrik.');
  ensure(Number.isFinite(a.evaluation.validation.mae) && a.evaluation.validation.mae>=0,'Galat validasi tidak tersedia.');return a;
}
