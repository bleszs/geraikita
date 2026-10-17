import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { featureStageOrder } from './asr-followup-evaluation.mjs';

export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const key = value => JSON.stringify(value);
export const decoderStageOrder = [...featureStageOrder, 'decoder_input', 'decoder_tokens', 'decoder_scores', 'segments', 'transcript'];
const fingerprint = buffer => {
  assert(buffer && /^[a-f0-9]{64}$/.test(buffer.sha256) && Array.isArray(buffer.shape) && buffer.shape.length > 0 &&
    buffer.shape.every(n => Number.isInteger(n) && n > 0) && typeof buffer.dtype === 'string', 'Invalid tensor fingerprint.');
  return { sha256: buffer.sha256, shape: buffer.shape, dtype: buffer.dtype };
};
function validateGeneration(value) {
  assert(value && Array.isArray(value.tokens) && value.tokens.length > 0 && value.tokens.every(tokens => Array.isArray(tokens) &&
    tokens.length > 0 && tokens.every(token => Number.isInteger(token) && token >= 0)), 'Missing decoder token sequence.');
  assert(Array.isArray(value.scores) && value.scores.length === value.tokens.length && value.scores.every(Number.isFinite) &&
    Number.isFinite(value.noSpeechProbability) && value.noSpeechProbability >= 0 && value.noSpeechProbability <= 1, 'Invalid decoder scores.');
}
function stages(trace) {
  const s = trace.stages;
  assert(!trace.traceError && s?.features.length > 0 && s.encoders.length > 0 && s.decoders.length > 0 && s.segments.length > 0, 'Incomplete deferred capture.');
  const result = { pcm: [fingerprint(s.pcm)] };
  for (const name of featureStageOrder.filter(name => name !== 'pcm' && !name.startsWith('encoder_'))) result[name] = s.features.map(row => fingerprint(row[name]));
  for (const name of ['encoder_input', 'encoder_output']) result[name] = s.encoders.map(row => fingerprint(row[name === 'encoder_input' ? 'input' : 'output']));
  for (const row of s.decoders) {
    validateGeneration(row.output);
    assert(Array.isArray(row.prompt) && row.prompt.length > 0 && row.prompt.every(Number.isInteger) && row.kwargs?.beam_size === 3 &&
      Number.isFinite(row.averageLogProbability) && row.temperature === 0 && Number.isFinite(row.compressionRatio), 'Invalid captured decoder configuration.');
  }
  result.decoder_input = s.decoders.map(row => ({ input: fingerprint(row.input), prompt: row.prompt, kwargs: row.kwargs }));
  result.decoder_tokens = s.decoders.map(row => row.output.tokens);
  result.decoder_scores = s.decoders.map(row => ({ scores: row.output.scores, noSpeechProbability: row.output.noSpeechProbability,
    averageLogProbability: row.averageLogProbability, temperature: row.temperature, compressionRatio: row.compressionRatio }));
  for (const row of s.segments) assert(Array.isArray(row.tokens) && row.tokens.length > 0 && row.tokens.every(Number.isInteger) &&
    typeof row.text === 'string' && [row.start, row.end, row.averageLogProbability, row.noSpeechProbability].every(Number.isFinite), 'Invalid captured segment.');
  result.segments = s.segments; result.transcript = trace.result.text;
  return result;
}

