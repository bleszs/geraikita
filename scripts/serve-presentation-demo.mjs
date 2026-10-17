import { createApp } from '../server/http.mjs';
import { createRuntimeTranscriber } from '../server/runtime-speech.mjs';
import { preparePresentationDemo } from './presentation-demo.mjs';
try {
  if (process.argv.length > 2) throw new Error('Server demo memakai port 4180 dan database demo terpisah.');
  const demo = preparePresentationDemo();
  console.log('DEMO PRESENTASI — ' + demo.account.businessName + '\nEmail: ' + demo.account.email + '\nKata sandi demo: ' + demo.account.password + '\nData simulasi: ' + demo.filename);
  const app = createApp({ filename: demo.filename, transcriber: createRuntimeTranscriber() });
  app.server.listen(4180, '127.0.0.1', () => console.log('DEMO Gerai Kita: http://127.0.0.1:4180'));
  app.server.once('error', error => { console.error(error.message); app.store.close(); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
} catch (error) { console.error(error.message); process.exitCode = 1; }
