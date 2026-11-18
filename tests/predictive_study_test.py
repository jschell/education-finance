import sys,unittest
from pathlib import Path
import numpy as np
from scipy.linalg import block_diag
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from revision_cost_predictive import generated,BalancedLikelihood,PARAMETERS,DRIFT,conditional,forecast_draws,fit_balanced
from revision_cost_reml import StudyLikelihood
from revision_cost_estimator import covariance

class PredictiveTests(unittest.TestCase):
    def test_generator_prefixes_do_not_change_with_years_or_school_count(self):
        g,x,shocks=generated(9123,7,8);gg,xx,ss=generated(9123,12,32)
        np.testing.assert_array_equal(x,xx[:8,:len(x[0])]);np.testing.assert_array_equal(shocks,ss[:len(shocks)])
        lookup={r['key']:r for r in gg['observations']}
        for r in g['observations']:self.assertEqual(r,lookup[r['key']])

    def test_balanced_likelihood_gradient_and_solves_match_generic(self):
        graph,_,_=generated(9124,3,3)
        for mode in ['ml','reml']:
            a=BalancedLikelihood(graph,mode);b=StudyLikelihood(graph,mode)
            for p in [PARAMETERS,PARAMETERS*np.tile([1.2,.8,1.],4)]:
                f,g,beta=a.evaluate(p,True);ff,gg,bb=b.evaluate(p,True)
                self.assertAlmostEqual(f,ff,places=9);np.testing.assert_allclose(g,gg,rtol=1e-9,atol=1e-8);np.testing.assert_allclose(beta,bb,atol=1e-11)
                c,y,x,*_=b.evaluate(p,dense=True);rhs=np.arange(len(y)*2).reshape(a.schools,-1,2)/100
                np.testing.assert_allclose(a.solve(p,rhs).reshape(len(y),2),np.linalg.solve(c,rhs.reshape(len(y),2)),atol=1e-9)
                for k in range(12):
                    lo=p.copy();hi=p.copy();lo[k]-=1e-6;hi[k]+=1e-6
                    self.assertAlmostEqual(g[k],(a.evaluate(hi)[0]-a.evaluate(lo)[0])/2e-6,delta=max(.003,abs(g[k])*1e-5))

    def test_conditional_covariance_matches_dense_schur_complement(self):
        graph,_,_=generated(9125,3,3);a=BalancedLikelihood(graph);b=StudyLikelihood(graph)
        mean,cov,cross,kzz,design=conditional(a,PARAMETERS,DRIFT)
        c,y,x,*_=b.evaluate(PARAMETERS,dense=True);k=np.concatenate(list(cross),axis=1)
        np.testing.assert_allclose(mean,design@DRIFT+k@np.linalg.solve(c,y-x@DRIFT),atol=1e-11)
        np.testing.assert_allclose(cov,kzz-k@np.linalg.solve(c,k.T),atol=1e-11)
        self.assertGreater(np.linalg.eigvalsh(cov).min(),-1e-10)
        draws=forecast_draws(a,PARAMETERS,DRIFT,181,20);np.testing.assert_array_equal(draws[:,:,0,:],0)
        # Future shared shocks imply a strictly positive cross-school covariance.
        self.assertGreater(cov[26,54],0)

    def test_forecast_covariances_match_independent_raw_level_kernel(self):
        graph,_,_=generated(9126,3,3);a=BalancedLikelihood(graph)
        mean,cov,cross,kzz,design=conditional(a,PARAMETERS,DRIFT)
        qs=[covariance(PARAMETERS[k:k+3]) for k in range(0,12,3)]
        def kernel(i,t,j,u):
            return min(t,u)*qs[0]+(min(t,u)*qs[1]+.5**abs(t-u)*qs[2]/.75 if i==j else 0)
        observations=[(i,r['academicYear']-2000) for i,b in enumerate(a.blocks) for r in b['rows']]
        n=len(observations);raw=np.zeros((2*n,2*n))
        for k,(i,t) in enumerate(observations):
            for l,(j,u) in enumerate(observations):raw[2*k:2*k+2,2*l:2*l+2]=kernel(i,t,j,u)+(qs[3] if k==l else 0)
        hs=[]
        for b in a.blocks:
            m=len(b['rows']);h=np.column_stack([-np.ones(m-1),np.eye(m-1)]);hs.append(np.kron(h,np.eye(2)))
        h=block_diag(*hs);rawcross=np.zeros((56,2*n));zz=np.zeros((56,56))
        for i in range(2):
            for future in range(14):
                sl=slice(28*i+2*future,28*i+2*future+2)
                for k,(j,u) in enumerate(observations):rawcross[sl,2*k:2*k+2]=kernel(i,3+future,j,u)-kernel(i,3,j,u)
                for j in range(2):
                    for other in range(14):
                        sk=slice(28*j+2*other,28*j+2*other+2)
                        zz[sl,sk]=kernel(i,3+future,j,3+other)-kernel(i,3+future,j,3)-kernel(i,3,j,3+other)+kernel(i,3,j,3)
        k=rawcross@h.T;np.testing.assert_allclose(k,np.concatenate(list(cross),axis=1),atol=1e-14)
        np.testing.assert_allclose(zz,kzz,atol=1e-14)
        np.testing.assert_allclose(cov,zz-k@np.linalg.solve(h@raw@h.T,k.T),atol=1e-12)

    def test_oracle_standardized_errors_have_expected_coverage(self):
        z=[]
        for seed in range(512):
            graph,latent,_=generated(100000+seed,7,3);a=BalancedLikelihood(graph);mean,cov,*_=conditional(a,PARAMETERS,DRIFT)
            truth=(latent[:2,7:21]-latent[:2,7,None,:]).reshape(-1)
            # One prespecified outer-world observation, not 56 pseudo-replicates.
            index=2*8;z.append((truth[index]-mean[index])/np.sqrt(cov[index,index]))
        z=np.array(z);self.assertLess(abs(z.mean()),.16);self.assertLess(abs(np.mean(z*z)-1),.22)
        self.assertTrue(.74<np.mean(np.abs(z)<=1.2815515655446004)<.86)

    def test_historical_and_unbalanced_inputs_are_rejected(self):
        g,_,_=generated(1,3,3)
        with self.assertRaisesRegex(ValueError,'Historical'):fit_balanced({**g,'kind':'historical'})
        with self.assertRaisesRegex(ValueError,'Unbalanced'):BalancedLikelihood({**g,'observations':g['observations'][:-1]})
        with self.assertRaises(ValueError):generated(1,scenario='unknown')

if __name__=='__main__':unittest.main()