export function summarizeDecoder(rows, protocol) {
  assert(protocol?.schemaVersion === 1 && protocol.experiment === 'seen-public-asr-decoder-v1', 'Invalid decoder protocol.');
  assert(Number.isInteger(protocol.repeats) && protocol.repeats >= 2 && protocol.repeats <= 8 && protocol.decoderReplays === 3, 'Invalid fixed repeat plan.');
  assert.deepEqual(protocol.modes, ['plain', 'deferred']);
  assert(Array.isArray(protocol.cases) && protocol.cases.length > 0 && new Set(protocol.cases.map(row => row.id)).size === protocol.cases.length, 'Invalid diagnostic cases.');
  assert.equal(rows.length, protocol.cases.length * protocol.modes.length * protocol.repeats, 'Incomplete inference cohort.');
  const seen = new Set(), traceStages = new Map(), replay = { expected: 0, attempted: 0, accepted: 0, errors: 0,
    inputMutations: 0, tokenChangesFromCapture: 0, scoreChangesFromCapture: 0, groupsWithReplayTokenVariation: 0 };
  for (const row of rows) {
    const sample = protocol.cases.find(sample => sample.id === row.caseId), trace = row.trace;
    assert(sample && protocol.modes.includes(row.mode) && Number.isInteger(row.repeat) && row.repeat >= 1 && row.repeat <= protocol.repeats, 'Unexpected cohort member.');
    const id = key([row.caseId, row.mode, row.repeat]); assert(!seen.has(id), 'Duplicate inference attempt.'); seen.add(id);
    assert(trace && trace.mode === row.mode && trace.profile === sample.profile && trace.inputSha256 === sample.audioSha256, 'Audio/profile/mode mismatch.');
    assert(['accepted', 'rejected', 'error'].includes(trace.status), 'Unknown inference status.');
    if (trace.status !== 'accepted') continue;
    assert(row.exitCode === 0 && typeof trace.result?.text === 'string' && trace.result.text.trim(), 'Invalid accepted inference.');
    if (row.mode === 'plain') { assert(!trace.stages && !trace.replays, 'Plain control was instrumented.'); continue; }
    traceStages.set(id, stages(trace));
    const expected = trace.stages.decoders.length * protocol.decoderReplays;
    assert.equal(trace.replays?.length, expected, 'Incomplete decoder replay cohort.');
    replay.expected += expected; replay.attempted += trace.replays.length;
    const replaySeen = new Set();
    for (const attempt of trace.replays) {
      const decoder = trace.stages.decoders[attempt.decoder];
      assert(decoder && Number.isInteger(attempt.decoder) && Number.isInteger(attempt.repeat) && attempt.repeat >= 1 && attempt.repeat <= protocol.decoderReplays, 'Unexpected replay.');
      const replayId = key([attempt.decoder, attempt.repeat]); assert(!replaySeen.has(replayId), 'Duplicate decoder replay.'); replaySeen.add(replayId);
      const sameInput = key(fingerprint(attempt.inputBefore)) === key(fingerprint(decoder.input)) &&
        key(fingerprint(attempt.inputAfter)) === key(fingerprint(decoder.input));
      if (!sameInput) replay.inputMutations++;
      assert(['accepted', 'error'].includes(attempt.status), 'Unknown replay status.');
      if (attempt.status === 'error') { replay.errors++; continue; }
      validateGeneration(attempt.output); replay.accepted++;
      if (key(attempt.output.tokens) !== key(decoder.output.tokens)) replay.tokenChangesFromCapture++;
      if (key([attempt.output.scores, attempt.output.noSpeechProbability]) !== key([decoder.output.scores, decoder.output.noSpeechProbability])) replay.scoreChangesFromCapture++;
    }
    for (let index = 0; index < trace.stages.decoders.length; index++) {
      const attempts = trace.replays.filter(row => row.decoder === index && row.status === 'accepted');
      if (new Set(attempts.map(row => key(row.output.tokens))).size > 1) replay.groupsWithReplayTokenVariation++;
    }
  }
  const groups = [];
  for (const sample of protocol.cases) for (const mode of protocol.modes) {
    const members = rows.filter(row => row.caseId === sample.id && row.mode === mode), usable = members.filter(row => row.trace.status === 'accepted');
    const transcriptVariants = new Set(usable.map(row => row.trace.result.text)).size;
    const complete = usable.length === protocol.repeats;
    const stageVariants = mode === 'deferred' && complete ? Object.fromEntries(decoderStageOrder.map(name => [name,
      new Set(members.map(row => key(traceStages.get(key([row.caseId, row.mode, row.repeat]))[name]))).size])) : null;
    groups.push({ caseId: sample.id, profile: sample.profile, mode, attempts: members.length, accepted: usable.length,
      rejected: members.filter(row => row.trace.status === 'rejected').length, errors: members.filter(row => row.trace.status === 'error').length,
      transcriptVariants, allAccepted: complete, observedTextRepeatsMatch: complete && transcriptVariants === 1,
      stageVariants, firstChangedStage: stageVariants ? decoderStageOrder.find(name => stageVariants[name] > 1) ?? null : null });
  }
  return { inferences: rows.length, groups, replay,
    groupsWithTextVariation: groups.filter(group => group.transcriptVariants > 1).length,
    withinConfigurationTextFailureLocalized: groups.some(group => group.mode === 'deferred' && group.allAccepted && group.transcriptVariants > 1 && group.firstChangedStage !== null),
    allObservedTextRepeatsMatch: groups.every(group => group.observedTextRepeatsMatch),
    causeEstablished: false, fixValidated: false, readyForPromotion: false,
    scope: 'Known seen clips, fixed repeats, no tuning or accuracy test. Profiling changes timing/lifetimes. Decoder replays use retained inputs after the original inference; model/process history may differ. Negative captures do not erase historical plain/HTTP failures.' };
}
