import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { hash, summarizeDecoder, decoderStageOrder } from '../scripts/asr-decoder-evaluation.mjs';
import { auditDecoderRun } from '../scripts/analyze-asr-decoder.mjs';

// Synthetic contracts only, never public-quality scores or active business data.
const fingerprint = marker => ({ sha256: hash(marker), shape: [2, 2], dtype: 'float32', alignment64: 0 });
function fixture() {
  const protocol = { schemaVersion: 1, experiment: 'seen-public-asr-decoder-v1', repeats: 2, decoderReplays: 3,
    modes: ['plain', 'deferred'], cases: [{ id: 'contract', profile: 'baseline', audioSha256: hash('contract-audio') }] };
  const rows = [];
  for (let repeat = 1; repeat <= 2; repeat++) for (const mode of protocol.modes) {
    const fp = fingerprint('same-input'), output = { tokens: [[1, 2, 3]], scores: [-.25], noSpeechProbability: .1 };
    const trace = { mode, profile: 'baseline', environment: {}, inputSha256: protocol.cases[0].audioSha256, status: 'accepted', result: { text: 'contract transcript' } };
    if (mode === 'deferred') {
      trace.stages = { pcm: structuredClone(fp), features: [Object.fromEntries(['waveform', 'window', 'mel_filters', 'stft', 'magnitudes', 'mel_spec', 'log_spec'].map(name => [name, structuredClone(fp)]))],
        encoders: [{ input: structuredClone(fp), output: structuredClone(fp) }],
        decoders: [{ input: structuredClone(fp), prompt: [1, 2], kwargs: { beam_size: 3 }, output: structuredClone(output), averageLogProbability: -.25, temperature: 0, compressionRatio: 1 }],
        segments: [{ tokens: [1, 2, 3], text: 'contract transcript', start: 0, end: 1, averageLogProbability: -.25, noSpeechProbability: .1 }] };
      trace.replays = Array.from({ length: 3 }, (_, i) => ({ decoder: 0, repeat: i + 1, inputBefore: structuredClone(fp), inputAfter: structuredClone(fp), status: 'accepted', output: structuredClone(output) }));
    }
    rows.push({ caseId: 'contract', mode, repeat, exitCode: 0, trace });
  }
  return { protocol, rows };
}
const traced = rows => rows.filter(row => row.mode === 'deferred');

test('complete fixed cohort reports all replay attempts without asserting historical cause or promotion', () => {
  const { protocol, rows } = fixture(), summary = summarizeDecoder(rows, protocol);
  assert.equal(summary.inferences, 4); assert.equal(summary.replay.attempted, 6); assert.equal(summary.replay.accepted, 6);
  assert.equal(summary.allObservedTextRepeatsMatch, true); assert.equal(summary.withinConfigurationTextFailureLocalized, false);
  assert.equal(summary.causeEstablished, false); assert.equal(summary.fixValidated, false); assert.equal(summary.readyForPromotion, false);
  assert.ok(summary.groups.every(group => group.firstChangedStage === null));
});

test('missing/duplicate attempts, wrong audio/profile and an instrumented plain control fail closed', () => {
  for (const change of [rows => rows.pop(), rows => rows[3] = structuredClone(rows[1]), rows => rows[0].trace.inputSha256 = hash('other'),
    rows => rows[0].trace.profile = 'openblas_one', rows => rows[0].trace.stages = {}]) {
    const { protocol, rows } = fixture(); change(rows); assert.throws(() => summarizeDecoder(rows, protocol));
  }
});

test('deferred text variation is localized to the earliest content change, ignoring memory alignment', () => {
  const { protocol, rows } = fixture(), last = traced(rows)[1].trace;
  last.stages.features[0].mel_spec = fingerprint('different-mel');
  last.stages.features[0].window.alignment64 = 32;
  last.stages.decoders[0].output.tokens = [[3, 4]]; last.result.text = 'different transcript';
  const summary = summarizeDecoder(rows, protocol), group = summary.groups.find(group => group.mode === 'deferred');
  assert.equal(group.firstChangedStage, 'mel_spec'); assert.equal(group.stageVariants.window, 1);
  assert.equal(summary.withinConfigurationTextFailureLocalized, true); assert.equal(summary.causeEstablished, false);
  assert.equal(decoderStageOrder.at(-1), 'transcript');
});

