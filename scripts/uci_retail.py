"""Aggregation contract for the public UCI benchmark, not application records."""
from collections import Counter, defaultdict
import datetime as dt
import hashlib
import math
import re


def calendar_dates(start, end):
    first, last = dt.date.fromisoformat(start), dt.date.fromisoformat(end)
    if first > last:
        raise ValueError('Invalid calendar range.')
    return [str(first + dt.timedelta(days=i)) for i in range((last-first).days+1)]


def aggregate_events(records, protocol):
    quantities, event_counts, exclusions = defaultdict(int), Counter(), Counter()
    calendar = protocol['calendar']
    total = 0
    for row in records:
        total += 1
        if len(row) != 8:
            raise ValueError('Unexpected source columns; do not silently repair.')
        invoice, stock, _description, qty, timestamp, price, _customer, country = row
        if (not isinstance(timestamp, dt.datetime) or not isinstance(qty, (int, float)) or isinstance(qty, bool)
                or not math.isfinite(qty) or not float(qty).is_integer() or not isinstance(price, (int, float))
                or isinstance(price, bool) or not math.isfinite(price) or not isinstance(country, str) or not country.strip()
                or invoice is None or stock is None):
            exclusions['invalid_required_fields'] += 1
            continue
        date = str(timestamp.date())
        if not calendar['from'] <= date <= calendar['externalThrough']:
            exclusions['outside_fixed_calendar'] += 1
        elif str(invoice).upper().startswith('C'):
            exclusions['cancelled_invoice'] += 1
        elif qty <= 0 or price <= 0:
            exclusions['nonpositive_quantity_or_price'] += 1
        elif not re.fullmatch(r'[0-9]{5}[A-Za-z]?', str(stock)):
            exclusions['nonproduct_stock_code'] += 1
        elif country.strip() in protocol['selection']['excludedCountries']:
            exclusions['excluded_country'] += 1
        else:
            key = (country.strip(), date)
            quantities[key] += int(qty)
            event_counts[key] += 1
    accepted = sum(event_counts.values())
    if accepted + sum(exclusions.values()) != total:
        raise ValueError('Row accounting mismatch.')
    return dict(quantities), event_counts, {'sourceRows': total, 'acceptedRows': accepted, 'excludedRows': dict(exclusions)}


def select_countries(quantities, protocol):
    dates = calendar_dates(protocol['calendar']['from'], protocol['calendar']['developmentThrough'])
    eligibility = []
    for country in sorted({country for country, _date in quantities}):
        values = [quantities.get((country, date), 0) for date in dates]
        scale = sum(values[:84])/84
        active = sum(v > 0 for v in values)
        eligible = active >= protocol['selection']['minimumActiveDates'] and sum(values) >= protocol['selection']['minimumUnits'] and scale > 0
        eligibility.append({'country': country, 'selected': eligible, 'developmentActiveDates': active,
                            'developmentUnits': sum(values), 'earlyScale84': scale})
    selected = [row for row in eligibility if row['selected']]
    if not selected:
        raise ValueError('No country meets the frozen protocol; do not relax criteria.')
    return selected, eligibility


def derived_series(country, dates, quantities, counts, scale):
    if not math.isfinite(scale) or scale <= 0:
        raise ValueError('Normalization must use a positive early-history scale.')
    return [{'date': date, 'quantity': quantities.get((country, date), 0)/scale,
             'rawQuantity': quantities.get((country, date), 0), 'sourceEventRows': counts.get((country, date), 0)} for date in dates]


def country_key(country):
    return hashlib.sha256(country.encode()).hexdigest()[:20]
