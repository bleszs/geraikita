import {parseArgs} from 'node:util';
import {writeFile,mkdir} from 'node:fs/promises';
import {liveReport} from './live-report.mjs';
try{
  const {values}=parseArgs({options:{database:{type:'string'},report:{type:'string'}}});
  const report=liveReport(values.database || process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite');
  console.log(JSON.stringify(report,null,2));
  const destination=values.report || 'docs/evaluation/live-evaluation.json';
  await mkdir('docs/evaluation',{recursive:true});await writeFile(destination,JSON.stringify(report,null,2)+'\n');
}catch(error){console.error(error.message);process.exitCode=1;}
