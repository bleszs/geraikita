"""Frozen v2 benchmark: pooled boosting, unseen stores, public records only."""
import os
os.environ['OMP_NUM_THREADS'] = '2'
os.environ['OPENBLAS_NUM_THREADS'] = '2'
os.environ['MKL_NUM_THREADS'] = '2'

import csv
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import platform
import uuid
import duckdb
import joblib
import numpy as np
import sklearn
from sklearn.ensemble import HistGradientBoostingRegressor
from threadpoolctl import threadpool_limits
from pooled_forecast import select_holdout, make_rows, predictions, score, feature_names

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'datasets/public/freshretailnet/raw'
PROTOCOL_PATH = ROOT / 'benchmarks/freshretailnet/protocol-v2.json'


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def key_text(key):
    return ':'.join(map(str, key))


def read_series(db, keys, include_eval=False):
    db.execute('DROP TABLE IF EXISTS selected')
    db.execute('CREATE TEMP TABLE selected(city_id BIGINT,store_id BIGINT,product_id BIGINT)')
    db.executemany('INSERT INTO selected VALUES(?,?,?)', keys)
    groups = {key_text(k): [] for k in keys}
    for view, expected in [('training', 90)] + ([('evaluation', 97)] if include_eval else []):
        records = db.execute(f'SELECT d.* FROM {view} d JOIN selected s USING(city_id,store_id,product_id) ORDER BY city_id,store_id,product_id,dt').fetchall()
        for city, store, product, date, sale, stockout in records:
            if not math.isfinite(sale) or sale < 0 or not math.isfinite(stockout) or not 0 <= stockout <= 17:
                raise ValueError('Invalid observed record; no replacement or imputation.')
            groups[key_text((city, store, product))].append({'date': str(date), 'quantity': sale, 'stockoutHours': stockout})
        for key, series in groups.items():
            if len(series) != expected:
                raise ValueError(f'{key}: expected {expected} dates, got {len(series)}; no silent exclusion.')
            for i, row in enumerate(series):
                date = dt.date.fromisoformat(row['date'])
                if i and date != dt.date.fromisoformat(series[i-1]['date']) + dt.timedelta(days=1):
                    raise ValueError(f'{key}: missing/duplicate date; no imputation.')
            if series[0]['date'] != '2024-03-28' or series[-1]['date'] != ('2024-07-02' if expected == 97 else '2024-06-25'):
                raise ValueError('Unexpected publisher date range.')
    return groups


def fit(rows, leaves, fitting):
    model = HistGradientBoostingRegressor(
        loss=fitting['loss'], learning_rate=fitting['learning_rate'],
        max_iter=fitting['max_iter'], min_samples_leaf=fitting['min_samples_leaf'],
        l2_regularization=fitting['l2_regularization'], max_leaf_nodes=leaves,
        random_state=fitting['random_state'], early_stopping=fitting['early_stopping'])
    model.fit(np.array([r['x'] for r in rows]), np.array([r['residual'] for r in rows]),
              sample_weight=np.array([r['scale'] for r in rows]))
    return model


def summarize(rows):
    methods = ['pooled', 'naive', 'ma7', 'ma14', 'weekly']
    actual = [r['actual'] for r in rows]
    return {name: score(actual, [r[name] for r in rows]) for name in methods}


