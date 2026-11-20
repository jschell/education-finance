"""Independent adversarial tests for the bounded C2 follow-up.

These test fixtures do not contain study outcomes. They verify the new mean
mechanism, coherent paths and causal input isolation rather than score targets.
"""
import copy
import pathlib
import sys
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
import retrospective_cost_models as old
import retrospective_c2_models as c2
import retrospective_inputs as inputs
from run_retrospective_walkforward import bill_draws
import run_retrospective_c2 as runner


def deterministic_history(log_growth=(.07, .06)):
    rows = []
    for unitid in (11, 22):
        for t in range(7):
            rows.append({'unitid': unitid, 'year': 2000+t,
                         'tuition': (8000+unitid)*np.exp(log_growth[0]*t),
                         'housing': (6000+unitid)*np.exp(log_growth[1]*t),
                         'deflator': 100*np.exp(.02*t)})
    return rows


class IndependentC2MechanismTests(unittest.TestCase):
    def test_constant_growth_has_hand_derived_damped_anchor_mean(self):
        fitted = c2.fit(deterministic_history(), 2006)
        actual = c2.forecast(fitted, 11, horizon=11, trials=17, seed=817)
        h = np.arange(1, 12)[:, None]
        expected = np.exp(np.log1p([.04, .03])
                          + (.5**h)*(np.array([.07, .06])-np.log1p([.04, .03])))
        np.testing.assert_allclose(actual, np.broadcast_to(expected, actual.shape), atol=2e-14)
        levels = bill_draws(actual, [100., 200.])
        np.testing.assert_array_equal(levels[:, 0], np.broadcast_to([100., 200.], (17, 2)))

    def test_forecast_is_prefix_coherent_and_has_no_wait_specific_switch(self):
        rows = deterministic_history()
        # Create genuine empirical innovations without any outcome labels.
        for row in rows:
            row['tuition'] *= np.exp(.025*np.sin(row['year']+row['unitid']))
            row['housing'] *= np.exp(.017*np.cos(row['year']+row['unitid']))
        fitted = c2.fit(rows, 2006)
        long = c2.forecast(fitted, 11, 11, trials=73, seed=817)
        for horizon in (1, 3, 5, 7):
            short = c2.forecast(fitted, 11, horizon, trials=73, seed=817)
            np.testing.assert_array_equal(short, long[:, :horizon])

    def test_mean_parameter_uncertainty_is_temporary_in_actual_draws(self):
        rows = []
        tuition, housing = 100., 200.
        rows.append(dict(unitid=1, year=2000, tuition=tuition, housing=housing, deflator=1.))
        for year, displacement in enumerate((-.02, 0., .02), 2001):
            tuition *= np.exp(np.log1p(.04)+displacement)
            housing *= np.exp(np.log1p(.03)+displacement/2)
            rows.append(dict(unitid=1, year=year, tuition=tuition, housing=housing, deflator=1.))
        fitted = c2.fit(rows, 2003)
        def zero_process(vectors, segments, horizon, trials, rng):
            return np.zeros((trials, horizon, np.asarray(vectors).shape[1]))
        with patch('retrospective_cost_models._sample_blocks', side_effect=zero_process):
            pair = c2.forecast_pair(fitted, 1, 11, trials=97, seed=711)
        centered_old = np.log(pair['B2'])-np.log1p([.04, .03])
        centered_new = np.log(pair['C2'])-np.log1p([.04, .03])
        h = np.arange(1, 12)[None, :, None]
        np.testing.assert_allclose(centered_new, centered_old*(.5**h), atol=2e-15)
        self.assertGreater(float(np.var(centered_old[:, 0, 0])), 0.)
        self.assertLess(float(np.var(centered_new[:, -1, 0])),
                        float(np.var(centered_new[:, 0, 0]))/100000.)

    def test_past_only_fit_and_global_rng_isolation_apply_to_C2(self):
        rows = deterministic_history()
        poisoned = copy.deepcopy(rows)
        poisoned.append(dict(unitid=999, year=2040, tuition=float('inf'), housing=-1, deflator=0))
        a, b = c2.fit(rows, 2006), c2.fit(poisoned, 2006)
        np.random.seed(1)
        first = c2.forecast(a, 11, 11, trials=37, seed=19)
        np.random.seed(99)
        np.random.normal(size=1000)
        np.testing.assert_array_equal(first, c2.forecast(b, 11, 11, trials=37, seed=19))

    def test_withheld_school_history_cannot_affect_C2(self):
        rows = deterministic_history()
        omitted = [r for r in rows if r['unitid'] != 22]
        poisoned = copy.deepcopy(rows)
        for row in poisoned:
            if row['unitid'] == 22:
                row['tuition'] *= np.exp(.8*(row['year']-2000))
                row['housing'] *= np.exp(-.5*(row['year']-2000))
        a = c2.fit(omitted, 2006)
        b = c2.fit(poisoned, 2006, excluded_unitids={22})
        np.testing.assert_array_equal(c2.forecast(a, None, 11, 37, 19, school_key='unknown:22'),
                                      c2.forecast(b, None, 11, 37, 19, school_key='unknown:22'))

    def test_same_school_repeat_is_coherent_and_unknown_has_no_fitted_state(self):
        fitted = c2.fit(deterministic_history(), 2006)
        a = c2.forecast(fitted, None, 11, 37, 19, school_key='unknown:7')
        b = c2.forecast(fitted, 'no-training-state', 11, 37, 19, school_key='unknown:7')
        np.testing.assert_array_equal(a, b)
        np.testing.assert_array_equal(a, c2.forecast(fitted, None, 11, 37, 19, school_key='unknown:7'))


