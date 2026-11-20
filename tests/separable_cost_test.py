"""Independent algebra, distribution and guard checks for separable study."""
import copy
import pathlib
import sys
import unittest
import numpy as np
from scipy.linalg import block_diag
from scipy.stats import t
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from revision_cost_predictive import generated, BalancedLikelihood, conditional as frozen_conditional
from revision_cost_estimator import covariance
from separable_cost_predictive import fit, posterior, conditional, marginal_interval, draws


class SeparableTests(unittest.TestCase):
    def setUp(self):
        # Dedicated arithmetic fixture seed, outside the fresh screening batch.
        self.parameters = np.tile([.04, .03, .25], 4)
        self.graph, _, _ = generated(340913, transitions=3, parameters=self.parameters)
        self.model = fit(self.graph)

    def test_dense_likelihood_and_conditional_kernel_agree(self):
        model = self.model
        old = BalancedLikelihood(self.graph, 'reml')
        _, a, m, *_ = old.matrices(self.parameters)
        dense = block_diag(*([a] * old.schools))
        dense += np.kron(np.ones((old.schools, old.schools)),
                         np.kron(old.shared, covariance(self.parameters[:3])))
        np.testing.assert_allclose(np.kron(model['rowCovariance'], covariance(self.parameters[:3])), dense, atol=1e-15)
        beta = old.evaluate(self.parameters)[1]
        np.testing.assert_allclose(model['drift'].ravel(), beta, atol=1e-13)
        # Frozen conditional excludes drift integration: independent code path.
        fmean, fcov, *_ = frozen_conditional(old, self.parameters, beta, horizons=13, targets=(0,))
        mean, row = conditional(model, integrate_drift=False)
        np.testing.assert_allclose(mean.ravel(), fmean, atol=1e-13)
        np.testing.assert_allclose(np.kron(row, covariance(self.parameters[:3])), fcov, atol=1e-13)
        self.assertEqual(model['nu'], 55)

    def test_whitened_regression_and_joint_integration(self):
        model = self.model
        lower = np.linalg.cholesky(model['rowCovariance'])
        wx = np.linalg.solve(lower, model['x'])
        wy = np.linalg.solve(lower, model['y'])
        beta = np.linalg.lstsq(wx, wy, rcond=None)[0]
        residual = wy - wx @ beta
        np.testing.assert_allclose(beta, model['drift'], atol=1e-13)
        np.testing.assert_allclose(residual.T @ residual, model['scale'], atol=1e-13)
        mean, row = conditional(model)
        sample = draws(model, 12049, count=60000)
        expected = row[4, 4] * model['scale'] / (model['nu']-3)
        actual = np.cov(sample[:, 4, :].T)
        np.testing.assert_allclose(actual, expected, atol=.00016, rtol=.04)
        for component in (0, 1):
            analytical = marginal_interval(model, 4, component)
            empirical = np.quantile(sample[:, 4, component], [.1, .9])
            np.testing.assert_allclose(empirical, analytical, atol=.002)
        self.assertTrue(np.all(sample[:, 0, :] == 0))
        np.testing.assert_array_equal(draws(model, 9, count=8), draws(model, 9, count=8))
        # Integrated row covariance is PSD larger by the drift uncertainty term.
        _, fixed_row = conditional(model, integrate_drift=False)
        self.assertGreaterEqual(np.linalg.eigvalsh((row-fixed_row)[1:, 1:])[0], -1e-12)

    def test_missing_worlds_cannot_pass_screen(self):
        from run_separable_cost_study import ARMS, summary
        cells = [{'seed': seed, 'depth': depth, 'arm': arm, 'status': 'unavailable'}
                 for seed in range(2026112301, 2026112365) for depth in (3, 7, 12) for arm in ARMS]
        result = summary(cells)
        self.assertFalse(result['availabilityPass'])
        self.assertFalse(result['matchedScreenPass'])
        for group in result['groups']:
            self.assertEqual(group['total'], 64)
            self.assertEqual(group['available'], 0)
            self.assertIsNone(group['waits']['0']['integrated']['coverage'])
        with self.assertRaises(ValueError):
            summary(cells[:-1])
        with self.assertRaises(ValueError):
            summary(cells[:-1] + [cells[0]])

    def test_singular_and_historical_inputs_fail_closed(self):
        with self.assertRaises(ValueError):
            fit({'kind': 'historical', 'observations': self.graph['observations']})
        repeated = copy.deepcopy(self.graph)
        repeated['observations'].append(repeated['observations'][0])
        with self.assertRaises(ValueError):
            fit(repeated)
        for n in (3, 4, 8):
            with self.assertRaises(ValueError):
                posterior(np.ones((n, 2)), np.ones((n, 1)), np.eye(n))
        with self.assertRaises((ValueError, np.linalg.LinAlgError)):
            posterior(np.arange(16).reshape(8, 2), np.ones((8, 1)), np.zeros((8, 8)))
        with self.assertRaises(ValueError):
            posterior(np.full((8, 2), np.nan), np.ones((8, 1)), np.eye(8))


if __name__ == '__main__':
    unittest.main()
