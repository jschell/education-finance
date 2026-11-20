"""Independent mature-label, weighting and path tests for the bounded C3 study."""
import copy
import pathlib
import sys
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
import retrospective_c3_models as c3
from retrospective_inputs import identity_hash
from run_retrospective_walkforward import bill_draws
import run_retrospective_c3 as runner
import retrospective_inputs as inputs

KNOWN = [i for i in range(1, 100) if identity_hash(i) % 5 != 0]
WITHHELD = next(i for i in range(1, 100) if identity_hash(i) % 5 == 0)


def label(year, error, unitid=None, variance=(.04, .16)):
    return {'targetYear': year, 'unitid': KNOWN[0] if unitid is None else unitid,
            'sector': 'public4', 'error': list(error), 'variance': list(variance)}


def labels():
    return [label(2004, (.2, .4), KNOWN[0]), label(2004, (0., 0.), KNOWN[1]),
            label(2005, (-.1, -.2), KNOWN[0]),
            label(2006, (.3, .6), KNOWN[0]), label(2006, (.1, .2), KNOWN[1])]


class IndependentC3CalibrationTests(unittest.TestCase):
    def test_manual_calendar_weighting_and_shrunk_location_scale(self):
        fitted = c3.calibrate(labels(), 2008, 2008)
        self.assertEqual(fitted['targetYears'], [2004, 2005, 2006])
        self.assertEqual(fitted['nYears'], 3)
        # Year-average component-one errors are .1, -.1, .2, not a school-row mean.
        np.testing.assert_allclose(fitted['b'], [.025, .05], atol=1e-15)
        # Standardized centered square year means: .390625,.390625,1.015625.
        np.testing.assert_allclose(fitted['scale']**2, [.849609375, .849609375], atol=1e-15)

    def test_current_future_and_post_cutoff_labels_cannot_enter_calibration(self):
        original = labels()
        expected = c3.calibrate(original, 2008, 2006)
        poisoned = original + [label(2007, (1e10, 1e10)),
                               label(2008, (float('nan'), float('inf')), variance=(-1., -1.)),
                               label(2040, (float('nan'), float('inf')), variance=(-1., -1.))]
        actual = c3.calibrate(poisoned, 2008, 2006)
        self.assertEqual(actual['targetYears'], expected['targetYears'])
        np.testing.assert_array_equal(actual['b'], expected['b'])
        np.testing.assert_array_equal(actual['scale'], expected['scale'])

    def test_hash_withheld_outcomes_cannot_change_learner(self):
        expected = c3.calibrate(labels(), 2008, 2008)
        poisoned = labels() + [label(2005, (100., -100.), WITHHELD)]
        # Hash-withheld outcomes are rejected explicitly, never consumed or
        # silently converted into a favorable identity fallback.
        with self.assertRaises(ValueError):
            c3.calibrate(poisoned, 2008, 2008)

    def test_last_five_years_and_short_history_identity_are_fixed(self):
        original = [label(y, (.01*(y-2000), .02*(y-2000))) for y in range(2001, 2008)]
        fitted = c3.calibrate(original, 2009, 2009)
        self.assertEqual(fitted['targetYears'], [2003, 2004, 2005, 2006, 2007])
        short = c3.calibrate(original, 2003, 2003)
        self.assertEqual(short['status'], 'identity-fallback')
        np.testing.assert_array_equal(short['b'], [0., 0.])
        np.testing.assert_array_equal(short['scale'], [1., 1.])

    def test_zero_variance_neutral_or_unsupported_never_winning_fallback(self):
        zero = [label(y, (0., 0.), variance=(0., 0.)) for y in (2004, 2005, 2006)]
        fitted = c3.calibrate(zero, 2008, 2008)
        np.testing.assert_array_equal(fitted['b'], [0., 0.])
        np.testing.assert_array_equal(fitted['scale'], [1., 1.])
        bad = [label(y, (.1, .2), variance=(0., 0.)) for y in (2004, 2005, 2006)]
        with self.assertRaises(ValueError):
            c3.calibrate(bad, 2008, 2008)

    def test_order_and_future_noise_do_not_change_path_outputs(self):
        first = labels()
        second = list(reversed(copy.deepcopy(first)))
        a, b = c3.calibrate(first, 2008, 2008), c3.calibrate(second, 2008, 2008)
        paths = np.exp(np.random.default_rng(671).normal(.03, .02, size=(31, 11, 2)))
        np.testing.assert_array_equal(c3.apply(paths, a), c3.apply(paths, b))


