import test from 'node:test';
import assert from 'node:assert/strict';
import { train } from '../server/ml/forecast-model.mjs';
import { addDays } from '../server/common.mjs';
import { evaluateUciExternal, summarizeUci } from '../scripts/uci-evaluation.mjs';

const fixture = () => {
  const development = Array.from({ length: 334 }, (_, i) => ({ date: addDays('2010-12-02', i), quantity: 1+i*.005 }));
  const data = { schemaVersion: 1, scope: { workspaceId: 'public-contract-uci', businessId: 'isolated-country', productId: 'gross-product-units', unit: 'normalized_sales' },
    provenance: { source: 'public_dataset', usage: 'benchmark_only', reference: 'Isolated mathematical contract only', permissionConfirmed: true, completeDailyRecords: true,
      sourceUrl: 'https://example.test/contract', license: 'CC-BY-4.0', sourceRevision: 'a'.repeat(40), rawSha256: 'b'.repeat(64) }, observations: development };
  return { development, artifact: train(data), external: Array.from({ length: 38 }, (_, i) => ({ date: addDays('2011-11-01', i), quantity: (200+i)/100, rawQuantity: 200+i, sourceEventRows: 1 })) };
};

test('UCI targets do not overlap and future targets never enter an earlier prediction', () => {
  const { artifact, development, external } = fixture();
  const originalModel = structuredClone(artifact.model);
  const rows = evaluateUciExternal(artifact, development, external, 100, 'isolated');
  assert.equal(rows.length, 19); assert.equal(rows.at(-1).targetThrough, '2011-12-08');
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i-1].targetThrough < rows[i].date);
  const changed = structuredClone(external); changed[0].quantity = 999; changed[0].rawQuantity = 99900;
  const other = evaluateUciExternal(artifact, development, changed, 100, 'isolated');
  assert.equal(rows[0].ridge, other[0].ridge); assert.notEqual(rows[0].actual, other[0].actual);
  assert.deepEqual(artifact.model, originalModel);
});

test('UCI scoring rejects changed dates and inconsistent raw/normalized aggregates', () => {
  const { artifact, development, external } = fixture();
  const wrongDate = structuredClone(external); wrongDate[1].date = wrongDate[0].date;
  assert.throws(() => evaluateUciExternal(artifact, development, wrongDate, 100, 'isolated'), /berurutan/);
  const wrongScale = structuredClone(external); wrongScale[0].rawQuantity = 1;
  assert.throws(() => evaluateUciExternal(artifact, development, wrongScale, 100, 'isolated'), /normalisasinya/);
  assert.throws(() => evaluateUciExternal(artifact, development, external.slice(1), 100, 'isolated'), /Ukuran/);
});

test('UCI raw scoring inverses the fixed early scale; zero targets retain undefined WAPE', () => {
  const rows = [{ actual: 2, rawActual: 200, scale: 100, ridge: 3, naive: 2, moving_average_7: 1, moving_average_14: 1, weekly: 1 }];
  assert.equal(summarizeUci(rows).ridge.mae, 1); assert.equal(summarizeUci(rows, true).ridge.mae, 100);
  assert.equal(summarizeUci(rows).ridge.wape, summarizeUci(rows, true).ridge.wape);
  assert.equal(summarizeUci([{ ...rows[0], actual: 0, rawActual: 0 }]).ridge.wape, null);
});
