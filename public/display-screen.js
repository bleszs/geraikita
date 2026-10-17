const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=location.hash.slice(1),main=document.querySelector('#customer-main'),status=document.querySelector('#screen-status'),retry=document.querySelector('#screen-retry');
let controller,timer,epoch=0,retries=0,closed=false,lastOrders='',watchdog;
const systemTheme=matchMedia('(prefers-color-scheme: dark)');
document.documentElement.dataset.theme=systemTheme.matches?'dark':'light';
document.querySelector('#screen-theme').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';};
function message(text,kind){document.body.dataset.connection=kind;status.textContent=text;}
function clearOrders(){lastOrders='';main.innerHTML='<section class="screen-unavailable"><h2>Menunggu koneksi terbaru.</h2><p>Status pesanan disembunyikan sampai layar terhubung kembali.</p></section>';}
function endAccess(){
  closed=true;controller?.abort();clearTimeout(timer);clearTimeout(watchdog);lastOrders='';
  main.innerHTML='<section class="screen-unavailable"><h2>Akses layar sudah berakhir.</h2><p>Minta tautan baru kepada pemilik. Kode pesanan sebelumnya sudah disembunyikan.</p></section>';
  message('Tautan berakhir atau dicabut.','closed');retry.hidden=true;
}
function render(data){
  if(!Array.isArray(data.orders)||data.orders.some(o=>!o||!/^[A-F0-9]{8}$/.test(o.code)||!['queued','preparing','ready'].includes(o.status)))throw Error('Data layar belum valid.');
  const next=JSON.stringify([data.orders,data.hasMore]);
  if(next!==lastOrders){
    lastOrders=next;
    const lane=(title,orders,ready)=>`<section class="customer-lane"><h2>${title}</h2>${orders.length?`<ul>${orders.map(o=>`<li><strong class="customer-code">#${escape(o.code)}</strong><span class="${ready?'ready-label':'waiting-label'}">${ready?'Silakan ke petugas':o.status==='queued'?'Pesanan diterima':'Sedang disiapkan'}</span>${!ready&&o.etaMinutes>0?`<span class="eta-label">~${o.etaMinutes} mnt</span>`:''}</li>`).join('')}</ul>`:`<p class="customer-empty">${ready?'Belum ada pesanan siap.':'Belum ada pesanan yang menunggu.'}</p>`}</section>`;
    main.innerHTML=`<div class="customer-board">${lane('Siap disajikan',data.orders.filter(o=>o.status==='ready'),true)}${lane('Sedang disiapkan',data.orders.filter(o=>o.status!=='ready'),false)}</div>${data.hasMore?'<p>Antrean lebih panjang dari tampilan layar. Tanyakan kode pesanan kepada petugas.</p>':''}`;
  }
  retries=0;retry.hidden=true;message('Terhubung · diperbarui '+new Date(data.updatedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),'live');
}
async function connect(){
  clearTimeout(timer);clearTimeout(watchdog);controller?.abort();const version=++epoch;
  if(closed)return;
  if(!navigator.onLine){clearOrders();message('Layar offline · status disembunyikan.','stale');retry.hidden=false;return;}
  if(!/^[a-f0-9]{64}$/.test(token)){main.innerHTML='<section class="screen-unavailable"><h2>Buka tautan layar dari pemilik.</h2><p>Tautan belum lengkap. Minta pemilik membuat tautan melalui Pengaturan akun → Layar pelanggan.</p></section>';message('Tautan belum tersedia.','closed');retry.hidden=true;closed=true;return;}
  clearOrders();controller=new AbortController();const signal=controller.signal;
  message(lastOrders?'Menghubungkan kembali · status sebelumnya mungkin sudah berubah.':'Menghubungkan layar…','stale');
  const watch=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>controller?.abort(),12000);};watch();
  try{
    const response=await fetch('/api/display/events',{headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal});
    if(version!==epoch)return;
    if(response.status===401){endAccess();return;}if(!response.ok||!response.body)throw Error('Koneksi belum tersedia.');
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    try{while(true){const {value,done}=await reader.read();if(version!==epoch||closed)return;if(done)throw Error('Koneksi terputus.');watch();buffer+=decoder.decode(value,{stream:true});if(buffer.length>100000)throw Error('Data layar terlalu besar.');let end;
      while((end=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,end);buffer=buffer.slice(end+2);if(event.includes('event: revoked')){endAccess();return;}const line=event.split('\n').find(l=>l.startsWith('data: '));if(line)render(JSON.parse(line.slice(6)));}
    }}finally{await reader.cancel().catch(()=>{});}
  }catch{
    if(version!==epoch||closed||document.hidden)return;
    clearOrders();message(navigator.onLine?'Koneksi terputus. Periksa koneksi layar.':'Layar offline · status disembunyikan.','stale');retry.hidden=false;
    if(navigator.onLine)timer=setTimeout(connect,Math.min(15000,1000*2**Math.min(retries++,4)));
  }finally{if(version===epoch)clearTimeout(watchdog);}
}
retry.onclick=connect;
window.addEventListener('offline',()=>{if(closed)return;controller?.abort();clearOrders();message('Layar offline · status disembunyikan.','stale');retry.hidden=false;});
window.addEventListener('online',()=>{if(!closed)connect();});
window.addEventListener('pagehide',()=>{epoch++;controller?.abort();clearTimeout(timer);clearTimeout(watchdog);if(!closed)clearOrders();});
window.addEventListener('pageshow',event=>{if(event.persisted&&!closed)connect();});
window.addEventListener('hashchange',()=>location.reload());
document.addEventListener('visibilitychange',()=>{if(document.hidden){epoch++;controller?.abort();clearTimeout(timer);clearTimeout(watchdog);if(!closed)clearOrders();message('Pembaruan dijeda · hubungkan kembali saat layar dibuka.','stale');}else if(!closed)connect();});
connect();
