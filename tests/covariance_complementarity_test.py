import sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_covariance_complementarity import complementarity
from covariance_coordinate_audit import to_coordinate,RHO
from revision_cost_predictive import PARAMETERS
class ComplementarityTests(unittest.TestCase):
    def candidate(self):return {'status':'first-order-verified','coordinates':to_coordinate(PARAMETERS).tolist(),'kkt':{'active':[],'multipliers':[],'zeroGradientCones':[]}}
    def test_inactive_and_lower_box_slack(self):
        c=self.candidate();self.assertEqual(complementarity(c)['maximumAbsoluteProduct'],0.)
        c['coordinates'][0]=5e-8;c['kkt']['active']=['lower:0'];c['kkt']['multipliers']=[10.]
        self.assertAlmostEqual(complementarity(c)['maximumAbsoluteProduct'],5e-7);self.assertEqual(complementarity(c)['status'],'supplemental-kkt-screen-pass')
        c['coordinates'][0]=-5e-8;self.assertLess(complementarity(c)['constraints'][0]['normalizedSlack'],0)
        c['kkt']['multipliers']=[100.];self.assertEqual(complementarity(c)['status'],'unresolved')
    def test_cone_slack_and_unresolved_prior(self):
        c=self.candidate();c['coordinates'][:3]=[1.,1.,RHO-1e-8];c['kkt']['active']=['cone:0'];c['kkt']['multipliers']=[2.]
        out=complementarity(c);self.assertEqual(out['status'],'supplemental-kkt-screen-pass');self.assertGreater(out['maximumAbsoluteProduct'],0)
        c['status']='unresolved';self.assertEqual(complementarity(c)['status'],'unresolved')
    def test_missing_and_zero_gradient_do_not_pass(self):
        self.assertEqual(complementarity(None)['status'],'unresolved');c=self.candidate();c['kkt']['zeroGradientCones']=[0];self.assertEqual(complementarity(c)['status'],'unresolved')
        c=self.candidate();c['kkt']['active']=['lower:0'];self.assertEqual(complementarity(c)['status'],'unresolved')
        c=self.candidate();c['coordinates'][:3]=[0,0,0];c['kkt']['active']=['cone:0'];c['kkt']['multipliers']=[1.];self.assertEqual(complementarity(c)['status'],'unresolved')
if __name__=='__main__':unittest.main()
