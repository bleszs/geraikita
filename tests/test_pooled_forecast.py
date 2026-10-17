"""Isolated mathematical fixtures only; never inserted into application data."""
import os
os.environ['OMP_NUM_THREADS'] = '2'
import copy
import datetime
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from threadpoolctl import threadpool_limits
from pooled_forecast import select_holdout, make_features, make_rows, feature_names, predictions, score


def fixture():
    start = datetime.date(2024, 1, 1)
    return [{'date': str(start + datetime.timedelta(days=i)), 'quantity': float(i % 7 + 1), 'stockoutHours': i % 3} for i in range(60)]


class PooledForecastTests(unittest.TestCase):
    def test_holdout_is_group_disjoint_and_order_independent(self):
        keys = [(city, store, product) for city in range(2) for store in range(8) for product in range(3)]
        excluded = {(0, 0), (1, 1)}
        selected = select_holdout(keys, excluded, 10)
        self.assertEqual(selected, select_holdout(list(reversed(keys)), excluded, 10))
        self.assertEqual(len({k[:2] for k in selected}), 10)
        self.assertFalse({k[:2] for k in selected} & excluded)
        self.assertTrue(set(selected).issubset(keys))
        with self.assertRaises(ValueError):
            select_holdout(keys, excluded, 15)

    def test_future_quantities_stockouts_never_enter_features(self):
        records = fixture()
        changed = copy.deepcopy(records)
        for r in changed[28:]:
            r.update(quantity=100000, stockoutHours=17)
        for variant in ['lags', 'calendar']:
            a, scale, base = make_features(records, 28, variant)
            b, scale2, base2 = make_features(changed, 28, variant)
            np.testing.assert_array_equal(a, b)
            self.assertEqual((scale, base), (scale2, base2))
            self.assertEqual(len(a), len(feature_names(variant)))
        self.assertNotEqual(make_rows({'a': records}, 'lags', [28])[0]['actual'], make_rows({'a': changed}, 'lags', [28])[0]['actual'])

    def test_past_stockout_only_and_calendar_known_in_advance(self):
        records = fixture()
        x, _, _ = make_features(records, 28, 'calendar')
        self.assertAlmostEqual(x[22], sum(r['stockoutHours'] > 0 for r in records[21:28])/7)
        self.assertEqual(x[-1], 0)  # Monday + Tuesday.
        records[27]['stockoutHours'] = 0
        y, _, _ = make_features(records, 28, 'calendar')
        self.assertTrue(np.array_equal(x[:22], y[:22]))

    def test_zero_history_and_zero_denominator_are_explicit(self):
        records = fixture()
        for r in records:
            r['quantity'] = 0
        x, scale, base = make_features(records, 28, 'lags')
        self.assertTrue(np.all(np.isfinite(x)))
        self.assertEqual(scale, 1e-6)
        self.assertEqual(base, 0)
        self.assertEqual(score([0, 0], [0, 0]), {'mae': 0.0, 'wape': None, 'observations': 2})
        self.assertEqual(score([], [])['mae'], None)

    def test_invalid_records_and_scores_fail(self):
        records = fixture()
        records[25]['quantity'] = float('nan')
        with self.assertRaises(ValueError):
            make_features(records, 28, 'lags')
        with self.assertRaises(ValueError):
            make_rows({'a': fixture()}, 'lags', [59])
        with self.assertRaises(ValueError):
            make_features(fixture(), 13, 'lags')
        for a, p in [([1], [1, 2]), ([1], [float('nan')]), ([-1], [1])]:
            with self.assertRaises(ValueError):
                score(a, p)

    def test_baselines_labels_and_weight_zero(self):
        records = fixture()
        rows = make_rows({'a': records}, 'lags', [28])
        row = rows[0]
        self.assertEqual(row['actual'], records[28]['quantity'] + records[29]['quantity'])
        self.assertEqual(row['weekly'], records[21]['quantity'] + records[22]['quantity'])
        class Stub:
            def predict(self, x):
                return np.full(len(x), -1000.)
        np.testing.assert_array_equal(predictions(Stub(), rows, 0), [row['base']])
        np.testing.assert_array_equal(predictions(Stub(), rows, 1), [0])

    def test_learned_model_reloads_with_exact_predictions(self):
        rows = make_rows({'a': fixture()}, 'calendar', range(14, 58, 2))
        x = np.array([r['x'] for r in rows])
        y = np.array([r['residual'] for r in rows])
        with threadpool_limits(limits=2):
            first = HistGradientBoostingRegressor(loss='absolute_error', max_iter=5, min_samples_leaf=2, random_state=26015, early_stopping=False).fit(x, y)
            second = HistGradientBoostingRegressor(loss='absolute_error', max_iter=5, min_samples_leaf=2, random_state=26015, early_stopping=False).fit(x, y)
            np.testing.assert_array_equal(first.predict(x), second.predict(x))
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / 'model.joblib'
                joblib.dump(first, path)
                np.testing.assert_array_equal(first.predict(x), joblib.load(path).predict(x))


if __name__ == '__main__':
    unittest.main()
