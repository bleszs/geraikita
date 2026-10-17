import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import path from 'node:path';
import assert from 'node:assert/strict';
import { verifySpeechProfile } from '../server/speech-profiles.mjs';
import { hash, summarizeDecoder } from './asr-decoder-evaluation.mjs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const sha = file => hash(readFileSync(file));
const write = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const help = 'npm run diagnose:asr-decoder -- [--out DIRECTORY_BARU]\n24 cold Base transcriptions, two seen public clips, plain/deferred, six repeats; three post-inference decoder replays per capture. No training, business data, promotion or new accuracy test.';

function infer(audio, sample, mode) {
  return new Promise((resolve, reject) => {
    const child = spawn(path.resolve('.venv-voice', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'),
      ['scripts/probe-asr-decoder.py', sample.profile, mode, '3'],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONUTF8: '1' } });
    let stdout = '', stderr = '', finished = false;
    const finish = (error, value) => {
      if (finished) return; finished = true; clearTimeout(timer);
      if (error) { child.kill(); reject(error); } else resolve(value);
    };
    const timer = setTimeout(() => finish(Error('Decoder diagnostic exceeded 90 seconds.')), 90000);
    child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 1_000_000) finish(Error('Diagnostic stdout exceeded limit.')); });
    child.stderr.on('data', chunk => { if (stderr.length < 8000) stderr += chunk.toString().slice(0, 8000 - stderr.length); });
    child.stdin.on('error', () => {}); child.once('error', error => finish(error));
    child.once('close', exitCode => {
      if (finished) return;
      try { finish(null, { trace: JSON.parse(stdout), exitCode, stderr }); }
      catch { finish(Error('Invalid diagnostic JSON; exit ' + exitCode + ': ' + stderr.slice(-300))); }
    });
    child.stdin.end(audio);
  });
}

try {
  const { values } = parseArgs({ options: { out: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) console.log(help);
  else {
    const historicalFile = 'benchmarks/asr-stability/evidence.json', historical = read(historicalFile);
    const oldProtocolFile = path.join(historical.previousRun, 'protocol.json'), old = read(oldProtocolFile);
    const firstFile = 'docs/evaluation/runtime-speech-smoke-first.json', first = read(firstFile);
    const pinnedProtocolFile = path.join('models/benchmarks/asr-profiles', first.publicSourceRun, 'protocol.json'), pinned = read(pinnedProtocolFile);
    for (const [file, expected] of Object.entries(pinned.sourceSha256)) assert.equal(sha(file), expected, 'Changed frozen source: ' + file);
    assert.equal(sha(old.manifestFile), old.manifestSha256); assert.equal(sha(pinned.manifestFile), pinned.manifestSha256);
    const variation = first.variations.find(row => row.profile === 'base-pinned'); assert(variation, 'Missing pinned Base historical discrepancy.');
    const legacySample = read(old.manifestFile).splits.test.records[0];
    assert.equal(legacySample.filename, '9485984081064467567.wav', 'Historical diagnostic selection changed.');
    const pinnedSample = read(pinned.manifestFile).splits.test.records.find(row => row.filename === variation.filename); assert(pinnedSample);
    const cases = [
      { id: 'base-legacy-known-failure', profile: 'baseline', sample: legacySample, manifest: old.manifestFile },
      { id: 'base-pinned-http-discrepancy', profile: 'openblas_one', sample: pinnedSample, manifest: pinned.manifestFile }
    ].map(item => ({ id: item.id, profile: item.profile, filename: item.sample.filename, audioSha256: item.sample.audioSha256,
      audioFile: path.join(path.dirname(item.manifest), item.sample.audioPath), manifestFile: item.manifest, manifestSha256: sha(item.manifest) }));
    const audios = new Map(cases.map(sample => {
      const audio = readFileSync(sample.audioFile); assert.equal(hash(audio), sample.audioSha256); return [sample.id, audio];
    }));
    await verifySpeechProfile('base-pinned');
    const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
    const directory = values.out || path.join('models/benchmarks/asr-decoder', runId);
    mkdirSync(path.dirname(path.resolve(directory)), { recursive: true }); mkdirSync(directory);
    const evidenceFiles = [historicalFile, oldProtocolFile, pinnedProtocolFile, firstFile,
      'docs/evaluation/asr-comparison-reproducibility.json', 'docs/evaluation/asr-stability-results.json', 'docs/evaluation/runtime-speech-capture.json'];
    const sourceFiles = ['scripts/probe-asr-decoder.py', 'scripts/probe-asr-decoder.mjs', 'scripts/asr-decoder-evaluation.mjs', 'scripts/analyze-asr-decoder.mjs',
      'server/ml/transcribe.py', 'server/ml/transcribe-profile.py', 'models/speech-base-source.json', 'requirements-voice.txt',
      '.venv-voice/Lib/site-packages/faster_whisper/transcribe.py', '.venv-voice/Lib/site-packages/faster_whisper/feature_extractor.py'];
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(CT2_|MKL_|OMP_|OPENBLAS_)/.test(key)));
    const schedule = [];
    for (let repeat = 1; repeat <= 6; repeat++) for (const sample of repeat % 2 ? cases : [...cases].reverse())
      for (const mode of repeat % 2 ? ['plain', 'deferred'] : ['deferred', 'plain']) schedule.push({ caseId: sample.id, mode, repeat });
    const protocol = { schemaVersion: 1, experiment: 'seen-public-asr-decoder-v1', runId, frozenAt: new Date().toISOString(),
      cases, modes: ['plain', 'deferred'], repeats: 6, decoderReplays: 3, schedule, inheritedNumericalEnvironment: environment,
      sourceSha256: Object.fromEntries(sourceFiles.map(file => [file, sha(file)])),
      priorEvidenceSha256: Object.fromEntries(evidenceFiles.map(file => [file, sha(file)])),
      selection: 'Two explicitly pinned, previously seen clips with historical plain/HTTP Base discrepancies; not a fresh quality sample.',
      policy: 'Fixed 24 attempts, retain all failures; no retry until match, threshold tuning, training or model/default change. Capturing/replaying changes timing and lifetime; no equivalence to plain inference or historical environment is assumed.' };
    write(path.join(directory, 'protocol.json'), protocol);
    const rows = [];
    for (const member of schedule) {
      const sample = cases.find(sample => sample.id === member.caseId), started = performance.now();
      let result;
      try { result = await infer(audios.get(sample.id), sample, member.mode); }
      catch (error) { result = { exitCode: null, processError: error.message, trace: { mode: member.mode, profile: sample.profile,
        inputSha256: sample.audioSha256, status: 'error', errorType: 'worker_failure' } }; }
      rows.push({ ...member, elapsedMs: Math.round(performance.now() - started), ...result });
      // A unique checkpoint per attempt preserves a crash trail without replacing earlier evidence.
      write(path.join(directory, 'attempt-' + String(rows.length).padStart(2, '0') + '.json'), rows.at(-1));
      console.log(`${rows.length}/24 ${member.caseId} ${member.mode} repeat ${member.repeat}: ${result.trace.status}${result.trace.traceError ? ' TRACE ERROR ' + result.trace.traceError : ''}`);
    }
    write(path.join(directory, 'traces.json'), rows);
    const summary = summarizeDecoder(rows, protocol);
    write(path.join(directory, 'summary.json'), summary);
    console.log(JSON.stringify({ directory, inferences: summary.inferences, groupsWithTextVariation: summary.groupsWithTextVariation,
      replay: summary.replay, causeEstablished: false, fixValidated: false, readyForPromotion: false }, null, 2));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
