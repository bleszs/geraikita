import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {GUIDE_TOPICS} from '../public/guide-content.js';

const tour=page=>page.locator('#guide-root .guide-tour');
const welcome=page=>page.locator('.guide-welcome');
async function register(page){
  await page.goto('/');const r=await page.request.post('/api/auth/register',{data:{businessName:'Usaha uji panduan',communityName:'Kelompok uji panduan',email:crypto.randomUUID()+'@example.test',password:'Browser-guide-only-456'}});
  expect(r.status()).toBe(201);const data=await r.json();await page.reload();await page.goto('/#ringkasan');await expect(page.locator('#main h1')).toHaveText('Catatan nyata, keputusan lebih jelas.');return data;
}
async function state(page){const r=await page.request.get('/api/bootstrap');expect(r.status()).toBe(200);return r.json();}
async function capture(page,name){
  if(!process.env.CAPTURE_REVIEW)return;await mkdir('.impeccable/review',{recursive:true});await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});
  const filename=name.startsWith('guide-arrow-')?name:name.replace(/^guide-/,'guide-arrow-');
  await page.screenshot({path:'.impeccable/review/'+filename+'.png',fullPage:true,animations:'disabled'});
}

test('guest gets optional next/back/skip instructions without submitting registration or losing ordinary text fields',async({page})=>{
  await page.goto('/');await expect(welcome(page)).toBeVisible();
  await page.getByLabel('Nama usaha',{exact:true}).fill('Nama belum dikirim');await page.getByLabel('Email',{exact:true}).fill('not-submitted@example.test');
  let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
  await page.setViewportSize({width:1440,height:1050});await capture(page,'guide-welcome-desktop');
  await page.setViewportSize({width:320,height:900});await capture(page,'guide-welcome-mobile');
  await page.setViewportSize({width:1440,height:1050});
  await welcome(page).getByRole('button',{name:'Mulai panduan',exact:true}).click();
  await expect(tour(page)).toContainText('Langkah 1 dari 5');await expect(tour(page).getByRole('heading')).toBeFocused();
  await expect(tour(page)).toContainText('Kenalan dulu dengan Gerai Kita');
  await page.setViewportSize({width:320,height:900});await expect(page.locator('.guide-arrow')).toBeVisible();await capture(page,'guide-arrow-guest-intro-mobile');
  await page.setViewportSize({width:1440,height:1050});
  await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();await expect(tour(page)).toContainText('Isi identitas usahamu');
  await tour(page).getByRole('button',{name:'Kembali',exact:true}).click();await expect(tour(page)).toContainText('Langkah 1 dari 5');
  await tour(page).getByRole('button',{name:'Lewati panduan'}).click();await expect(tour(page)).toHaveCount(0);
  await expect(page.getByLabel('Nama usaha',{exact:true})).toHaveValue('Nama belum dikirim');await expect(page.getByLabel('Email',{exact:true})).toHaveValue('not-submitted@example.test');
  expect(posts).toBe(0);await page.reload();await expect(welcome(page)).toHaveCount(0);
});

