import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('pesanan, stok, persetujuan kelompok, surplus, dan reset', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/#ringkasan');
  await expect(page.locator('.quantity-flow')).toContainText('Kebutuhan 2 usaha');
  await expect(page.locator('.flow-result strong')).toHaveText('—butir');
  await expect(page.locator('.feature-bottom')).not.toContainText('Bu Sari');
  await page.goto('/#pesanan');
  await page.getByRole('button', { name: 'Susun rincian pesanan' }).click();
  await expect(page.getByRole('heading', { name: 'Periksa dulu, baru catat.' })).toBeVisible();
  await expect(page.locator('#review-total')).toContainText('82.000');
  let releaseSave;
  const waitForSave = new Promise(resolve => { releaseSave = resolve; });
  await page.route('**/api/transactions', async intercepted => { await waitForSave; await intercepted.continue(); });
  await page.getByRole('button', { name: 'Konfirmasi & catat' }).click();
  await expect(page.getByLabel('Jumlah item 1')).toBeDisabled();
  await expect(page.getByLabel('Usaha demo')).toBeDisabled();
  releaseSave();
  await expect(page.getByRole('heading', { name: 'Pesanan sudah tercatat.' })).toBeVisible();
  await page.unroute('**/api/transactions');
  await page.goto('/#stok');
  await expect(page.locator('[data-product="telur"]')).toContainText('4 butir');
  await page.reload();
  await expect(page.locator('[data-product="telur"]')).toContainText('4 butir');
  await page.goto('/#restock');
  await page.getByLabel('Jumlah kebutuhan yang dibagikan (butir)').fill('22');
  await page.locator('#share-consent').check();
  await page.getByRole('button', { name: 'Bagikan kebutuhan & lihat proposal' }).click();
  await expect(page.locator('.quantity-flow')).toContainText('50');
  await page.goto('/#ringkasan');
  await expect(page.locator('.flow-result strong')).toHaveText('50butir');
  await expect(page.locator('.feature-bottom')).toContainText('Bu Sari');
  await page.goto('/#kelompok');
  await page.getByRole('button', { name: 'Setujui bagianku' }).click();
  await expect(page.getByRole('button', { name: 'Bagianmu disetujui' })).toBeDisabled();
  for (const business of ['budi', 'rina']) {
    await page.getByLabel('Usaha demo').selectOption(business);
    await page.getByRole('button', { name: 'Setujui bagianku' }).click();
    await expect(page.getByRole('button', { name: 'Bagianmu disetujui' })).toBeDisabled();
  }
  await expect(page.getByText('Semua anggota setuju', { exact: true })).toBeVisible();
  await page.getByLabel('Usaha demo').selectOption('sari');
  await page.getByLabel('Kebutuhanmu (butir)').fill('24');
  await page.getByRole('button', { name: 'Ubah jumlah' }).click();
  await expect(page.getByRole('button', { name: 'Setujui bagianku' })).toBeEnabled();
  await page.goto('/#surplus');
  await page.getByRole('button', { name: 'Minta transfer 10 butir' }).click();
  await expect(page.getByText('Permintaanmu menunggu Bu Dewi.')).toBeVisible();
  await page.goto('/#stok');
  await expect(page.locator('[data-product="telur"]')).toContainText('4 butir');
  await page.goto('/#surplus');
  await page.getByLabel('Usaha demo').selectOption('dewi');
  await page.getByRole('button', { name: 'Setujui transfer 10 butir' }).click();
  await page.getByLabel('Usaha demo').selectOption('sari');
  await page.goto('/#stok');
  await expect(page.locator('[data-product="telur"]')).toContainText('14 butir');
  await page.goto('/#kelompok');
  await expect(page.locator('.flow-result')).toContainText('42');
  await page.goto('/#riwayat');
  await page.getByRole('button', { name: 'Batalkan & kembalikan stok' }).click();
  await page.goto('/#stok');
  await expect(page.locator('[data-product="telur"]')).toContainText('18 butir');
  await page.getByRole('button', { name: 'Reset data contoh' }).click();
  await page.getByRole('button', { name: 'Reset data contoh', exact: true }).last().click();
  await page.goto('/#stok');
  await expect(page.locator('[data-product="telur"]')).toContainText('8 butir');
  expect(errors).toEqual([]);
});

