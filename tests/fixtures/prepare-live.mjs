import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
let f='public/app.js';writeFileSync(f,readFileSync(f,'utf8').replace('</span></div></div></header>','</span></div></header>'));
f='tests/fixtures/store.mjs';let s=readFileSync(f,'utf8').replace("{supplier:'UD Pangan Bersama',unitPrice:","{productName:'Telur ayam',supplier:'UD Pangan Bersama',unitPrice:");writeFileSync(f,s);
writeFileSync('tests/fixtures/service.mjs',`import {createService as liveService} from '../../server/service.mjs';
export function createService(store){const service=liveService(store);return {...service,reset(s){store.atomic(()=>{const sessions=store.all('SELECT * FROM sessions WHERE workspace_id=?',s.workspace_id);store.run('DELETE FROM workspaces WHERE id=?',s.workspace_id);store.seed(s.workspace_id);for(const t of sessions)store.run('INSERT INTO sessions VALUES(?,?,?,?,?)',t.id,t.workspace_id,t.business_id,t.csrf,t.expires_at);});}};}
`);
for(const file of ['tests/backend.test.mjs','tests/receipt-units.test.mjs','tests/stock-cancellation.test.mjs','tests/collective-cancellation.test.mjs','tests/surplus.test.mjs'])writeFileSync(file,readFileSync(file,'utf8').replace("'../server/service.mjs'","'./fixtures/service.mjs'"));
f='tests/fixtures/http.mjs';writeFileSync(f,readFileSync(f,'utf8').replace("'../../server/service.mjs'","'./service.mjs'"));
mkdirSync('tests/legacy/frontend',{recursive:true});
for(const file of ['attention.js','screens.js','inventory-screen.js','ingredient-editor.js','surplus-screen.js','collective-screen.js','receipt-cancellation.js','stock-cancellation.js'])if(existsSync('public/'+file))renameSync('public/'+file,'tests/legacy/frontend/'+file);
writeFileSync('public/sw.js',`const CACHE='gerai-kita-shell-v20-live';
const FILES=['/','/index.html','/app.js','/live-views.js','/api.js','/styles.css','/offline.js','/model.js','/catalog.js','/icons.js','/receipt-measurement.js','/manifest.webmanifest','/assets/favicon.svg','/assets/icon-192.png','/assets/icon-512.png',...[400,600,700,800,900].map(w=>'/assets/nunito-sans-'+w+'.woff2')];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('gerai-kita-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(url.origin!==location.origin||e.request.method!=='GET'||url.pathname.startsWith('/api/'))return;if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE).then(c=>c.match('/index.html')));return;}if(FILES.includes(url.pathname))e.respondWith(caches.open(CACHE).then(async c=>(await c.match(url.pathname))||fetch(e.request)));});
`);
console.log('Legacy presentation and fixtures isolated; live shell prepared.');