test('arrow introduction visits every main feature without creating transactions and stays readable on phones',async({page})=>{
  await register(page);const before=await state(page);let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
  await welcome(page).getByRole('button',{name:'Mulai panduan',exact:true}).click();
  await expect(tour(page)).toContainText('Selamat datang di Gerai Kita');
  await expect(page.locator('.guide-arrow')).toBeVisible();
  await page.setViewportSize({width:1440,height:1050});await capture(page,'guide-arrow-intro-desktop');
  await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();
  await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();await expect(page).toHaveURL(/#stok$/);
  await expect(page.locator('[data-action="new-ingredient"]')).toHaveClass(/guide-target/);
  await expect(page.locator('.guide-arrow')).toBeVisible();
  await page.setViewportSize({width:1440,height:1050});await capture(page,'guide-tour-desktop');
  await page.setViewportSize({width:320,height:900});await capture(page,'guide-tour-mobile');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const panel=await tour(page).boundingBox(),next=await tour(page).getByRole('button',{name:'Lanjut',exact:true}).boundingBox();expect(next.y+next.height).toBeLessThanOrEqual(900);expect(panel.height).toBeLessThan(500);
  await page.getByRole('button',{name:'Ubah tema'}).click();await capture(page,'guide-tour-mobile-dark');
  for(let i=0;i<8;i++){await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();await expect(page.locator('.guide-arrow')).toBeVisible();}
  await expect(tour(page)).toContainText('Langkah 11 dari 11');await tour(page).getByRole('button',{name:'Selesai',exact:true}).click();
  await expect(tour(page)).toHaveCount(0);expect(posts).toBe(0);
  const after=await state(page);for(const key of ['stock','catalog','menu','transactions','stockReceipts','offers','transfers'])expect(after[key]).toEqual(before[key]);
});

test('context help explains an open editor without clearing its input and supports pause/resume after reload',async({page})=>{
  await register(page);await welcome(page).getByRole('button',{name:'Lewati',exact:true}).click();await page.goto('/#stok');
  await page.getByRole('button',{name:'Tambah bahan',exact:true}).click();await page.getByLabel('Nama bahan',{exact:true}).fill('Isian bahan belum disimpan');
  let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
  await page.getByRole('button',{name:'Panduan halaman ini',exact:true}).click();await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();
  await expect(page.getByLabel('Nama bahan',{exact:true})).toHaveValue('Isian bahan belum disimpan');
  await tour(page).getByRole('button',{name:'Tutup sementara',exact:true}).click();await expect(tour(page)).toHaveCount(0);expect(posts).toBe(0);
  await page.reload();await page.getByRole('button',{name:'Buka panduan penggunaan',exact:true}).click();
  await expect(page.locator('.guide-resume')).toContainText('langkah 2 dari 4');await page.getByRole('button',{name:/Lanjutkan panduan terakhir/}).click();
  await expect(tour(page)).toContainText('Periksa satuan sebelum menyimpan');await page.keyboard.press('Escape');await expect(tour(page)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Buka panduan penggunaan',exact:true})).toBeFocused();
});

test('search covers conditional features and every topic can be read without enabling unavailable controls',async({page})=>{
  await register(page);await page.goto('/#panduan');
  await page.getByLabel('Cari fitur atau tombol').fill('Batalkan batch');await expect(page.locator('[data-guide-result="kelompok"]')).toBeVisible();await expect(page.locator('[data-guide-result="suara"]')).toBeHidden();
  await page.getByLabel('Cari fitur atau tombol').fill('xx-no-guide-match');await expect(page.locator('.guide-no-results')).toBeVisible();
  await page.getByLabel('Cari fitur atau tombol').fill('');
  await page.setViewportSize({width:1440,height:1050});await capture(page,'guide-help-desktop');
  await page.setViewportSize({width:320,height:900});await page.getByRole('button',{name:'Ubah tema'}).click();await capture(page,'guide-help-mobile-dark');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
  await page.locator('[data-guide-result="kelompok"] button').click();await expect(tour(page)).toContainText('Pengelola mengisi penawaran pemasok');
  for(let i=0;i<6;i++)await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();await tour(page).getByRole('button',{name:'Selesai',exact:true}).click();expect(posts).toBe(0);
  await expect(page.locator('[data-action="finalize"]')).toHaveCount(0);
});

test('offline shell includes guides and progress from one account is not resumed by a second account',async({page,context})=>{
  const owner=await register(page);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.goto('/#panduan');await page.locator('[data-guide-result="suara"] button').click();await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();await tour(page).getByRole('button',{name:'Tutup sementara',exact:true}).click();
  await context.setOffline(true);await page.reload();await expect(page.locator('#main')).toContainText('Server belum terhubung');
  await page.goto('/#panduan');await expect(page.locator('.guide-resume')).toContainText('langkah 2 dari 4');
  await page.locator('[data-guide-result="offline"] button').click();await expect(tour(page)).toBeVisible();await tour(page).getByRole('button',{name:'Lewati panduan'}).click();
  await context.setOffline(false);await page.request.post('/api/auth/logout',{data:{csrf:owner.csrf}});
  await register(page);await page.goto('/#panduan');await expect(page.locator('.guide-resume')).toHaveCount(0);
});

test('blocked guide storage still allows starting, advancing and skipping with a recovery message',async({page})=>{
  await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('gerai-kita-guide-'))throw new DOMException('denied','SecurityError');return original.call(this,key,value);};});
  await page.goto('/');await welcome(page).getByRole('button',{name:'Mulai panduan',exact:true}).click();
  await expect(page.locator('#toast')).toContainText('belum bisa menyimpan posisi panduan');await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();
  await tour(page).getByRole('button',{name:'Lewati panduan'}).click();await expect(welcome(page)).toHaveCount(0);await expect(tour(page)).toHaveCount(0);
});

test('all eighteen topics and eighty-seven steps run end to end without posting business actions',async({page})=>{
  await register(page);const before=await state(page);let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
  let visited=0;
  for(const topic of GUIDE_TOPICS){
    await page.goto('/#panduan');await page.locator('[data-guide-result="'+topic.id+'"] button').click();
    for(let index=0;index<topic.steps.length;index++){
      await expect(tour(page).getByRole('heading')).toHaveText(topic.steps[index].title);
      await tour(page).getByRole('button',{name:index===topic.steps.length-1?'Selesai':'Lanjut',exact:true}).click();visited++;
    }
    await expect(tour(page)).toHaveCount(0);
  }
  expect(visited).toBe(87);expect(posts).toBe(0);
  const after=await state(page);for(const key of ['stock','catalog','menu','transactions','stockReceipts','offers','transfers'])expect(after[key]).toEqual(before[key]);
});

test('arrow tracks the real target after resize and scrolling, and disappears after skip',async({page})=>{
  await register(page);await welcome(page).getByRole('button',{name:'Mulai panduan',exact:true}).click();
  await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();await tour(page).getByRole('button',{name:'Lanjut',exact:true}).click();
  for(const viewport of [{width:1440,height:1000},{width:320,height:900}]){
    await page.setViewportSize(viewport);await expect(page.locator('.guide-arrow')).toBeVisible();
    await expect.poll(async()=>page.evaluate(()=>{
      const arrow=document.querySelector('.guide-arrow'),target=document.querySelector('.guide-target'),panel=document.querySelector('.guide-tour');if(!arrow||!target||!panel)return false;
      const r=target.getBoundingClientRect(),p=panel.getBoundingClientRect(),x=Number(arrow.dataset.endX),y=Number(arrow.dataset.endY);
      return Number.isFinite(x)&&Number.isFinite(y)&&x>=r.left-8&&x<=r.right+8&&y>=r.top-8&&y<=r.bottom+8&&p.left>=0&&p.right<=innerWidth&&p.top>=0&&p.bottom<=innerHeight&&!(p.left<r.right&&p.right>r.left&&p.top<r.bottom&&p.bottom>r.top);
    })).toBe(true);
  }
  await page.evaluate(()=>scrollBy(0,50));await expect(page.locator('.guide-arrow')).toBeVisible();
  await tour(page).getByRole('button',{name:'Lewati panduan'}).click();await expect(page.locator('.guide-overlay')).toHaveCount(0);await expect(page.locator('.guide-target')).toHaveCount(0);
});
