import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,existsSync,rmdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {resolveSpeechSelection,createRuntimeTranscriber} from '../server/runtime-speech.mjs';
import {parseStartOptions} from '../scripts/start-options.mjs';
import {inspectRuntimeSpeech} from '../scripts/runtime-speech-health.mjs';

const base={available:true,model:'whisper-base',profile:'base-pinned',openblasThreads:'1'};
const tiny={available:true,model:'whisper-tiny'};
const response=speech=>new Response(JSON.stringify({mode:'live',storage:'sqlite',speech}));
test('no setting returns the exact legacy engine without constructing a candidate',()=>{
  const legacy={};assert.equal(resolveSpeechSelection({env:{}}),null);assert.equal(resolveSpeechSelection({env:{SPEECH_PROFILE:''}}),null);
  assert.equal(createRuntimeTranscriber({env:{},legacy,profileFactory:()=>{throw Error('unexpected');}}),legacy);
});
test('CLI overrides environment, which is not changed by selection',()=>{
  const env={SPEECH_PROFILE:'tiny-pinned'};assert.equal(parseStartOptions([],env).speechProfile,'tiny-pinned');
  assert.equal(parseStartOptions(['--speech-profile','base-pinned'],env).speechProfile,'base-pinned');assert.equal(env.SPEECH_PROFILE,'tiny-pinned');
  for(const args of [['--speech-profile',''],['--speech-profile','../base'],['--speech-profile','constructor'],['--unknown'],['base-pinned']])assert.throws(()=>parseStartOptions(args,{}));
  assert.throws(()=>resolveSpeechSelection({env:{SPEECH_PROFILE:'typo'}}));
});
test('explicit profile respects speech disable and is constructed only once',()=>{
  let calls=0;const engine={};assert.equal(createRuntimeTranscriber({env:{SPEECH_PROFILE:'base-pinned',SPEECH_PROVIDER:'disabled'},profileFactory:(id,options)=>{calls++;assert.equal(id,'base-pinned');assert.equal(options.disabled,true);return engine;}}),engine);assert.equal(calls,1);
});
test('port is explicit and validated before startup; unset preserves 4174 and zero allows isolated tests',()=>{
  assert.equal(parseStartOptions([],{}).port,4174);assert.equal(parseStartOptions([],{PORT:''}).port,4174);assert.equal(parseStartOptions(['--port','0'],{PORT:'4174'}).port,0);assert.equal(parseStartOptions(['--port','4176'],{}).port,4176);
  for(const value of ['-1','65536','0x20','1.5','','NaN'])assert.throws(()=>parseStartOptions(['--port',value],{}));
});
test('invalid startup option exits before opening or migrating a database',()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),'gerai-invalid-runtime-')),filename=path.join(directory,'untouched.sqlite');
  try{const child=spawnSync(process.execPath,['scripts/serve.mjs','--speech-profile','invalid'],{windowsHide:true,timeout:15000,encoding:'utf8',env:{...process.env,DATABASE_PATH:filename}});assert.notEqual(child.status,0);assert.match(child.stderr,/Profil suara tidak didukung/);assert.equal(existsSync(filename),false);}finally{rmdirSync(directory);}
});
test('doctor observes default Tiny from server and verifies that same model locally',async()=>{
  const result=await inspectRuntimeSpeech('http://localhost:4174',{fetcher:async(url,options)=>{assert.equal(url.pathname,'/api/health');assert.equal(options.redirect,'error');return response(tiny);},verifyLocal:async status=>{assert.equal(status.model,'whisper-tiny');return tiny;}});
  assert.equal(result.model,'whisper-tiny');assert.equal(result.source,'server_health');assert.equal(result.localModelVerified,true);
});
test('doctor observes actual Base profile instead of checking only Tiny',async()=>{
  const result=await inspectRuntimeSpeech('http://127.0.0.1:4174',{expectedProfile:'base-pinned',fetcher:async()=>response(base),verifyLocal:async status=>{assert.equal(status.profile,'base-pinned');return base;}});
  assert.equal(result.model,'whisper-base');assert.equal(result.localModelVerified,true);
});
test('wrong profile or model fails before a local inference check',async()=>{
  let verified=false;const options={expectedProfile:'base-pinned',fetcher:async()=>response(tiny),verifyLocal:async()=>{verified=true;return tiny;}};
  await assert.rejects(inspectRuntimeSpeech('http://localhost:4174',options),/berbeda/);assert.equal(verified,false);
  for(const status of [{...base,model:'whisper-tiny'},{...base,openblasThreads:'12'},{...base,profile:undefined}])await assert.rejects(inspectRuntimeSpeech('http://localhost:4174',{...options,fetcher:async()=>response(status)}));
});
test('unavailable/disabled server does not invoke a local model; local failure is not reported ready',async()=>{
  const result=await inspectRuntimeSpeech('http://localhost:4174',{fetcher:async()=>response({...base,available:false}),verifyLocal:async()=>{throw Error('unexpected');}});assert.equal(result.available,false);assert.equal(result.localModelVerified,false);
  const missing=await inspectRuntimeSpeech('http://localhost:4174',{fetcher:async()=>response(base),verifyLocal:async()=>({...base,available:false})});assert.equal(missing.available,false);
  await assert.rejects(inspectRuntimeSpeech('http://localhost:4174',{fetcher:async()=>response(base),verifyLocal:async()=>tiny}),/tidak sesuai/);
});
test('non-local URLs and malformed server identity are rejected',async()=>{
  let calls=0;const fetcher=async()=>{calls++;return response(tiny);};
  for(const url of ['https://localhost:4174','http://example.com','http://localhost:4174/path','http://user@localhost:4174','http://localhost:4174/?x=1'])await assert.rejects(inspectRuntimeSpeech(url,{fetcher}));assert.equal(calls,0);
  await assert.rejects(inspectRuntimeSpeech('http://localhost:4174',{fetcher:async()=>new Response('{}')}),/bukan status/);
  await assert.rejects(inspectRuntimeSpeech('http://localhost:4174',{fetcher:async()=>new Response('',{status:503})}),/HTTP 503/);
});
