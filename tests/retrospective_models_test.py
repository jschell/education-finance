"""Mathematical tests for the fixed observable paired-growth research model."""
import copy
import pathlib
import sys
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from retrospective_cost_models import fit, forecast, forecast_pair, _sample_blocks


def levels(increments, unitid=1):
    records = [dict(unitid=unitid, year=2000, tuition=100., housing=200., deflator=1.)]
    for year, (tuition, housing, inflation) in enumerate(increments, 2001):
        previous = records[-1]
        records.append(dict(unitid=unitid, year=year,
                            tuition=previous['tuition'] * tuition,
                            housing=previous['housing'] * housing,
                            deflator=previous['deflator'] * inflation))
    return records


class PairedGrowthMathTests(unittest.TestCase):
    def test_constant_nominal_growth_is_reconstructed_without_double_cpi(self):
        fitted = fit(levels([(1.04, 1.03, 1.02)] * 4), 2004)
        pair = forecast_pair(fitted, 1, 8, trials=17, seed=14)
        for paths in (pair['B2'], pair['C1']):
            np.testing.assert_allclose(paths, np.broadcast_to([1.04, 1.03], paths.shape), atol=1e-14)
        np.testing.assert_allclose(pair['no-real-growth'], np.full((17, 8, 2), 1.02), atol=1e-14)

    def test_signed_temporary_state_is_exact_matched_log_ratio(self):
        records = []
        for unitid, sign in ((1, 1), (2, -1)):
            records += levels([(np.exp(sign * (-1) ** y * .1),
                                np.exp(sign * (-1) ** y * .05), 1.)
                               for y in range(8)], unitid)
        fitted = fit(records, 2008)
        self.assertTrue(np.all(fitted['rho'] < 0))
        self.assertTrue(np.all(fitted['rho'] >= -.5))
        pair = forecast_pair(fitted, 1, 7, trials=11, seed=25)
        state = fitted['school_states']['1']
        h = np.arange(1, 8)[:, None]
        expected = (.5 ** h * fitted['recent_delta'][None, :]
                    + 8 / 28 * fitted['rho'][None, :] ** h * state['last_residual'][None, :])
        difference = np.log(pair['C1']) - np.log(pair['B2'])
        np.testing.assert_allclose(difference, np.broadcast_to(expected, difference.shape), atol=2e-15)
        self.assertTrue(np.all(np.abs(expected[-1]) < np.abs(expected[0])))

    def test_circular_blocks_do_not_mix_distinct_segments_within_block(self):
        vectors = np.array([[0., 10.], [1., 11.], [100., 110.], [101., 111.]])
        draws = _sample_blocks(vectors, [[0, 1], [2, 3]], 6, 200, np.random.default_rng(4))
        for offset in range(0, 6, 2):
            first = draws[:, offset, 0]
            second = draws[:, offset + 1, 0]
            np.testing.assert_array_equal(first // 100, second // 100)
            np.testing.assert_array_equal(np.abs(first - second), np.ones(200))
        np.testing.assert_array_equal(draws[:, :, 1] - draws[:, :, 0], np.full((200, 6), 10.))

    def test_three_year_parameter_bootstrap_does_not_degenerate(self):
        fitted = fit(levels([(1.01, 1.02, 1.), (1.05, 1.06, 1.), (1.09, 1.10, 1.)]), 2003)
        def zero_process(vectors, segments, horizon, trials, rng):
            return np.zeros((trials, horizon, np.asarray(vectors).shape[1]))
        with patch('retrospective_cost_models._sample_blocks', side_effect=zero_process):
            draws = forecast(fitted, 1, 2, trials=200, seed=3)
        self.assertGreater(np.var(np.log(draws[:, 0, 0])), 0)
        np.testing.assert_array_equal(draws[:, 0], draws[:, 1])

    def test_identity_changes_individual_draws_but_not_known_state_for_unknown(self):
        records = levels([(1.03, 1.02, 1.01)] * 5)
        records += levels([(1.12, 1.08, 1.01)] * 5, 2)
        fitted = fit(records, 2005)
        a = forecast_pair(fitted, None, 5, trials=60, seed=8, school_key='unknown-a')
        b = forecast_pair(fitted, None, 5, trials=60, seed=8, school_key='unknown-b')
        self.assertFalse(np.array_equal(a['B2'], b['B2']))
        np.testing.assert_allclose(np.log(a['C1']) - np.log(a['B2']),
                                   np.log(b['C1']) - np.log(b['B2']), atol=1e-15)
        with self.assertRaises(ValueError):
            forecast(fitted, None, 3)

    def test_finite_failure_and_shapes(self):
        fitted = fit(levels([(1.02, 1.04, 1.01)] * 3), 2003)
        pair = forecast_pair(fitted, 1, 9, trials=13, seed=2)
        self.assertEqual(pair['C1'].shape, (13, 9, 2))
        for candidate in ('B2', 'C1', 'no-real-growth'):
            np.testing.assert_array_equal(pair[candidate], forecast(fitted, 1, 9, 13, 2, candidate))
        broken = copy.deepcopy(fitted)
        broken['mu'][0] = 1000.
        with self.assertRaises(ValueError):
            forecast(broken, 1, 2)
        for horizon, trials in ((0, 10), (1, 0)):
            with self.assertRaises(ValueError):
                forecast(fitted, 1, horizon, trials)


if __name__ == '__main__':
    unittest.main()
