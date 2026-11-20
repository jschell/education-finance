"""Independent three-role, coherent-donor and mature-bill checks for C4."""
import copy
import gzip
import json
import pathlib
import sys
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
import retrospective_c4_models as model
import retrospective_c4_inputs as role_inputs
import retrospective_bill_benchmark as benchmark
import run_retrospective_c4 as runner
from retrospective_inputs import identity_hash, load_data, SECTORS

FIT = [u for u in range(1, 500) if identity_hash(u) % 5 in (2, 3, 4)][:4]
CAL = [u for u in range(1, 500) if identity_hash(u) % 5 == 1][:3]
KNOWN_TEST = next(u for u in range(1, 500) if identity_hash(u) % 5 in (2, 3, 4) and u not in FIT)
COLD_TEST = next(u for u in range(1, 500) if identity_hash(u) % 5 == 0)
TEST = [KNOWN_TEST, COLD_TEST]


def history(unitid, amplitude=0.):
    return [dict(unitid=unitid, year=2000+t,
                 tuition=100.*1.04**t*np.exp(-amplitude*(t % 2)),
                 housing=200.*1.03**t*np.exp(-2*amplitude*(t % 2)),
                 deflator=100.*1.02**t) for t in range(7)]


def bank(amplitudes=(.01, .04, .1)):
    fit_rows = [r for u in FIT for r in history(u)]
    cal_rows = [r for u, a in zip(CAL, amplitudes) for r in history(u, a)]
    return fit_rows, cal_rows


class IndependentC4ModelTests(unittest.TestCase):
    def fitted(self, amplitudes=(.01, .04, .1)):
        fit_rows, cal_rows = bank(amplitudes)
        return model.fit(fit_rows, cal_rows, 2006, test_unitids=TEST)

    def test_one_donor_per_whole_path_and_joint_serial_blocks(self):
        fitted = self.fitted()
        weights = model.donor_weights(fitted, [100.*1.04**6, 200.*1.03**6])
        noise, chosen = model.sample_school_noise(fitted, weights, 11, 97, 819, 'cold:x', return_donors=True)
        amplitude = {str(u): a for u, a in zip(CAL, (.01, .04, .1))}
        for trial, donor in enumerate(chosen):
            expected = amplitude[fitted['donors'][int(donor)]['unitid']]
            np.testing.assert_allclose(np.abs(noise[trial, :, 0]), expected, atol=2e-14)
        np.testing.assert_allclose(noise[:, :, 1], 2*noise[:, :, 0], atol=2e-14)
        for h in range(0, 10, 2):
            np.testing.assert_allclose(noise[:, h+1], -noise[:, h], atol=2e-14)

    def test_forecast_prefixes_and_refit_C2_have_independent_constructions(self):
        fitted = self.fitted()
        anchor = [100.*1.04**6, 200.*1.03**6]
        long = model.forecast(fitted, anchor, 11, 73, 917, school_key='cold:x')
        for horizon in (1, 3, 7):
            np.testing.assert_array_equal(model.forecast(fitted, anchor, horizon, 73, 917, school_key='cold:x'), long[:, :horizon])
        # FIT schools have deterministic 4%/3% growth and zero individual noise.
        reference = model.refit_c2(fitted, anchor, 11, 73, 917, school_key='cold:x')
        np.testing.assert_allclose(reference, np.broadcast_to([1.04, 1.03], reference.shape), atol=2e-14)

    def test_known_history_conditions_weights_without_entering_population_fit(self):
        fitted = self.fitted()
        anchor = [100.*1.04**6, 200.*1.03**6]
        cold = model.donor_weights(fitted, anchor)
        known = model.donor_weights(fitted, anchor, KNOWN_TEST, history(KNOWN_TEST, .01))
        indices = {donor['unitid']: i for i, donor in enumerate(fitted['donors'])}
        np.testing.assert_allclose(cold, np.ones(3)/3, atol=2e-14)
        self.assertGreater(known[indices[str(CAL[0])]], known[indices[str(CAL[2])]])
        self.assertNotIn(str(KNOWN_TEST), fitted['audit']['fitIds'])
        self.assertNotIn(str(KNOWN_TEST), fitted['audit']['calIds'])
        with self.assertRaises(ValueError):
            model.forecast(fitted, anchor, 3, 17, 3, history=history(COLD_TEST), school_key='cold:x')

    def test_zero_variance_donors_remain_and_add_no_artificial_shock(self):
        fitted = self.fitted((0., 0., 0.))
        self.assertEqual(fitted['audit']['calDonors'], 3)
        self.assertTrue(np.isfinite(fitted['features']).all())
        paths = model.forecast(fitted, [100., 200.], 11, 37, 51, school_key='cold:x')
        np.testing.assert_allclose(paths, np.broadcast_to([1.04, 1.03], paths.shape), atol=2e-14)

    def test_future_poison_in_FIT_CAL_and_known_features_is_ignored(self):
        fit_rows, cal_rows = bank()
        fitted = model.fit(fit_rows, cal_rows, 2006, test_unitids=TEST)
        future = dict(unitid=COLD_TEST, year=2040, tuition=float('inf'), housing=-1., deflator=0.)
        poisoned = model.fit(fit_rows+[future], cal_rows+[future], 2006, test_unitids=TEST)
        own = history(KNOWN_TEST, .01)
        anchor = [100.*1.04**6, 200.*1.03**6]
        a = model.forecast(fitted, anchor, 11, 37, 51, KNOWN_TEST, own)
        b = model.forecast(poisoned, anchor, 11, 37, 51, KNOWN_TEST, own+[future])
        np.testing.assert_array_equal(a, b)
        self.assertEqual(fitted['audit'], poisoned['audit'])

    def test_test_and_hash_roles_fail_closed_in_both_fit_stages(self):
        fit_rows, cal_rows = bank()
        for bad_fit, bad_cal in ((fit_rows+history(KNOWN_TEST), cal_rows),
                                 (fit_rows, cal_rows+history(COLD_TEST)),
                                 (fit_rows+history(CAL[0]), cal_rows),
                                 (fit_rows, cal_rows+history(FIT[0]))):
            with self.assertRaises(ValueError):
                model.fit(bad_fit, bad_cal, 2006, test_unitids=TEST)


class IndependentRoleInputTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.table, cls.cpi = load_data()

    def test_real_origin_test_union_excluded_across_all_categories(self):
        selected, tests = role_inputs.test_selections(self.table, 2010, SECTORS)
        self.assertEqual(set(tests), {u for s in selected.values() for key in ('known_ids', 'unknown_ids') for u in s[key]})
        for sector in SECTORS:
            payload = role_inputs.role_context(self.table, self.cpi, 2010, sector, 0, tests)
            self.assertFalse(set(tests) & (set(payload['fit_ids']) | set(payload['cal_ids'])))
            self.assertFalse(set(payload['fit_ids']) & set(payload['cal_ids']))
            self.assertTrue(all(identity_hash(u)%5 in (2,3,4) for u in payload['fit_ids']))
            self.assertTrue(all(identity_hash(u)%5 == 1 for u in payload['cal_ids']))
            self.assertTrue(all(r['year'] <= 2010 for r in payload['fit_records']+payload['cal_records']))

    def test_real_future_metadata_prices_and_CPI_do_not_change_roles_or_inputs(self):
        _, tests = role_inputs.test_selections(self.table, 2010, SECTORS)
        before = role_inputs.role_context(self.table, self.cpi, 2010, 'public4', 0, tests)
        poison = {u: dict(years) for u, years in self.table.items()}
        for years in poison.values():
            for year in list(years):
                if year > 2010:
                    years[year] = {'SECTOR':'9', 'CHG2AY3':'-1', 'CHG3AY3':'999999', 'CHG5AY3':'0'}
        cpi = {y: x if y <= 2010 else float('nan') for y,x in self.cpi.items()}
        after = role_inputs.role_context(poison, cpi, 2010, 'public4', 0, tests)
        self.assertEqual(before, after)