class IndependentC3PathTests(unittest.TestCase):
    def test_transform_has_exact_sample_mean_variance_and_coherent_prefixes(self):
        paths = np.exp(np.random.default_rng(816).normal(.03, .04, size=(73, 11, 2)))
        fitted = {'status': 'available', 'b': np.array([.01, -.02]), 'scale': np.array([.7, 1.2])}
        actual = c3.apply(paths, fitted)
        old, new = np.log(paths), np.log(actual)
        np.testing.assert_allclose(new.mean(axis=0), old.mean(axis=0)+fitted['b'], atol=2e-15)
        np.testing.assert_allclose(new.var(axis=0), old.var(axis=0)*fitted['scale']**2, atol=2e-15)
        for horizon in (1, 3, 7):
            np.testing.assert_array_equal(c3.apply(paths[:, :horizon], fitted), actual[:, :horizon])
        # Positive diagonal scaling preserves paired correlations, not independent component draws.
        np.testing.assert_allclose(np.corrcoef(old[:, 0, :].T), np.corrcoef(new[:, 0, :].T), atol=2e-14)

    def test_origin_anchor_is_untouched_and_location_is_annual_not_one_off(self):
        paths = np.ones((3, 11, 2))
        fitted = {'status': 'available', 'b': np.log([1.1, .9]), 'scale': np.array([1., 1.])}
        levels = bill_draws(c3.apply(paths, fitted), [100., 200.])
        np.testing.assert_array_equal(levels[:, 0], np.broadcast_to([100., 200.], (3, 2)))
        np.testing.assert_allclose(levels[:, 3], np.broadcast_to([100.*1.1**3, 200.*.9**3], (3, 2)))
        identity = c3.calibrate([], 2008, 2008)
        np.testing.assert_array_equal(c3.apply(paths, identity), paths)


class IndependentC3DecisionTests(unittest.TestCase):
    @staticmethod
    def cases():
        rows = []
        for origin in (2010, 2011):
            for sector in inputs.SECTORS:
                for kind in ('known', 'unknown'):
                    for wait in (0, 4):
                        scores = {model: dict(score=score, covered=coverage, width=.1,
                                              bias=0., below=0., above=0.)
                                  for model, score, coverage in
                                  (('B0', 1., .5), ('B2', .9, .7), ('C2', .8, .9), ('C3', .7, .8))}
                        rows.append(dict(origin=origin, sector=sector, kind=kind, wait=wait,
                                         lag=0, scores=scores,
                                         outcome=dict(status='observed', lastBillYear=origin+wait+3)))
        return rows

    def test_missing_candidate_cannot_narrow_three_baseline_denominator(self):
        rows = self.cases()
        del rows[0]['scores']['C3']
        result = runner.summarize(rows)['primary']
        self.assertEqual(result['fixedBaselineCases'], 40)
        self.assertEqual(result['C3Available'], 39)
        self.assertFalse(result['checks']['availability'])
        self.assertEqual(result['decision'], 'reject-fixed-C3')
        self.assertEqual(result['pairedDifference95'], {})

    def test_improvement_over_B0_and_B2_cannot_override_loss_to_C2(self):
        rows = self.cases()
        for row in rows:
            row['scores']['C3']['score'] = .79
        result = runner.summarize(rows)['primary']
        self.assertTrue(result['checks']['stratumProtectionAll'])
        self.assertFalse(result['checks']['score5PercentAll'])
        self.assertEqual(result['decision'], 'reject-fixed-C3')

    def test_aggregate_gain_cannot_override_one_harmed_group(self):
        rows = self.cases()
        for row in rows:
            row['scores']['C3']['score'] = (1.2 if (row['sector'], row['kind'], row['wait'])
                                           == ('public4', 'unknown', 4) else .4)
        result = runner.summarize(rows)['primary']
        self.assertTrue(result['checks']['score5PercentAll'])
        self.assertFalse(result['checks']['stratumProtectionAll'])
        self.assertEqual(result['decision'], 'reject-fixed-C3')


if __name__ == '__main__':
    unittest.main()
