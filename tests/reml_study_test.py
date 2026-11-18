import sys,unittest
from pathlib import Path
import numpy as np
from scipy.linalg import cho_factor,cho_solve
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from revision_cost_estimator import ObservationLikelihood
from revision_cost_synthetic import synthetic_graph,PARAMETERS
from revision_cost_trace import traced_synthetic_graph
from revision_cost_reml import StudyLikelihood,diagnose_geometry,drift_contract,fit_study,nuisance_profile

class RemlTests(unittest.TestCase):
    def test_instrumentation_replays_original_observations_and_realized_shocks(self):
        for seed in range(2026111801,2026111807):
            for bias in [False,True]:
                graph,trace=traced_synthetic_graph(seed,bias=bias);self.assertEqual(graph,synthetic_graph(seed,bias=bias))
                draws=np.array(trace['sharedInnovations'][1:]);self.assertEqual(trace['effectiveTransitions'],23)
                np.testing.assert_allclose(trace['transitionMean'],draws.mean(axis=0))
                np.testing.assert_allclose(trace['sampleCovarianceNMinus1'],np.cov(draws,rowvar=False,ddof=1))
                np.testing.assert_allclose(np.array(trace['centeredCovarianceN'])+np.outer(draws.mean(axis=0),draws.mean(axis=0)),trace['knownZeroSecondMoment'])

    def test_ml_equivalence_and_reml_matches_dense_and_orthogonal_contrasts(self):
        graph=synthetic_graph(schools=3,years=6);old=ObservationLikelihood(graph);ml=StudyLikelihood(graph,'ml');reml=StudyLikelihood(graph,'reml')
        f,g,b=old.evaluate(PARAMETERS,True);ff,gg,bb=ml.evaluate(PARAMETERS,True)
        self.assertAlmostEqual(f,ff,places=10);np.testing.assert_allclose(g,gg,atol=1e-10);np.testing.assert_allclose(b,bb,atol=1e-10)
        c,y,x,r,beta=reml.evaluate(PARAMETERS,dense=True);cf=cho_factor(c,lower=True);ci=cho_solve(cf,np.eye(len(c)));info=x.T@ci@x;bh=np.linalg.solve(info,x.T@ci@y);residual=y-x@bh
        dense=.5*((len(y)-2)*np.log(2*np.pi)+np.linalg.slogdet(c)[1]+np.linalg.slogdet(info)[1]+residual@ci@residual)
        self.assertAlmostEqual(r,dense,places=8);np.testing.assert_allclose(beta,bh,atol=1e-10)
        q=np.linalg.qr(x,mode='complete')[0];k=q[:,2:].T;kc=k@c@k.T;ky=k@y
        contrast=.5*(len(ky)*np.log(2*np.pi)+np.linalg.slogdet(kc)[1]+ky@np.linalg.solve(kc,ky))
        self.assertAlmostEqual(r,contrast+.5*np.linalg.slogdet(x.T@x)[1],places=8)

    def test_reml_and_known_drift_covariance_gradients_match_finite_differences(self):
        graph=synthetic_graph(schools=3,years=6)
        for mode in ['known-drift','reml']:
            likelihood=StudyLikelihood(graph,mode);_,gradient,beta=likelihood.evaluate(PARAMETERS,True)
            if mode=='known-drift':np.testing.assert_equal(beta,[.02,.01])
            for index in range(12):
                a=PARAMETERS.copy();z=PARAMETERS.copy();a[index]-=1e-6;z[index]+=1e-6
                difference=(likelihood.evaluate(z)[0]-likelihood.evaluate(a)[0])/2e-6
                self.assertAlmostEqual(gradient[index],difference,delta=max(.002,abs(difference)*1e-5))

    def test_bound_geometry_separates_constrained_minimum_from_feasible_saddle(self):
        bounds=[(0.,1.),(-1.,1.)];h=np.diag([-1.,2.])
        minimum=diagnose_geometry(np.array([0.,0.]),np.array([1.,0.]),h,bounds)
        self.assertEqual(minimum['classification'],'constraint-limited');self.assertTrue(minimum['legacyUnconstrainedWarning']);self.assertEqual(minimum['criticalCoordinates'],[1])
        self.assertGreater(.01-.5*.01**2,0.) # actual feasible toy objective rises
        saddle=diagnose_geometry(np.array([.5,0.]),np.zeros(2),h,bounds)
        self.assertEqual(saddle['classification'],'nonpositive-free-curvature')
        weak=diagnose_geometry(np.zeros(2),np.zeros(2),h,bounds);self.assertEqual(weak['classification'],'weak-bound-unresolved')
        bad=diagnose_geometry(np.zeros(2),np.array([-1.,0.]),h,bounds);self.assertEqual(bad['classification'],'nonstationary')

    def test_drift_contract_and_history_block_remain_explicit(self):
        self.assertEqual(drift_contract([.2,0.]),'drift-contract-unsupported');self.assertEqual(drift_contract([.02,.01]),'interior-drift')
        graph=synthetic_graph(schools=2,years=5)
        for row in graph['observations']:row['logValues']=(np.array(row['logValues'])+[row['academicYear']-2000,0.]).tolist()
        _,beta=StudyLikelihood(graph,'reml').evaluate(PARAMETERS);self.assertGreater(beta[0],.2)
        graph['kind']='historical'
        with self.assertRaisesRegex(ValueError,'Historical fitting blocked'):fit_study(graph)
        self.assertEqual(nuisance_profile(graph,'ml',{'parameters':None})['status'],'selected-fit-unavailable')
        self.assertEqual(fit_study(synthetic_graph(schools=2,years=5),maxiter=1)['status'],'nonconverged')

if __name__=='__main__':unittest.main()
