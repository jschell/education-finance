import copy
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from retrospective_bill_benchmark import predict
from retrospective_inputs import identity_hash


def fixture():
    ids = [u for u in range(100000, 100100) if identity_hash(u) % 5 == 1][:4]
    return [{'unitid': ids[j], 'sector': 'public4', 'labelOrigin': year,
             'lastBillYear': year + 3, 'status': 'observed',
             'anchor': [100., 100.], 'bill': 800. * ratio}
            for year, ratios in [(2003, [1.]), (2004, [2., 2.]), (2005, [3., 3., 3.])]
            for j, ratio in enumerate(ratios)]


class DirectBillBenchmark(unittest.TestCase):
    def test_equal_origin_mass_and_inverse_cdf(self):
        result = predict(fixture(), [100., 100.], 2010, 2010)
        self.assertEqual(result['status'], 'available')
        for year in (2003, 2004, 2005):
            self.assertAlmostEqual(sum(r['weight'] for r in result['label_weights'] if r['labelOrigin'] == year), 1/3)
        np.testing.assert_allclose([result['p10'], result['p50'], result['p90']], [800., 1600., 2400.])
        self.assertAlmostEqual(result['mean'], 1600.)

    def test_strict_maturity_cutoff_and_minimum(self):
        records = fixture()
        self.assertEqual(predict(records, [100., 100.], 2008, 2008)['status'], 'unsupported-insufficient-mature-origins')
        self.assertEqual(predict(records, [100., 100.], 2010, 2007)['status'], 'unsupported-insufficient-mature-origins')
        result = predict(records, [100., 100.], 2009, 2008)
        self.assertEqual(result['label_origins'], [2003, 2004, 2005])

    def test_global_test_and_non_cal_fail_closed(self):
        records = fixture()
        with self.assertRaises(ValueError):
            predict(records, [100., 100.], 2010, 2010, [records[0]['unitid']])
        bad = copy.deepcopy(records)
        bad[0]['unitid'] = next(u for u in range(100000, 100100) if identity_hash(u) % 5 != 1)
        with self.assertRaises(ValueError):
            predict(bad, [100., 100.], 2010, 2010)

    def test_future_poison_and_missing_status(self):
        records = fixture()
        expected = predict(records, [100., 100.], 2010, 2010)
        records.append({'lastBillYear': 2010, 'anchor': [math.nan, math.inf], 'bill': -1})
        self.assertEqual(expected, predict(records, [100., 100.], 2010, 2010))
        records = fixture()
        records[-1]['status'] = 'missing-school-row'
        del records[-1]['bill']
        result = predict(records, [100., 100.], 2010, 2010)
        self.assertEqual(result['status_counts']['missing-school-row'], 1)
        self.assertEqual(result['observed_labels'], 5)

    def test_kernel_hand_calculation(self):
        records = fixture()
        for record in records:
            if record['labelOrigin'] == 2005:
                record['anchor'] = [200., 200.]
                record['bill'] *= 2
        result = predict(records, [200., 200.], 2010, 2010)
        scale = math.sqrt(2/9) * math.log(2)
        np.testing.assert_allclose(result['feature_scale'], [scale, scale])
        far = math.exp(-(math.log(2)/scale)**2)
        expected = .8/(1+2*far) + .2/3
        self.assertAlmostEqual(sum(r['weight'] for r in result['label_weights'] if r['labelOrigin'] == 2005), expected)

    def test_currency_scale_and_nonannual_interface(self):
        records = fixture()
        expected = predict(records, [100., 100.], 2010, 2010)
        scaled = copy.deepcopy(records)
        for row in scaled:
            row['anchor'] = [v*7 for v in row['anchor']]
            row['bill'] *= 7
        result = predict(scaled, [700., 700.], 2010, 2010)
        for key in ('p10', 'p50', 'p90', 'mean'):
            self.assertAlmostEqual(result[key], 7 * expected[key])
        self.assertNotIn('paths', result)

    def test_bad_prices_duplicates_and_mixed_sectors(self):
        for change in ('duplicate', 'sector', 'anchor', 'bill', 'date'):
            records = fixture()
            if change == 'duplicate': records.append(copy.deepcopy(records[0]))
            if change == 'sector': records[0]['sector'] = 'private4'
            if change == 'anchor': records[0]['anchor'][0] = 0
            if change == 'bill': records[0]['bill'] = math.inf
            if change == 'date': records[0]['labelOrigin'] = 2002
            with self.subTest(change=change), self.assertRaises(ValueError):
                predict(records, [100., 100.], 2010, 2010)


if __name__ == '__main__':
    unittest.main()
