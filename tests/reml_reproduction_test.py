import copy,json,sys,unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from verify_reml_reproduction import check_trace,portable_verify

class ReproductionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.report=json.loads((ROOT/'data/calibration-diagnostics/reml-boundary-study.json').read_text())
    def test_roundoff_is_allowed_without_mutating_reference_or_actual_fits(self):
        actual=copy.deepcopy(self.report);before=copy.deepcopy(self.report)
        actual['worlds'][0]['trace']['sharedInnovations'][0][0]+=1e-16
        self.assertGreater(portable_verify(actual,self.report),0);self.assertEqual(self.report,before)
    def test_meaningful_values_metadata_shape_and_nonfinite_traces_fail(self):
        expected=self.report['worlds'][0]['trace']
        for mutate in [lambda t:t['sharedInnovations'][0].__setitem__(0,t['sharedInnovations'][0][0]+1e-8),lambda t:t.__setitem__('effectiveTransitions',24),lambda t:t.__setitem__('excludedFirstDraw',False),lambda t:t['sharedInnovations'].pop(),lambda t:t['transitionMean'].__setitem__(0,float('nan'))]:
            changed=copy.deepcopy(expected);mutate(changed)
            with self.assertRaises((ValueError,AssertionError)):check_trace(changed,expected)
    def test_fit_and_source_changes_still_fail_original_verifier(self):
        for mutate in [lambda r:r['sourceHashes'].__setitem__('new-source','x'),lambda r:r['worlds'][0]['methods']['reml']['parameters'].__setitem__(0,0.4),lambda r:r['worlds'][0].__setitem__('seed',0)]:
            changed=copy.deepcopy(self.report);mutate(changed)
            with self.assertRaises((ValueError,AssertionError)):portable_verify(changed,self.report)

if __name__=='__main__':unittest.main()
