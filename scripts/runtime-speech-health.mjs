import {localTranscriber} from '../server/transcriber.mjs';
import {createProfileTranscriber,speechProfile} from '../server/speech-profiles.mjs';

async function localVerification(status){
  const engine=status.profile?createProfileTranscriber(status.profile,{disabled:false}):localTranscriber;
  return engine.status();
}
export async function inspectRuntimeSpeech(address,{expectedProfile,fetcher=fetch,verifyLocal=localVerification}={}){
  const url=new URL(address);
  if(url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Alamat aplikasi harus berupa http://localhost:PORT atau http://127.0.0.1:PORT.');
  if(expectedProfile!==undefined)speechProfile(expectedProfile);
  const response=await fetcher(new URL('/api/health',url),{signal:AbortSignal.timeout(35000),redirect:'error'});
  if(!response.ok)throw Error('Status suara server tidak dapat dibaca: HTTP '+response.status);
  const body=await response.json(),status=body.speech;
  if(body.mode!=='live'||body.storage!=='sqlite'||!status||typeof status.available!=='boolean'||!['whisper-tiny','whisper-base'].includes(status.model))throw Error('Respons bukan status suara Gerai Kita yang valid.');
  if(status.profile!==undefined){
    const config=speechProfile(status.profile);
    if(status.model!=='whisper-'+config.model||(config.openblasThreads&&status.openblasThreads!==config.openblasThreads))throw Error('Model server tidak sesuai profil yang dilaporkan.');
  }else if(status.model!=='whisper-tiny')throw Error('Server melaporkan model tanpa identitas profil.');
  if(expectedProfile!==undefined&&status.profile!==expectedProfile)throw Error('Profil server '+(status.profile??'Tiny default')+' berbeda dari profil yang diminta '+expectedProfile+'.');
  if(!status.available)return {...status,source:'server_health',localModelVerified:false};
  const checked=await verifyLocal(status);
  if(checked.model!==status.model||checked.profile!==status.profile)throw Error('Pemeriksaan lokal tidak sesuai model/profil server.');
  return {...status,source:'server_health',localModelVerified:checked.available===true,...(!checked.available?{available:false,reason:'Model pada laptop belum siap meskipun status server tersedia. Periksa pemasangan profil lalu mulai ulang server.'}:{})};
}
