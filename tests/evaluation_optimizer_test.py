import sys,unittest
from pathlib import Path
import numpy as np
from scipy.optimize import minimize
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from evaluation_optimizer import project,to_y,to_z,evaluate_y,starts,mapping,EvaluationLikelihood
from covariance_coordinate_audit import DirectLikelihood,to_coordinate,violation
from revision_cost_predictive import generated,PARAMETERS
class OptimizerTests(unittest.TestCase):
    def test_projection_matches_independent_constrained_minimization(self):
        for seed in range(6):
            rng=np.random.default_rng(seed);target=rng.normal(size=12)*3;y,_=project(target)
            self.assertLessEqual(violation(to_z(y)),1e-10);again,_=project(y);np.testing.assert_allclose(y,again,atol=1e-11)
            def h(x):
                a=x.reshape(4,3);return 2*a[:,0]*a[:,1]-a[:,2]**2
            r=minimize(lambda x:.5*np.sum((x-target)**2),np.tile([1.,1.,0.],4),jac=lambda x:x-target,method='SLSQP',bounds=[(0,25),(0,25),(None,None)]*4,constraints=[{'type':'ineq','fun':h}],options={'ftol':1e-12,'maxiter':2000})
            self.assertLessEqual(.5*np.sum((y-target)**2),r.fun+1e-6)
        target=np.tile([40.,-2.,5.],4);y,_=project(target);self.assertLessEqual(violation(to_z(y)),1e-10)
    def test_boundary_normal_projection_and_gradient_chain(self):
        zero=np.zeros(12);self.assertEqual(mapping(zero,np.tile([1.,1.,0.],4)),0.)
        g,_,_=generated(1,3,3);l=EvaluationLikelihood(g);old=DirectLikelihood(g);z=to_coordinate(PARAMETERS)
        a,gg,bb=l.evaluate(z,True);aa,gold,bold=old.evaluate(z,True);self.assertEqual(a,aa);np.testing.assert_array_equal(gg,gold);np.testing.assert_array_equal(bb,bold)
        y=to_y(to_coordinate(PARAMETERS));f,grad,b=evaluate_y(l,y,True)
        for k in range(12):
            a=y.copy();z=y.copy();a[k]-=1e-6;z[k]+=1e-6
            finite=(evaluate_y(l,z)[0]-evaluate_y(l,a)[0])/2e-6
            self.assertAlmostEqual(grad[k],finite,delta=max(.001,abs(finite)*1e-5))
    def test_prespecified_starts_and_rejection(self):
        self.assertEqual(len(starts()),11);self.assertEqual([x[0] for x in starts()],['sd-.02','sd-.10','warm',*[f'sobol-{i}' for i in range(8)]])
        with self.assertRaises(ValueError):project(np.full(12,np.nan))
if __name__=='__main__':unittest.main()
