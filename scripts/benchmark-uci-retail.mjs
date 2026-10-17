import { readFileSync, writeFileSync, mkdirSync, copyFileSync, createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { train, validateArtifact, validateDataset, hash, ensure } from '../server/ml/forecast-model.mjs';
import { evaluateUciExternal, summarizeUci, UCI_METHODS } from './uci-evaluation.mjs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const writeNew = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2)+'\n', { flag: 'wx' });
const protocolPath = 'benchmarks/uci-online-retail/protocol.json', protocol = read(protocolPath);
const manifest = read('datasets/public/uci-online-retail/processed/index.json');
const lock = read('benchmarks/uci-online-retail/source-lock.json');
ensure(JSON.stringify(protocol) === JSON.stringify(manifest.protocol) && JSON.stringify(lock) === JSON.stringify(manifest.sourceLock), 'Protokol/lock berbeda dari preparasi.');
const preparation = path.resolve(manifest.preparationDirectory);
ensure(preparation.startsWith(path.resolve('datasets/public/uci-online-retail/processed')+path.sep), 'Direktori preparasi tidak valid.');
ensure(manifest.series.length > 0 && new Set(manifest.series.map(s => s.key)).size === manifest.series.length, 'Seri kosong/duplikat.');
for (const [filename, expected] of [['Online Retail.xlsx', lock.files.workbookSha256], ['online-retail.zip', lock.files.archiveSha256]]) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path.join('datasets/public/uci-online-retail/raw', filename))) digest.update(chunk);
  ensure(digest.digest('hex') === expected, 'Checksum sumber berubah: '+filename);
}
const runId = new Date().toISOString().replace(/[:.]/g, '-')+'-'+randomUUID().slice(0, 8);
const directory = path.resolve('models/benchmarks/uci-online-retail', runId);
mkdirSync(path.dirname(directory), { recursive: true }); mkdirSync(directory); mkdirSync(path.join(directory, 'series'));
copyFileSync(protocolPath, path.join(directory, 'protocol.json'));
writeNew(path.join(directory, 'source-lock.json'), lock);
writeNew(path.join(directory, 'preparation-manifest.json'), manifest);
const sources = [protocolPath, 'server/ml/forecast-model.mjs', 'scripts/benchmark-uci-retail.mjs', 'scripts/uci-evaluation.mjs', 'scripts/uci_retail.py', 'scripts/fetch-uci-retail.py'];
writeNew(path.join(directory, 'frozen-configuration.json'), { frozenAt: new Date().toISOString(), protocolHash: hash(protocol),
  sourceSha256: Object.fromEntries(sources.map(file => [file, hash(readFileSync(file, 'utf8'))])),
  selectedCountries: manifest.series.map(s => s.country), policy: 'Existing Ridge candidates only. Fit all countries before opening external target files. No fitting or selection on external targets.' });
