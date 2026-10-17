import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

async function setup(page,{permission='allow'}={}){
  await page.addInitScript(({permission})=>{
    window.voiceTest={stops:0,requests:0,late:false};
    const stream=()=>({getTracks:()=>[{stop(){window.voiceTest.stops++;},addEventListener(){}}]});
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
      if(permission==='deny')throw new DOMException('denied','NotAllowedError');
      if(permission==='late')return new Promise(resolve=>window.voiceTest.resolve=()=>resolve(stream()));
      return stream();
    }});
    class Recorder {
      static isTypeSupported(){return true;}
      constructor(){this.state='inactive';}
      start(){this.state='recording';}
      stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['technical browser audio fixture'])});this.onstop?.();});}
    }
    window.MediaRecorder=Recorder;
  },{permission});
  await page.route('**/api/bootstrap',async route=>{const response=await route.fetch(),data=await response.json();data.speech={available:true,model:'whisper-tiny'};await route.fulfill({response,json:data});});
  await page.goto('/');
  const registration=await page.request.post('/api/auth/register',{data:{email:crypto.randomUUID()+'@example.test',password:'Browser-voice-test-password',businessName:'Usaha uji mikrofon',communityName:'Kelompok uji terisolasi'}});
  expect(registration.status()).toBe(201);let state=await registration.json();
  let response=await page.request.post('/api/ingredients',{data:{csrf:state.csrf,name:'Tepung uji',unit:'gram',min:100,storageNote:'Wadah tertutup',catalogRevision:state.catalogRevision}});expect(response.ok()).toBe(true);
  state=await (await page.request.get('/api/bootstrap')).json();
  response=await page.request.post('/api/menus',{data:{csrf:state.csrf,name:'Roti uji',price:5000,aliases:['roti'],recipe:{[state.catalog[0].id]:20},catalogRevision:state.catalogRevision}});expect(response.ok()).toBe(true);
  await page.goto('/#pesanan');await page.reload();await expect(page.getByRole('button',{name:'Rekam pesanan',exact:true})).toBeEnabled();
}
async function snapshot(page){return (await page.request.get('/api/bootstrap')).json();}
async function capture(page,name){if(!process.env.CAPTURE_REVIEW)return;await fs.mkdir('.impeccable/review',{recursive:true});await page.screenshot({path:'.impeccable/review/'+name+'.png',fullPage:false});}

