import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.mjs';
import {createIdentity} from './identity.mjs';
import {createDisplayAccess} from './display-access.mjs';
import { createService } from './service.mjs';
import { createExtractor } from './extractor.mjs';
import {localTranscriber,MAX_AUDIO_BODY} from './transcriber.mjs';
import { ApiError, requireValue } from './common.mjs';
const root = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8' };
async function readBody(request, limit=65536) {
  requireValue(request.headers['content-type']?.startsWith('application/json'), 'Gunakan JSON.', 415);
  requireValue(!request.headers['content-length'] || Number(request.headers['content-length'])<=limit, 'Permintaan terlalu besar.', 413);
  let size = 0; const chunks = [];
  for await (const chunk of request) { size += chunk.length; requireValue(size <= limit, 'Permintaan terlalu besar.', 413); chunks.push(chunk); }
  try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); requireValue(body && typeof body === 'object' && !Array.isArray(body), 'JSON harus berupa objek.'); return body; } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, 'JSON tidak valid.'); }
}
export function createApp({ filename = process.env.DATABASE_PATH || 'data/gerai-kita-live.sqlite', extractor = createExtractor(),transcriber=localTranscriber } = {}) {
  const store = createStore(filename); const service = createService(store),identity=createIdentity(store);
  const displays=createDisplayAccess(store);
  const failures=new Map();
  const kitchenStreams=new Set();
  const stateOf=async s=>({...service.bootstrap(s),displays:displays.list(s),account:identity.details(s),ai:await extractor.status(),speech:await transcriber.status()});
  const server = http.createServer(async (request, response) => {
    const json = (value, status = 200) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)); };
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      requireValue(['localhost', '127.0.0.1'].includes((request.headers.host || '').split(':')[0]), 'Host tidak diizinkan.', 403);
      if(pathname==='/api/display/screen'&&request.method==='GET'){
        const content=await readFile(path.join(root,'display-screen.html'));
        response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'"});response.end(content);return;
      }
      if(['/api/display/snapshot','/api/display/events'].includes(pathname)){
        requireValue(request.method==='GET','Layar pelanggan hanya dapat membaca status.',405);
        const access=displays.resolve(request.headers.authorization);
        if(pathname.endsWith('/snapshot'))return json(displays.snapshot(access));
        response.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Connection':'keep-alive','X-Accel-Buffering':'no'});
        kitchenStreams.add(response);let fingerprint='',lastSent=0;
        const tick=()=>{try{
          const active=displays.resolve(request.headers.authorization),data=displays.snapshot(active),next=JSON.stringify([data.orders,data.hasMore]);
          if(next!==fingerprint||Date.now()-lastSent>=5000){fingerprint=next;lastSent=Date.now();response.write(`data: ${JSON.stringify(data)}\n\n`);}
        }catch{response.write('event: revoked\ndata: {}\n\n');response.end();}};
        const interval=setInterval(tick,1000);response.once('close',()=>{clearInterval(interval);kitchenStreams.delete(response);});tick();return;
      }
      // API prefix intentionally bypasses every legacy shell worker, including
      // versions whose startup error has no working update control.
      if(request.method==='GET' && ['/api/recovery','/api/recovery.js'].includes(pathname)){
        const script=pathname.endsWith('.js');
        const content=await readFile(path.join(root,script?'recovery.js':'recovery.html'));
        response.writeHead(200,{'Content-Type':script?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'"});response.end(content);return;
      }
      if (pathname.startsWith('/api/')) {
        const mutating = !['GET', 'HEAD'].includes(request.method);
        if (mutating) { requireValue(!request.headers.origin || request.headers.origin === `http://${request.headers.host}`, 'Asal permintaan tidak diizinkan.', 403); requireValue(request.method === 'POST', 'Metode tidak didukung.', 405); }
        const cookie = request.headers.cookie?.match(/(?:^|;\s*)gerai_session=([a-f0-9]{64})(?:;|$)/)?.[1];
        let session=identity.resolve(cookie);
        if(pathname==='/api/transcriptions')requireValue(session,'Masuk ke akun untuk memakai pencatatan suara.',401);
        const body=mutating ? await readBody(request,pathname==='/api/transcriptions'?MAX_AUDIO_BODY:65536) : null;
        if(pathname==='/api/health' && request.method==='GET')return json({storage:'sqlite',mode:'live',ai:await extractor.status(),speech:await transcriber.status()});
        if(['/api/auth/register','/api/auth/login'].includes(pathname) && mutating){
          requireValue(!session,'Keluar dari akun aktif sebelum masuk dengan akun lain.',409);
          const key=request.socket.remoteAddress+':'+String(body.email || '').toLowerCase();const failed=failures.get(key);
          requireValue(!failed || failed.until<Date.now() || failed.count<8,'Terlalu banyak percobaan. Coba lagi dalam 10 menit.',429);
          try{session=pathname.endsWith('/register') ? identity.register(body) : identity.login(body);failures.delete(key);}catch(error){const old=failed && failed.until>Date.now() ? failed : {count:0,until:Date.now()+600000};failures.set(key,{...old,count:old.count+1});throw error;}
          response.setHeader('Set-Cookie',`gerai_session=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
          return json(await stateOf(session),pathname.endsWith('/register') ? 201 : 200);
        }
        requireValue(session, 'Masuk ke akun untuk membuka catatan usaha.', 401);
        if (mutating) requireValue(body.csrf === session.csrf, 'Sesi berubah. Muat ulang halaman.', 403);
        if(pathname==='/api/displays'&&mutating)return json(displays.create(session,body),201);
        const displayMatch=pathname.match(/^\/api\/displays\/([a-zA-Z0-9-]+)\/revoke$/);
        if(displayMatch&&mutating)return json(displays.revoke(session,displayMatch[1]));
        if(pathname==='/api/kitchen/events'&&request.method==='GET'){
          response.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});
          kitchenStreams.add(response);let revision='';
          const tick=()=>{try{
            const active=identity.resolve(cookie);
            if(!active||active.workspace_id!==session.workspace_id||active.business_id!==session.business_id){response.end();return;}
            const next=service.kitchen.snapshot(active).revision;
            revision=next;response.write(`data: ${JSON.stringify({revision})}\n\n`);
          }catch{response.end();}};
          const interval=setInterval(tick,1000);response.once('close',()=>{clearInterval(interval);kitchenStreams.delete(response);});tick();return;
        }
        if(pathname==='/api/kitchen'&&request.method==='GET')return json(service.kitchen.snapshot(session));
        if(pathname==='/api/kitchen/orders'&&mutating)return json(service.kitchen.create(session,body),201);
        if(pathname==='/api/kitchen/commands'&&mutating)return json(service.kitchen.command(session,body));
        const kitchenMatch=pathname.match(/^\/api\/kitchen\/orders\/([a-zA-Z0-9-]+)\/actions$/);
        if(kitchenMatch&&mutating)return json(service.kitchen.change(session,kitchenMatch[1],body));
        if (pathname === '/api/bootstrap' && request.method === 'GET') return json(await stateOf(session));
        if (pathname === '/api/usage-reviews' && mutating) return json(service.saveUsageReview(session,body),201);
        if(pathname==='/api/transcriptions' && mutating){
          const controller=new AbortController();
          const disconnected=()=>{if(!response.writableEnded)controller.abort();};
          response.once('close',disconnected);
          try{return json(await transcriber.transcribe(body,{signal:controller.signal}));}
          finally{response.removeListener('close',disconnected);}
        }
        if(pathname==='/api/account/profile' && mutating)return json(identity.saveBusiness(session,body));
        if(pathname==='/api/community/settings' && mutating)return json(identity.saveCommunity(session,body));
        if(pathname==='/api/community/invite' && mutating)return json(identity.rotateInvite(session,body));
        if(pathname==='/api/account/password' && mutating){
          const key='password:'+session.workspace_id+':'+session.business_id,failed=failures.get(key);
          requireValue(!failed || failed.until<Date.now() || failed.count<8,'Terlalu banyak percobaan. Coba lagi dalam 10 menit.',429);
          try{const result=identity.changePassword(session,body);failures.delete(key);return json(result);}catch(error){if(error.code==='incorrect_password'){const old=failed && failed.until>Date.now()?failed:{count:0,until:Date.now()+600000};failures.set(key,{...old,count:old.count+1});}throw error;}
        }

        if (pathname === '/api/extractions' && mutating) {
          const catalogRevision = store.get('SELECT catalog_revision FROM business_state WHERE workspace_id=? AND business_id=?', session.workspace_id, session.business_id).catalog_revision;
          return json({ ...await extractor.extract(body.text, store.menus(session)), catalogRevision });
        }
        if (pathname === '/api/transactions' && mutating) return json(service.transaction(session, body), 201);
        if (pathname === '/api/stock-receipts' && mutating) return json(service.receive(session, body), 201);
        if (pathname === '/api/menus' && mutating) return json(service.saveMenu(session, null, body), 201);
        if (pathname === '/api/ingredients' && mutating) return json(service.saveIngredient(session,null,body),201);
        if (pathname === '/api/offers' && mutating) return json(service.createOffer(session,body),201);
        if (pathname === '/api/demand-consents' && mutating) return json(service.demand(session, body));
        if (pathname === '/api/proposal/approval' && mutating) return json(service.approval(session, body));
        if (pathname === '/api/collective-orders' && mutating) return json(service.finalizeCollective(session,body),201);
        if (pathname === '/api/collective-cycles/next' && mutating) return json(service.nextCycle(session,body));
        if(pathname==='/api/auth/logout' && mutating){store.run('DELETE FROM sessions WHERE id=?',session.id);response.setHeader('Set-Cookie','gerai_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json({signedOut:true});}
        if(pathname==='/api/community/quote' && mutating)return json(service.saveQuote(session,body));
        let match;
        if ((match=pathname.match(/^\/api\/collective-orders\/([a-zA-Z0-9-]+)\/receipts\/([a-zA-Z0-9-]+)\/cancel$/)) && mutating) return json(service.cancelCollectiveReceipt(session,match[1],match[2],body));
        if ((match=pathname.match(/^\/api\/ingredients\/([a-zA-Z0-9-]+)$/)) && mutating) return json(service.saveIngredient(session,match[1],body));
        if ((match = pathname.match(/^\/api\/collective-orders\/([a-zA-Z0-9-]+)\/(receipts|cancel)$/)) && mutating) return json(match[2] === 'receipts' ? service.receiveCollective(session,match[1],body) : service.cancelCollective(session,match[1]),match[2] === 'receipts' ? 201 : 200);
        if ((match = pathname.match(/^\/api\/stock-receipts\/([a-zA-Z0-9-]+)\/cancel$/)) && mutating) return json(service.cancelReceipt(session, match[1], body));
        if ((match = pathname.match(/^\/api\/menus\/([a-zA-Z0-9-]+)$/)) && mutating) return json(service.saveMenu(session, match[1], body));
        if ((match = pathname.match(/^\/api\/transactions\/([a-zA-Z0-9-]+)\/cancel$/)) && mutating) return json(service.cancelSale(session, match[1]));
        if ((match = pathname.match(/^\/api\/offers\/([a-zA-Z0-9-]+)\/request$/)) && mutating) return json(service.requestTransfer(session, match[1], body), 201);
        if ((match = pathname.match(/^\/api\/offers\/([a-zA-Z0-9-]+)\/withdraw$/)) && mutating) return json(service.withdrawOffer(session,match[1]));
        if ((match = pathname.match(/^\/api\/transfers\/([a-zA-Z0-9-]+)\/(approval|cancel)$/)) && mutating) return json(service.transferDecision(session, match[1], match[2] === 'approval'));
        throw new ApiError(404, 'Endpoint tidak ditemukan.');
      }
      requireValue(request.method === 'GET' || request.method === 'HEAD', 'Metode tidak didukung.', 405);
      const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      requireValue(filename.startsWith(root + path.sep), 'Akses tidak diizinkan.', 403);
      let content; try { content = await readFile(filename); } catch { throw new ApiError(404, 'Halaman tidak ditemukan.'); }
      response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) { if (!(error instanceof ApiError)) console.error(error); json({ error: error instanceof ApiError ? error.message : 'Terjadi kesalahan penyimpanan. Coba lagi.', code: error.code || 'server_error' }, error.status || 500); }
  });
  return { server, store, service, close: () => new Promise(resolve => {for(const stream of kitchenStreams)stream.end();server.close(() => { store.close(); resolve(); });server.closeIdleConnections();}) };
}