class IndependentDirectBillTests(unittest.TestCase):
    @staticmethod
    def labels():
        return [dict(unitid=CAL[i], sector='public4', labelOrigin=year, lastBillYear=year+3,
                     status='observed', anchor=[100.,100.], bill=800.*ratio)
                for year, ratios in ((2003,[1.]),(2004,[2.,2.]),(2005,[3.,3.,3.]))
                for i,ratio in enumerate(ratios)]

    def test_future_labels_cannot_change_feature_scales_or_distribution(self):
        labels = self.labels()
        before = benchmark.predict(labels, [100.,100.], 2010, 2010, TEST)
        labels.append({'lastBillYear':2010,'unitid':COLD_TEST,'anchor':[float('nan'),float('inf')]})
        after = benchmark.predict(labels, [100.,100.], 2010, 2010, TEST)
        self.assertEqual(before, after)
        np.testing.assert_allclose([before['p10'],before['p50'],before['p90']], [800.,1600.,2400.])
        self.assertNotIn('paths', before)
        for year in (2003,2004,2005):
            self.assertAlmostEqual(sum(r['base'] for r in before['label_weights'] if r['labelOrigin']==year), 1/3)

    def test_bill_labels_use_strict_completion_and_TEST_exclusion(self):
        self.assertEqual(benchmark.predict(self.labels(), [100.,100.], 2008, 2008)['status'],
                         'unsupported-insufficient-mature-origins')
        with self.assertRaises(ValueError):
            benchmark.predict(self.labels(), [100.,100.], 2010, 2010, [CAL[0]])


class IndependentC4DecisionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source = pathlib.Path(__file__).resolve().parents[1] / 'data/calibration-diagnostics/retrospective-c3.json.gz'
        cls.baseline = json.loads(gzip.decompress(source.read_bytes()))['cases']

    def cases(self, model):
        rows = copy.deepcopy(self.baseline)
        for row in rows:
            if row['outcome']['status'] == 'observed':
                row['scores'][model] = dict(score=.000001, covered=.8, width=.1,
                                             bias=0., below=.1, above=.1)
        return rows

    def test_missing_C4_cannot_reduce_fixed_primary_baseline_denominator(self):
        rows = self.cases('C4')
        first = next(c for c in rows if c['lag']==0 and c['wait'] in (0,4)
                     and all(m in c['scores'] for m in ('B0','C2')))
        del first['scores']['C4']
        with patch.object(runner, 'interval', return_value=None):
            result = runner.evaluate(rows, 'C4', (0,4))
        self.assertEqual(result['fixedBaselineCases'], 1001)
        self.assertEqual(result['available'], 1000)
        self.assertFalse(result['checks']['availability'])
        self.assertEqual(result['decision'], 'reject-fixed-C4')

    def test_aggregate_gain_cannot_waive_one_harmed_group(self):
        rows = self.cases('C4')
        for row in rows:
            if row['outcome']['status']=='observed' and (row['sector'],row['kind'],row['wait'])==('private4','unknown',0):
                row['scores']['C4']['score'] = .2
        with patch.object(runner, 'interval', return_value=None):
            result = runner.evaluate(rows, 'C4', (0,4))
        self.assertTrue(result['checks']['score5PercentBoth'])
        self.assertFalse(result['checks']['stratumProtectionBoth'])
        self.assertEqual(result['decision'], 'reject-fixed-C4')

    def test_unsupported_bill_forecast_cannot_remove_one_of_626_baseline_cases(self):
        rows = self.cases('DIRECT-BILL')
        first = next(c for c in rows if c['lag']==0 and c['wait']==0
                     and all(m in c['scores'] for m in ('B0','C2')))
        del first['scores']['DIRECT-BILL']
        with patch.object(runner, 'interval', return_value=None):
            result = runner.evaluate(rows, 'DIRECT-BILL', (0,))
        self.assertEqual(result['fixedBaselineCases'], 626)
        self.assertEqual(result['available'], 625)
        self.assertFalse(result['checks']['availability'])
        self.assertEqual(result['decision'], 'reject-fixed-DIRECT-BILL')


if __name__ == '__main__':
    unittest.main()