const prepared = [], failures = [];
for (const entry of manifest.series) {
  try {
    ensure(/^[a-f0-9]{20}$/.test(entry.key) && entry.trainFile === entry.key+'.train.json' && entry.externalFile === entry.key+'.external.json', 'Nama file preparasi tidak valid.');
    const raw = readFileSync(path.join(preparation, entry.trainFile), 'utf8');
    ensure(hash(raw) === entry.trainSha256, 'Checksum development berubah.');
    const data = validateDataset(JSON.parse(raw));
    ensure(JSON.stringify(data.scope) === JSON.stringify(entry.scope) && data.provenance.rawSha256 === lock.files.workbookSha256 &&
      data.provenance.sourceRevisionType === 'workbook_content_sha1_not_git' && data.provenance.sourceRevision === lock.files.workbookContentSha1 &&
      data.provenance.normalization.scale === entry.scale && data.observations.length === 334 && data.observations[0].date === protocol.calendar.from && data.observations.at(-1).date === protocol.calendar.developmentThrough,
      'Provenance, normalisasi atau tanggal development berubah.');
    ensure(Math.abs(data.observations.slice(0, 84).reduce((s, r) => s+r.quantity, 0)/84-1) < 1e-10, 'Normalisasi tidak cocok dengan awal development.');
    const artifact = validateArtifact(train(data));
    const filename = entry.key+'.model.json', saved = JSON.stringify(artifact, null, 2)+'\n';
    writeFileSync(path.join(directory, 'series', filename), saved, { flag: 'wx' });
    prepared.push({ entry, data, artifact, filename, artifactSha256: hash(saved) });
    console.log('Trained and frozen: '+entry.country);
  } catch (error) { failures.push({ country: entry.country, error: error.message }); }
}
writeNew(path.join(directory, 'training-state.json'), { completedAt: new Date().toISOString(), trained: prepared.length, failures, externalScoresRead: false });
ensure(failures.length === 0 && prepared.length === manifest.series.length, 'Pelatihan gagal; tidak membuang negara lalu melanjutkan scoring.');
const series = [], allRows = [];
for (const { entry, data, artifact, filename, artifactSha256 } of prepared) {
  const raw = readFileSync(path.join(preparation, entry.externalFile), 'utf8');
  ensure(hash(raw) === entry.externalSha256, 'Checksum eksternal berubah.');
  const external = JSON.parse(raw), rows = evaluateUciExternal(artifact, data.observations, external, entry.scale, entry.country);
  allRows.push(...rows);
  series.push({ country: entry.country, key: entry.key, scope: entry.scope, scale: entry.scale, datasetHash: artifact.datasetHash,
    artifact: path.relative(process.cwd(), path.join(directory, 'series', filename)).replaceAll('\\', '/'), artifactSha256,
    training: artifact.training, selection: artifact.evaluation.selection, internalQualified: artifact.evaluation.qualified,
    internalMetrics: artifact.evaluation.test, externalMetrics: summarizeUci(rows), externalRawUnitMetrics: summarizeUci(rows, true),
    externalEmptyEventDates: external.filter(r => r.sourceEventRows === 0).length,
    externalBeatsBoth: summarizeUci(rows).ridge.mae < Math.min(summarizeUci(rows).naive.mae, summarizeUci(rows).moving_average_7.mae) });
}
const macro = Object.fromEntries(UCI_METHODS.map(method => {
  const valid = series.map(s => s.externalMetrics[method].wape).filter(v => v !== null);
  return [method, { meanCountryWape: valid.length ? valid.reduce((a, b) => a+b, 0)/valid.length : null, definedCountries: valid.length, undefinedCountries: series.length-valid.length }];
}));
const totals = allRows.reduce((sum, r) => sum+r.rawActual, 0);
const ukTotal = allRows.filter(r => r.country === 'United Kingdom').reduce((sum, r) => sum+r.rawActual, 0);
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), protocolVersion: protocol.protocolVersion, runId,
  directory: path.relative(process.cwd(), directory).replaceAll('\\', '/'), protocolHash: hash(protocol), source: { ...protocol.source, sourceLock: lock },
  preparationDirectory: manifest.preparationDirectory, accounting: manifest.accounting,
  data: { selectedCountries: series.length, developmentDaysPerSeries: 334, externalDaysPerSeries: 38,
    developmentEmptyEventDates: manifest.series.reduce((s, e) => s+e.developmentEmptyEventDates, 0),
    externalEmptyEventDates: series.reduce((s, e) => s+e.externalEmptyEventDates, 0), generatedTransactions: 0,
    zeroPolicy: protocol.aggregation, scope: 'Country aggregate from one retailer, not independent stores.', normalization: protocol.normalization },
  run: { trainedModels: series.length, failures, allModelsSavedBeforeExternalScoring: true, automaticActivation: false },
  external: { targets: allRows.length, metrics: summarizeUci(allRows), rawUnitMetrics: summarizeUci(allRows, true), macroCountry: macro,
    seriesBeatingBoth: series.filter(s => s.externalBeatsBoth).length, ukShareOfRawTarget: totals ? ukTotal/totals : null,
    byOrigin: Object.fromEntries([...new Set(allRows.map(r => r.date))].map(date => [date, summarizeUci(allRows.filter(r => r.date === date))])) },
  series, limitations: [protocol.restrictions, 'The method was retrained in the new domain; this does not test fixed FreshRetailNet weights.',
    'Gross positive published invoice units omit returns/cancellation reconciliation and latent demand. Aggregate zero means no matching published event, not proof of no real demand.',
    'No known stockout, weather, holiday or customer features. No personal customer identifiers copied to derived files.',
    'Raw-unit pooled errors can be dominated by the UK; normalized and equal-country summaries are also reported.',
    'Observed earlier holdout days enter later lags; no full-period recursive forecast or refitting after the external score.'] };
