import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, profiles } from './store.mjs';
import { createService } from './service.mjs';
import { createExtractor } from '../../server/extractor.mjs';
import { ApiError, requireValue } from '../../server/common.mjs';
const root = path.resolve(fileURLToPath(new URL('../../public/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8' };
async function readBody(request) {
  requireValue(request.headers['content-type']?.startsWith('application/json'), 'Gunakan JSON.', 415);
  let size = 0; const chunks = [];
  for await (const chunk of request) { size += chunk.length; requireValue(size <= 65536, 'Permintaan terlalu besar.', 413); chunks.push(chunk); }
  try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); requireValue(body && typeof body === 'object' && !Array.isArray(body), 'JSON harus berupa objek.'); return body; } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, 'JSON tidak valid.'); }
}
export function createApp({ filename = process.env.DATABASE_PATH || 'data/gerai-kita.sqlite', extractor = createExtractor() } = {}) {
  const store = createStore(filename); const service = createService(store);
  const server = http.createServer(async (request, response) => {
    const json = (value, status = 200) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)); };
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      requireValue(['localhost', '127.0.0.1'].includes((request.headers.host || '').split(':')[0]), 'Host tidak diizinkan.', 403);
      if (pathname.startsWith('/api/')) {
        const mutating = !['GET', 'HEAD'].includes(request.method);
        if (mutating) { requireValue(!request.headers.origin || request.headers.origin === `http://${request.headers.host}`, 'Asal permintaan tidak diizinkan.', 403); requireValue(request.method === 'POST', 'Metode tidak didukung.', 405); }
        const cookie = request.headers.cookie?.match(/(?:^|;\s*)gerai_session=([a-f0-9]{64})(?:;|$)/)?.[1];
        let session = cookie && store.get('SELECT * FROM sessions WHERE id=? AND expires_at>?', cookie, Date.now());
        const body = mutating ? await readBody(request) : null;
        if (pathname === '/api/demo/session' && mutating) {
          const business = body.businessId || 'sari'; requireValue(profiles.some(p => p.id === business), 'Usaha demo tidak ditemukan.');
          if (session) requireValue(body.csrf === session.csrf, 'Sesi berubah. Muat ulang halaman.', 403);
          session = store.session(business, session?.workspace_id || null);
          response.setHeader('Set-Cookie', `gerai_session=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
          return json({ ...service.bootstrap(session), ai: await extractor.status() });
        }
        requireValue(session, 'Sesi demo belum tersedia. Muat ulang aplikasi.', 401);
        if (mutating) requireValue(body.csrf === session.csrf, 'Sesi berubah. Muat ulang halaman.', 403);
        if (pathname === '/api/bootstrap' && request.method === 'GET') return json({ ...service.bootstrap(session), ai: await extractor.status() });
        if (pathname === '/api/health' && request.method === 'GET') return json({ storage: 'sqlite', demo: true, ai: await extractor.status() });
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
        if (pathname === '/api/demo/reset' && mutating) { const sessions=store.all('SELECT * FROM sessions WHERE workspace_id=?',session.workspace_id);store.atomic(()=>{store.run('DELETE FROM workspaces WHERE id=?',session.workspace_id);store.seed(session.workspace_id);for(const t of sessions)store.run('INSERT INTO sessions VALUES(?,?,?,?,?)',t.id,t.workspace_id,t.business_id,t.csrf,t.expires_at);}); return json(service.bootstrap(session)); }
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
  return { server, store, service, close: () => new Promise(resolve => server.close(() => { store.close(); resolve(); })) };
}