test('decoder-only token and score changes remain distinguishable from encoder and segment changes', () => {
  const { protocol, rows } = fixture(), last = traced(rows)[1].trace;
  last.stages.decoders[0].output.tokens = [[8, 9]];
  let group = summarizeDecoder(rows, protocol).groups.find(group => group.mode === 'deferred');
  assert.equal(group.firstChangedStage, 'decoder_tokens'); assert.equal(group.stageVariants.encoder_output, 1);
  last.stages.decoders[0].output.tokens = [[1, 2, 3]]; last.stages.decoders[0].output.scores = [-.5];
  group = summarizeDecoder(rows, protocol).groups.find(group => group.mode === 'deferred');
  assert.equal(group.firstChangedStage, 'decoder_scores'); assert.equal(group.transcriptVariants, 1);
});

test('replay differences, encoder mutation and decoder errors remain in the denominator', () => {
  const { protocol, rows } = fixture(), trace = traced(rows)[0].trace;
  trace.replays[0].output.tokens = [[9]]; trace.replays[0].output.scores = [-.8];
  trace.replays[1].inputAfter = fingerprint('mutated-buffer');
  trace.replays[2] = { ...trace.replays[2], status: 'error', errorType: 'contract-error' }; delete trace.replays[2].output;
  const summary = summarizeDecoder(rows, protocol);
  assert.equal(summary.replay.expected, 6); assert.equal(summary.replay.attempted, 6); assert.equal(summary.replay.accepted, 5);
  assert.equal(summary.replay.errors, 1); assert.equal(summary.replay.inputMutations, 1);
  assert.equal(summary.replay.tokenChangesFromCapture, 1); assert.equal(summary.replay.scoreChangesFromCapture, 1);
  assert.equal(summary.replay.groupsWithReplayTokenVariation, 1);
});

test('failed inference cannot become a successful stability group and missing trace/replay data is rejected', () => {
  const { protocol, rows } = fixture(); rows[0].trace.status = 'error'; delete rows[0].trace.result;
  const summary = summarizeDecoder(rows, protocol); assert.equal(summary.allObservedTextRepeatsMatch, false);
  assert.equal(summary.groups.find(group => group.mode === 'plain').errors, 1);
  for (const change of [trace => trace.traceError = 'contract', trace => trace.replays.pop(),
    trace => trace.replays[2] = structuredClone(trace.replays[0]), trace => trace.stages.decoders[0].output.scores = [NaN],
    trace => delete trace.stages.encoders[0].input, trace => trace.stages.decoders[0].temperature = 1]) {
    const next = fixture(); change(traced(next.rows)[0].trace); assert.throws(() => summarizeDecoder(next.rows, next.protocol));
  }
});

test('run audit checks checkpoints, frozen sources, prior evidence, audio and saved summary without inference', async t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'gerai-decoder-audit-'));
  t.after(() => {
    const resolved = realpathSync(directory); assert.equal(path.dirname(resolved), realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('gerai-decoder-audit-')); rmSync(resolved, { recursive: true, force: true });
  });
  const { protocol, rows } = fixture(), audio = path.join(directory, 'contract.audio'), manifest = path.join(directory, 'manifest.json'), prior = path.join(directory, 'prior.json');
  writeFileSync(audio, 'contract-audio'); writeFileSync(manifest, '{}'); writeFileSync(prior, 'historical contract');
  protocol.cases[0] = { ...protocol.cases[0], audioFile: audio, manifestFile: manifest, manifestSha256: hash(readFileSync(manifest)) };
  protocol.sourceSha256 = { 'scripts/asr-decoder-evaluation.mjs': hash(readFileSync('scripts/asr-decoder-evaluation.mjs')) };
  protocol.priorEvidenceSha256 = { [prior]: hash(readFileSync(prior)) }; protocol.inheritedNumericalEnvironment = {};
  protocol.schedule = rows.map(({ caseId, mode, repeat }) => ({ caseId, mode, repeat })); protocol.runId = 'contract-run';
  const write = (name, value) => writeFileSync(path.join(directory, name), JSON.stringify(value));
  write('protocol.json', protocol); write('traces.json', rows); write('summary.json', summarizeDecoder(rows, protocol));
  rows.forEach((row, index) => write('attempt-' + String(index + 1).padStart(2, '0') + '.json', row));
  let modelChecks = 0;
  const options = { verifyModel: async () => { modelChecks++; } };
  assert.equal((await auditDecoderRun(directory, options)).auditPassed, true); assert.equal(modelChecks, 1);
  writeFileSync(prior, 'changed historical evidence'); await assert.rejects(auditDecoderRun(directory, options), /Historical evidence/);
  writeFileSync(prior, 'historical contract'); write('attempt-01.json', {}); await assert.rejects(auditDecoderRun(directory, options), /checkpoint/);
  write('attempt-01.json', rows[0]); write('summary.json', {}); await assert.rejects(auditDecoderRun(directory, options), /summary/);
});
