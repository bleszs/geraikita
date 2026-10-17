import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { requestModelItems, createExtractor } from '../server/extractor.mjs';
import { validateChatDataset, evaluateChats, summarizeChat } from '../scripts/chat-evaluation.mjs';

// Mathematical/contract fixtures only; never loaded into the application database.
const menu = [{ id: 'isolated-material-menu', name: 'Produk uji terisolasi', aliases: ['produk uji'] }];
const fixture = () => ({ schemaVersion: 1, provenance: { source: 'consented_business_chats', reference: 'Isolated contract test only', permissionConfirmed: true, redacted: true, humanAnnotated: true }, menu: structuredClone(menu), records: [
  { id: 'private-record-a', conversationId: 'private-thread-a', split: 'test', text: 'produk uji 2', expected: { action: 'extract', items: [{ id: menu[0].id, qty: 2 }] } },
  { id: 'private-record-b', conversationId: 'private-thread-b', split: 'test', text: 'batal produk uji 2', expected: { action: 'manual', items: [] } },
] });
const response = body => ({ ok: true, json: async () => ({ message: { content: JSON.stringify(body) } }) });

test('chat validation requires permission, redaction, human labels and nonempty actual records', () => {
  assert.equal(validateChatDataset(fixture()).records.length, 2);
  for (const field of ['permissionConfirmed', 'redacted', 'humanAnnotated']) {
    const data = fixture(); data.provenance[field] = false;
    assert.throws(() => validateChatDataset(data), /sumber chat nyata/);
  }
  const empty = fixture(); empty.records = [];
  assert.throws(() => validateChatDataset(empty), /dataset kosong/);
  assert.throws(() => validateChatDataset(JSON.parse(readFileSync('datasets/templates/chat-dataset.json'))));
});

test('chat split rejects shared conversations and normalized identical text across splits', () => {
  const groupLeak = fixture(); groupLeak.records[1].split = 'validation'; groupLeak.records[1].conversationId = groupLeak.records[0].conversationId;
  assert.throws(() => validateChatDataset(groupLeak), /bocor/);
  const textLeak = fixture(); textLeak.records[1].split = 'train'; textLeak.records[1].text = ' PRODUK   UJI 2 ';
  assert.throws(() => validateChatDataset(textLeak), /bocor/);
  const distinct = fixture(); distinct.records[1].split = 'validation';
  assert.equal(validateChatDataset(distinct).records.length, 2);
});

test('chat labels and catalog reject unknown IDs, ambiguous aliases, duplicates and invalid quantities', () => {
  for (const edit of [d => { d.records[0].expected.items[0].qty = 0; }, d => { d.records[0].expected.items[0].id = 'unknown'; }, d => { d.menu[0].aliases.push('produk uji'); }, d => { d.records[1].expected.items = [{ id: menu[0].id, qty: 1 }]; }, d => { d.records[1].id = d.records[0].id; }]) {
    const data = fixture(); edit(data); assert.throws(() => validateChatDataset(data));
  }
});

test('raw model client maps short references without applying the parser evidence gate', async () => {
  let sent;
  const result = await requestModelItems('chat belum dipahami parser', menu, { fetcher: async (_url, options) => { sent = JSON.parse(options.body); return response({ items: [{ id: 'menu1', qty: 2 }] }); } });
  assert.deepEqual(result.items, [{ id: menu[0].id, qty: 2 }]);
  assert.equal(sent.messages[1].content, 'chat belum dipahami parser');
  assert.equal(sent.options.temperature, 0);
  assert.deepEqual(sent.format.properties.items.items.properties.id.enum, ['menu1']);
});

test('raw model client rejects malformed JSON, empty/duplicate/extra/unknown fields and invalid quantity', async () => {
  for (const body of [null, { items: [] }, { items: [{ id: 'menu1', qty: 2 }], extra: 1 }, { items: [{ id: 'menu1', qty: 2, extra: 1 }] }, { items: [{ id: 'menu1', qty: 2 }, { id: 'menu1', qty: 2 }] }, { items: [{ id: 'unknown', qty: 2 }] }, { items: [{ id: 'menu1', qty: 2.5 }] }]) {
    await assert.rejects(requestModelItems('produk uji 2', menu, { fetcher: async () => response(body) }), /evidence mismatch/);
  }
  await assert.rejects(requestModelItems('produk uji 2', menu, { fetcher: async () => ({ ok: true, json: async () => ({ message: { content: '{invalid' } }) }) }), /evidence mismatch/);
});

