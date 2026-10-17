import { test, expect } from '@playwright/test';
import fs from 'node:fs';

async function prepare(page) {
  await page.goto('/#pesanan');
  await expect(page.getByRole('button', { name:'Isi menu secara manual' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole('button', { name:'Isi menu secara manual' })).toBeVisible();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}
async function queueOffline(page, context) {
  await context.setOffline(true); await page.reload();
  await expect(page.getByText('Server belum terhubung', {exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Isi menu secara manual'}).click();
  await page.getByLabel('Jumlah item 1').fill('2');
  await page.getByRole('button', {name:'Simpan di perangkat'}).click();
  await expect(page.locator('.pending-orders li')).toHaveCount(1);
}

test('PWA precaches assets; offline reload queues a draft without a sale, then explicit review sends once', async ({page,context}) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000}); await prepare(page);
  const manifest=await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone'); expect(manifest.icons.map(i=>i.sizes)).toEqual(['192x192','512x512']);
  const cached=await page.evaluate(async()=>{const cache=await caches.open('gerai-kita-shell-v18');return (await cache.keys()).map(r=>new URL(r.url).pathname);});
  expect(cached).toContain('/assets/icon-512.png'); expect(cached.some(p=>p.startsWith('/api/'))).toBe(false);
  let sales=0; page.on('request',r=>{if(r.url().endsWith('/api/transactions')&&r.method()==='POST')sales++;});
  await queueOffline(page,context);
  await page.reload(); await expect(page.locator('.pending-orders li')).toHaveCount(1);
  await page.goto('/#stok'); await expect(page.locator('[data-product="telur"]')).toContainText('8 butir');
  await expect(page.getByRole('button',{name:'Catat barang masuk'})).toBeDisabled();
  await expect(page.getByLabel('Usaha demo')).toBeDisabled();
  await page.goto('/#pesanan');
  await expect(page.getByRole('button',{name:'Lihat catatan tertunda (1)',exact:true})).toBeVisible();
  if(process.env.CAPTURE_REVIEW==='1'){
    fs.mkdirSync('.impeccable/review',{recursive:true});
    await page.screenshot({path:'.impeccable/review/offline-desktop.png',fullPage:true});
    await page.setViewportSize({width:320,height:740});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:'.impeccable/review/offline-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
  }
  await context.setOffline(false); expect(sales).toBe(0);
  await page.getByRole('button',{name:'Hubungkan & muat ulang'}).click();
  await expect(page.getByText('Server belum terhubung',{exact:true})).toHaveCount(0); expect(sales).toBe(0);
  await page.getByRole('button',{name:'Tinjau draft'}).click();
  await expect(page.getByLabel('Jumlah item 1')).toHaveValue('2');
  await page.getByRole('button',{name:'Konfirmasi & catat'}).click();
  await expect(page.getByRole('heading',{name:'Pesanan sudah tercatat.'})).toBeVisible(); expect(sales).toBe(1);
  await expect(page.locator('.pending-orders')).toHaveCount(0);
  await page.goto('/#stok'); await expect(page.locator('[data-product="telur"]')).toContainText('6 butir');
  await page.reload(); await expect(page.locator('[data-product="telur"]')).toContainText('6 butir'); expect(errors).toEqual([]);
});

test('lost acknowledgement preserves an immutable outbox; retry uses the same key once', async ({page}) => {
  await prepare(page); await page.getByRole('button',{name:'Isi menu secara manual'}).click();
  await page.getByLabel('Jumlah item 1').fill('2');
  let key;
  await page.route('**/api/transactions',async route=>{key=route.request().postDataJSON().idempotencyKey;await route.fetch();await route.abort('failed');});
  await page.getByRole('button',{name:'Konfirmasi & catat'}).click();
  await expect(page.getByText('Status pengiriman belum pasti',{exact:false}).first()).toBeVisible();
  await expect(page.getByLabel('Jumlah item 1')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Hapus draft'})).toBeDisabled();
  const queue=await page.evaluate(async()=>{const {listDrafts}=await import('/offline.js');return listDrafts();});
  expect(queue).toHaveLength(1); expect(queue[0].id).toBe(key);
  await page.unroute('**/api/transactions');
  // Make the bootstrap reply temporarily lag behind the committed sale so the
  // UI exercises retry rather than immediately reconciling by the ledger.
  await page.route('**/api/bootstrap',async route=>{const response=await route.fetch();const data=await response.json();data.transactions=data.transactions.filter(t=>t.idem!==key);await route.fulfill({response,json:data});});
  await page.getByRole('button',{name:'Hubungkan & muat ulang'}).click();
  await expect(page.getByRole('button',{name:'Periksa & kirim ulang'})).toBeEnabled();
  await page.getByRole('button',{name:'Periksa & kirim ulang'}).click();
  await expect(page.getByRole('heading',{name:'Pesanan sudah tercatat.'})).toBeVisible();
  await page.unroute('**/api/bootstrap');
  const actual=await page.evaluate(async()=> (await (await fetch('/api/bootstrap')).json()));
  expect(actual.stock.telur).toBe(6); expect(actual.transactions.filter(t=>t.idem===key)).toHaveLength(1);
  await page.reload(); await expect(page.locator('.pending-orders')).toHaveCount(0);
});

test('offline draft requires a catalog review and remains scoped across profiles, reset, and expired cookies', async ({page,context}) => {
  await prepare(page); const initial=await (await page.request.get('/api/bootstrap')).json();
  await queueOffline(page,context); await context.setOffline(false);
  await page.request.post('/api/menus/ayam',{data:{csrf:initial.csrf,name:'Ayam geprek',price:20000,aliases:['geprek'],recipe:{telur:1,beras:.15,minyak:.05},catalogRevision:initial.catalogRevision}});
  await page.getByRole('button',{name:'Hubungkan & muat ulang'}).click();
  await page.getByRole('button',{name:'Tinjau draft'}).click();
  await expect(page.getByRole('button',{name:'Konfirmasi & catat'})).toBeDisabled();
  await page.getByRole('button',{name:'Perbarui katalog'}).click();
  await expect(page.locator('#review-total')).toContainText('40.000');
  await expect(page.getByRole('button',{name:'Konfirmasi & catat'})).toBeEnabled();
  await page.getByLabel('Usaha demo').selectOption('budi');
  await expect(page.getByRole('button',{name:'Tinjau draft'})).toHaveCount(0);
  await expect(page.getByText(/catatan dari usaha atau sesi lain/)).toBeVisible();
  await page.getByLabel('Usaha demo').selectOption('sari');
  await expect(page.getByRole('button',{name:'Tinjau draft'})).toBeVisible();
  const beforeReset=await (await page.request.get('/api/bootstrap')).json();
  await page.request.post('/api/demo/reset',{data:{csrf:beforeReset.csrf}});
  await page.reload(); await expect(page.getByRole('button',{name:'Tinjau draft'})).toHaveCount(0);
  await expect(page.getByText(/catatan dari usaha atau sesi lain/)).toBeVisible();
  const afterReset=await (await page.request.get('/api/bootstrap')).json(); expect(afterReset.workspaceEpoch).not.toBe(beforeReset.workspaceEpoch);
  await context.clearCookies(); await page.reload();await expect(page.getByLabel('Usaha demo')).toBeEnabled();
  await expect(page.getByRole('button',{name:'Tinjau draft'})).toHaveCount(0);
  const next=await (await page.request.get('/api/bootstrap')).json(); expect(next.workspaceId).not.toBe(initial.workspaceId); expect(next.stock.telur).toBe(8);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Ekspor catatan tertunda'}).click();expect((await download).suggestedFilename()).toBe('gerai-kita-catatan-tertunda.csv');
});

test('storage failure and a first offline visit never claim a draft was saved', async ({page,context}) => {
  await page.goto('/#pesanan'); await page.getByRole('button',{name:'Isi menu secara manual'}).click();
  await page.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('gerai-kita-device-v1');r.onsuccess=()=>resolve(r.result);});db.close();});
  await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{value:{open(){throw new Error('Storage blocked');}}});});
  await page.reload(); await page.getByRole('button',{name:'Isi menu secara manual'}).click();
  let writes=0;page.on('request',r=>{if(r.url().endsWith('/api/transactions'))writes++;});
  await page.getByRole('button',{name:'Konfirmasi & catat'}).click();
  await expect(page.getByRole('heading',{name:'Periksa dulu, baru catat.'})).toBeVisible();
  expect(writes).toBe(0); await expect(page.locator('.pending-orders')).toHaveCount(0);
  const newContext=await context.browser().newContext();const first=await newContext.newPage();
  await newContext.route('**/api/**',route=>route.abort());
  await first.goto('/'); await first.evaluate(()=>navigator.serviceWorker.ready);await first.reload();
  await newContext.setOffline(true);await first.reload();
  await expect(first.getByRole('heading',{name:'Aplikasi belum terhubung.'})).toBeVisible();
  await expect(first.getByText(/Buka aplikasi sekali/)).toBeVisible();await newContext.close();
});