class IndependentC2RealInputTests(unittest.TestCase):
    def test_post_origin_prices_cpi_metadata_do_not_change_real_C2_forecast(self):
        table, cpi = inputs.load_data()
        origin = 2010
        before = inputs.context(table, cpi, origin, 'public4')
        poison = {u: dict(years) for u, years in table.items()}
        for years in poison.values():
            for year in list(years):
                if year > origin:
                    years[year] = {'SECTOR': '9', 'CHG2AY3': '-1', 'CHG3AY3': '9999999', 'CHG5AY3': '0'}
        poison[99999999] = {2040: {'SECTOR': '1', 'CHG2AY3': '1', 'CHG3AY3': '1', 'CHG5AY3': '1'}}
        bad_cpi = {year: value if year <= origin else float('nan') for year, value in cpi.items()}
        after = inputs.context(poison, bad_cpi, origin, 'public4')
        self.assertEqual(before, after)
        target = before['selection']['known_ids'][0]
        a, b = c2.fit(before['records'], origin), c2.fit(after['records'], origin)
        np.testing.assert_array_equal(c2.forecast(a, target, 11, 73, 991),
                                      c2.forecast(b, target, 11, 73, 991))


class IndependentC2DecisionTests(unittest.TestCase):
    @staticmethod
    def cases():
        rows = []
        for origin in (2010, 2011):
            for sector in inputs.SECTORS:
                for kind in ('known', 'unknown'):
                    for wait in (0, 4):
                        scores = {}
                        for model, score, coverage in (('B0', 1., .5), ('B2', 1., .7),
                                                       ('C1', 1.2, .6), ('C2', .8, .8)):
                            scores[model] = dict(score=score, covered=coverage, width=.1,
                                                 bias=0., below=0., above=0.)
                        rows.append(dict(origin=origin, sector=sector, kind=kind, wait=wait,
                                         lag=0, scores=scores,
                                         outcome=dict(status='observed', lastBillYear=origin+wait+3)))
        return rows

    def test_missing_C2_does_not_shrink_fixed_baseline_primary_denominator(self):
        rows = self.cases()
        del rows[0]['scores']['C2']
        summary = runner.summarize(rows)['primary']
        self.assertEqual(summary['fixedBaselineCases'], 40)
        self.assertEqual(summary['C2Available'], 39)
        self.assertFalse(summary['checks']['availability'])
        self.assertFalse(summary['checks']['score5PercentBoth'])
        self.assertEqual(summary['decision'], 'reject-fixed-C2')
        self.assertEqual(summary['pairedDifference95'], {})

    def test_aggregate_gain_cannot_hide_one_harmed_sector_type_wait(self):
        rows = self.cases()
        for row in rows:
            row['scores']['C2']['score'] = (1.2 if (row['sector'], row['kind'], row['wait'])
                                           == ('public4', 'known', 0) else .5)
        summary = runner.summarize(rows)['primary']
        self.assertTrue(summary['checks']['score5PercentBoth'])
        self.assertFalse(summary['checks']['stratumProtectionBoth'])
        self.assertEqual(summary['decision'], 'reject-fixed-C2')

    def test_candidate_must_beat_both_baselines_by_frozen_material_amount(self):
        rows = self.cases()
        for row in rows:
            row['scores']['B2']['score'] = .7
            row['scores']['C2']['score'] = .69
        summary = runner.summarize(rows)['primary']
        self.assertTrue(summary['checks']['stratumProtectionBoth'])
        self.assertFalse(summary['checks']['score5PercentBoth'])
        self.assertEqual(summary['decision'], 'reject-fixed-C2')

    def test_score_improvement_does_not_override_coverage_protection(self):
        rows = self.cases()
        for row in rows:
            row['scores']['B2']['covered'] = .8
            row['scores']['C2']['covered'] = .9
        summary = runner.summarize(rows)['primary']
        self.assertTrue(summary['checks']['score5PercentBoth'])
        self.assertFalse(summary['checks']['coverageNoFartherBoth'])
        self.assertEqual(summary['decision'], 'reject-fixed-C2')


if __name__ == '__main__':
    unittest.main()
