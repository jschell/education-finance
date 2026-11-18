import sys,unittest
from pathlib import Path
import numpy as np
from scipy.linalg import cho_factor,cho_solve
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from revision_cost_estimator import ObservationLikelihood,covariance,bounded_drift,fit_synthetic

from revision_cost_synthetic import PARAMETERS,synthetic_graph

class EstimatorTests(unittest.TestCase):
    def test_block_likelihood_equals_independent_dense_and_covariance_keys(self):
        likelihood=ObservationLikelihood(synthetic_graph(schools=3,years=6));c,y,x,block,beta=likelihood.evaluate(PARAMETERS,dense=True)
        cf=cho_factor(c,lower=True);ci=cho_solve(cf,np.eye(len(c)));expected_beta=bounded_drift(x.T@ci@x,x.T@ci@y)
        r=y-x@expected_beta
        dense=.5*(len(y)*np.log(2*np.pi)+2*np.log(np.diag(cf[0])).sum()+r@ci@r)
        self.assertAlmostEqual(block,dense,places=8);np.testing.assert_allclose(beta,expected_beta,atol=1e-10)
        self.assertTrue(likelihood.design_diagnostic()['supported'])
        # Independent explicit raw covariance then contrasts; no use of the
        # low-rank or school temporal matrices to build this reference.
        raw=[];transforms=[]
        for b in likelihood.blocks:
            rows=b['rows'];n=len(rows);h=np.zeros((n-1,n));h[:,0]=-1;h[:,1:]=np.eye(n-1)
            transforms.append(np.kron(h,np.eye(2)));raw.extend(rows)
        from scipy.linalg import block_diag
        transform=block_diag(*transforms);reference=np.zeros((2*len(raw),2*len(raw)))
        for a,ra in enumerate(raw):
            for z,rz in enumerate(raw):
                ta=ra['academicYear']-likelihood.start;tz=rz['academicYear']-likelihood.start
                value=min(ta,tz)*covariance(PARAMETERS[:3])
                if ra['unitid']==rz['unitid']:
                    value=value+min(ta,tz)*covariance(PARAMETERS[3:6])+.5**abs(ta-tz)*covariance(PARAMETERS[6:9])/.75
                if ra['key']==rz['key']:value=value+covariance(PARAMETERS[9:12])
                reference[2*a:2*a+2,2*z:2*z+2]=value
        np.testing.assert_allclose(c,transform@reference@transform.T,atol=1e-12)

    def test_analytic_gradient_matches_finite_difference(self):
        likelihood=ObservationLikelihood(synthetic_graph(schools=3,years=6));_,gradient,_=likelihood.evaluate(PARAMETERS,True)
        for k in range(12):
            a=PARAMETERS.copy();b=PARAMETERS.copy();a[k]-=1e-6;b[k]+=1e-6
            finite=(likelihood.evaluate(b)[0]-likelihood.evaluate(a)[0])/2e-6
            self.assertAlmostEqual(gradient[k],finite,delta=max(.002,abs(finite)*1e-5))

    def test_offsets_duplicates_short_support_and_historical_gate(self):
        graph=synthetic_graph(schools=2,years=5);original=ObservationLikelihood(graph).evaluate(PARAMETERS)[0]
        for r in graph['observations']:r['logValues']=(np.array(r['logValues'])+[20.,-10.]).tolist()
        self.assertAlmostEqual(original,ObservationLikelihood(graph).evaluate(PARAMETERS)[0],places=8)
        graph['kind']='historical'
        with self.assertRaisesRegex(ValueError,'Historical fitting blocked'):fit_synthetic(graph)
        graph['observations'].append(graph['observations'][0])
        with self.assertRaisesRegex(ValueError,'Duplicate'):ObservationLikelihood(graph)
        self.assertFalse(ObservationLikelihood(synthetic_graph(schools=1,years=6)).design_diagnostic()['supported'])
        self.assertEqual(fit_synthetic(synthetic_graph(schools=1,years=6))['status'],'identification-unsupported')
        self.assertFalse(ObservationLikelihood(synthetic_graph(schools=2,years=3)).design_diagnostic()['supported'])
        report=fit_synthetic(synthetic_graph(schools=2,years=5),maxiter=1)
        self.assertEqual(report['status'],'nonconverged');self.assertIsNone(report['parameters'])

    def test_correlated_drift_bound_is_profiled_not_independently_clipped(self):
        info=np.array([[2.,1.],[1.,2.]]);linear=info@np.array([1.,-.1]);beta=bounded_drift(info,linear)
        np.testing.assert_allclose(beta,[.2,.2],atol=1e-12)
        self.assertLess(beta@info@beta-2*beta@linear,np.array([.2,-.1])@info@np.array([.2,-.1])-2*np.array([.2,-.1])@linear)

if __name__=='__main__':unittest.main()
