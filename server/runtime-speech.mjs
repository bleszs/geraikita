import {localTranscriber} from './transcriber.mjs';
import {createProfileTranscriber,speechProfile} from './speech-profiles.mjs';

/** No option preserves the original singleton and entrypoint exactly. */
export function resolveSpeechSelection({profile,env=process.env}={}){
  const selected=profile===undefined?env.SPEECH_PROFILE:profile;
  if(profile===undefined&&(selected===undefined||selected===''))return null;
  speechProfile(selected);
  return selected;
}
export function createRuntimeTranscriber({profile,env=process.env,legacy=localTranscriber,profileFactory=createProfileTranscriber}={}){
  const selected=resolveSpeechSelection({profile,env});
  return selected===null?legacy:profileFactory(selected,{disabled:env.SPEECH_PROVIDER==='disabled'});
}
