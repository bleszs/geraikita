"""Isolated contracts for source-only, sales-only domain transfer."""
import os
os.environ['OMP_NUM_THREADS'] = '2'
import copy
import datetime as dt
import importlib.util
import json
from pathlib import Path
import sys
import unittest
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from sales_features import features, feature_names, make_rows, select_target_groups, METHODS
from pooled_forecast import predictions
from uci_retail import select_countries, calendar_dates
spec = importlib.util.spec_from_file_location('transfer_benchmark', ROOT / 'scripts/benchmark-transfer.py')
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


def records():
    return [{'date': str(dt.date(2011, 1, 1)+dt.timedelta(days=i)), 'quantity': float(i%7+1)} for i in range(60)]


class BoostingTransferTests(unittest.TestCase):
    def test_future_quantities_and_stockout_fields_do_not_enter_features(self):
        original = records()
        changed = copy.deepcopy(original)
        for row in changed:
            row['stockoutHours'] = 'not observed'
        for row in changed[28:]:
            row['quantity'] = None
        for variant in ['lags', 'calendar']:
            before, scale, base = features(original, 28, variant)
            after, scale2, base2 = features(changed, 28, variant)
            np.testing.assert_array_equal(before, after)
            self.assertEqual((scale, base), (scale2, base2))

    def test_features_and_prediction_are_scale_equivariant_above_floor(self):
        original = records()
        changed = [{**row, 'quantity': row['quantity']*1000} for row in original]
        class FixedModel:
            def predict(self, x):
                return np.full(len(x), .25)
        for variant in ['lags', 'calendar']:
            first, scale, base = features(original, 28, variant)
            second, scale2, base2 = features(changed, 28, variant)
            np.testing.assert_allclose(first, second, rtol=1e-12, atol=1e-12)
            self.assertAlmostEqual(scale2, scale*1000)
            self.assertAlmostEqual(base2, base*1000)
            a = predictions(FixedModel(), make_rows({'a': original}, variant, [28]), 1)
            b = predictions(FixedModel(), make_rows({'a': changed}, variant, [28]), 1)
            np.testing.assert_allclose(b, a*1000)

    def test_feature_contract_has_no_absolute_level_or_stockout_requirement(self):
        self.assertEqual(len(feature_names('lags')), 21)
        self.assertEqual(len(feature_names('calendar')), 24)
        self.assertFalse(any('stockout' in key or 'log_scale' in key for key in feature_names('calendar')))
        zero = [{**row, 'quantity': 0} for row in records()]
        x, scale, base = features(zero, 28, 'calendar')
        self.assertTrue(np.all(np.isfinite(x)))
        self.assertEqual((scale, base), (1e-6, 0))

    def test_context_gaps_invalid_quantities_and_missing_targets_fail(self):
        for edit in [lambda rows: rows[20].update(date='2011-01-20'), lambda rows: rows[20].update(quantity=-1), lambda rows: rows[20].update(quantity=float('nan'))]:
            changed = records()
            edit(changed)
            with self.assertRaises(ValueError):
                features(changed, 28, 'lags')
        with self.assertRaises(ValueError):
            make_rows({'a': records()}, 'lags', [59])

    def test_two_day_targets_and_baselines_use_only_preceding_context(self):
        observed = records()
        rows = make_rows({'a': observed}, 'calendar', [28, 30, 32])
        self.assertEqual(rows[0]['actual'], observed[28]['quantity']+observed[29]['quantity'])
        self.assertEqual(rows[0]['weekly'], observed[21]['quantity']+observed[22]['quantity'])
        self.assertLess(rows[0]['targetThrough'], rows[1]['date'])
        changed = copy.deepcopy(observed)
        changed[28]['quantity'] = 999
        after = make_rows({'a': changed}, 'calendar', [28])[0]
        np.testing.assert_array_equal(rows[0]['x'], after['x'])
        self.assertEqual(rows[0]['ma7'], after['ma7'])
        self.assertNotEqual(rows[0]['actual'], after['actual'])

    def test_group_selection_is_context_only_and_excludes_all_known_scored_groups(self):
        protocol = json.loads((ROOT / 'benchmarks/uci-online-retail/protocol.json').read_text())
        protocol['selection']['minimumActiveDates'] = 20
        dates = calendar_dates(protocol['calendar']['from'], protocol['calendar']['developmentThrough'])
        quantities = {(country, date): 100 for country in ['New contract group', 'United Kingdom'] for date in dates[:25]}
        _, eligibility = select_countries(quantities, protocol)
        before = select_target_groups(eligibility, ['United Kingdom'])
        for date in calendar_dates('2011-11-01', '2011-12-08'):
            quantities[('New contract group', date)] = 999999
        _, after_eligibility = select_countries(quantities, protocol)
        self.assertEqual(before, select_target_groups(list(reversed(after_eligibility)), ['United Kingdom']))
        self.assertEqual([row['country'] for row in before], ['New contract group'])
        with self.assertRaises(ValueError):
            select_target_groups(eligibility, ['United Kingdom', 'New contract group'])

    def test_zero_target_countries_stay_in_pooled_metrics_and_are_counted_undefined_in_macro(self):
        rows = [{'key': country, 'date': '2011-11-01', 'actual': actual, **{method: 1. for method in METHODS}} for country, actual in [('a', 0.), ('b', 2.)]]
        result = benchmark.target_summary(rows, {'a': [], 'b': []})
        self.assertEqual(result['primaryMacroCountry']['boosting']['undefinedCountries'], 1)
        self.assertEqual(result['primaryMacroCountry']['boosting']['definedCountries'], 1)
        self.assertEqual(result['pooledRawUnitMetrics']['boosting']['observations'], 2)
        self.assertEqual(result['pooledRawUnitMetrics']['boosting']['wape'], 1.)


if __name__ == '__main__':
    unittest.main()
