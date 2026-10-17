"""Aggregation invariants on isolated contract events, never business records."""
import copy
import datetime as dt
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from uci_retail import aggregate_events, select_countries, calendar_dates, derived_series

PROTOCOL = json.loads((Path(__file__).resolve().parents[1] / 'benchmarks/uci-online-retail/protocol.json').read_text())


def event(date, qty=10, invoice='1', stock='12345', price=1, country='Isolated contract region'):
    return (invoice, stock, 'Unused private description', qty, dt.datetime.fromisoformat(date+'T10:00:00'), price, 'Unused customer ID', country)


class UciRetailTests(unittest.TestCase):
    def test_filtering_accounts_for_every_source_row_without_using_identity(self):
        rows = [event('2010-12-02'), event('2010-12-02'), event('2010-12-02', invoice='c42'), event('2010-12-02', qty=-1),
                event('2010-12-02', stock='POST'), event('2010-12-01'), event('2011-12-09'), event('2010-12-02', country='Unspecified')]
        quantities, counts, accounting = aggregate_events(rows, PROTOCOL)
        self.assertEqual(quantities[('Isolated contract region', '2010-12-02')], 20)
        self.assertEqual(counts[('Isolated contract region', '2010-12-02')], 2)  # Preserve published duplicates.
        self.assertEqual(accounting['sourceRows'], 8)
        self.assertEqual(accounting['acceptedRows']+sum(accounting['excludedRows'].values()), 8)
        self.assertNotIn('Unused customer ID', json.dumps(list(quantities)))

    def test_empty_event_sum_is_zero_and_normalization_uses_given_early_scale(self):
        quantities, counts, _ = aggregate_events([event('2010-12-02', qty=12)], PROTOCOL)
        result = derived_series('Isolated contract region', ['2010-12-02', '2010-12-03'], quantities, counts, 2)
        self.assertEqual([r['quantity'] for r in result], [6, 0])
        self.assertEqual([r['sourceEventRows'] for r in result], [1, 0])
        self.assertEqual([r['rawQuantity'] for r in result], [12, 0])
        with self.assertRaises(ValueError):
            derived_series('a', [], quantities, counts, 0)

    def test_external_values_never_change_country_selection_or_scale(self):
        dates = calendar_dates(PROTOCOL['calendar']['from'], PROTOCOL['calendar']['developmentThrough'])
        quantities = {('Isolated contract region', date): 10 for date in dates[:110]}
        before, _ = select_countries(quantities, PROTOCOL)
        changed = copy.deepcopy(quantities)
        for date in calendar_dates(PROTOCOL['calendar']['externalFrom'], PROTOCOL['calendar']['externalThrough']):
            changed[('Isolated contract region', date)] = 999999
            changed[('External-only region', date)] = 999999
        after, _ = select_countries(changed, PROTOCOL)
        self.assertEqual(before, after)
        self.assertEqual(before[0]['earlyScale84'], 10)

    def test_insufficient_development_never_relaxes_selection(self):
        quantities = {('Isolated contract region', date): 999999 for date in calendar_dates('2010-12-02', '2011-02-01')}
        with self.assertRaises(ValueError):
            select_countries(quantities, PROTOCOL)

    def test_frozen_boundaries_count_and_invalid_fields_are_audited(self):
        self.assertEqual(len(calendar_dates('2010-12-02', '2011-10-31')), 334)
        self.assertEqual(len(calendar_dates('2011-11-01', '2011-12-08')), 38)
        _quantities, _counts, accounting = aggregate_events([event('2010-12-02', qty=float('nan')), event('2010-12-02', qty=1.5)], PROTOCOL)
        self.assertEqual(accounting['excludedRows']['invalid_required_fields'], 2)


if __name__ == '__main__':
    unittest.main()