test('eror ekstraksi, stok kurang, pencarian kosong, dan MOQ', async ({ page }) => {
  await page.goto('/#pesanan');
  await page.getByLabel('Chat atau catatan pelanggan').fill('');
  await page.getByRole('button', { name: 'Susun rincian pesanan' }).click();
  await expect(page.getByText('Isi pesanannya dulu, atau gunakan formulir manual.')).toBeVisible();
  await page.getByLabel('Chat atau catatan pelanggan').fill('batal ayam geprek 3');
  await page.getByRole('button', { name: 'Susun rincian pesanan' }).click();
  await expect(page.getByText(/memuat pembatalan/)).toBeVisible();
  await page.getByRole('button', { name: 'Isi menu secara manual' }).click();
  await page.getByLabel('Jumlah item 1').fill('99');
  await page.getByRole('button', { name: 'Konfirmasi & catat' }).click();
  await expect(page.getByText(/Stok telur ayam tidak cukup/)).toBeVisible();
  await page.goto('/#stok');
  await expect(page.locator('[data-product="telur"]')).toContainText('8 butir');
  await page.getByRole('searchbox').fill('tidak ada');
  await expect(page.locator('#stock-empty')).toBeVisible();
  await page.goto('/#restock');
  await page.getByLabel('Jumlah kebutuhan yang dibagikan (butir)').fill('1');
  await page.locator('#share-consent').check();
  await page.getByRole('button', { name: 'Bagikan kebutuhan & lihat proposal' }).click();
  await expect(page.getByRole('button', { name: 'Setujui bagianku' })).toBeDisabled();
  await expect(page.getByText(/Minimum order 30 butir belum tercapai/)).toBeVisible();
});

test('mobile navigation, theme, export, and bounded screenshot review', async ({ page }) => {
  const capture = options => process.env.CAPTURE_REVIEW === '1' ? page.screenshot(options) : Promise.resolve();
  fs.mkdirSync('.impeccable/review', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/'); await page.evaluate(() => document.fonts.ready);
  await capture({ path: '.impeccable/review/desktop.png', fullPage: true });
  for (const name of ['pesanan', 'restock', 'kelompok', 'surplus', 'stok']) {
    await page.goto('/#' + name); await capture({ path: `.impeccable/review/desktop-${name}.png`, fullPage: true });
  }
  await page.goto('/#pesanan'); await page.getByRole('button', { name: 'Susun rincian pesanan' }).click();
  await expect(page.getByRole('heading', { name: 'Periksa dulu, baru catat.' })).toBeVisible();
  await capture({ path: '.impeccable/review/desktop-review.png', fullPage: true });
  await page.goto('/#ringkasan');
  await page.getByRole('button', { name: 'Gunakan tema gelap' }).click();
  await capture({ path: '.impeccable/review/desktop-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Gunakan tema terang' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture({ path: '.impeccable/review/mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Buka navigasi' }).click();
  await page.getByRole('link', { name: 'Produk & stok', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kenali stok, hindari kehabisan.' })).toBeVisible();
  await expect(page.locator('#sidebar')).not.toBeVisible();
  for (const name of ['pesanan', 'restock', 'kelompok', 'surplus', 'stok']) {
    await page.goto('/#' + name);
    if (name === 'pesanan') await page.reload();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await capture({ path: `.impeccable/review/mobile-${name}.png`, fullPage: true });
  }
  await page.goto('/#pesanan'); await page.getByRole('button', { name: 'Susun rincian pesanan' }).click();
  await expect(page.getByRole('heading', { name: 'Periksa dulu, baru catat.' })).toBeVisible();
  await capture({ path: '.impeccable/review/mobile-review.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  for (const name of ['ringkasan', 'pesanan', 'stok', 'restock', 'kelompok', 'surplus', 'riwayat']) {
    await page.goto('/#' + name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBeTruthy();
  }
  await page.goto('/#ringkasan'); await capture({ path: '.impeccable/review/mobile-320.png', fullPage: true });
  await page.goto('/#riwayat');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor transaksi CSV' }).click();
  expect((await download).suggestedFilename()).toBe('gerai-kita-transaksi-contoh.csv');
});