writeNew(path.join(directory, 'report.json'), report);
writeNew(path.join(directory, 'predictions.json'), allRows);
const fields = ['country','date','targetThrough','actual','rawActual','scale','sourceEventRows','emptyEventDates',...UCI_METHODS];
const csvCell = value => '"'+String(value).replaceAll('"', '""')+'"';
writeFileSync(path.join(directory, 'predictions.csv'), [fields.join(','), ...allRows.map(r => fields.map(k => csvCell(r[k])).join(','))].join('\n')+'\n', { flag: 'wx' });
mkdirSync('docs/evaluation', { recursive: true });
writeFileSync('docs/evaluation/uci-retail-results.json', JSON.stringify(report, null, 2)+'\n');
writeFileSync('models/benchmarks/uci-online-retail/latest.json', JSON.stringify({ runId, directory: report.directory }, null, 2)+'\n');
const pct = n => n === null ? 'null' : (n*100).toFixed(2)+'%';
const table = (entries, rawUnits = false) => Object.entries(entries).map(([method, m]) => `| ${method} | ${m.mae?.toFixed(6)} | ${pct(m.wape)} |`).join('\n');
const improvement = report.external.metrics.moving_average_7.mae ? (1-report.external.metrics.ridge.mae/report.external.metrics.moving_average_7.mae)*100 : null;
const markdown = `# Replikasi Ridge — UCI Online Retail\n\n${series.length} model dilatih dari ${series.length*334} agregat harian development. Test eksternal: **${allRows.length} target dua hari**, 1 November–8 Desember 2011. Algoritme Ridge yang sama dilatih ulang; ini bukan transfer bobot boosting FreshRetailNet.\n\n| Metode | MAE normalized sales / 2 hari | WAPE |\n|---|---:|---:|\n${table(report.external.metrics)}\n\nPerubahan MAE Ridge terhadap MA7 pada test yang sama: ${improvement?.toFixed(2)}% (positif berarti galat berkurang). Menang dari naive dan MA7: ${report.external.seriesBeatingBoth}/${series.length} negara. Seluruh negara terpilih disimpan, termasuk yang kalah; kegagalan pipeline ${failures.length}.\n\n## Setelah dikembalikan ke satuan invoice\n\n| Metode | MAE gross invoice units / 2 hari | WAPE |\n|---|---:|---:|\n${table(report.external.rawUnitMetrics)}\n\nPorsi Inggris terhadap total target raw: ${pct(report.external.ukShareOfRawTarget)}. Laporan JSON juga memuat rata-rata WAPE per negara dan nilai undefined, agar dominasi volume tidak tersembunyi.\n\n## Transformasi dan batas\n\nTarget adalah jumlah Quantity positif dari baris invoice terpublikasi yang lolos filter protokol, dikelompokkan per negara/tanggal. Tanggal tanpa event yang cocok menghasilkan jumlah kosong nol menurut definisi agregasi; bukan transaksi buatan atau imputasi permintaan yang tidak diketahui. Jumlah tanggal agregat kosong: development ${report.data.developmentEmptyEventDates}, eksternal ${report.data.externalEmptyEventDates}. Normalisasi hanya memakai 84 tanggal development pertama.\n\nTidak ada penambahan stok/transaksi akun atau aktivasi model publik. Bukan pilot Indonesia, kebutuhan bahan, pemulihan lost sales, atau bukti boosting v2 menggeneralisasi. Negara berasal dari satu peritel dan berbagi kondisi kalender; ini bukan banyak usaha independen. Angka lintas dataset tidak dibandingkan langsung. Hasil test kini sudah diketahui; pengulangan hanya reproduksi.\n\nSumber: [Chen (2015), UCI Online Retail](${protocol.source.url}), DOI ${protocol.source.doi}, CC BY 4.0. Hash XLSX ${lock.files.workbookSha256} dipatok secara lokal sebelum parsing; bukan checksum yang diterbitkan UCI.\n\n[Protokol](../../benchmarks/uci-online-retail/protocol.json), [hasil lengkap](uci-retail-results.json). Artefak dan seluruh prediksi: \`${report.directory}\`.\n`;
writeFileSync('docs/evaluation/UCI_RETAIL_RESULTS.md', markdown);
console.log(JSON.stringify({ directory: report.directory, trainedModels: series.length, targets: allRows.length, primary: report.external.metrics, rawUnits: report.external.rawUnitMetrics, improvementVsMA7Percent: improvement }, null, 2));
