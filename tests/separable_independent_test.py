"""Independent checks from innovation loadings and Gaussian regression identities."""
import copy
import pathlib
import sys
import unittest
from unittest.mock import patch
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from revision_cost_predictive import generated
from separable_cost_predictive import fit, posterior, future_rows, conditional, draws


def innovation_covariances(graph, target, horizons):
    """Build full loadings before contrasts; no estimator kernel functions."""
    rows = graph['observations']
    origin = max(r['academicYear'] for r in rows)
    start = min(r['academicYear'] for r in rows)
    last = origin - start + horizons - 1
    phi = .5
    def latent(school, time):
        v = {}
        for year in range(1, time + 1):
            v['shared', year] = 1.
            v['permanent', school, year] = 1.
            v['temporary', school, year] = phi ** (time-year)
        v['temporary', school, 0] = phi ** time / np.sqrt(1-phi**2)
        return v
    def diff(a, b):
        return {k: a.get(k, 0.)-b.get(k, 0.) for k in a.keys() | b.keys()}
    groups = {}
    for row in rows:
        groups.setdefault(str(row['unitid']), []).append(row)
    observed = []
    for school, records in sorted(groups.items()):
        vectors = []
        for r in sorted(records, key=lambda r: (r['academicYear'], r['key'])):
            v = latent(int(school), r['academicYear']-start)
            v['measurement', r['key']] = 1.
            vectors.append(v)
        observed.extend(diff(v, vectors[0]) for v in vectors[1:])
    origin_vector = latent(target, origin-start)
    future = [diff(latent(target, origin-start+h), origin_vector) for h in range(horizons)]
    keys = sorted(set().union(*(v.keys() for v in observed+future)), key=repr)
    b = np.array([[v.get(k, 0.) for k in keys] for v in observed])
    f = np.array([[v.get(k, 0.) for k in keys] for v in future])
    return b@b.T, f@b.T, f@f.T


class IndependentSeparableTests(unittest.TestCase):
    def setUp(self):
        self.graph, _, _ = generated(814532, transitions=3, schools=3,
                                    parameters=np.tile([.04,.03,.25],4))
        self.model = fit(self.graph)

    def test_loading_gram_recovers_past_cross_and_future_covariances(self):
        expected_k, expected_c, expected_z = innovation_covariances(self.graph, 1, 10)
        _, actual_c, actual_z = future_rows(self.model, horizons=10, target=1)
        np.testing.assert_allclose(self.model['rowCovariance'], expected_k, atol=1e-13)
        np.testing.assert_allclose(actual_c, expected_c, atol=1e-13)
        np.testing.assert_allclose(actual_z, expected_z, atol=1e-13)

    def test_drift_integration_equals_diffuse_gaussian_joint_conditioning(self):
        # A proper N(0,tau Q) drift prior converges to the reference-prior mean
        # and conditional row covariance. Solve only the full joint Gaussian.
        m = self.model
        z, c, zz = future_rows(m, horizons=8, target=2)
        x, k, y = m['x'], m['rowCovariance'], m['y']
        tau = 1e7
        obs_cov = k + tau*x@x.T
        future_cov = zz + tau*z@z.T
        cross = c + tau*z@x.T
        expected_mean = cross@np.linalg.solve(obs_cov,y)
        expected_cov = future_cov-cross@np.linalg.solve(obs_cov,cross.T)
        actual_mean, actual_cov = conditional(m, horizons=8, target=2)
        np.testing.assert_allclose(actual_mean, expected_mean, atol=2e-7)
        np.testing.assert_allclose(actual_cov, expected_cov, atol=1e-5)

    def test_posterior_is_equivariant_under_outcome_and_row_transformations(self):
        m = self.model
        a = np.array([[1., .4],[-.3, 1.2]])
        transformed = posterior(m['y']@a, m['x'], m['rowCovariance'])
        np.testing.assert_allclose(transformed['drift'], m['drift']@a, atol=1e-13)
        np.testing.assert_allclose(transformed['scale'], a.T@m['scale']@a, atol=1e-13)
        n = len(m['y'])
        h = np.eye(n)+np.tril(np.ones((n,n)),-1)*.02
        row_changed = posterior(h@m['y'],h@m['x'],h@m['rowCovariance']@h.T)
        np.testing.assert_allclose(row_changed['scale'],m['scale'],atol=1e-13)
        np.testing.assert_allclose(row_changed['drift'],m['drift'],atol=1e-13)
        self.assertEqual(transformed['nu'],m['nu'])

    def test_joint_draw_covariance_preserves_horizon_and_component_dependence(self):
        m = self.model
        mean, row = conditional(m, horizons=5, integrate_drift=False)
        sample = draws(m, 71635, count=40000, horizons=5, integrated=False)
        expected = np.kron(row[1:,1:], m['scale']/m['nu'])
        actual = np.cov(sample[:,1:,:].reshape(40000,-1), rowvar=False)
        self.assertLess(np.linalg.norm(actual-expected)/np.linalg.norm(expected), .025)
        np.testing.assert_allclose(sample[:,1:,:].mean(axis=0),mean[1:,:],atol=.002)

    def test_prediction_failure_and_exponential_overflow_stay_unavailable(self):
        from run_separable_cost_study import cell
        with patch('run_separable_cost_study.draws', side_effect=ValueError('forced prediction failure')):
            result = cell(2026112301, 3, 'matched')
        self.assertEqual(result['status'], 'unavailable')
        self.assertNotIn('integrated', result)
        # Force overflow after a successful fit, not a malformed input graph.
        with patch('run_separable_cost_study.draws', return_value=np.full((2,13,2),1000.)):
            result = cell(2026112301, 3, 'matched')
        self.assertEqual(result['status'], 'unavailable')
        self.assertNotIn('integrated', result)
        self.assertNotIn('plugin', result)

    def test_nonfinite_scores_and_finite_arithmetic_overflow_fail_closed(self):
        from run_separable_cost_study import score
        with self.assertRaises((ValueError,FloatingPointError)):
            score(np.array([1.,np.inf]),1.)
        with self.assertRaises((ValueError,FloatingPointError)):
            score(np.full(8,1e308),1.)

    def test_no_information_and_indefinite_covariance_fail_closed(self):
        m = self.model
        with self.assertRaises(ValueError):
            posterior(m['y'], np.zeros_like(m['x']),m['rowCovariance'])
        bad = m['rowCovariance'].copy()
        bad[0,0] = -1.
        with self.assertRaises((ValueError,np.linalg.LinAlgError)):
            posterior(m['y'],m['x'],bad)
        bad = m['rowCovariance'].copy()
        bad[0,1] += .01
        with self.assertRaises(ValueError):
            posterior(m['y'],m['x'],bad)


if __name__ == '__main__':
    unittest.main()
