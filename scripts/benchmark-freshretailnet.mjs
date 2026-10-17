import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createReadStream} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {train,validateArtifact,predict,metrics,ensure,hash} from '../server/ml/forecast-model.mjs';
import {addDays} from '../server/common.mjs';

const {values}=parseArgs({options:{out:{type:'string'}}});
const root=path.resolve('datasets/public/freshretailnet'),protocol=JSON.parse(readFileSync('benchmarks/freshretailnet/protocol.json','utf8'));
const manifest=JSON.parse(readFileSync(path.join(root,'processed/index.json'),'utf8'));
ensure(JSON.stringify(manifest.protocol)===JSON.stringify(protocol),'Protokol preparasi berbeda; jalankan preparasi ulang.');
ensure(manifest.series.length===protocol.sample.series,'Jumlah seri berbeda dari protokol tetap.');
for(const [name,metadata] of Object.entries(protocol.files)){
  const h=createHash('sha256');for await(const chunk of createReadStream(path.join(root,'raw',name)))h.update(chunk);
  ensure(h.digest('hex')===metadata.sha256,'Checksum input berbeda: '+name);
}
const directory=path.resolve(values.out || path.join('models/benchmarks/freshretailnet',new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8)));
mkdirSync(path.dirname(directory),{recursive:true});
mkdirSync(directory,{recursive:false});mkdirSync(path.join(directory,'series'));
copyFileSync('benchmarks/freshretailnet/protocol.json',path.join(directory,'protocol.json'));
const allInternal=[],allExternal=[],series=[],failures=[];
const avg=x=>x.reduce((s,n)=>s+n,0)/x.length;
for(const [i,entry] of manifest.series.entries()){
  try{
    const data=JSON.parse(readFileSync(path.join(root,'processed',entry.file),'utf8'));
    ensure(JSON.stringify(data.scope)===JSON.stringify(entry.scope),'Scope benchmark berubah.');
    ensure(data.provenance.source==='public_dataset' && data.provenance.sourceRevision===protocol.revision,'Provenance benchmark berbeda.');
    const artifact=train(data);validateArtifact(artifact);
    const saved=JSON.stringify(artifact,null,2)+'\n',filename=entry.file.replace('.json','.model.json');
    writeFileSync(path.join(directory,'series',filename),saved,{flag:'wx'});
    const internal=artifact.evaluation.rows.map(row=>({...row,key:entry.key.join(':'),stockoutAffected:entry.trainStockouts.filter(r=>r.date>=row.date && r.date<=row.targetThrough).some(r=>r.stockoutHours>0)}));
    const history=data.observations.map(r=>r.quantity),external=[];
    for(let j=0;j+1<entry.externalObservations.length;j+=2){
      const a=entry.externalObservations[j],b=entry.externalObservations[j+1];
      ensure(a.date===addDays(data.observations.at(-1).date,j+1) && b.date===addDays(a.date,1),'Tanggal eval bukan periode baru yang berurutan.');
      const past=[...history,...entry.externalObservations.slice(0,j).map(r=>r.quantity)];
      external.push({key:entry.key.join(':'),date:a.date,targetThrough:b.date,actual:a.quantity+b.quantity,ridge:predict(artifact.model,past,a.date),naive:2*past.at(-1),moving_average_7:2*avg(past.slice(-7)),stockoutAffected:a.stockoutHours>0 || b.stockoutHours>0});
    }
    ensure(external.length===3,'Harus ada tiga target dua hari pada eval split.');
    const externalMetrics=Object.fromEntries(['ridge','naive','moving_average_7'].map(k=>[k,metrics(external,k)]));
    series.push({key:entry.key.join(':'),scope:entry.scope,artifact:path.relative(process.cwd(),path.join(directory,'series',filename)),artifactSha256:hash(saved),training:artifact.training,selection:artifact.evaluation.selection,internalQualified:artifact.evaluation.qualified,internalMetrics:artifact.evaluation.test,externalMetrics,externalBeatsBoth:externalMetrics.ridge.mae<Math.min(externalMetrics.naive.mae,externalMetrics.moving_average_7.mae),externalRows:external});
    allInternal.push(...internal);allExternal.push(...external);
  }catch(error){failures.push({key:entry.key.join(':'),error:error.message});}
  if((i+1)%50===0)console.log(`Trained/evaluated ${i+1}/${manifest.series.length}, failures ${failures.length}`);
}
const summarize=rows=>Object.fromEntries(['ridge','naive','moving_average_7'].map(k=>[k,metrics(rows,k)]));
const byDate=Object.fromEntries([...new Set(allExternal.map(r=>r.date))].map(date=>[date,summarize(allExternal.filter(r=>r.date===date))]));
const report={generatedAt:new Date().toISOString(),protocolVersion:protocol.protocolVersion,protocolHash:hash(protocol),source:{dataset:protocol.dataset,url:protocol.sourceUrl,license:protocol.license,revision:protocol.revision,files:protocol.files,citation:'Wang et al. (2025), FreshRetailNet-50K, arXiv:2505.16319; Dingdong-Inc.'},data:{availableSeries:manifest.availableSeries,selectedSeries:manifest.selectedSeries,trainingDaysPerSeries:90,externalDaysPerSeries:7,selectedDailyRows:manifest.selectedSeries*97,syntheticRows:0,imputedRows:0,unit:'normalized_sales',selection:protocol.sample.selection},run:{directory,trainedModels:series.length,failures,automaticActivation:false},internal:{metrics:summarize(allInternal),qualifiedModels:series.filter(s=>s.internalQualified).length},external:{metrics:summarize(allExternal),seriesBeatingBoth:series.filter(s=>s.externalBeatsBoth).length,byOrigin:byDate,stockoutAffected:summarize(allExternal.filter(r=>r.stockoutAffected)),noStockout:summarize(allExternal.filter(r=>!r.stockoutAffected)),unscoredDaysPerSeries:1},series,limitations:[protocol.restrictions,'500 ID-selected series (1% of the dataset), not a full 50,000-series benchmark.','External holdout has three shared calendar origins across series; outcomes are correlated and do not establish broad generalization.','Rolling observed-history evaluation uses actual earlier eval days as lags, not a seven-day recursive forecast.','Normalized observed sales, not recovered latent demand, raw units or ingredient usage.','No local user accounts, inventory, sales or recipes are created or modified.','Qwen is not fine-tuned by this experiment.']};
writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const csv=['split,key,date,targetThrough,actual,ridge,naive,moving_average_7,stockoutAffected',...[...allInternal.map(r=>({split:'internal',...r})),...allExternal.map(r=>({split:'external',...r}))].map(r=>[r.split,r.key,r.date,r.targetThrough,r.actual,r.ridge,r.naive,r.moving_average_7,r.stockoutAffected].join(','))].join('\n')+'\n';
writeFileSync(path.join(directory,'errors.csv'),csv,{flag:'wx'});
mkdirSync('docs/evaluation',{recursive:true});writeFileSync('docs/evaluation/freshretailnet-results.json',JSON.stringify(report,null,2)+'\n');
const pct=n=>n==null?'undefined':(100*n).toFixed(2)+'%';
const markdown=`# FreshRetailNet-50K — hasil pelatihan nyata publik\n\nSumber: [Dingdong-Inc](${protocol.sourceUrl}), CC BY 4.0. Revisi ${protocol.revision}.\n\n${series.length} model Ridge dilatih dari ${manifest.selectedSeries*90} observasi train publik; evaluasi eksternal memakai ${allExternal.length} target dua hari dari split eval penerbit. Data asli bernilai normalisasi dipertahankan, tanpa imputasi atau data sintetis.\n\n| Metode | MAE eksternal (normalized sales / 2 hari) | WAPE eksternal |\n|---|---:|---:|\n${Object.entries(report.external.metrics).map(([name,m])=>`| ${name} | ${m.mae?.toFixed(8)} | ${pct(m.wape)} |`).join('\n')}\n\nModel lolos kedua baseline pada test internal: ${report.internal.qualifiedModels}/${series.length}. Pada eval eksternal: ${report.external.seriesBeatingBoth}/${series.length}. Semua seri terpilih dilaporkan, termasuk yang kalah dari baseline. Kegagalan pipeline: ${failures.length}.\n\nArtefak: ${path.relative(process.cwd(),directory)}. Setiap seri menyimpan koefisien/scaler dan metadata. report.json memuat seluruh hasil dan errors.csv memuat rincian prediksi/target. Tidak ada model publik yang diaktifkan untuk usaha pengguna.\n\n## Batas\n\n${report.limitations.map(s=>'- '+s).join('\n')}\n`;
writeFileSync('docs/evaluation/FRESHRETAILNET_RESULTS.md',markdown);
console.log(JSON.stringify({directory,trainedModels:series.length,failed:failures.length,internal:report.internal,external:{metrics:report.external.metrics,seriesBeatingBoth:report.external.seriesBeatingBoth}},null,2));
if(failures.length)process.exitCode=1;
