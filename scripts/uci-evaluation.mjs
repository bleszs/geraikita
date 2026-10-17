import { addDays } from '../server/common.mjs';
import { ensure, predict, metrics, validateArtifact } from '../server/ml/forecast-model.mjs';

export const UCI_METHODS = ['ridge', 'naive', 'moving_average_7', 'moving_average_14', 'weekly'];
const average = values => values.reduce((sum, n) => sum+n, 0)/values.length;

export function evaluateUciExternal(artifact, development, external, scale, country) {
  validateArtifact(artifact);
  ensure(Number.isFinite(scale) && scale > 0, 'Skala awal harus positif.');
  ensure(development.length >= 84 && external.length === 38, 'Ukuran blok berbeda dari protokol UCI.');
  ensure(artifact.dataset.to === development.at(-1).date, 'Periode model berbeda dari development.');
  for (const [i, row] of external.entries()) {
    ensure(row.date === addDays(development.at(-1).date, i+1), 'Holdout harus tanggal berurutan setelah development.');
    ensure(Number.isSafeInteger(row.rawQuantity) && row.rawQuantity >= 0 && Number.isFinite(row.quantity) && row.quantity >= 0 &&
      Math.abs(row.quantity-row.rawQuantity/scale) < 1e-10 && Number.isSafeInteger(row.sourceEventRows) && row.sourceEventRows >= 0 &&
      (row.sourceEventRows === 0) === (row.rawQuantity === 0), 'Agregat holdout atau normalisasinya tidak valid.');
  }
  const history = development.map(r => r.quantity), rows = [];
  for (let i = 0; i < external.length; i += 2) {
    const past = [...history, ...external.slice(0, i).map(r => r.quantity)];
    const first = external[i], second = external[i+1];
    const predictions = { ridge: predict(artifact.model, past, first.date), naive: 2*past.at(-1),
      moving_average_7: 2*average(past.slice(-7)), moving_average_14: 2*average(past.slice(-14)), weekly: past.at(-7)+past.at(-6) };
    rows.push({ country, date: first.date, targetThrough: second.date, actual: first.quantity+second.quantity,
      rawActual: first.rawQuantity+second.rawQuantity, scale, sourceEventRows: first.sourceEventRows+second.sourceEventRows,
      emptyEventDates: Number(first.sourceEventRows === 0)+Number(second.sourceEventRows === 0), ...predictions });
  }
  return rows;
}

export function summarizeUci(rows, rawUnits = false) {
  const measured = rawUnits ? rows.map(r => ({ actual: r.rawActual, ...Object.fromEntries(UCI_METHODS.map(method => [method, r[method]*r.scale])) })) : rows;
  return Object.fromEntries(UCI_METHODS.map(method => [method, metrics(measured, method)]));
}
