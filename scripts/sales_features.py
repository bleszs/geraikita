"""Scale-relative features requiring observed sales only; no stockout imputation."""
import datetime as dt
import math
import numpy as np

METHODS = ['boosting', 'naive', 'ma7', 'ma14', 'weekly']


def feature_names(variant):
    if variant not in ['lags', 'calendar']:
        raise ValueError('Unknown feature variant.')
    names = [f'lag{i}_relative' for i in range(1, 15)] + ['mean3_relative', 'mean7_relative', 'median7_relative', 'std7_relative', 'trend7_relative', 'zero_fraction7', 'weekly_two_day_relative']
    return names + (['weekday_sin', 'weekday_cos', 'weekend_days'] if variant == 'calendar' else [])


def features(records, origin, variant):
    feature_names(variant)
    if not 14 <= origin < len(records):
        raise ValueError('Need fourteen prior observed calendar dates.')
    past = records[origin-14:origin]
    for i in range(14):
        date = dt.date.fromisoformat(past[i]['date'])
        next_date = dt.date.fromisoformat(records[origin-14+i+1]['date'])
        if next_date != date + dt.timedelta(days=1):
            raise ValueError('Missing/duplicate context date; no imputation.')
    history = np.asarray([row['quantity'] for row in past], dtype=float)
    if not np.all(np.isfinite(history)) or np.any(history < 0):
        raise ValueError('Invalid observed quantities.')
    scale = max(float(np.mean(history)), 1e-6)
    last = history[-7:]
    mean7 = float(np.mean(last))
    x = (history[::-1]/scale).tolist()
    x.extend([float(np.mean(history[-3:]))/scale, mean7/scale, float(np.median(last))/scale,
              float(np.std(last))/scale, (mean7-float(np.mean(history[:7])))/scale,
              float(np.mean(last == 0)), float((history[-7]+history[-6])/scale)])
    if variant == 'calendar':
        day = dt.date.fromisoformat(records[origin]['date']).weekday()
        x.extend([math.sin(2*math.pi*day/7), math.cos(2*math.pi*day/7), sum((day+i)%7 >= 5 for i in [0, 1])])
    if not np.all(np.isfinite(x)):
        raise ValueError('Non-finite feature values.')
    return np.asarray(x), scale, 2*mean7


def make_rows(groups, variant, origins):
    result = []
    for key, records in groups.items():
        for i in origins:
            if i+1 >= len(records) or dt.date.fromisoformat(records[i+1]['date']) != dt.date.fromisoformat(records[i]['date']) + dt.timedelta(days=1):
                raise ValueError('Missing two-day target.')
            x, scale, base = features(records, i, variant)
            target = [records[i]['quantity'], records[i+1]['quantity']]
            if not all(isinstance(n, (int, float)) and math.isfinite(n) and n >= 0 for n in target):
                raise ValueError('Invalid observed target.')
            actual = sum(target)
            result.append({'key': key, 'date': records[i]['date'], 'targetThrough': records[i+1]['date'],
                           'x': x, 'scale': scale, 'base': base, 'actual': actual, 'residual': (actual-base)/scale,
                           'naive': 2*records[i-1]['quantity'], 'ma7': base,
                           'ma14': 2*sum(r['quantity'] for r in records[i-14:i])/14,
                           'weekly': records[i-7]['quantity']+records[i-6]['quantity']})
    return result


def select_target_groups(eligibility, excluded):
    # Eligibility is computed from context only by the existing UCI aggregator.
    selected = sorted([row for row in eligibility if row['selected'] and row['country'] not in excluded], key=lambda row: row['country'])
    if not selected:
        raise ValueError('No unscored target group satisfies the frozen criteria.')
    return selected
