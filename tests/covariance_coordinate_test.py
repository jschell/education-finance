import sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from covariance_coordinate_audit import DirectLikelihood,to_coordinate,to_parameters,cones,cone_jac,kkt,violation
from revision_cost_predictive import generated,BalancedLikelihood,PARAMETERS
class CovarianceTests(unittest.TestCase):
    def test_independent_objective_gradient_and_covariance_mapping(self):
        g,_,_=generated(4,3,3);d=DirectLikelihood(g);old=BalancedLikelihood(g);z=to_coordinate(PARAMETERS)
        np.testing.assert_allclose(to_parameters(z),PARAMETERS,atol=1e-14)
        f,grad,beta=d.evaluate(z,True);ff,bb=old.evaluate(PARAMETERS)
        self.assertAlmostEqual(f,ff,places=9);np.testing.assert_allclose(beta,bb,atol=1e-11)
        for k in range(12):
            a=z.copy();b=z.copy();a[k]-=1e-6;b[k]+=1e-6
            self.assertAlmostEqual(grad[k],(d.evaluate(b)[0]-d.evaluate(a)[0])/2e-6,delta=max(.001,abs(grad[k])*2e-5))
        for k in range(12):
            a=z.copy();b=z.copy();a[k]-=1e-6;b[k]+=1e-6
            np.testing.assert_allclose(cone_jac(z)[:,k],(cones(b)-cones(a))/2e-6,atol=1e-8)
    def test_zero_variance_correlation_is_not_identified(self):
        z=to_coordinate(PARAMETERS);z[:3]=[0,0,0];self.assertEqual(to_parameters(z)[2],0.)
        result=kkt(z,np.zeros(12));self.assertFalse(result['qualification']);self.assertFalse(result['firstOrderVerified']);self.assertIn(0,result['zeroGradientCones'])
        z[2]=.01;self.assertGreater(violation(z),0)
        with self.assertRaises(ValueError):to_parameters(z)
    def test_kkt_box_constraints_and_nonstationarity(self):
        z=to_coordinate(PARAMETERS);self.assertTrue(kkt(z,np.zeros(12))['firstOrderVerified'])
        self.assertFalse(kkt(z,np.ones(12))['firstOrderVerified'])
    def test_historical_data_are_rejected(self):
        g,_,_=generated(4,3,3)
        with self.assertRaisesRegex(ValueError,'Historical'):DirectLikelihood({**g,'kind':'historical'})
if __name__=='__main__':unittest.main()