test('actual pipeline accepts agreement, falls back on disagreement and blocks negation before any model call', async () => {
  let calls = 0, qty = 2;
  const extractor = createExtractor({ fetcher: async () => { calls++; return response({ items: [{ id: 'menu1', qty }] }); } });
  assert.equal((await extractor.extract('produk uji 2', menu)).mode, 'ollama');
  qty = 3;
  const fallback = await extractor.extract('produk uji 2', menu);
  assert.equal(fallback.mode, 'fallback'); assert.equal(fallback.items[0].qty, 2);
  await assert.rejects(extractor.extract('batal produk uji 2', menu));
  assert.equal(calls, 2);
});

test('chat metrics count unsafe acceptance and infrastructure failure without fabricated empty rates', () => {
  const data = fixture();
  const rows = data.records.map(row => ({ expected: row.expected, engine: { status: 'accepted', mode: 'ollama', latencyMs: 10, items: [{ id: menu[0].id, qty: 3 }] } }));
  const metrics = summarizeChat(rows, 'engine');
  assert.equal(metrics.exactMatchRate, 0); assert.equal(metrics.unsafeAccepted, 2); assert.equal(metrics.falseAcceptanceOnManualRate, 1);
  rows[1].engine = { status: 'error', items: [], mode: 'unavailable', latencyMs: 100 };
  assert.equal(summarizeChat(rows, 'engine').errors, 1); assert.equal(summarizeChat(rows, 'engine').exactMatches, 0);
  assert.equal(summarizeChat(rows, 'not-run').exactMatchRate, null);
  assert.equal(summarizeChat(rows, 'not-run').latencyMs.p95, null);
});

test('rules evaluation reports raw model not run and omits source chat/identity; rejects remote endpoints and empty split', async () => {
  const data = fixture();
  const report = await evaluateChats(data, { provider: 'rules', fetcher: () => { throw new Error('Must never fetch'); } });
  assert.equal(report.metrics.parser.exactMatchRate, 1); assert.equal(report.metrics.pipeline.exactMatchRate, 1);
  assert.equal(report.metrics.rawModel.status, 'not_run');
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('batal produk uji'), false); assert.equal(serialized.includes('private-record-a'), false); assert.equal(serialized.includes('private-thread-a'), false);
  await assert.rejects(evaluateChats(data, { url: 'https://example.test' }), /Ollama lokal/);
  await assert.rejects(evaluateChats(data, { split: 'validation' }), /belum memiliki chat/);
});

test('comparison runs independent raw AI and actual pipeline, retaining wrong outputs and fallback', async () => {
  let calls = 0;
  const report = await evaluateChats(fixture(), { provider: 'ollama', fetcher: async () => { calls++; return response({ items: [{ id: 'menu1', qty: 3 }] }); } });
  assert.equal(calls, 3);
  assert.equal(report.metrics.rawModel.unsafeAccepted, 2);
  assert.equal(report.metrics.pipeline.exactMatchRate, 1);
  assert.deepEqual(report.metrics.pipeline.modeCounts, { fallback: 1, manual: 1 });
  assert.equal(report.rows[0].rawModel.items[0].qty, 3);
});

test('chat CLI refuses missing data, writes only private evaluation artifacts and never overwrites an existing run', () => {
  const run = args => spawnSync(process.execPath, ['scripts/evaluate-chat.mjs', ...args], { encoding: 'utf8' });
  assert.equal(run([]).status, 1);
  const directory = mkdtempSync(path.join(tmpdir(), 'gerai-chat-contract-'));
  try {
    const source = path.join(directory, 'input.json'), destination = path.join(directory, 'run');
    writeFileSync(source, JSON.stringify(fixture()));
    const result = run(['--dataset', source, '--out', destination]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(readFileSync(path.join(destination, 'report.json')));
    assert.equal(report.evaluatedRecords, 2); assert.equal(report.metrics.rawModel.status, 'not_run');
    assert.equal(report.datasetSha256.length, 64);
    const before = readFileSync(path.join(destination, 'protocol.json'), 'utf8');
    assert.equal(run(['--dataset', source, '--out', destination]).status, 1);
    assert.equal(readFileSync(path.join(destination, 'protocol.json'), 'utf8'), before);
  } finally {
    const resolved = realpathSync(directory);
    assert.equal(path.dirname(resolved), realpathSync(tmpdir()));
    assert.ok(path.basename(resolved).startsWith('gerai-chat-contract-'));
    rmSync(resolved, { recursive: true, force: true });
  }
});
