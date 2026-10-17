import {readFileSync,writeFileSync,renameSync,mkdirSync,statSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ensure,hash,validateArtifact} from './ml/forecast-model.mjs';

export const modelKey=scope=>[scope.workspaceId,scope.businessId,scope.productId].join(':');
export function createForecastRegistry(directory=process.env.FORECAST_MODEL_DIR || 'models/forecast'){
  const root=path.resolve(directory),registryFile=path.join(root,'registry.json');
  function readRegistry(){
    if(statSync(registryFile).size>1000000)throw new Error('Registry model terlalu besar.');
    const r=JSON.parse(readFileSync(registryFile,'utf8'));ensure(r.version===1 && r.models && typeof r.models==='object' && !Array.isArray(r.models),'Registry model tidak valid.');return r;
  }
  function load(relative,expectedHash){
    const absolute=realpathSync(path.resolve(root,relative)),resolvedRoot=realpathSync(root);
    ensure(absolute.startsWith(resolvedRoot+path.sep) && statSync(absolute).size<=1000000,'Lokasi/ukuran artefak tidak valid.');
    const raw=readFileSync(absolute,'utf8');ensure(hash(raw)===expectedHash,'Checksum model berubah. Aktifkan ulang hanya setelah meninjau artefak.');return validateArtifact(JSON.parse(raw));
  }
  function get(scope){
    const missing={status:'not_trained',artifact:null,reason:'Belum ada model terlatih yang diaktifkan untuk bahan ini.'},unavailable={status:'unavailable',artifact:null,reason:'Artefak model belum dapat digunakan; baseline tetap tersedia.'};
    let r;try{r=readRegistry();}catch(error){return error.code==='ENOENT'?missing:unavailable;}
    const entry=r.models[modelKey(scope)];if(!entry)return missing;
    try{const a=load(entry.file,entry.sha256);ensure(a.dataset.provenance.source==='user_records','Model benchmark publik tidak digunakan sebagai model usaha.');ensure(modelKey(a.scope)===modelKey(scope) && a.scope.unit===scope.unit,'Identitas atau satuan model berbeda.');ensure(a.evaluation.qualified,'Model belum mengalahkan kedua baseline.');return {status:'active',artifact:a,reason:'Model terlatih lolos perbandingan holdout.'};}catch{return unavailable;}
  }
  function activate(filename){
    const absolute=path.resolve(filename);mkdirSync(root,{recursive:true});
    const real=realpathSync(absolute),realRoot=realpathSync(root);ensure(real.startsWith(realRoot+path.sep),'Simpan artefak di dalam direktori models/forecast sebelum aktivasi.');
    const raw=readFileSync(real,'utf8');ensure(Buffer.byteLength(raw)<=1000000,'Artefak terlalu besar.');const a=validateArtifact(JSON.parse(raw));ensure(a.dataset.provenance.source==='user_records','Artefak benchmark publik tidak boleh diaktifkan sebagai model usaha.');ensure(a.evaluation.qualified,'Model tidak mengalahkan kedua baseline pada holdout. Aktivasi ditolak.');
    let registry;try{registry=readRegistry();}catch(error){if(error.code!=='ENOENT')throw error;registry={version:1,models:{}};}
    registry.models[modelKey(a.scope)]={file:path.relative(root,real),sha256:hash(raw),activatedAt:new Date().toISOString()};
    const temporary=path.join(root,'registry-'+randomUUID()+'.tmp');writeFileSync(temporary,JSON.stringify(registry,null,2)+'\n',{flag:'wx'});renameSync(temporary,registryFile);return {activated:true,scope:a.scope};
  }
  return {get,activate};
}