test('voice transcript is editable and opt-in, preserves existing text and cannot book a sale',async({page})=>{
  await setup(page);let audioPosts=0;
  await page.route('**/api/transcriptions',async route=>{audioPosts++;expect(route.request().postDataJSON().mimeType).toBe('audio/webm;codecs=opus');await route.fulfill({json:{text:'dua roti uji',durationSeconds:2}});});
  const before=await snapshot(page);await page.setViewportSize({width:1440,height:1000});await capture(page,'voice-idle-desktop');
  await page.getByLabel('Chat atau catatan pelanggan',{exact:true}).fill('1 roti');
  await page.getByRole('button',{name:'Rekam pesanan',exact:true}).click();await expect(page.getByRole('button',{name:'Selesai merekam',exact:true})).toBeFocused();await expect(page.getByRole('button',{name:'Susun rincian pesanan',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Selesai merekam',exact:true}).click();await expect(page.getByLabel('Periksa hasil ucapan',{exact:true})).toHaveValue('dua roti uji');
  await expect(page.getByLabel('Chat atau catatan pelanggan',{exact:true})).toHaveValue('1 roti');expect(audioPosts).toBe(1);expect((await snapshot(page)).transactions).toEqual([]);expect(await page.evaluate(()=>voiceTest.stops)).toBe(1);
  await capture(page,'voice-review-desktop');await page.setViewportSize({width:320,height:900});await capture(page,'voice-review-mobile');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('Periksa hasil ucapan',{exact:true}).fill('2 roti');await page.getByRole('button',{name:'Gunakan teks',exact:true}).click();await expect(page.getByLabel('Chat atau catatan pelanggan',{exact:true})).toHaveValue('1 roti\n2 roti');
  await page.getByLabel('Chat atau catatan pelanggan',{exact:true}).fill('2 roti');await page.getByRole('button',{name:'Susun rincian pesanan',exact:true}).click();await expect(page.getByRole('button',{name:'Konfirmasi & catat',exact:true})).toBeVisible();
  const after=await snapshot(page);expect(after.transactions).toEqual([]);expect(after.stock).toEqual(before.stock);expect(after.audit).toEqual(before.audit);
});

test('cancel, navigation and late microphone permission release tracks without sending audio',async({page})=>{
  await setup(page,{permission:'late'});let posts=0;page.on('request',r=>{if(r.url().endsWith('/api/transcriptions'))posts++;});
  await page.getByRole('button',{name:'Rekam pesanan',exact:true}).click();await expect(page.getByText('Menunggu izin mikrofon dari browser…',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Batalkan suara',exact:true})).toBeFocused();await page.getByRole('button',{name:'Batalkan suara',exact:true}).click();await expect(page.getByRole('button',{name:'Rekam pesanan',exact:true})).toBeFocused();await expect(page.locator('#toast')).toContainText('Suara dibatalkan.');await page.evaluate(()=>voiceTest.resolve());await expect.poll(()=>page.evaluate(()=>voiceTest.stops)).toBe(1);expect(posts).toBe(0);
  await page.getByRole('button',{name:'Rekam pesanan',exact:true}).click();await page.evaluate(()=>voiceTest.resolve());await expect(page.getByRole('button',{name:'Selesai merekam',exact:true})).toBeVisible();await page.goto('/#stok');await expect.poll(()=>page.evaluate(()=>voiceTest.stops)).toBe(2);expect(posts).toBe(0);
  await page.goto('/#pesanan');await expect(page.getByLabel('Periksa hasil ucapan',{exact:true})).toHaveCount(0);
});

test('microphone permission errors keep manually typed text and remain usable on mobile',async({page})=>{
  await setup(page,{permission:'deny'});await page.setViewportSize({width:320,height:900});await page.getByLabel('Chat atau catatan pelanggan',{exact:true}).fill('3 roti');await page.getByRole('button',{name:'Rekam pesanan',exact:true}).click();await expect(page.locator('.voice-entry')).toContainText('Izin mikrofon belum diberikan.');await expect(page.getByLabel('Chat atau catatan pelanggan',{exact:true})).toHaveValue('3 roti');await expect(page.getByRole('button',{name:'Susun rincian pesanan',exact:true})).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await capture(page,'voice-error-mobile');
  await expect(page.getByRole('button',{name:'Rekam pesanan',exact:true})).toBeFocused();await expect(page.locator('.voice-entry [role="alert"]')).toContainText('Izin mikrofon belum diberikan.');
  for(const theme of ['light','dark']){
    const audit=await page.evaluate(theme=>{
      document.documentElement.dataset.theme=theme;
      const style=el=>getComputedStyle(el),rgb=text=>text.match(/[\d.]+/g).slice(0,3).map(Number),lum=c=>rgb(c).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
      const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      const muted=style(document.querySelector('.voice-entry>p')),panel=style(document.querySelector('.section-panel')),error=style(document.querySelector('.voice-entry .notice')),button=document.querySelector('[data-action="voice-start"]');
      return {theme,bodyContrast:contrast(muted.color,panel.backgroundColor),errorContrast:contrast(error.color,error.backgroundColor),buttonHeight:button.getBoundingClientRect().height,font:muted.fontFamily,spacing:style(document.querySelector('.voice-entry')).marginBottom};
    },theme);
    expect(audit.bodyContrast).toBeGreaterThanOrEqual(4.5);expect(audit.errorContrast).toBeGreaterThanOrEqual(4.5);expect(audit.buttonHeight).toBeGreaterThanOrEqual(44);expect(audit.font).toContain('Nunito');expect(audit.spacing).toBe('24px');
    if(process.env.CAPTURE_REVIEW)await fs.writeFile(`.impeccable/review/voice-craft-${theme}.json`,JSON.stringify(audit,null,2));
  }
});

test('an in-flight transcript is discarded on navigation and offline recording is cancelled without queuing',async({page})=>{
  await setup(page);let release;const wait=new Promise(resolve=>release=resolve);let posted=false;
  await page.route('**/api/transcriptions',async route=>{posted=true;await wait;try{await route.fulfill({json:{text:'must never reappear',durationSeconds:2}});}catch{}});
  await page.getByRole('button',{name:'Rekam pesanan',exact:true}).click();await page.getByRole('button',{name:'Selesai merekam',exact:true}).click();await expect.poll(()=>posted).toBe(true);await page.goto('/#stok');release();await page.goto('/#pesanan');await expect(page.getByLabel('Chat atau catatan pelanggan',{exact:true})).toHaveValue('');await expect(page.getByLabel('Periksa hasil ucapan',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Rekam pesanan',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await expect(page.getByRole('button',{name:'Rekam pesanan',exact:true})).toBeDisabled();expect(await page.evaluate(()=>voiceTest.stops)).toBe(2);const actions=await page.evaluate(async()=>{const {readAction,scopeOf}=await import('/offline.js');const data=await (await fetch('/api/bootstrap')).json();return readAction(scopeOf(data));});expect(actions).toBeUndefined();
});
