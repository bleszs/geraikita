import { readFileSync, writeFileSync, createReadStream } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { train, hash, validateArtifact } from '../server/ml/forecast-model.mjs';
import { evaluateUciExternal, summarizeUci } from './uci-evaluation.mjs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const pointer = read('models/benchmarks/uci-online-retail/latest.json');
const directory = path.resolve(pointer.directory);
assert.ok(directory.startsWith(path.resolve('models/benchmarks/uci-online-retail')+path.sep));
const report = read(path.join(directory, 'report.json'));
const manifest = read(path.join(directory, 'preparation-manifest.json'));
const currentManifest = read('datasets/public/uci-online-retail/processed/index.json');
assert.deepEqual(manifest.protocol, currentManifest.protocol);
assert.deepEqual(manifest.selection, currentManifest.selection);
assert.deepEqual(manifest.series, currentManifest.series); // Includes every regenerated train/external hash.
const configuration = read(path.join(directory, 'frozen-configuration.json'));
for (const [source, expected] of Object.entries(configuration.sourceSha256)) assert.equal(hash(readFileSync(source, 'utf8')), expected);
for (const [filename, expected] of [['Online Retail.xlsx', manifest.sourceLock.files.workbookSha256], ['online-retail.zip', manifest.sourceLock.files.archiveSha256]]) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path.join('datasets/public/uci-online-retail/raw', filename))) digest.update(chunk);
  assert.equal(digest.digest('hex'), expected);
}
const allRows = [];
for (const entry of manifest.series) {
  const matching = report.series.find(s => s.key === entry.key);
  const artifactRaw = readFileSync(matching.artifact, 'utf8');
  assert.equal(hash(artifactRaw), matching.artifactSha256);
  const artifact = validateArtifact(JSON.parse(artifactRaw));
  const dataRaw = readFileSync(path.join(currentManifest.preparationDirectory, entry.trainFile), 'utf8');
  const externalRaw = readFileSync(path.join(currentManifest.preparationDirectory, entry.externalFile), 'utf8');
  assert.equal(hash(dataRaw), entry.trainSha256); assert.equal(hash(externalRaw), entry.externalSha256);
  const data = JSON.parse(dataRaw), external = JSON.parse(externalRaw);
  const again = train(data);
  assert.equal(again.datasetHash, artifact.datasetHash);
  assert.deepEqual(again.model, artifact.model);
  assert.deepEqual(again.evaluation.selection, artifact.evaluation.selection);
  assert.deepEqual(again.evaluation.test, artifact.evaluation.test);
  const rows = evaluateUciExternal(artifact, data.observations, external, entry.scale, entry.country);
  assert.deepEqual(rows, evaluateUciExternal(again, data.observations, external, entry.scale, entry.country));
  allRows.push(...rows);
}
assert.deepEqual(allRows, read(path.join(directory, 'predictions.json')));
assert.deepEqual(summarizeUci(allRows), report.external.metrics);
assert.deepEqual(summarizeUci(allRows, true), report.external.rawUnitMetrics);
const result = { checkedAt: new Date().toISOString(), runId: report.runId, passed: true,
  inputContentChecksumsVerified: true, allPreparationFileHashesIdentical: true, selectionAndNormalizationIdentical: true,
  retrainedModelsWithIdenticalWeightsAndScalers: manifest.series.length, identicalExternalPredictions: allRows.length,
  normalizedAndRawMetricsRecomputed: true,
  note: 'Fixed-protocol repeat, not a new independent test. Re-run prepare:uci first to verify workbook aggregation as well.' };
writeFileSync('docs/evaluation/uci-retail-reproducibility.json', JSON.stringify(result, null, 2)+'\n');
console.log(JSON.stringify(result, null, 2));
