import { test,expect } from '@playwright/test';
import fs from 'node:fs';

async function switchTo(page,id) { await page.getByLabel('Usaha demo').selectOption(id);await expect(page.getByLabel('Usaha demo')).toBeEnabled(); }
async function share(page,qty) {
  await page.goto('/#restock');await page.getByLabel('Jumlah kebutuhan yang dibagikan (butir)').fill(String(qty));await page.locator('#share-consent').check();
  await page.getByRole('button',{name:'Bagikan kebutuhan & lihat proposal'}).click();await expect(page.locator('#allocation-form')).toBeVisible();
}
async function ready(page,withSurplus=false) {
  await page.goto('/#restock');await share(page,22);
  if(withSurplus) {
    await page.goto('/#surplus');await page.getByRole('button',{name:'Minta transfer 10 butir'}).click();
    await switchTo(page,'dewi');await page.getByRole('button',{name:'Setujui transfer 10 butir'}).click();await switchTo(page,'sari');
  }
  await page.goto('/#kelompok');
  for(const owner of ['sari','budi','rina']) { if(owner!=='sari')await switchTo(page,owner);await page.getByRole('button',{name:'Setujui bagianku'}).click();await expect(page.getByRole('button',{name:'Bagianmu disetujui'})).toBeDisabled(); }
  await switchTo(page,'sari');await page.getByRole('button',{name:'Simpan rencana penerimaan'}).click();
  await expect(page.getByRole('heading',{name:'Kulakan disepakati. Terima sesuai bagian.'})).toBeVisible();
}
async function receive(page,qty) {
  await page.getByLabel('Jumlah diterima sekarang (butir)').fill(String(qty));await page.getByRole('button',{name:'Catat penerimaan bagianku'}).click();
  await expect(page.getByLabel('Usaha demo')).toBeEnabled();
}
async function capture(page,name) {
  if(process.env.CAPTURE_REVIEW!=='1')return;fs.mkdirSync('.impeccable/review',{recursive:true});
  await page.evaluate(()=>{document.activeElement.blur();scrollTo(0,0);});await page.screenshot({path:`.impeccable/review/${name}.png`,fullPage:true});
}

test('collective partial delivery updates only the owner, charges shipping once, closes cycle and never reuses past surplus',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});await ready(page,true);
  await expect(page.locator('.receipt-progress')).toContainText('12');await receive(page,5);
  await expect(page.locator('.receipt-progress')).toContainText('Sudah diterima5');
  await expect(page.locator('.context-panel')).toContainText('7.800');await capture(page,'collective-receipt-desktop');
  await receive(page,7);await expect(page.getByText('Bagian pemasok usahamu sudah lengkap.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Mulai siklus baru'})).toHaveCount(0);
  await page.goto('/#stok');await expect(page.locator('[data-product="telur"]')).toContainText('30 butir');
  await page.goto('/#restock');await expect(page.getByLabel('Jumlah kebutuhan yang dibagikan (butir)')).toBeDisabled();
  await page.goto('/#kelompok');await switchTo(page,'budi');await page.setViewportSize({width:320,height:740});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await capture(page,'collective-receipt-mobile');
  await page.setViewportSize({width:1440,height:1000});await receive(page,18);await switchTo(page,'rina');await receive(page,10);
  await expect(page.getByText('Semua bagian diterima',{exact:true})).toBeVisible();await switchTo(page,'sari');
  await page.getByRole('button',{name:'Mulai siklus baru'}).click();await expect(page.getByRole('button',{name:'Bagikan kebutuhan & lihat proposal'})).toHaveCount(0);
  await expect(page.locator('.page-title p')).toContainText('siklus 2');
  const fresh=await (await page.request.get('/api/bootstrap')).json();expect(fresh.group.count).toBe(0);expect(fresh.stock.telur).toBe(30);expect(fresh.collectiveHistory[0].receivedCost).toBe(16200);
  for(const [owner,qty] of [['sari',2],['budi',18],['rina',10]]) { if(owner!=='sari')await switchTo(page,owner);await share(page,qty); }
  await expect(page.locator('.flow-result strong')).toHaveText('30butir');
  const next=await (await page.request.get('/api/bootstrap')).json();expect(next.group.surplus).toBe(0);expect(next.group.order).toBe(30);
  await switchTo(page,'sari');await page.goto('/#riwayat');await expect(page.locator('.collective-history')).toContainText('12 dari 12 butir');
  await expect(page.locator('.receipt-history')).toContainText('Kulakan bersama');await expect(page.getByRole('button',{name:'Batalkan barang masuk'})).toHaveCount(0);expect(errors).toEqual([]);
});

test('collective receipt acknowledgement loss persists original key offline and reconciles after reload without a second delivery',async({page,context})=>{
  await ready(page);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  let writes=0;page.on('request',r=>{if(/\/api\/collective-orders\/[^/]+\/receipts$/.test(r.url()))writes++;});
  await page.route('**/api/collective-orders/*/receipts',async route=>{await route.fetch();await route.abort('failed');});
  await page.getByLabel('Jumlah diterima sekarang (butir)').fill('5');await page.getByRole('button',{name:'Catat penerimaan bagianku'}).click();await expect(page.getByText('Server belum terhubung',{exact:true})).toBeVisible();await expect(page.getByLabel('Jumlah diterima sekarang (butir)')).toBeDisabled();
  await context.setOffline(true);await page.reload();await expect(page.getByLabel('Jumlah diterima sekarang (butir)')).toHaveValue('5');await expect(page.getByLabel('Jumlah diterima sekarang (butir)')).toBeDisabled();
  await context.setOffline(false);await page.unroute('**/api/collective-orders/*/receipts');await page.getByRole('button',{name:'Hubungkan & muat ulang'}).click();
  await expect(page.getByLabel('Jumlah diterima sekarang (butir)')).toHaveValue('17');await expect(page.getByLabel('Jumlah diterima sekarang (butir)')).toBeEnabled();expect(writes).toBe(1);
  const data=await (await page.request.get('/api/bootstrap')).json();expect(data.stock.telur).toBe(13);expect(data.group.receiptHistory).toHaveLength(1);expect(data.group.own.receivedCost).toBe(8640);
});

test('cancelling an untouched receipt plan requires fresh approval and retains a history entry',async({page})=>{
  await ready(page);await page.getByRole('button',{name:'Batalkan rencana penerimaan'}).click();
  await expect(page.getByRole('button',{name:'Setujui bagianku'})).toBeEnabled();await expect(page.getByRole('button',{name:'Simpan rencana penerimaan'})).toBeDisabled();
  const data=await (await page.request.get('/api/bootstrap')).json();expect(data.group.approvedCount).toBe(0);expect(data.stock.telur).toBe(8);expect(data.collectiveHistory[0].status).toBe('cancelled');
  await page.goto('/#riwayat');await expect(page.locator('.collective-history')).toContainText('Rencana dibatalkan');
});
