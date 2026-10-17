import {parseArgs} from 'node:util';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {train} from '../server/ml/forecast-model.mjs';
import {createForecastRegistry} from '../server/forecast-registry.mjs';
import {readJson,writeNewJson,importCsv,exportDatabase,listSources} from './forecast-data.mjs';
import {forecastReadiness} from './forecast-readiness.mjs';

const help=`Perintah forecasting (tidak mengisi database):
  npm run forecast -- status
  npm run forecast -- sources [--database PATH]
  npm run forecast -- readiness [--database PATH] [--workspace ID --business ID --product ID] [--as-of YYYY-MM-DD] [--out PATH]
  npm run forecast -- import --csv PATH --metadata PATH --out PATH
  npm run forecast -- export --workspace ID --business ID --product ID --from YYYY-MM-DD --to YYYY-MM-DD --reference "REFERENSI IZIN" --confirm-records --out PATH
  npm run forecast -- train --dataset PATH [--out DIRECTORY]
  npm run forecast -- activate --artifact PATH [--models DIRECTORY]
Template kosong: datasets/templates/. Panduan: docs/AI_TRAINING.md.
Pelatihan minimal 84 hari lengkap. Tidak ada dataset atau model bisnis bawaan.`;
try{
  const {values,positionals}=parseArgs({allowPositionals:true,options:{csv:{type:'string'},metadata:{type:'string'},out:{type:'string'},dataset:{type:'string'},database:{type:'string'},workspace:{type:'string'},business:{type:'string'},product:{type:'string'},from:{type:'string'},to:{type:'string'},'as-of':{type:'string'},reference:{type:'string'},'confirm-records':{type:'boolean'},artifact:{type:'string'},models:{type:'string'},help:{type:'boolean'}}});
  const command=positionals[0] || 'status';
  if(values.help)console.log(help);
  else if(command==='status')console.log(help+'\nStatus: pipeline tersedia. Model milik usaha hanya ada setelah dataset diberikan, dilatih, lolos evaluasi, lalu diaktifkan. Tidak ada pelatihan otomatis.');
  else if(command==='sources')console.log(JSON.stringify({readOnly:true,sources:listSources(values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite')},null,2));
  else if(command==='readiness'){
    const report=forecastReadiness({filename:values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite',asOf:values['as-of'],workspaceId:values.workspace,businessId:values.business,productId:values.product,models:values.models});
    if(values.out)writeNewJson(values.out,report);
    console.log(JSON.stringify(report,null,2));
  }
  else if(command==='import'){if(!values.csv || !values.metadata || !values.out)throw new Error('Isi --csv, --metadata dan --out.');const dataset=importCsv(values.csv,readJson(values.metadata));writeNewJson(values.out,dataset);console.log('Dataset tervalidasi: '+dataset.observations.length+' hari. Tidak mengimpor transaksi/stok ke aplikasi.');}
  else if(command==='export'){if(!values.out || !values.workspace || !values.business || !values.product)throw new Error('Isi --workspace, --business, --product dan --out.');const dataset=exportDatabase({filename:values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite',workspaceId:values.workspace,businessId:values.business,productId:values.product,from:values.from,to:values.to,reference:values.reference,confirmed:values['confirm-records']});writeNewJson(values.out,dataset);console.log('Ekspor read-only selesai: '+dataset.observations.length+' hari.');}
  else if(command==='train'){
    if(!values.dataset)throw new Error('Isi --dataset. Tidak ada dataset bawaan.');
    const artifact=train(readJson(values.dataset)),directory=values.out || path.join(values.models || process.env.FORECAST_MODEL_DIR || 'models/forecast','runs',new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));
    mkdirSync(directory,{recursive:true});writeNewJson(path.join(directory,'evaluation.json'),{scope:artifact.scope,dataset:artifact.dataset,datasetHash:artifact.datasetHash,...artifact.evaluation});writeNewJson(path.join(directory,'model.json'),artifact);
    console.log(JSON.stringify({trained:true,qualified:artifact.evaluation.qualified,directory,test:artifact.evaluation.test,activated:false,note:'Bobot dilatih dari train+validation; test tidak dipakai fitting. Aktivasi adalah perintah terpisah.'},null,2));
  }
  else if(command==='activate'){if(!values.artifact)throw new Error('Isi --artifact.');console.log(JSON.stringify(createForecastRegistry(values.models).activate(values.artifact)));}
  else throw new Error('Perintah tidak dikenal.\n'+help);
}catch(error){console.error(error.message);process.exitCode=1;}