def main():
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding='utf-8'))
    original = json.loads((ROOT / protocol['sourceProtocol']).read_text(encoding='utf-8'))
    manifest_path = ROOT / 'datasets/public/freshretailnet/processed/index.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest['protocol'] != original or original['revision'] != protocol['datasetRevision'] or len(manifest['series']) != 500:
        raise ValueError('Development dataset/protocol mismatch.')
    for name, metadata in original['files'].items():
        if sha(RAW / name) != metadata['sha256'] or (RAW / name).stat().st_size != metadata['bytes']:
            raise ValueError('Raw input checksum mismatch: ' + name)
    db = duckdb.connect()
    db.execute('SET threads=2')
    columns = 'city_id,store_id,product_id,dt,sale_amount,stock_hour6_22_cnt'
    db.read_parquet(str(RAW / 'train.parquet')).project(columns).create_view('training')
    db.read_parquet(str(RAW / 'eval.parquet')).project(columns).create_view('evaluation')
    keys = db.execute('SELECT DISTINCT city_id,store_id,product_id FROM training').fetchall()
    development_keys = [tuple(e['key']) for e in manifest['series']]
    excluded = {key[:2] for key in development_keys}
    if len(excluded) != 355 or len(set(development_keys)) != 500:
        raise ValueError('Unexpected development store groups.')
    selected = select_holdout(keys, excluded, protocol['selection']['holdoutStores'])
    run_id = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ') + '-' + uuid.uuid4().hex[:8]
    run = ROOT / 'models/benchmarks/freshretailnet-v2' / run_id
    run.mkdir(parents=True, exist_ok=False)
    write_json(run / 'protocol.json', protocol)
    write_json(run / 'selection.json', {'developmentKeys': development_keys, 'excludedStores': sorted(excluded), 'holdoutKeys': selected})
    write_json(run / 'state.json', {'stage': 'selection_frozen_before_training', 'createdAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'protocolSha256': sha(PROTOCOL_PATH)})
    print('Frozen selection: 500 development series, 200 unseen stores. Run ' + run_id, flush=True)

    development = read_series(db, development_keys)
    for entry in manifest['series']:
        if development[key_text(entry['key'])] != entry['trainStockouts']:
            raise ValueError('Development manifest differs from raw publisher records.')
    candidates = []
    fitting = protocol['fitting']
    for variant in fitting['variants']:
        train_rows = make_rows(development, variant, range(14, 76, 2))
        val_rows = make_rows(development, variant, range(76, 90, 2))
        for leaves in fitting['max_leaf_nodes']:
            model = fit(train_rows, leaves, fitting)
            for weight in fitting['residualWeights']:
                metrics = score([r['actual'] for r in val_rows], predictions(model, val_rows, weight))
                candidates.append({'variant': variant, 'maxLeafNodes': leaves, 'residualWeight': weight, **metrics})
            print(f'Validation complete: {variant}, {leaves} leaves', flush=True)
    # Fixed deterministic tie-break: less correction, fewer leaves, no calendar.
    chosen = min(candidates, key=lambda c: (c['mae'], c['residualWeight'], c['maxLeafNodes'], c['variant'] != 'lags'))
    write_json(run / 'validation.json', {'candidates': candidates, 'chosen': chosen, 'trainTargets': len(train_rows), 'validationTargets': len(val_rows), 'selectionMetric': 'MAE only; test targets not loaded'})
    write_json(run / 'state.json', {'stage': 'configuration_frozen_before_holdout_labels', 'chosen': chosen, 'frozenAt': dt.datetime.now(dt.timezone.utc).isoformat()})
    print('Chosen using validation only: ' + json.dumps(chosen), flush=True)
    all_rows = make_rows(development, chosen['variant'], range(14, 90, 2))
    model = fit(all_rows, chosen['maxLeafNodes'], fitting)
    artifact = run / 'pooled-model.joblib'
    joblib.dump(model, artifact, compress=3)
    metadata = {
        'modelKind': 'gerai-pooled-residual-hgb-two-day-v2', 'usage': 'public_benchmark_only',
        'source': {'url': original['sourceUrl'], 'license': original['license'], 'revision': original['revision'], 'files': original['files']},
        'protocolSha256': sha(PROTOCOL_PATH), 'selectionSha256': sha(run / 'selection.json'), 'developmentManifestSha256': sha(manifest_path),
        'artifactSha256': sha(artifact), 'features': feature_names(chosen['variant']), 'selected': chosen,
        'fitting': fitting, 'developmentSeries': 500, 'developmentStores': len(excluded), 'trainingTargets': len(all_rows),
        'trainingThrough': '2024-06-25', 'unit': 'normalized_sales', 'horizonDays': 2,
        'inference': 'max(0, 2*mean_last_7 + residualWeight*max(mean_last_14,1e-6)*model.predict(features))',
        'environment': {'python': platform.python_version(), 'numpy': np.__version__, 'sklearn': sklearn.__version__, 'duckdb': duckdb.__version__, 'joblib': joblib.__version__},
    }
    write_json(run / 'model-metadata.json', metadata)
    # Holdout daily quantities are first read only after configuration and learned artifact are frozen.
    holdout = read_series(db, selected, include_eval=True)
    test = make_rows(holdout, chosen['variant'], [90, 92, 94])
    estimate = predictions(model, test, chosen['residualWeight'])
    loaded_estimate = predictions(joblib.load(artifact), test, chosen['residualWeight'])
    if not np.array_equal(estimate, loaded_estimate):
        raise ValueError('Saved model predictions differ after reload.')
    records = [{**{k: v for k, v in row.items() if k not in ['x', 'residual', 'scale', 'base']}, 'pooled': float(p), 'ma7': row['base']} for row, p in zip(test, estimate)]
    with (run / 'predictions.csv').open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)
    write_json(run / 'holdout-records.json', holdout)
    write_json(run / 'predictions.json', records)
    per_series = {key: summarize([r for r in records if r['key'] == key]) for key in holdout}
    metrics = summarize(records)
    report = {
        'schemaVersion': 1, 'protocolVersion': protocol['protocolVersion'], 'runId': run_id,
        'generatedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'artifactDirectory': run.relative_to(ROOT).as_posix(),
        'model': metadata, 'validation': {'chosen': chosen, 'candidates': candidates},
        'test': {'stores': len(selected), 'series': len(holdout), 'targets': len(records), 'origins': sorted({r['date'] for r in records}),
                 'targetThrough': '2024-07-01', 'unusedDate': '2024-07-02', 'failedOrExcludedSeries': [], 'metrics': metrics,
                 'stockoutStrata': {str(flag).lower(): summarize([r for r in records if r['stockoutAffected'] == flag]) for flag in [True, False]},
                 'byOrigin': {date: summarize([r for r in records if r['date'] == date]) for date in sorted({r['date'] for r in records})},
                 'perSeries': per_series, 'seriesBeatingMA7': sum(m['pooled']['mae'] < m['ma7']['mae'] for m in per_series.values())},
        'checks': {'storeOverlap': len(excluded & {k[:2] for k in selected}), 'savedModelReloadPredictionsIdentical': True, 'noUserDatabaseAccess': True,
                   'selectionFrozenBeforeTraining': True, 'configurationAndModelFrozenBeforeHoldoutLabels': True},
        'limitations': protocol['limitations'],
    }
    write_json(run / 'report.json', report)
    evaluation = ROOT / 'docs/evaluation'
    write_json(evaluation / 'freshretailnet-v2-results.json', report)
    write_json(run.parent / 'latest.json', {'runId': run_id, 'directory': run.relative_to(ROOT).as_posix(), 'modelSha256': sha(artifact)})
    baseline = metrics['ma7']['mae']
    improvement = 100 * (baseline - metrics['pooled']['mae']) / baseline
    table = '\n'.join(f"| {name} | {m['mae']:.6f} | {100*m['wape']:.2f}% |" for name, m in metrics.items())
    summary = f'''# FreshRetailNet v2: transfer ke toko baru

Run `{run_id}`. Model HistGradientBoostingRegressor dipelajari dari 500 seri / {len(excluded)} toko / {len(all_rows):,} target dua hari nyata. Model, parameter, 16 kandidat validasi, pemilihan toko dan seluruh prediksi tersimpan di `{run.relative_to(ROOT).as_posix()}`.

## Pengujian yang dibekukan

200 toko dipilih melalui hash ID, seluruhnya di luar toko pengembangan. Satu produk per toko; 600 target dua hari, 26 Juni–1 Juli 2024. Tidak ada seri gagal/dibuang. Pilihan konfigurasi dan bobot koreksi disimpan sebelum label holdout dibaca. Penjualan masa lalu dari toko holdout menjadi konteks inferensi, tidak dipakai melatih atau memilih model.

| Metode | MAE | WAPE |
|---|---:|---:|
{table}

Perubahan MAE terhadap MA7 pada **test yang sama**: {improvement:+.2f}% (positif berarti lebih kecil). Model menang terhadap MA7 pada {report['test']['seriesBeatingMA7']}/200 seri. Konfigurasi terpilih: `{chosen['variant']}`, {chosen['maxLeafNodes']} leaf, bobot residual {chosen['residualWeight']}. Bobot nol berarti keluaran identik MA7 dan bukan keberhasilan tambahan model.

## Batas klaim

{protocol['limitations']}

Target adalah penjualan teramati yang dinormalisasi, bukan kebutuhan bahan atau permintaan laten saat stockout. MAE/WAPE tidak menunjukkan kalibrasi interval. Nilai Ridge v1 menggunakan toko berbeda sehingga tidak menjadi pembanding langsung. Model publik tidak diaktifkan pada akun pengguna; Qwen tetap pretrained.

Sumber: [Dingdong-Inc/FreshRetailNet-50K](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K), CC BY 4.0, revisi `{original['revision']}`. [Protokol v2](../../benchmarks/freshretailnet/protocol-v2.json), [hasil lengkap](freshretailnet-v2-results.json).
'''
    (evaluation / 'FRESHRETAILNET_V2_RESULTS.md').write_text(summary, encoding='utf-8')
    print(json.dumps({'runId': run_id, 'metrics': metrics, 'relativeMAEImprovementVsMA7Percent': improvement, 'checks': report['checks']}), flush=True)


if __name__ == '__main__':
    with threadpool_limits(limits=2):
        main()
