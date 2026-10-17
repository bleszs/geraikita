import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2),command=args[0];
if(args.length!==1||!['setup','fetch'].includes(command))throw Error('Use setup or fetch.');
const python=path.join(root,'.venv-speech-data',process.platform==='win32'?'Scripts/python.exe':'bin/python');
function run(exe,params){const result=spawnSync(exe,params,{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,PYTHONUTF8:'1'}});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
if(command==='setup'){
  run(process.platform==='win32'?'python':'python3',['-m','venv',path.join(root,'.venv-speech-data')]);
  run(python,['-m','pip','install','-r','requirements-speech-data.txt']);
}else run(python,['scripts/fetch-fleurs.py']);
