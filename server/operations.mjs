import {kitchenReserved} from './kitchen.mjs';
import { randomUUID, createHash } from 'node:crypto';
import { requireValue, units, quantity } from './common.mjs';
import { receiptMeasurement } from '../public/receipt-measurement.js';

const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createOperations(store, stockChanged) {
  const { run, get, all, atomic, log, movement } = store;
  const scope = s => [s.workspace_id, s.business_id];
  function available(s, productId) {
    const stock = get('SELECT quantity FROM inventory WHERE workspace_id=? AND business_id=? AND product_id=?', ...scope(s), productId);
    const reserved = get("SELECT COALESCE(SUM(t.qty),0) AS qty FROM transfers t JOIN offers o ON o.id=t.offer_id WHERE o.workspace_id=? AND o.owner_id=? AND o.product_id=? AND t.status='pending' AND o.expires_at>?", ...scope(s), productId, Date.now()).qty;
    return (stock?.quantity || 0) - units(reserved) - kitchenReserved(store,s,productId);
  }
  function receive(s, body) {
    const product = store.ingredients(s).find(p => p.id === body.productId);
    requireValue(product, 'Bahan tidak ditemukan dalam katalog.');
    let measurement;
    try { measurement = receiptMeasurement(product.unit, body.inputUnit === undefined ? product.unit : body.inputUnit, body.qty, body.unitPrice); }
    catch (error) { requireValue(false, error.message); }
    requireValue(typeof body.supplier === 'string' && body.supplier.trim().length <= 80, 'Nama pemasok maksimal 80 karakter.');
    requireValue(typeof body.idempotencyKey === 'string' && body.idempotencyKey.length >= 8 && body.idempotencyKey.length <= 100, 'Kunci barang masuk tidak valid.');
    const supplier = body.supplier.trim(); const { total } = measurement;
    // Keep the legacy fingerprint for receipts entered in their stock unit.
    const hash = fingerprint(measurement.inputUnit === product.unit
      ? [product.id, measurement.scaledQty, measurement.unitPrice, supplier]
      : [product.id, measurement.scaledQty, measurement.unitPrice, supplier, measurement.inputUnit, measurement.inputQty, measurement.inputUnitPrice]);
    return atomic(() => {
      const previous = get('SELECT * FROM stock_receipts WHERE workspace_id=? AND business_id=? AND idem=?', ...scope(s), body.idempotencyKey);
      if (previous) { requireValue(previous.fingerprint === hash, 'Kunci barang masuk sudah digunakan untuk data berbeda.', 409); return { id: previous.id, total: previous.total, duplicate: true, cancelled: !!previous.cancelled_at }; }
      const id = randomUUID();
      run('INSERT INTO stock_receipts(id,workspace_id,business_id,idem,fingerprint,product_id,quantity,unit_price,total,supplier,created_at,cancelled_at,product_name,product_unit,input_quantity,input_unit,input_unit_price) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id, ...scope(s), body.idempotencyKey, hash, product.id, measurement.scaledQty, measurement.unitPrice, total, supplier, new Date().toISOString(), null,product.name,product.unit, units(measurement.inputQty), measurement.inputUnit, measurement.inputUnitPrice);
      run('UPDATE inventory SET quantity=quantity+? WHERE workspace_id=? AND business_id=? AND product_id=?', measurement.scaledQty, ...scope(s), product.id);
      movement(...scope(s), product.id, measurement.qty, 'stock_receipt', id); stockChanged(s);
      log(...scope(s), `Barang masuk: ${measurement.inputQty} ${measurement.inputUnit} ${product.name}${measurement.inputUnit !== product.unit ? ` = ${measurement.qty} ${product.unit}` : ''}, total Rp${total}${supplier ? ' dari ' + supplier : ''}.`);
      return { id, total, duplicate: false };
    });
  }
  function cancelReceipt(s, id, body = {}) {
    requireValue(body.reason === undefined || (typeof body.reason === 'string' && body.reason.trim().length >= 5 && body.reason.trim().length <= 240), 'Isi alasan pembatalan dalam 5–240 karakter.');
    const reason=body.reason === undefined ? null : body.reason.trim();
    return atomic(() => {
      const receipt = get('SELECT * FROM stock_receipts WHERE id=? AND workspace_id=? AND business_id=?', id, ...scope(s));
      requireValue(receipt, 'Barang masuk tidak ditemukan.', 404);
      requireValue(!receipt.collective_order_id, 'Buka rencana kulakan bersama untuk membatalkan batch penerimaan.', 409);
      if (receipt.cancelled_at) {
        requireValue(reason === null || receipt.cancel_reason === reason, 'Catatan sudah dibatalkan dengan alasan lain. Muat ulang riwayat.',409);
        return { duplicate: true };
      }
      requireValue(available(s, receipt.product_id) >= receipt.quantity, 'Stok sudah terpakai atau dicadangkan. Barang masuk ini belum dapat dibatalkan.', 409);
      run('UPDATE inventory SET quantity=quantity-? WHERE workspace_id=? AND business_id=? AND product_id=?', receipt.quantity, ...scope(s), receipt.product_id);
      run('UPDATE stock_receipts SET cancelled_at=?,cancel_reason=? WHERE id=?', new Date().toISOString(), reason, id);
      movement(...scope(s), receipt.product_id, -quantity(receipt.quantity), 'receipt_reversal', id); stockChanged(s);
      log(...scope(s), `Catatan barang masuk ${id.slice(0, 8)} dibatalkan; stok dan catatan biaya dibalik.${reason ? ' Alasan: '+reason : ''}`);
      return { duplicate: false };
    });
  }
  function saveMenu(s, id, body) {
    const catalog = store.ingredients(s);
    requireValue(typeof body.name === 'string' && body.name.trim().length >= 2 && body.name.trim().length <= 60, 'Nama menu harus 2–60 karakter.');
    requireValue(Number.isInteger(body.price) && body.price > 0 && body.price <= 10000000, 'Harga menu harus rupiah bulat, 1–10.000.000.');
    requireValue(Array.isArray(body.aliases) && body.aliases.length <= 3 && body.aliases.every(a => typeof a === 'string' && a.trim().length >= 2 && a.trim().length <= 60), 'Isi maksimal tiga alias, masing-masing 2–60 karakter.');
    const name = body.name.trim(); const aliases = [...new Set([name, ...body.aliases].map(a => a.trim().normalize('NFKC').toLowerCase()))];
    requireValue(!aliases.some(a => /\b(abaikan|instruksi|system|keluarkan|ignore|output|json|batal|jangan|cancel|hapus|kurangi)\b/.test(a)), 'Nama atau alias memakai kata yang ditahan saat ekstraksi. Pilih nama yang lebih jelas.');
    requireValue(body.recipe && typeof body.recipe === 'object' && !Array.isArray(body.recipe) && Object.keys(body.recipe).length > 0 && Object.keys(body.recipe).length <= catalog.length, 'Pilih minimal satu bahan untuk resep.');
    const recipe = {};
    for (const [product, qty] of Object.entries(body.recipe)) {
      requireValue(catalog.some(p => p.id === product), 'Resep memuat bahan di luar katalog.');
      requireValue(typeof qty === 'number' && Number.isFinite(qty) && qty > 0 && qty <= 1000 && Math.abs(qty - quantity(units(qty))) < 1e-9, 'Jumlah bahan per porsi harus positif, maksimal 1.000 dengan empat angka desimal.');
      recipe[product] = qty;
    }
    requireValue(Number.isInteger(body.catalogRevision), 'Versi katalog tidak valid.');
    return atomic(() => {
      const state = get('SELECT * FROM business_state WHERE workspace_id=? AND business_id=?', ...scope(s));
      requireValue(state.catalog_revision === body.catalogRevision, 'Katalog berubah. Muat ulang katalog sebelum menyimpan perubahan.', 409);
      const menus = store.menus(s); const existing = id && menus.find(m => m.id === id);
      if (id) requireValue(existing, 'Menu tidak ditemukan.', 404);
      else requireValue(menus.length < 20, 'Maksimal 20 menu pada MVP lokal.');
      requireValue(!menus.filter(m => m.id !== id).some(m => m.aliases.some(a => aliases.includes(a))), 'Nama atau alias sudah digunakan menu lain. Pilih alias yang berbeda.', 409);
      const menuId = id || randomUUID();
      if(body.preparation!==undefined){
        const p=body.preparation;
        requireValue(p&&Number.isInteger(p.minutes)&&p.minutes>=1&&p.minutes<=240&&Number.isInteger(p.passiveMinutes)&&p.passiveMinutes>=0&&p.passiveMinutes<p.minutes&&typeof p.station==='string'&&p.station.trim().length>=2&&p.station.trim().length<=40,'Isi waktu total 1–240 menit, waktu pasif lebih kecil dari total, dan stasiun 2–40 karakter.');
        run('INSERT INTO kitchen_menus VALUES(?,?,?,?,?,?) ON CONFLICT(workspace_id,business_id,menu_id) DO UPDATE SET minutes=excluded.minutes,station=excluded.station,passive_minutes=excluded.passive_minutes',...scope(s),menuId,p.minutes,p.station.trim().normalize('NFKC').toLowerCase(),p.passiveMinutes);
      }
      if (existing) run('UPDATE menus SET name=?,aliases=?,price=?,recipe=? WHERE workspace_id=? AND business_id=? AND id=?', name, JSON.stringify(aliases), body.price, JSON.stringify(recipe), ...scope(s), menuId);
      else run('INSERT INTO menus VALUES(?,?,?,?,?,?,?)', ...scope(s), menuId, name, JSON.stringify(aliases), body.price, JSON.stringify(recipe));
      run('UPDATE business_state SET catalog_revision=catalog_revision+1 WHERE workspace_id=? AND business_id=?', ...scope(s));
      log(...scope(s), `${existing ? 'Menu diperbarui' : 'Menu ditambahkan'}: ${name}, harga Rp${body.price}; resep berlaku untuk transaksi berikutnya.`);
      return { id: menuId, catalogRevision: state.catalog_revision + 1 };
    });
  }
  function saveIngredient(s,id,body) {
    requireValue(typeof body.name==='string' && body.name.trim().length>=2 && body.name.trim().length<=60,'Nama bahan harus 2–60 karakter.');
    requireValue(['kg','gram','liter','ml','butir','buah'].includes(body.unit),'Pilih satuan kg, gram, liter, ml, butir atau buah.');
    requireValue(typeof body.min==='number' && Number.isFinite(body.min) && body.min>=0 && body.min<=10000 && Math.abs(body.min-quantity(units(body.min)))<1e-9,'Ambang stok harus 0–10.000 dengan maksimal empat angka desimal.');
    requireValue(!['butir','buah'].includes(body.unit) || Number.isInteger(body.min),'Ambang stok butir/buah harus bilangan bulat.');
    requireValue(typeof body.storageNote==='string' && body.storageNote.trim().length<=120,'Catatan penyimpanan maksimal 120 karakter.');
    requireValue(Number.isInteger(body.catalogRevision),'Versi katalog tidak valid.');
    const name=body.name.trim(),normalized=name.normalize('NFKC').toLowerCase();
    return atomic(()=>{
      const revision=get('SELECT catalog_revision FROM business_state WHERE workspace_id=? AND business_id=?',...scope(s)).catalog_revision;
      requireValue(revision===body.catalogRevision,'Katalog berubah. Muat ulang dan periksa perubahan sebelum menyimpan.',409);
      const list=store.ingredients(s),existing=id && list.find(p=>p.id===id);
      if(id)requireValue(existing,'Bahan tidak ditemukan.',404);
      else requireValue(list.length<25,'Maksimal 25 bahan per usaha pada MVP lokal.');
      if(existing){requireValue(existing.unit===body.unit,'Satuan tetap setelah bahan dibuat. Tambahkan bahan baru bila memerlukan satuan berbeda.',409);requireValue(!existing.shared || existing.name===name,'Nama bahan bersama mengikuti pengaturan kelompok agar identitas antarusaha sesuai.',409);}
      requireValue(!get('SELECT id FROM ingredients WHERE workspace_id=? AND business_id=? AND normalized_name=? AND id<>?',...scope(s),normalized,id || ''),'Nama bahan sudah digunakan. Pilih nama yang berbeda.',409);
      const productId=id || randomUUID();
      if(existing)run('UPDATE ingredients SET name=?,normalized_name=?,min_quantity=?,storage_note=? WHERE workspace_id=? AND business_id=? AND id=?',name,normalized,units(body.min),body.storageNote.trim(),...scope(s),productId);
      else {run('INSERT INTO ingredients VALUES(?,?,?,?,?,?,?,?,0)',...scope(s),productId,name,normalized,body.unit,units(body.min),body.storageNote.trim());run('INSERT INTO inventory VALUES(?,?,?,?,NULL)',...scope(s),productId,0);}
      run('UPDATE business_state SET catalog_revision=catalog_revision+1 WHERE workspace_id=? AND business_id=?',...scope(s));
      log(...scope(s),`${existing ? 'Bahan diperbarui' : 'Bahan ditambahkan'}: ${name} (${body.unit}), ambang ${body.min}. ${existing ? 'Satuan dan saldo tetap.' : 'Saldo awal nol; catat barang masuk untuk menambah stok.'}`);
      return {id:productId,catalogRevision:revision+1};
    });
  }
  return { available, receive, cancelReceipt, saveMenu, saveIngredient };
}
