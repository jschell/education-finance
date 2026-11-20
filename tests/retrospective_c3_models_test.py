"""Mathematical checks of the frozen annual location/scale rule."""
import copy
import pathlib
import sys
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from retrospective_c3_models import calibrate, apply


def record(year, unitid, error, variance):
    return {'targetYear': year, 'unitid': unitid, 'sector': 'public4',
            'error': error, 'variance': variance, 'inputHash': 'a'*64}


class AnnualCalibrationMathTests(unittest.TestCase):
    def test_hand_computed_calendar_weighted_bias_and_scale(self):
        rows = [record(2005, 1, [.1, -.2], [.04, .09]),
                record(2005, 2, [.3, 0], [.04, .09]),
                record(2006, 1, [-.1, .2], [.04, .09]),
                record(2007, 1, [.2, .1], [.04, .09])]
        result = calibrate(rows, 2008, 2008)
        b = np.array([.2-.1+.2, -.1+.2+.1])/8
        yearly = []
        for year in (2005, 2006, 2007):
            yearly.append(np.mean([(np.array(r['error'])-b)**2/np.array(r['variance'])
                                   for r in rows if r['targetYear']==year], axis=0))
        np.testing.assert_allclose(result['b'], b, atol=1e-16)
        np.testing.assert_allclose(result['scale'], np.sqrt((5+sum(yearly))/8), atol=1e-16)
        self.assertEqual(result['nYears'], 3)

    def test_schools_do_not_create_extra_calendar_weight(self):
        rows = [record(year, 1, [.1*year/2000, -.05], [.03, .04]) for year in range(2003,2008)]
        replicated = [{**r, 'unitid': unitid} for r in rows for unitid in (1,2,3,4,5,6,8,9,10,11)]
        a, b = calibrate(rows, 2008, 2008), calibrate(replicated, 2008, 2008)
        self.assertEqual(a['nYears'], b['nYears'])
        np.testing.assert_allclose(a['b'], b['b'], atol=1e-16)
        np.testing.assert_allclose(a['scale'], b['scale'], atol=1e-16)

    def test_transform_has_declared_mean_and_component_covariance(self):
        logs = np.array([[[.02,.04],[.03,.06]], [[.04,.08],[.05,.10]], [[.06,.12],[.07,.14]]])
        calibration = {'status':'available','b':np.array([.01,-.02]),'scale':np.array([.8,1.2])}
        changed = np.log(apply(np.exp(logs), calibration))
        np.testing.assert_allclose(changed.mean(axis=0), logs.mean(axis=0)+calibration['b'], atol=1e-15)
        for h in range(2):
            expected = np.diag(calibration['scale']) @ np.cov(logs[:,h,:], rowvar=False, ddof=0) @ np.diag(calibration['scale'])
            np.testing.assert_allclose(np.cov(changed[:,h,:], rowvar=False, ddof=0), expected, atol=1e-15)

    def test_identity_fallback_is_bitwise_and_does_not_mutate(self):
        rows = [record(2005,1,[.1,.2],[.1,.2]), record(2006,1,[.2,.3],[.1,.2])]
        calibration = calibrate(rows,2008,2008)
        self.assertEqual(calibration['status'],'identity-fallback')
        paths = np.exp(np.arange(30).reshape(5,3,2)*.001)
        before = paths.copy()
        changed = apply(paths,calibration)
        np.testing.assert_array_equal(changed,paths)
        changed[0,0,0] = 99
        np.testing.assert_array_equal(paths,before)

    def test_zero_variance_is_neutral_only_for_zero_residual(self):
        zero = [record(year,1,[0,0],[0,0]) for year in range(2003,2006)]
        result = calibrate(zero,2006,2006)
        np.testing.assert_array_equal(result['b'],[0,0])
        np.testing.assert_array_equal(result['scale'],[1,1])
        with self.assertRaises(ValueError):
            calibrate([record(year,1,[.1,0],[0,0]) for year in range(2003,2006)],2006,2006)

    def test_last_five_years_and_permutation_are_fixed(self):
        rows = [record(year,1,[.01*(year-2000),.02],[.04,.05]) for year in range(2001,2010)]
        original = copy.deepcopy(rows)
        a, b = calibrate(rows,2010,2009), calibrate(rows[::-1],2010,2009)
        self.assertEqual(a['targetYears'],[2005,2006,2007,2008,2009])
        np.testing.assert_array_equal(a['b'],b['b'])
        np.testing.assert_array_equal(a['scale'],b['scale'])
        self.assertEqual(rows,original)


if __name__=='__main__':
    unittest.main()
