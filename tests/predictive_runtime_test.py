import os,sys,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from verify_predictive_runtime import ENV,contract,changed_fit
class RuntimeTests(unittest.TestCase):
    def test_numerical_dispatch_and_versions_must_match(self):
        with patch.dict(os.environ,ENV),patch('verify_predictive_runtime.platform.python_version',return_value='3.12.14'):
            self.assertEqual(contract()['id'],'avx2-haswell-v1')
            for key in ENV:
                with patch.dict(os.environ,{key:'different'}):
                    with self.assertRaises(ValueError):contract()
            with patch('verify_predictive_runtime.platform.python_version',return_value='3.12.16'):
                with self.assertRaises(ValueError):contract()
    def test_cross_runtime_status_and_objective_failures_remain_visible(self):
        a={'status':'converged','parameters':[.02,.03],'objective':-195.302438}
        self.assertIsNone(changed_fit(a,dict(a)))
        b={**a,'objective':-195.297441};self.assertIsNotNone(changed_fit(a,b))
        self.assertIsNotNone(changed_fit(a,{'status':'nonconverged','parameters':None}))
        self.assertIsNotNone(changed_fit(a,{**a,'parameters':[.01,.03]}))
if __name__=='__main__':unittest.main()
