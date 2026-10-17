import { DatabaseSync } from 'node:sqlite';
import { statSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function inspectDatabase(filename) {
  if (!statSync(filename).isFile()) throw new Error('Database harus berupa file SQLite.');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const integrity = db.prepare('PRAGMA quick_check').all();
    if (integrity.length !== 1 || integrity[0].quick_check !== 'ok') throw new Error('Pemeriksaan integritas SQLite gagal.');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Relasi database tidak konsisten.');
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));
    for (const name of ['workspaces', 'ingredients', 'inventory', 'sales', 'stock_receipts', 'collective_orders']) {
      if (!tables.has(name)) throw new Error(`Schema belum lengkap: ${name}. Jalankan aplikasi untuk migrasi dahulu.`);
    }
    const receiptColumns = new Set(db.prepare('PRAGMA table_info(stock_receipts)').all().map(r => r.name));
    if (!receiptColumns.has('product_name') || !receiptColumns.has('product_unit')) throw new Error('Snapshot penerimaan belum dimigrasikan.');
    return { integrity: 'ok', foreignKeys: 'ok', namespaces: db.prepare('SELECT COUNT(*) AS n FROM workspaces').get().n };
  } finally { db.close(); }
}

export function backupDatabase(filename, directory = 'data/backups') {
  const source = path.resolve(filename);
  inspectDatabase(source);
  const destinationDirectory = path.resolve(directory);
  mkdirSync(destinationDirectory, { recursive: true });
  const createdAt = new Date().toISOString();
  const filenameStem = path.basename(source, path.extname(source)).replace(/[^a-zA-Z0-9_-]/g, '_');
  const destination = path.join(destinationDirectory, `${filenameStem}-${createdAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.sqlite`);
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    db.exec('PRAGMA busy_timeout=5000');
    // SQLite includes committed WAL contents; copying the main file alone would not.
    db.prepare('VACUUM INTO ?').run(destination);
  } finally { db.close(); }
  const verification = inspectDatabase(destination);
  return { filename: destination, bytes: statSync(destination).size, createdAt, verification };
}

export async function inspectServer(address, fetcher = fetch) {
  const url = new URL(address);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Alamat aplikasi harus berupa http://localhost:PORT atau http://127.0.0.1:PORT.');
  }
  const files = ['/', '/app.js', '/voice.js', '/live-views.js', '/styles.css', '/offline.js', '/api.js', '/model.js', '/catalog.js', '/receipt-measurement.js', '/icons.js', '/sw.js', '/manifest.webmanifest', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/nunito-sans-400.woff2'];
  const results = await Promise.allSettled(files.map(async file => {
    const response = await fetcher(new URL(file, url), { signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    const body = await response.arrayBuffer();
    if (!body.byteLength) throw new Error(`${file}: file kosong`);
    if (file === '/') {
      const html = new TextDecoder().decode(body);
      if (!html.includes('Gerai Kita') || !html.includes('app.js')) throw new Error('Alamat ini bukan halaman Gerai Kita.');
    }
    if (file === '/manifest.webmanifest') {
      const manifest = JSON.parse(new TextDecoder().decode(body));
      if (manifest.name !== 'Gerai Kita' || !Array.isArray(manifest.icons) || manifest.icons.length < 2) throw new Error('Manifest Gerai Kita tidak lengkap.');
    }
    return file;
  }));
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length) throw new Error(failures.map(r => r.reason.message).join('; '));
  return { origin: url.origin, checkedAssets: results.length };
}
