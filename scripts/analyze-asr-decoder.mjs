import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { hash, summarizeDecoder } from './asr-decoder-evaluation.mjs';
import { verifySpeechProfile } from '../server/speech-profiles.mjs';

const sha = file => hash(readFileSync(file));
export async function auditDecoderRun(directory, { verifyModel = () => verifySpeechProfile('base-pinned') } = {}) {
  const read = file => JSON.parse(readFileSync(file, 'utf8'));
  const protocolFile = path.join(directory, 'protocol.json'), tracesFile = path.join(directory, 'traces.json');
  const protocol = read(protocolFile), rows = read(tracesFile);
  for (const [file, expected] of Object.entries(protocol.sourceSha256)) assert.equal(sha(file), expected, 'Frozen decoder source changed: ' + file);
  for (const [file, expected] of Object.entries(protocol.priorEvidenceSha256)) assert.equal(sha(file), expected, 'Historical evidence changed: ' + file);
  for (const sample of protocol.cases) {
    assert.equal(sha(sample.audioFile), sample.audioSha256); assert.equal(sha(sample.manifestFile), sample.manifestSha256);
  }
  await verifyModel();
  assert.deepEqual(rows.map(({ caseId, mode, repeat }) => ({ caseId, mode, repeat })), protocol.schedule, 'Frozen schedule changed.');
  for (const [index, row] of rows.entries()) {
    assert.deepEqual(read(path.join(directory, 'attempt-' + String(index + 1).padStart(2, '0') + '.json')), row, 'Attempt checkpoint differs.');
    if (row.trace.status === 'error' && row.processError) continue;
    const expected = { ...protocol.inheritedNumericalEnvironment, ...(row.trace.profile === 'openblas_one' ? { OPENBLAS_NUM_THREADS: '1' } : {}) };
    assert.deepEqual(row.trace.environment, expected, 'Numerical environment changed inside fixed-profile run.');
  }
  const summary = summarizeDecoder(rows, protocol);
  assert.deepEqual(read(path.join(directory, 'summary.json')), summary, 'Saved summary differs from recomputed analysis.');
  return { checkedAt: new Date().toISOString(), directory, runId: protocol.runId, auditPassed: true,
    protocolSha256: sha(protocolFile), tracesSha256: sha(tracesFile), summarySha256: sha(path.join(directory, 'summary.json')),
    ...summary, newTraining: false, defaultModelChanged: false, accuracyBenchmark: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { directory: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean' } } });
    if (values.help) console.log('npm run analyze:asr-decoder -- --directory RUN_DIRECTORY [--out NEW_REPORT.json]\nRead-only recomputation/hash audit; no inference, no latest pointer, no overwrite.');
    else {
      assert(values.directory, 'Isi --directory dengan run yang dipatok eksplisit.');
      const report = await auditDecoderRun(values.directory);
      if (values.out) {
        mkdirSync(path.dirname(path.resolve(values.out)), { recursive: true });
        writeFileSync(values.out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      }
      console.log(JSON.stringify(report, null, 2));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
