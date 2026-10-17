const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rupiah=n=>'Rp'+n.toLocaleString('id-ID');
const token=location.hash.slice(1),$=s=>document.querySelector(s);
const list=$('#catalog-list'),summary=$('#catalog-summary'),form=$('#catalog-form'),submit=$('#catalog-submit'),error=$('#catalog-error'),shop=$('#catalog-shop'),panel=$('#catalog-request'),status=$('#screen-status'),retry=$('#screen-retry');
const headers={Authorization:'Bearer '+token};
const storageKey='gerai-catalog-request:'+token.slice(0,16);
let menus=[],cart={},controller,timer,watchdog,poll,epoch=0,retries=0,closed=false,sending=false,draftKey=crypto.randomUUID(),requestId=null;
try{requestId=sessionStorage.getItem(storageKey);}catch{}
document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
$('#screen-theme').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';};
function message(text,kind){document.body.dataset.connection=kind;status.textContent=text;}
function remember(id){requestId=id;try{id?sessionStorage.setItem(storageKey,id):sessionStorage.removeItem(storageKey);}catch{}}
function endAccess(){
  closed=true;controller?.abort();clearTimeout(timer);clearTimeout(watchdog);clearTimeout(poll);
  shop.hidden=true;panel.hidden=false;panel.innerHTML='<div class="screen-unavailable"><h2>Katalog sudah ditutup.</h2><p>Tautan berakhir atau dicabut. Tanyakan kepada petugas untuk memesan.</p></div>';
  message('Tautan berakhir atau dicabut.','closed');retry.hidden=true;
}
function renderMenus(){
  const focused=document.activeElement?.dataset?.focusKey;
  list.innerHTML=menus.length?`<ul class="catalog-menu">${menus.map(m=>{const qty=cart[m.id]||0;return `<li class="${m.available?'':'is-sold-out'}"><div><strong>${escape(m.name)}</strong><span class="catalog-price">${rupiah(m.price)}</span></div>${m.available?`<div class="catalog-stepper"><button type="button" class="icon-button" data-step="-1" data-id="${escape(m.id)}" data-focus-key="minus-${escape(m.id)}" aria-label="Kurangi ${escape(m.name)}" ${qty?'':'disabled'}>−</button><span aria-label="Jumlah ${escape(m.name)}">${qty}</span><button type="button" class="icon-button" data-step="1" data-id="${escape(m.id)}" data-focus-key="plus-${escape(m.id)}" aria-label="Tambah ${escape(m.name)}" ${qty>=20||Object.keys(cart).length>=10&&!qty?'disabled':''}>+</button></div>`:'<span class="tag">Habis</span>'}</li>`;}).join('')}</ul>`:'<p class="customer-empty">Belum ada menu yang dapat dipesan.</p>';
  if(focused)list.querySelector(`[data-focus-key="${CSS.escape(focused)}"]:not(:disabled)`)?.focus();
  const chosen=menus.filter(m=>cart[m.id]);
  summary.innerHTML=chosen.length?`<ul class="catalog-cart">${chosen.map(m=>`<li><span>${cart[m.id]} × ${escape(m.name)}</span><span>${rupiah(m.price*cart[m.id])}</span></li>`).join('')}</ul><p class="catalog-total"><span>Total</span><strong>${rupiah(chosen.reduce((v,m)=>v+m.price*cart[m.id],0))}</strong></p>`:'<p class="customer-empty">Belum ada menu dipilih.</p>';
  submit.disabled=!chosen.length||sending||closed;
}
function adopt(data){
  if(!data||!Array.isArray(data.menus)||data.menus.some(m=>!m||typeof m.id!=='string'||typeof m.name!=='string'||!Number.isInteger(m.price)||typeof m.available!=='boolean'))throw Error('Data katalog belum valid.');
  $('#catalog-business').textContent=data.business||'';
  // A menu that sold out while selected leaves the cart so the request never carries it.
  const dropped=Object.keys(cart).filter(id=>!data.menus.some(m=>m.id===id&&m.available));
  for(const id of dropped)delete cart[id];
  menus=data.menus;renderMenus();
  if(dropped.length)error.textContent='Sebagian menu baru saja habis dan dikeluarkan dari pesananmu.';
  retries=0;retry.hidden=true;message('Terhubung · ketersediaan diperbarui '+new Date(data.updatedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),'live');
}
async function connect(){
  clearTimeout(timer);clearTimeout(watchdog);controller?.abort();const version=++epoch;
  if(closed)return;
  if(!/^[a-f0-9]{64}$/.test(token)){shop.hidden=true;panel.hidden=false;panel.innerHTML='<div class="screen-unavailable"><h2>Buka tautan katalog dari petugas.</h2><p>Tautan belum lengkap.</p></div>';message('Tautan belum tersedia.','closed');closed=true;return;}
  if(!navigator.onLine){message('Perangkat offline · ketersediaan menu mungkin sudah berubah.','stale');retry.hidden=false;submit.disabled=true;return;}
  controller=new AbortController();const signal=controller.signal;message('Menghubungkan katalog…','stale');
  const watch=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>controller?.abort(),12000);};watch();
  try{
    const response=await fetch('/api/catalog/events',{headers,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal});
    if(version!==epoch)return;
    if(response.status===401){endAccess();return;}if(!response.ok||!response.body)throw Error('Koneksi belum tersedia.');
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    try{while(true){const {value,done}=await reader.read();if(version!==epoch||closed)return;if(done)throw Error('Koneksi terputus.');watch();buffer+=decoder.decode(value,{stream:true});if(buffer.length>200000)throw Error('Data katalog terlalu besar.');let end;
      while((end=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,end);buffer=buffer.slice(end+2);if(event.includes('event: revoked')){endAccess();return;}const line=event.split('\n').find(l=>l.startsWith('data: '));if(line)adopt(JSON.parse(line.slice(6)));}
    }}finally{await reader.cancel().catch(()=>{});}
  }catch{
    if(version!==epoch||closed||document.hidden)return;
    message('Koneksi terputus · ketersediaan menu mungkin sudah berubah.','stale');retry.hidden=false;submit.disabled=true;
    if(navigator.onLine)timer=setTimeout(connect,Math.min(15000,1000*2**Math.min(retries++,4)));
  }finally{if(version===epoch)clearTimeout(watchdog);}
}
function showRequest(r){
  shop.hidden=true;panel.hidden=false;
  const items=`<ul class="catalog-cart">${r.items.map(i=>`<li><span>${i.qty} × ${escape(i.name)}</span></li>`).join('')}</ul><p class="catalog-total"><span>Total</span><strong>${rupiah(r.total)}</strong></p>`;
  const again='<button class="button secondary" type="button" data-action="new-order">Buat pesanan baru</button>';
  panel.innerHTML=r.status==='pending'?`<h2>Menunggu konfirmasi petugas.</h2><p>Permintaanmu sudah diterima sistem, tetapi belum masuk dapur. Halaman ini diperbarui otomatis.</p>${items}`
    :r.status==='accepted'?`<h2>Pesanan masuk antrean dapur.</h2><p>Cocokkan kode ini dengan layar status atau sebutkan kepada petugas.</p><p class="customer-code catalog-code">#${escape(r.code)}</p>${items}${again}`
    :r.status==='rejected'?`<h2>Permintaan belum dapat diproses.</h2><p>${escape(r.reason||'Silakan tanyakan kepada petugas.')}</p>${items}${again}`
    :`<h2>Permintaan kedaluwarsa.</h2><p>Belum dikonfirmasi dalam 30 menit. Kirim ulang atau tanyakan kepada petugas.</p>${items}${again}`;
}
async function check(){
  clearTimeout(poll);if(!requestId||closed)return;
  try{
    const response=await fetch('/api/catalog/requests/'+encodeURIComponent(requestId),{headers,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    if(response.status===401){endAccess();return;}
    if(response.status===404){remember(null);shop.hidden=false;panel.hidden=true;return;}
    if(!response.ok)throw Error();
    const r=await response.json();showRequest(r);if(r.status==='pending')poll=setTimeout(check,3000);
  }catch{message('Status permintaan belum dapat diperiksa. Mencoba lagi…','stale');poll=setTimeout(check,5000);}
}
list.addEventListener('click',event=>{
  const b=event.target.closest('[data-step]');if(!b)return;
  const next=(cart[b.dataset.id]||0)+Number(b.dataset.step);
  if(next<=0)delete cart[b.dataset.id];else cart[b.dataset.id]=Math.min(20,next);
  error.textContent='';renderMenus();
});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending||closed)return;
  const data=new FormData(form),label=String(data.get('label')||'').trim();
  if(!label){error.textContent='Isi nama atau nomor meja.';form.elements.label.focus();return;}
  const items=Object.entries(cart).map(([id,qty])=>({id,qty}));if(!items.length)return;
  sending=true;submit.disabled=true;error.textContent='';
  try{
    const response=await fetch('/api/catalog/requests',{method:'POST',headers:{...headers,'Content-Type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',body:JSON.stringify({label,note:String(data.get('note')||''),items,idempotencyKey:draftKey})});
    const body=await response.json().catch(()=>({}));
    if(response.status===401){endAccess();return;}
    if(!response.ok){error.textContent=body.error||'Permintaan belum terkirim. Coba lagi.';if(response.status!==429)draftKey=crypto.randomUUID();return;}
    remember(body.id);cart={};form.reset();draftKey=crypto.randomUUID();await check();panel.focus();
  }catch{error.textContent='Koneksi terputus. Kirim ulang; permintaan yang sama tidak akan tercatat dua kali.';}
  finally{sending=false;renderMenus();}
});
panel.addEventListener('click',event=>{if(!event.target.closest('[data-action="new-order"]'))return;remember(null);clearTimeout(poll);panel.hidden=true;shop.hidden=false;renderMenus();$('#catalog-menu-title').scrollIntoView();});
retry.onclick=connect;
window.addEventListener('offline',()=>{if(closed)return;controller?.abort();message('Perangkat offline · ketersediaan menu mungkin sudah berubah.','stale');retry.hidden=false;submit.disabled=true;});
window.addEventListener('online',()=>{if(!closed){connect();check();}});
window.addEventListener('hashchange',()=>location.reload());
document.addEventListener('visibilitychange',()=>{if(document.hidden){epoch++;controller?.abort();clearTimeout(timer);clearTimeout(watchdog);clearTimeout(poll);message('Pembaruan dijeda.','stale');}else if(!closed){connect();check();}});
connect();check();
