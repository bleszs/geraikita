import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../server/common.mjs';
import { screenDrift, DRIFT_RULE } from '../server/ml/usage-drift.mjs';

// Contract fixtures only; these observations never enter the live application.
const asOf = '2026-04-01', opts = { asOf, unit: 'kg' };
const span = DRIFT_RULE.recentDays + DRIFT_RULE.baselineDays; // 42 complete days before asOf
// i in [0,span): baseline for i < baselineDays, recent otherwise.
const build = fn => Array.from({ length: span }, (_, i) => ({ date: addDays(asOf, i - span), qty: fn(i, i >= DRIFT_RULE.baselineDays) }));

test('a sustained level shift is flagged by direction while window medians ignore a single spike', () => {
  const stable = screenDrift(build(() => 10), opts);
  assert.equal(stable.status, 'screened'); assert.equal(stable.changed, false); assert.equal(stable.direction, null);
  assert.equal(stable.baseline.median, 10); assert.equal(stable.recent.median, 10); assert.equal(stable.shift, 0);

  const up = screenDrift(build((i, recent) => recent ? 20 : 10), opts);
  assert.equal(up.changed, true); assert.equal(up.direction, 'higher'); assert.equal(up.relativeShift, 1);

  const down = screenDrift(build((i, recent) => recent ? 8 : 20), opts);
  assert.equal(down.changed, true); assert.equal(down.direction, 'lower');

  // One extreme day inside an otherwise flat recent window must not move the median.
  const spike = screenDrift(build((i, recent) => recent && i === span - 1 ? 1000 : 10), opts);
  assert.equal(spike.recent.median, 10); assert.equal(spike.changed, false);
});

test('changes below the relative floor are not flagged, and the floor boundary is crossed cleanly', () => {
  const small = screenDrift(build((i, recent) => recent ? 11 : 10), opts); // +10% < 25% floor
  assert.equal(small.changed, false);
  const over = screenDrift(build((i, recent) => recent ? 13 : 10), opts); // +30% > 25% floor
  assert.equal(over.changed, true); assert.equal(over.direction, 'higher');
});

test('gaps, short history and no history stay unavailable rather than guessing a shift', () => {
  const baselineGap = build(() => 10).filter(r => r.date !== addDays(asOf, -span + 5)); // drop a date inside the baseline window
  assert.equal(screenDrift(baselineGap, opts).status, 'baseline_has_gaps');
  assert.equal(screenDrift(baselineGap, opts).changed, null);
  const recentGap = build(() => 10).filter(r => r.date !== addDays(asOf, -1)); // drop a recent date
  assert.equal(screenDrift(recentGap, opts).status, 'recent_has_gaps');
  const short = Array.from({ length: span - 5 }, (_, i) => ({ date: addDays(asOf, i - (span - 5)), qty: 10 }));
  assert.equal(screenDrift(short, opts).status, 'insufficient_history');
  assert.equal(screenDrift([], opts).status, 'no_history');
});

test('future and partial dates are excluded and duplicate or invalid rows are rejected', () => {
  const withFuture = [...build(() => 10), { date: asOf, qty: 999 }, { date: addDays(asOf, 3), qty: 999 }];
  assert.deepEqual(screenDrift(withFuture, opts), screenDrift(build(() => 10), opts));
  assert.throws(() => screenDrift([{ date: '2026-03-01', qty: 1 }, { date: '2026-03-01', qty: 2 }], opts), /duplikat/);
  assert.throws(() => screenDrift([{ date: 'bukan-tanggal', qty: 1 }], opts), /Tanggal ledger/);
  assert.throws(() => screenDrift(build(() => 10), { asOf, unit: 'dus' }), /Satuan/);
});
