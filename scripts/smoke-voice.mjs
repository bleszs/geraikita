// Real HTTP -> Python -> PyAV/model installation smoke, never the user's DB.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createApp} from '../server/http.mjs';
import {createExtractor} from '../server/extractor.mjs';
import {localTranscriber} from '../server/transcriber.mjs';
const status=await localTranscriber.status();assert.equal(status.available,true,'Install the local model first.');
function silence(seconds){const bytes=16000*seconds*2,b=Buffer.alloc(44+bytes);b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);return b;}
const app=createApp({filename:':memory:',extractor:createExtractor({provider:'rules'})});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+app.server.address().port;
try{
  const registration=await fetch(base+'/api/auth/register',{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify({email:'speech-smoke@example.test',password:'Isolated-voice-smoke-password',businessName:'Uji teknis audio memory',communityName:'Scope pengujian memory'})});
  assert.equal(registration.status,201);const cookie=registration.headers.get('set-cookie').split(';')[0],state=await registration.json(),cases=[];
  for(const [name,audio] of [['silence',silence(2)],['decoded_duration_31_seconds',silence(31)],['malformed_container',Buffer.from('not an audio file')]]){
    const before=performance.now(),response=await fetch(base+'/api/transcriptions',{method:'POST',headers:{'content-type':'application/json',origin:base,cookie},body:JSON.stringify({csrf:state.csrf,mimeType:'audio/wav',audio:audio.toString('base64')})}),body=await response.json();
    assert.equal(response.status,422);assert.equal(body.text,undefined);cases.push({name,httpStatus:response.status,error:body.error,elapsedMs:Math.round(performance.now()-before),inventedTranscript:false});
  }
  assert.equal(app.store.get('SELECT COUNT(*) n FROM sales').n,0);assert.equal(app.store.get('SELECT COUNT(*) n FROM movements').n,0);
  const report={checkedAt:new Date().toISOString(),database:':memory:',realPythonSubprocess:true,available:status,cases,passed:true,scope:'Technical rejection smoke with generated silence/invalid bytes. Not speech recognition accuracy or a business dataset.'};
  await writeFile('docs/evaluation/voice-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await app.close();}
