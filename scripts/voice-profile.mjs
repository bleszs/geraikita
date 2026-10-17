import {createProfileTranscriber} from '../server/speech-profiles.mjs';
if(process.argv.length!==3)throw Error('Gunakan satu profil: tiny-current, tiny-pinned atau base-pinned.');
const status=await createProfileTranscriber(process.argv[2]).status();console.log(JSON.stringify(status,null,2));if(!status.available)process.exitCode=1;
