"""Pure feature/split helpers; never read user records or future observations."""
import datetime
import hashlib
import math
import numpy as np

def select_holdout(keys, excluded_stores, count=200):
    available = {}
    for key in keys:
        if key[:2] not in excluded_stores:
            available.setdefault(key[:2], []).append(key)
    ordered = sorted(available, key=lambda s: hashlib.sha256(('gerai-freshretailnet-v2:store:' + ':'.join(map(str, s))).encode()).hexdigest())
    if len(ordered) < count:
        raise ValueError('Insufficient disjoint stores; do not replace with previously scored stores.')
    return [min(available[store], key=lambda k: hashlib.sha256(('gerai-freshretailnet-v2:product:' + ':'.join(map(str, k))).encode()).hexdigest()) for store in ordered[:count]]

def make_features(records, origin, variant):
    if origin < 14 or origin >= len(records):
        raise ValueError('Need 14 earlier observed dates.')
    past = records[origin-14:origin]
    history = np.array([r['quantity'] for r in past], dtype=float)
    if len(history) != 14 or not np.all(np.isfinite(history)) or np.any(history < 0):
        raise ValueError('Invalid observed history.')
    if any(not math.isfinite(r['stockoutHours']) or not 0 <= r['stockoutHours'] <= 17 for r in past):
        raise ValueError('Invalid past stockout hours.')
    scale = max(float(np.mean(history)), 1e-6)
    x = (history[::-1] / scale).tolist()
    last = history[-7:]
    base = 2 * float(np.mean(last))
    x.extend([float(np.mean(history[-3:]))/scale, base/(2*scale), float(np.median(last))/scale,
              float(np.std(last))/scale, (float(np.mean(last))-float(np.mean(history[:7])))/scale,
              float(np.mean(last == 0)), float((history[-7]+history[-6])/scale), math.log1p(scale),
              sum(r['stockoutHours'] > 0 for r in past[-7:])/7])
    date = datetime.date.fromisoformat(records[origin]['date'])
    if variant == 'calendar':
        weekday = date.weekday()
        x.extend([math.sin(2*math.pi*weekday/7), math.cos(2*math.pi*weekday/7), sum((weekday+i)%7 >= 5 for i in [0,1])])
    elif variant != 'lags':
        raise ValueError('Unknown feature variant.')
    return np.asarray(x), scale, base

def feature_names(variant):
    if variant not in ['lags', 'calendar']:
        raise ValueError('Unknown feature variant.')
    names = [f'lag{i}_relative' for i in range(1,15)] + ['mean3_relative','mean7_relative','median7_relative','std7_relative','trend7_relative','zero_fraction7','weekly_two_day_relative','log_scale14','past_stockout_fraction7']
    return names + (['weekday_sin','weekday_cos','weekend_days'] if variant == 'calendar' else [])

def make_rows(series, variant, origins):
    rows = []
    for key, records in series.items():
        for i in origins:
            if i+1 >= len(records):
                raise ValueError('Missing two-day target; no imputation.')
            x, scale, base = make_features(records, i, variant)
            actual = records[i]['quantity']+records[i+1]['quantity']
            if any(not math.isfinite(r['quantity']) or r['quantity'] < 0 for r in records[i:i+2]):
                raise ValueError('Invalid target.')
            rows.append({'key': key, 'date': records[i]['date'], 'targetThrough': records[i+1]['date'],
                         'x': x, 'scale': scale, 'base': base, 'actual': actual, 'residual': (actual-base)/scale,
                         'naive': 2*records[i-1]['quantity'], 'ma14': 2*sum(r['quantity'] for r in records[i-14:i])/14,
                         'weekly': records[i-7]['quantity']+records[i-6]['quantity'],
                         'stockoutAffected': records[i]['stockoutHours']>0 or records[i+1]['stockoutHours']>0})
    return rows

def predictions(model, rows, weight):
    if not rows or not math.isfinite(weight) or not 0 <= weight <= 1:
        raise ValueError('Expected rows and residual weight in [0,1].')
    correction = model.predict(np.array([r['x'] for r in rows]))
    if not np.all(np.isfinite(correction)):
        raise ValueError('Model produced non-finite predictions.')
    return np.maximum(0, np.array([r['base'] for r in rows]) + weight*np.array([r['scale'] for r in rows])*correction)

def score(actual, predicted):
    actual, predicted = np.asarray(actual, dtype=float), np.asarray(predicted, dtype=float)
    if actual.ndim != 1 or actual.shape != predicted.shape or not np.all(np.isfinite(actual)) or not np.all(np.isfinite(predicted)) or np.any(actual < 0) or np.any(predicted < 0):
        raise ValueError('Expected finite nonnegative matching score arrays.')
    error = float(np.sum(np.abs(actual-predicted)))
    total = float(np.sum(actual))
    return {'mae': error/len(actual) if len(actual) else None, 'wape': error/total if total else None, 'observations': len(actual)}
