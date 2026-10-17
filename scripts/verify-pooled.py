"""Recompute records/metrics and refit the already-frozen configuration only."""
import os
os.environ['OMP_NUM_THREADS'] = '2'
os.environ['OPENBLAS_NUM_THREADS'] = '2'
os.environ['MKL_NUM_THREADS'] = '2'
import datetime
import json
from pathlib import Path
import duckdb
import joblib
import numpy as np
from threadpoolctl import threadpool_limits
from pooled_forecast import make_rows, select_holdout, predictions
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('benchmark_pooled', ROOT / 'scripts/benchmark-pooled.py')
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


def main():
    pointer = json.loads((ROOT / 'models/benchmarks/freshretailnet-v2/latest.json').read_text())
    run = (ROOT / pointer['directory']).resolve()
    if not run.is_relative_to((ROOT / 'models/benchmarks/freshretailnet-v2').resolve()):
        raise ValueError('Run outside benchmark directory.')
    report = json.loads((run / 'report.json').read_text())
    metadata = report['model']
    selection = json.loads((run / 'selection.json').read_text())
    protocol = json.loads((run / 'protocol.json').read_text())
    for path, expected in [(run / 'pooled-model.joblib', metadata['artifactSha256']), (benchmark.PROTOCOL_PATH, metadata['protocolSha256']), (run / 'selection.json', metadata['selectionSha256'])]:
        if benchmark.sha(path) != expected:
            raise ValueError('Artifact/protocol/selection checksum mismatch.')
    if protocol != json.loads(benchmark.PROTOCOL_PATH.read_text(encoding='utf-8')):
        raise ValueError('Archived protocol differs from the hashed source protocol.')
    db = duckdb.connect()
    db.execute('SET threads=2')
    columns = 'city_id,store_id,product_id,dt,sale_amount,stock_hour6_22_cnt'
    for filename, source in metadata['source']['files'].items():
        if benchmark.sha(benchmark.RAW / filename) != source['sha256']:
            raise ValueError('Source checksum mismatch.')
    db.read_parquet(str(benchmark.RAW / 'train.parquet')).project(columns).create_view('training')
    db.read_parquet(str(benchmark.RAW / 'eval.parquet')).project(columns).create_view('evaluation')
    excluded = {tuple(k) for k in selection['excludedStores']}
    keys = db.execute('SELECT DISTINCT city_id,store_id,product_id FROM training').fetchall()
    selected = select_holdout(keys, excluded, 200)
    if [list(k) for k in selected] != selection['holdoutKeys'] or excluded & {k[:2] for k in selected}:
        raise ValueError('Non-disjoint/non-reproducible holdout selection.')
    development = benchmark.read_series(db, [tuple(k) for k in selection['developmentKeys']])
    chosen = metadata['selected']
    model = benchmark.fit(make_rows(development, chosen['variant'], range(14, 90, 2)), chosen['maxLeafNodes'], protocol['fitting'])
    holdout = benchmark.read_series(db, selected, include_eval=True)
    if holdout != json.loads((run / 'holdout-records.json').read_text()):
        raise ValueError('Saved evaluation records differ from raw records.')
    rows = make_rows(holdout, chosen['variant'], [90, 92, 94])
    predicted = predictions(model, rows, chosen['residualWeight'])
    loaded = predictions(joblib.load(run / 'pooled-model.joblib'), rows, chosen['residualWeight'])
    saved = json.loads((run / 'predictions.json').read_text())
    if not np.array_equal(predicted, loaded) or not np.array_equal(predicted, [r['pooled'] for r in saved]):
        raise ValueError('Refit/reloaded/saved predictions differ.')
    recomputed = [{**{k: v for k, v in row.items() if k not in ['x', 'residual', 'scale', 'base']}, 'pooled': float(p), 'ma7': row['base']} for row, p in zip(rows, predicted)]
    if recomputed != saved or benchmark.summarize(recomputed) != report['test']['metrics']:
        raise ValueError('Saved labels, baselines, or aggregate metrics differ.')
    result = {'runId': pointer['runId'], 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'passed': True, 'refitConfigurationUnchanged': chosen, 'identicalPredictions': len(rows),
              'holdoutStores': len(selected), 'storeOverlap': 0, 'rawRecordsAndMetricsIdentical': True,
              'artifactChecksumVerified': True, 'note': 'Deterministic reproduction of the same test; not new independent evaluation.'}
    benchmark.write_json(ROOT / 'docs/evaluation/freshretailnet-v2-reproducibility.json', result)
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    with threadpool_limits(limits=2):
        main()
