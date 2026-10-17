import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createStore } from '../server/store.mjs';
import { createService } from '../server/service.mjs';
import { createExtractor, parseOrder } from '../server/extractor.mjs';
import { forecast } from '../server/forecast.mjs';
import { addDays, dayAt, quantity } from '../server/common.mjs';

const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/orders.json', import.meta.url), 'utf8'));
const extractor = createExtractor(); const ai = await extractor.status();
const canonical = items => items.map(i => `${i.id}:${i.qty}`).sort().join('|');
const extraction = [];
for (const c of fixtures.cases) {
  const start = performance.now(); let result; let error;
  try { result = await extractor.extract(c.text); } catch (e) { error = e.message; }
  const expected = c.items?.map(([id, qty]) => ({ id, qty }));
  let parserPass; try { const parsed = parseOrder(c.text); parserPass = !c.reject && canonical(parsed) === canonical(expected); } catch { parserPass = !!c.reject; }
  const pass = c.reject ? !!error : !!result && canonical(result.items) === canonical(expected);
  extraction.push({ id: c.id, expected: c.reject ? 'manual_review' : expected, actual: result?.items.map(({ id, qty }) => ({ id, qty })) || null, pass, parserPass, mode: result?.mode || 'manual_review', latencyMs: Math.round(performance.now() - start), error: error || null, reason: result?.reason || null });
  console.log(`${c.id}: ${pass ? 'PASS' : 'FAIL'} · ${result?.mode || 'manual_review'}`);
}
const store = createStore(':memory:'); const session = store.session(); const service = createService(store);
const series = store.all('SELECT date,quantity FROM daily_usage WHERE workspace_id=? AND business_id=? AND product_id=? ORDER BY date', session.workspace_id, 'sari', 'telur').filter(p => p.date < dayAt()).map(p => ({ date: p.date, qty: quantity(p.quantity) }));
// Seven final dates are held out from model selection at each prediction origin.
const holdout = series.slice(-7); const rows = holdout.map(target => {
  const past = series.filter(p => p.date < target.date); const f = forecast(past, 0, target.date, 1);
  const naive = past.at(-1).qty; const ma7 = past.slice(-7).reduce((s, p) => s + p.qty, 0) / Math.min(7, past.length);
  return { date: target.date, actual: target.qty, selectedMethod: f.method, selected: f.predicted, naive, moving_average_7: ma7 };
});
const metrics = Object.fromEntries(['selected', 'naive', 'moving_average_7'].map(method => { const error = rows.reduce((sum, p) => sum + Math.abs(p.actual - p[method]), 0); const actual = rows.reduce((sum, p) => sum + p.actual, 0); return [method, { mae: error / rows.length, wape: actual ? error / actual : null, observations: rows.length }]; }));
service.demand(session, { qty: 22, active: true }); const group = service.group(session);
const groupEvaluation = { needs: group.collective, vendorOrder: group.order, individualTotal: group.participants.reduce((n, p) => n + p.individual, 0), collectiveTotal: group.totalCost, shippingAllocated: group.participants.reduce((n, p) => n + p.transport, 0), minimumMet: group.eligible };
store.close();
const result = { generatedAt: new Date().toISOString(), fixtureVersion: fixtures.version, source: fixtures.source, interpretation: 'Uji regresi kecil pada data sintetis; bukan benchmark UMKM nyata atau bukti generalisasi. Mode fallback dihitung terpisah dari keberhasilan model.', ai, extraction: { passed: extraction.filter(r => r.pass).length, total: extraction.length, parserPassed: extraction.filter(r => r.parserPass).length, modelAccepted: extraction.filter(r => r.mode === 'ollama').length, fallback: extraction.filter(r => r.mode === 'fallback').length, manualReview: extraction.filter(r => r.mode === 'manual_review').length, cases: extraction }, forecast: { dataset: 'gerai-demo-v2', evaluation: 'Rolling one-day holdout, last seven complete dates; model selection uses only earlier history; zero safety stock and incoming', from: holdout[0].date, to: holdout.at(-1).date, metrics, rows }, collective: groupEvaluation };
await mkdir('docs/evaluation', { recursive: true }); await writeFile('docs/evaluation/results.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ extraction: { passed: result.extraction.passed, total: extraction.length, modelAccepted: result.extraction.modelAccepted, fallback: result.extraction.fallback }, forecast: metrics, collective: groupEvaluation }, null, 2));
if (extraction.some(r => !r.pass)) process.exitCode = 1;
