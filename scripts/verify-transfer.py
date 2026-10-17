"""Repeat frozen source fit and regenerate target aggregates, with no retuning."""
import os
os.environ['OMP_NUM_THREADS'] = '2'
os.environ['OPENBLAS_NUM_THREADS'] = '2'
os.environ['MKL_NUM_THREADS'] = '2'
import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path
import joblib
import numpy as np
from threadpoolctl import threadpool_limits
from sales_features import make_rows
from pooled_forecast import predictions

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('transfer_benchmark', ROOT / 'scripts/benchmark-transfer.py')
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


def learned_inference_state(model):
    # Compare meaningful learned values field-by-field. Hashing the whole pickle
    # also hashes padding bytes in structured node arrays, which are not learned
    # parameters and need not be deterministic after refitting/deserialization.
    array = lambda value: {'dtype': value.dtype.str, 'shape': list(value.shape), 'values': value.tolist()}
    trees = []
    for iteration in model._predictors:
        trees.append([{'nodes': {name: array(tree.nodes[name]) for name in tree.nodes.dtype.names},
                       'binnedLeftCategories': array(tree.binned_left_cat_bitsets),
                       'rawLeftCategories': array(tree.raw_left_cat_bitsets)} for tree in iteration])
    mapper = model._bin_mapper
    return {'parameters': model.get_params(deep=False), 'features': int(model.n_features_in_),
            'baseline': array(model._baseline_prediction), 'trees': trees,
            'thresholds': [array(values) for values in mapper.bin_thresholds_],
            'nonMissingBins': array(mapper.n_bins_non_missing_), 'missingBinIndex': int(mapper.missing_values_bin_idx_),
            'categoricalFlags': array(mapper.is_categorical_)}


def main():
    pointer = benchmark.read_json(ROOT / 'models/benchmarks/boosting-transfer/latest.json')
    directory = (ROOT / pointer['directory']).resolve()
    if not directory.is_relative_to((ROOT / 'models/benchmarks/boosting-transfer').resolve()):
        raise ValueError('Run outside transfer benchmark directory.')
    report = benchmark.read_json(directory / 'report.json')
    protocol = benchmark.read_json(directory / 'protocol.json')
    frozen = benchmark.read_json(directory / 'frozen-configuration.json')
    for source, expected in frozen['sourceSha256'].items():
        if benchmark.sha(ROOT / source) != expected:
            raise ValueError('Frozen source/protocol changed: '+source)
    if protocol != benchmark.read_json(benchmark.PROTOCOL_PATH):
        raise ValueError('Protocol archive mismatch.')
    metadata = report['model']
    artifact = directory / 'sales-only-model.joblib'
    if benchmark.sha(artifact) != metadata['artifactSha256']:
        raise ValueError('Artifact checksum mismatch.')
    development = benchmark.load_source(protocol)
    selected = metadata['selected']
    fitting_rows = make_rows(development, selected['variant'], range(14, 90, 2))
    refit = benchmark.source_benchmark.fit(fitting_rows, selected['maxLeafNodes'], protocol['fitting'])
    # Regenerate from the original locked workbook, not saved target predictions.
    groups, selection = benchmark.load_targets(protocol)
    if groups != benchmark.read_json(directory / 'target-records.json') or selection != benchmark.read_json(directory / 'target-selection.json'):
        raise ValueError('Target aggregation/selection differs from original workbook.')
    restored = joblib.load(artifact)
    state_hash = lambda model: hashlib.sha256(json.dumps(learned_inference_state(model), sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    refit_state_hash, restored_state_hash = state_hash(refit), state_hash(restored)
    if refit_state_hash != restored_state_hash:
        raise ValueError('Learned estimator state differs after source-only refit.')
    saved = benchmark.evaluate(restored, selected, groups)
    again = benchmark.evaluate(refit, selected, groups)
    if saved != again or saved != benchmark.read_json(directory / 'predictions.json'):
        raise ValueError('Refit/reloaded/saved predictions differ.')
    if benchmark.target_summary(saved, groups) != report['external']:
        raise ValueError('Recomputed macro/pooled/per-country metrics differ.')
    if set(groups) & set(protocol['target']['excludedPreviouslyScoredCountries']):
        raise ValueError('Previously scored groups included in new test.')
    # Verify tree predictions also match before nonnegative clamping/blending.
    test = make_rows(groups, selected['variant'], range(334, 372, 2))
    x = np.array([r['x'] for r in test])
    if not np.array_equal(refit.predict(x), restored.predict(x)):
        raise ValueError('Underlying learned corrections differ after refit.')
    result = {'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'runId': report['runId'], 'passed': True,
              'sourceChecksumsVerified': True, 'targetAggregatesRecomputedFromWorkbook': True,
              'targetCountries': len(groups), 'previouslyScoredGroupOverlap': 0,
              'sourceOnlyRefitCorrectionsIdentical': True, 'sourceOnlyRefitLearnedInferenceStateIdentical': True,
              'learnedInferenceStateSha256': restored_state_hash, 'identicalExternalPredictions': len(saved), 'allReportedMetricsRecomputed': True,
              'targetFittingPerformed': False, 'note': 'Same-test reproducibility only; poor transfer results preserved, no parameter search or retuning.'}
    benchmark.write_json(ROOT / 'docs/evaluation/boosting-transfer-reproducibility.json', result)
    print(result, flush=True)


if __name__ == '__main__':
    with threadpool_limits(limits=2):
        main()
