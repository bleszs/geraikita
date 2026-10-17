import {isIP} from 'node:net';
import path from 'node:path';
import {requireValue} from './common.mjs';

// A configured canonical origin is authoritative; forwarded host/proto cannot
// change redirects, CSRF decisions or cookie security.
export function deploymentConfig(env=process.env){
  const raw=env.PUBLIC_ORIGIN||(env.RAILWAY_PUBLIC_DOMAIN?`https://${env.RAILWAY_PUBLIC_DOMAIN}`:'');
  const publicMode=env.NODE_ENV==='production'||!!raw;
  let origin;
  if(publicMode){
    try{origin=new URL(raw);}catch{throw Error('Isi PUBLIC_ORIGIN HTTPS atau buat domain publik Railway sebelum menjalankan server produksi.');}
    if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('PUBLIC_ORIGIN harus origin HTTPS tanpa path, query atau kredensial.');
  }
  if(env.TRUST_RAILWAY_PROXY&&!['true','false'].includes(env.TRUST_RAILWAY_PROXY))throw Error('TRUST_RAILWAY_PROXY harus true atau false.');
  const trustRailwayProxy=env.TRUST_RAILWAY_PROXY==='true';
  if(trustRailwayProxy&&!publicMode)throw Error('Proxy Railway hanya boleh dipercaya pada mode publik dengan origin HTTPS.');
  const bindHost=env.BIND_HOST||(publicMode?'0.0.0.0':'127.0.0.1');
  if(!['127.0.0.1','0.0.0.0','::'].includes(bindHost))throw Error('BIND_HOST harus 127.0.0.1, 0.0.0.0 atau ::.');
  function checkHost(request,pathname){
    const host=(request.headers.host||'').toLowerCase();
    // Railway's probe hostname never grants access to an application route.
    if(publicMode&&host==='healthcheck.railway.app'&&pathname==='/api/health'&&request.method==='GET')return;
    let parsed;try{parsed=new URL('http://'+host);}catch{}
    const valid=parsed&&parsed.host===host&&parsed.pathname==='/'&&!parsed.search&&!parsed.hash;
    requireValue(valid&&(publicMode?host===origin.host:['localhost','127.0.0.1'].includes(parsed.hostname)),'Host tidak diizinkan.',403);
  }
  function checkOrigin(request){
    const expected=publicMode?origin.origin:`http://${request.headers.host}`;
    requireValue(!request.headers.origin||request.headers.origin===expected,'Asal permintaan tidak diizinkan.',403);
  }
  function sessionCookie(id,clear=false){
    return `gerai_session=${clear?'':id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:2592000}${publicMode?'; Secure':''}`;
  }
  function clientAddress(request){
    // Enable only behind Railway's edge, which supplies X-Real-IP. Never use
    // an arbitrary user-supplied X-Forwarded-For chain as a limiter identity.
    const real=request.headers['x-real-ip'];
    return trustRailwayProxy&&typeof real==='string'&&isIP(real)?real:request.socket.remoteAddress;
  }
  return {publicMode,origin:origin?.origin??null,bindHost,checkHost,checkOrigin,sessionCookie,clientAddress};
}

export function validateRailwayStorage(env=process.env){
  if(!env.RAILWAY_ENVIRONMENT_ID)return;
  const mount=env.RAILWAY_VOLUME_MOUNT_PATH,filename=env.DATABASE_PATH;
  if(!mount||!filename||!path.isAbsolute(mount)||!path.isAbsolute(filename))throw Error('Railway memerlukan volume persisten dan DATABASE_PATH absolut pada volume tersebut.');
  const relative=path.relative(mount,filename);
  if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('DATABASE_PATH harus berada di dalam volume Railway.');
}
