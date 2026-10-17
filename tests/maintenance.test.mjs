import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { unlinkSync, rmdirSync } from 'node:fs';
import { createStore } from './fixtures/store.mjs';
import { createService } from '../server/service.mjs';
import { inspectDatabase, backupDatabase, inspectServer } from '../scripts/maintenance.mjs';

test('consistent backup includes committed WAL, excludes uncommitted work and never overwrites an earlier backup', () => {
  const id = randomUUID();
  const filename = `data/test-maintenance-${id}.sqlite`, directory = `data/test-backups-${id}`;
  const store = createStore(filename); const artifacts = [];
  try {
    store.db.exec('PRAGMA wal_autocheckpoint=0');
    const session = store.session(), service = createService(store);
    const p = service.saveIngredient(session, null, { name: 'Tepung backup', unit: 'gram', min: 100, storageNote: '', catalogRevision: 1 });
    service.receive(session, { productId: p.id, qty: 250, unitPrice: 10, supplier: '', idempotencyKey: randomUUID() });
    const schemaBefore = store.get('PRAGMA schema_version').schema_version;
    assert.equal(inspectDatabase(filename).integrity, 'ok');
    assert.equal(store.get('PRAGMA schema_version').schema_version, schemaBefore);
    store.db.exec('BEGIN IMMEDIATE');
    store.run('UPDATE inventory SET quantity=0 WHERE workspace_id=? AND business_id=? AND product_id=?', session.workspace_id, session.business_id, p.id);
    const backup = backupDatabase(filename, directory); artifacts.push(backup.filename);
    store.db.exec('ROLLBACK');
    const copied = new DatabaseSync(backup.filename, { readOnly: true });
    try {
      assert.equal(copied.prepare('SELECT quantity FROM inventory WHERE product_id=?').get(p.id).quantity, 2500000);
      assert.equal(copied.prepare('SELECT product_name FROM stock_receipts WHERE product_id=?').get(p.id).product_name, 'Tepung backup');
    } finally { copied.close(); }
    const second = backupDatabase(filename, directory); artifacts.push(second.filename);
    assert.notEqual(second.filename, backup.filename);
    assert.equal(service.bootstrap(session).stock[p.id], 250);
    assert.throws(() => backupDatabase(`data/missing-${id}.sqlite`, directory), /ENOENT/);
  } finally {
    if (store.db.isTransaction) store.db.exec('ROLLBACK');
    store.close();
    for (const file of [filename, ...artifacts]) for (const suffix of ['', '-wal', '-shm']) try { unlinkSync(file + suffix); } catch {}
    try { rmdirSync(directory); } catch {}
  }
});

test('server readiness identifies Gerai Kita, inspects all asset failures, and rejects non-local URLs before fetching', async () => {
  let calls = 0;
  const fetcher = async url => {
    calls++;
    const pathname = new URL(url).pathname;
    return new Response(pathname === '/' ? '<title>Gerai Kita</title><script src="app.js"></script>' : pathname === '/manifest.webmanifest' ? JSON.stringify({ name: 'Gerai Kita', icons: [{}, {}] }) : 'asset');
  };
  assert.equal((await inspectServer('http://localhost:4174', fetcher)).checkedAssets, 16);
  assert.equal(calls, 16);
  await assert.rejects(inspectServer('https://example.com', fetcher), /Alamat aplikasi/); assert.equal(calls, 16);
  await assert.rejects(inspectServer('http://localhost:4174', async () => new Response('missing', { status: 404 })), /app.js.*styles.css/);
  await assert.rejects(inspectServer('http://localhost:4174', async () => new Response('Other application')), /bukan halaman Gerai Kita/);
  await assert.rejects(inspectServer('http://localhost:4174', async url => new Response(new URL(url).pathname === '/manifest.webmanifest' ? '{"name":"Gerai Kita"}' : '<title>Gerai Kita</title><script src="app.js"></script>')), /Manifest Gerai Kita tidak lengkap/);
});
