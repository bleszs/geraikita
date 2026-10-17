import {parseArgs} from 'node:util';
import {resolveSpeechSelection} from '../server/runtime-speech.mjs';
export function parseStartOptions(args=process.argv.slice(2),env=process.env){
  const {values}=parseArgs({args,options:{'speech-profile':{type:'string'},port:{type:'string'}},allowPositionals:false});
  const rawPort=values.port??(env.PORT||'4174');
  if(!/^\d+$/.test(String(rawPort))||!Number.isInteger(Number(rawPort))||Number(rawPort)>65535)throw Error('Port harus bilangan bulat antara 0 dan 65535.');
  return {speechProfile:resolveSpeechSelection({profile:values['speech-profile'],env}),port:Number(rawPort)};
}
