import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createStore } from '../server/store.mjs';
import { createService } from '../server/service.mjs';
import { createExtractor } from '../server/extractor.mjs';
import { example } from '../public/catalog.js';

// A fresh in-memory namespace rehearses the narrative without resetting browser data.
const store = createStore(':memory:');
try {
  const service = createService(store), sari = store.session();
  const members = [sari, store.session('budi', sari.workspace_id), store.session('rina', sari.workspace_id)];
  const dewi = store.session('dewi', sari.workspace_id);
  const extractor = createExtractor(), ai = await extractor.status();
  const steps = [];
  let state = service.bootstrap(sari);
  assert.equal(state.stock.telur, 8); assert.equal(state.group.visible, false);
  console.log('1/6 · Ekstraksi contoh chat melalui provider lokal…');
  const draft = await extractor.extract(example, state.menu);
  assert.equal(service.bootstrap(sari).stock.telur, 8);
  const sale = service.transaction(sari, { items: draft.items, catalogRevision: state.catalogRevision, idempotencyKey: randomUUID() });
  state = service.bootstrap(sari); assert.equal(sale.total, 82000); assert.equal(state.stock.telur, 4);
  steps.push({ step: 'Chat → review → konfirmasi', mode: draft.mode, total: sale.total, eggsBefore: 8, eggsAfter: state.stock.telur });
  console.log('2/6 · Kebutuhan 22 + 18 + 10 butir…');
  service.demand(sari, { qty: 22, active: true });
  let group = service.group(sari);
  assert.equal(group.collective, 50); assert.equal(group.totalCost, 66000);
  const individual = group.participants.reduce((sum, p) => sum + p.individual, 0); assert.equal(individual, 90000);
  steps.push({ step: 'Tiga kebutuhan berizin', demand: group.collective, vendorOrder: group.order, total: group.totalCost, individual });
  console.log('3/6 · Permintaan surplus dan persetujuan pemilik…');
  const offer = service.bootstrap(sari).offers[0];
  const transfer = service.requestTransfer(sari, offer.id, { qty: 10 });
  assert.equal(service.bootstrap(sari).stock.telur, 4);
  service.transferDecision(dewi, transfer.id, true);
  state = service.bootstrap(sari); assert.equal(state.stock.telur, 14); assert.ok(state.group.version > group.version);
  group = service.group(sari); assert.equal(group.order, 40); assert.equal(group.totalCost, 64000);
  steps.push({ step: 'Surplus selesai, proposal dihitung ulang', demand: group.collective, surplus: group.surplus, vendorOrder: group.order, total: group.totalCost, savings: individual - group.totalCost, sariEggs: state.stock.telur });
  console.log('4/6 · Persetujuan tiga bagian pada versi yang sama…');
  for (const member of members) service.approval(member, { version: group.version, decision: 'accepted' });
  group = service.group(sari); assert.equal(group.ready, true);
  steps.push({ step: 'Semua anggota setuju', ready: group.ready, allocations: group.participants.map(p => ({ businessId: p.businessId, order: p.order, cost: p.cost, shipping: p.transport })) });
  console.log('5/6 · Rencana dan penerimaan bagian masing-masing…');
  const plan = service.finalizeCollective(sari, { cycle: group.cycle.id, version: group.version });
  assert.equal(service.bootstrap(sari).stock.telur, 14);
  for (const member of members) {
    const own = group.participants.find(p => p.businessId === member.business_id);
    service.receiveCollective(member, plan.id, { qty: own.order, idempotencyKey: randomUUID() });
  }
  state = service.bootstrap(sari); assert.equal(state.stock.telur, 26); assert.equal(state.group.purchase.status, 'completed');
  steps.push({ step: 'Barang fisik dicatat setelah diterima', status: state.group.purchase.status, sariEggs: state.stock.telur, receivedCost: state.group.own.receivedCost });
  console.log('6/6 · Siklus baru menjaga stok/histori…');
  service.nextCycle(sari, { cycle: state.group.cycle.id, version: state.group.version });
  state = service.bootstrap(sari); assert.equal(state.stock.telur, 26); assert.equal(state.shared, false); assert.equal(state.group.surplus, null);
  steps.push({ step: 'Siklus baru', cycle: state.group.cycle.id, sariEggs: state.stock.telur, shared: state.shared, collectiveHistoryPreserved: state.collectiveHistory.length > 0 });
  assert.equal(steps.at(-1).collectiveHistoryPreserved, true);
  const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
  const report = { checkedAt: new Date().toISOString(), version, passed: true, storage: ':memory:', realDatabaseModified: false, ai, steps, interpretation: 'Latihan domain dengan model aktual bila tersedia dan fixture sintetis. Bukan pengukuran durasi demo, benchmark lapangan atau uji browser.' };
  await mkdir('docs/evaluation', { recursive: true });
  await writeFile('docs/evaluation/demo-rehearsal.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`Latihan lulus · ekstraksi ${draft.mode} · 50 − 10 = 40 butir · Rp64.000 dibanding Rp90.000.\nLaporan: docs/evaluation/demo-rehearsal.json`);
} catch (error) {
  console.error('Latihan gagal: ' + error.message);
  process.exitCode = 1;
} finally { store.close(); }
