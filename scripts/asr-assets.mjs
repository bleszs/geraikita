import {spawnSync} from 'node:child_process';
import path from 'node:path';
const args=process.argv.slice(2);if(args.length!==1||!['model','validation'].includes(args[0]))throw Error('Use model or validation.');
const python=path.resolve('.venv-speech-data',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const result=spawnSync(python,['scripts/fetch-asr-comparison.py',args[0]],{stdio:'inherit',windowsHide:true,env:{...process.env,PYTHONUTF8:'1'}});if(result.error)throw result.error;process.exitCode=result.status??1;
