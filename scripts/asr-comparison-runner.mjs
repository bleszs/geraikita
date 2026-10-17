import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runSpeechProcess,decodeAudioBody} from '../server/transcriber.mjs';
export function verifyCandidate(candidate){
  if(!['tiny','base'].includes(candidate.id))throw Error('Unsupported comparison model.');
  const source=JSON.parse(readFileSync(candidate.sourceLock,'utf8'));
  for(const file of source.files){const bytes=readFileSync(path.join(candidate.modelDirectory,file.name));if(bytes.length!==file.size)throw Error('Model source size mismatch.');const hash=file.sha256?createHash('sha256').update(bytes).digest('hex'):createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');if(hash!==(file.sha256||file.gitBlobSha1))throw Error('Model source checksum mismatch.');}
  return source;
}
export async function inferComparison(model,body,{check=false,signal}={}){
  if(!['tiny','base'].includes(model))throw Error('Unsupported comparison model.');
  const bytes=check?null:decodeAudioBody(body);
  return runSpeechProcess(bytes,{check,signal,timeoutMs:90000,spawnProcess(exe,args,options){return spawn(exe,[path.resolve('scripts/comparison-transcribe.py'),model,...args.slice(1)],options);}});
}
