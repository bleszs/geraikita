import { createApp } from '../server/http.mjs';
import {createRuntimeTranscriber} from '../server/runtime-speech.mjs';
import {parseStartOptions} from './start-options.mjs';
const options=parseStartOptions();
const transcriber=createRuntimeTranscriber({...(options.speechProfile===null?{}:{profile:options.speechProfile})});
const app = createApp({transcriber});
app.server.listen(options.port, '127.0.0.1', () => console.log('Gerai Kita: http://localhost:' + app.server.address().port+(options.speechProfile?' (profil suara: '+options.speechProfile+')':'')));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
