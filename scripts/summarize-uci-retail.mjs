import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const pointer = read('models/benchmarks/uci-online-retail/latest.json');
const report = read(path.join(pointer.directory, 'report.json'));
const predictions = read(path.join(pointer.directory, 'predictions.json'));
const pct = value => value === null ? 'null' : (100*value).toFixed(2)+'%';
const table = report.series.map(s => `| ${s.country} | ${pct(s.externalMetrics.ridge.wape)} | ${pct(s.externalMetrics.moving_average_7.wape)} | ${pct(s.externalMetrics.weekly.wape)} |`).join('\n');
const worst = [...predictions].sort((a, b) => Math.abs(b.actual-b.ridge)-Math.abs(a.actual-a.ridge)).slice(0, 5);
const analysis = { runId: report.runId, generatedAt: new Date().toISOString(),
  normalizedRidgeVsMA7Improvement: 1-report.external.metrics.ridge.mae/report.external.metrics.moving_average_7.mae,
  rawRidgeVsWeeklyErrorIncrease: report.external.rawUnitMetrics.ridge.mae/report.external.rawUnitMetrics.weekly.mae-1,
  ukShareOfRawTarget: report.external.ukShareOfRawTarget,
  allCountriesBeatingMA7: report.series.every(s => s.externalMetrics.ridge.mae < s.externalMetrics.moving_average_7.mae),
  countriesWhereWeeklyBeatsRidge: report.series.filter(s => s.externalMetrics.weekly.mae < s.externalMetrics.ridge.mae).map(s => s.country),
  worstNormalizedTargets: worst.map(r => ({ country: r.country, date: r.date, targetThrough: r.targetThrough, actual: r.actual, ridge: r.ridge,
    ma7: r.moving_average_7, weekly: r.weekly, ridgeAbsoluteError: Math.abs(r.actual-r.ridge), sourceEventRows: r.sourceEventRows, emptyEventDates: r.emptyEventDates })) };
writeFileSync('docs/evaluation/uci-retail-error-analysis.json', JSON.stringify(analysis, null, 2)+'\n');
writeFileSync('docs/evaluation/UCI_RETAIL_ERROR_ANALYSIS.md', `# Analisis error replikasi UCI\n\nRun \`${report.runId}\`, protokol tetap tanpa tuning setelah test.\n\n| Negara | Ridge WAPE | MA7 WAPE | Pola mingguan WAPE |\n|---|---:|---:|---:|\n${table}\n\nRidge mengalahkan MA7 pada keempat negara. Namun baseline pola mingguan mengalahkan Ridge di Inggris, yang menyumbang **${pct(report.external.ukShareOfRawTarget)}** target unit asli. Akibatnya, WAPE raw-unit pooled Ridge **${pct(report.external.rawUnitMetrics.ridge.wape)}** kalah dari pola mingguan **${pct(report.external.rawUnitMetrics.weekly.wape)}**. Ringkasan ternormalisasi, raw dan per negara menjawab pembobotan yang berbeda; jangan hanya melaporkan metrik yang paling menguntungkan.\n\nWAPE ternormalisasi Ridge ${pct(report.external.metrics.ridge.wape)} masih menunjukkan galat yang besar. Model tidak mengalahkan setiap baseline untuk setiap cara agregasi dan belum menjadi rekomendasi operasional bagi akun pengguna. Empat negara dari satu peritel bukan empat usaha independen.\n\nLima target dengan galat Ridge ternormalisasi terbesar tersedia di [JSON analisis](uci-retail-error-analysis.json); semua target berada pada CSV/JSON run. Pemilihan kasus ini hanya untuk menjelaskan error, bukan memilih negara/model yang diaktifkan. Tidak ada penggantian sampel, penghapusan outlier atau training ulang berdasarkan test ini.\n\n[Hasil utama](UCI_RETAIL_RESULTS.md), [protokol](../../benchmarks/uci-online-retail/protocol.json), [reproduksi](uci-retail-reproducibility.json).\n`);
console.log(JSON.stringify({ runId: report.runId, analyzedCountries: report.series.length, ukShareOfRawTarget: report.external.ukShareOfRawTarget }));
