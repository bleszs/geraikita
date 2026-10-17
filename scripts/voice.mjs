import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {localTranscriber} from '../server/transcriber.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const python=path.join(root,'.venv-voice',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const args=process.argv.slice(2),command=args[0];
if(!['setup','check','test'].includes(command)||args.length!==1)throw Error('Gunakan setup, check atau test.');
const run=(exe,params)=>{const r=spawnSync(exe,params,{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,PYTHONUTF8:'1',HF_HUB_OFFLINE:'1'}});if(r.error)throw Error(r.error.message);if(r.status!==0)process.exit(r.status||1);};
if(command==='setup'){
  run(process.platform==='win32'?'python':'python3',['-m','venv',path.join(root,'.venv-voice')]);
  run(python,['-m','pip','install','-r','requirements-voice.txt']);
  run(python,['scripts/setup-voice.py']);
}
if(command==='test')run(python,['-m','unittest','discover','-s','tests','-p','test_voice.py']);
else{const status=await localTranscriber.status();console.log(JSON.stringify(status,null,2));if(!status.available)process.exitCode=1;}
