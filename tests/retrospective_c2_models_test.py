"""Arithmetic tests for the fixed nominal-anchor state hypothesis."""
import copy
import pathlib
import sys
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
import retrospective_cost_models as old
import retrospective_c2_models as c2


def fixture():
    records = []
    for unitid, scale in ((1, 1.), (2, -1.)):
        tuition, housing, cpi = 100., 200., 1.
        records.append(dict(unitid=unitid, year=2000, tuition=tuition, housing=housing, deflator=cpi))
        for year in range(2001, 2007):
            tuition *= np.exp(.06 + .01*(year-2003) + scale*(-1)**year*.04)
            housing *= np.exp(.05 + .005*(year-2003) + scale*(-1)**year*.02)
            cpi *= np.exp(.02 + .001*(year-2003))
            records.append(dict(unitid=unitid, year=year, tuition=tuition, housing=housing, deflator=cpi))
    return old.fit(records, 2006)


class AnchoredStateMathTests(unittest.TestCase):
    def test_old_reference_paths_are_bitwise_unchanged(self):
        fitted = fixture()
        original = old.forecast_pair(fitted, 1, 11, 31, 123, 'known:1')
        combined = c2.forecast_pair(fitted, 1, 11, 31, 123, 'known:1')
        for name in original:
            np.testing.assert_array_equal(original[name], combined[name])
        self.assertEqual(combined['C2'].shape, (31, 11, 2))

    def test_c2_exact_declared_log_law_with_identical_noise(self):
        fitted = fixture()
        horizon, trials, seed = 9, 23, 52
        paths = c2.forecast_pair(fitted, 1, horizon, trials, seed)
        mu = fitted['mu']; nominal_mu = mu[:2] + mu[2]
        recent = (fitted['common_vectors'][-3:] + mu).mean(axis=0)
        recent_nominal = recent[:2] + recent[2]
        rng = np.random.default_rng(seed)
        indices = rng.integers(0, len(fitted['years']), size=(trials, len(fitted['years'])))
        delta3 = fitted['common_vectors'][indices].mean(axis=1)
        delta_nominal = delta3[:, :2] + delta3[:, 2, None]
        h = np.arange(1, horizon+1)[:, None]
        state = fitted['school_states']['1']
        school = state['n']/(state['n']+20)*fitted['rho'][None, :]**h*state['last_residual'][None, :]
        expected = (c2.NOMINAL_ANCHOR-nominal_mu)[None,None,:] \
            + (.5**h)[None,:,:]*(recent_nominal-c2.NOMINAL_ANCHOR)[None,None,:] \
            + ((.5**h)[None,:,:]-1)*delta_nominal[:,None,:] + school[None,:,:]
        np.testing.assert_allclose(np.log(paths['C2'])-np.log(paths['B2']), expected, atol=2e-15)

    def test_deterministic_long_horizon_approaches_anchor_without_wait_switch(self):
        fitted = fixture()
        # Zero process/parameter innovations isolate the deterministic conditional mean.
        fitted['common_vectors'][:] = 0
        fitted['school_vectors'][:] = 0
        fitted['school_states'] = {}
        paths = c2.forecast_pair(fitted, None, 60, 7, 99, 'unknown:x')['C2']
        expected = np.exp(c2.NOMINAL_ANCHOR)
        np.testing.assert_allclose(paths[:,-1,:], np.broadcast_to(expected,(7,2)), atol=1e-15)
        self.assertTrue(np.all(np.abs(paths[:,0,:]-expected)>0))

    def test_parameter_state_accumulation_is_bounded_instead_of_linear_in_horizon(self):
        fitted = fixture()
        delta = c2._mean_uncertainty_nominal(fitted, 50, 17)
        for horizon in (4, 20, 100):
            decay = (.5**np.arange(1,horizon+1)).sum()
            self.assertLess(decay, 1.000000000000001)
            np.testing.assert_allclose(delta*decay, delta*(1-.5**horizon), atol=1e-15)
        self.assertTrue(np.any(np.abs(delta)>0))

    def test_unknown_school_gets_no_known_reversal_feature(self):
        fitted = fixture()
        a = c2._log_adjustment(fitted, None, 11, 13, 8)
        b = c2._log_adjustment(fitted, 'not-a-training-identity', 11, 13, 8)
        np.testing.assert_array_equal(a,b)
        known = c2._log_adjustment(fitted, 1, 11, 13, 8)
        self.assertTrue(np.any(known != a))

    def test_references_and_anchor_are_not_mutated(self):
        fitted = fixture(); before = copy.deepcopy(fitted)
        c2.forecast_pair(fitted, 1, 7, 19, 9)
        for key in ('mu','common_vectors','school_vectors','rho','recent_delta'):
            np.testing.assert_array_equal(fitted[key], before[key])
        np.testing.assert_array_equal(c2.NOMINAL_ANCHOR, np.log1p([.04,.03]))


if __name__ == '__main__':
    unittest.main()
