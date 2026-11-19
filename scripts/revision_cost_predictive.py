"""Synthetic balanced-panel likelihood and conditional latent-change prediction.

Exact school mean/residual decomposition; existing generic estimators remain frozen.
No historical fitting or production imports.
"""
import math
import numpy as np
from scipy.linalg import cho_factor, cho_solve
from revision_cost_estimator import ObservationLikelihood, BOUNDS, FAMILIES, covariance, derivatives, bounded_drift, curvature
from revision_cost_reml import diagnose_geometry, drift_contract
from scipy.optimize import minimize

PARAMETERS=np.array([.03,.02,.4,.04,.03,.2,.05,.04,.3,.02,.03,.1])
DRIFT=np.array([.02,.01])
PHI=.5


def generated(seed,transitions=12,schools=8,parameters=PARAMETERS,drift=DRIFT,scenario='ideal',future=13):
    if scenario not in ['ideal','correlated-reporting','reporting-shift','heavy-tails','permanent-jump','persistence']:
        raise ValueError('Unknown synthetic scenario')
    if not 3<=transitions<=48 or not 2<=schools<=32:raise ValueError('Unsupported synthetic grid')
    n=transitions+future+1;phi=.8 if scenario=='persistence' else PHI
    qs=[covariance(parameters[k:k+3]) for k in range(0,12,3)]
    def innovations(family,school,q):
        rng=np.random.default_rng(np.random.SeedSequence([int(seed),family,school]))
        # Fixed two columns and separate family/school streams preserve every prefix.
        z=rng.standard_t(5,size=(n,2))*math.sqrt(3/5) if scenario=='heavy-tails' else rng.standard_normal((n,2))
        values,vectors=np.linalg.eigh(q)
        return z@(vectors*np.sqrt(np.maximum(0,values))).T
    g=innovations(0,0,qs[0]);g[0]=0
    common=np.arange(n)[:,None]*drift+np.cumsum(g,axis=0)
    latent=[];observed=[]
    for school in range(schools):
        u=innovations(1,school,qs[1]);u[0]=0
        v=innovations(2,school,qs[2]);v[0]/=math.sqrt(1-phi*phi)
        d=v.copy()
        for t in range(1,n):d[t]=phi*d[t-1]+v[t]
        x=common+np.cumsum(u,axis=0)+d
        if scenario=='permanent-jump' and school<schools//4:x[transitions//2:]+=np.array([.12,.08])
        latent.append(x);shared_e=innovations(5,school,qs[3])
        for representation in range(2):
            e=innovations(3+representation,school,qs[3])
            if scenario=='correlated-reporting':e=(e+shared_e)/math.sqrt(2)
            y=x+e
            if scenario=='reporting-shift':y[transitions-1:transitions+1]+=np.array([.08,.06])
            for t in range(transitions+1):observed.append({'key':f'{school:03}:{t:03}:{representation}', 'unitid':school,'academicYear':2000+t,'collectionYear':2000+t+representation,'logValues':y[t].tolist()})
    return {'kind':'synthetic','observations':observed},np.array(latent),g


class BalancedLikelihood(ObservationLikelihood):
    def __init__(self,graph,mode='reml'):
        if graph.get('kind')!='synthetic':raise ValueError('Historical fitting blocked')
        if mode not in ['ml','reml']:raise ValueError('Unsupported objective')
        super().__init__(graph);self.mode=mode
        first=self.blocks[0]
        for b in self.blocks[1:]:
            if any(not np.array_equal(b[k],first[k]) for k in ['x','j']) or any(not np.array_equal(a,z) for a,z in zip(b['temporal'],first['temporal'])):raise ValueError('Unbalanced synthetic panel')
        self.temporal=first['temporal'];self.x=first['x'];self.shared=self.temporal[0]
        ys=np.array([b['y'] for b in self.blocks]);self.ybar=ys.mean(axis=0);residual=ys-self.ybar
        self.scatter=residual.T@residual

    def matrices(self,p):
        qs=[covariance(p[k:k+3]) for k in range(0,12,3)]
        a=sum(np.kron(t,q) for t,q in zip(self.temporal,qs[1:]));b=np.kron(self.shared,qs[0]);m=a+self.schools*b
        af=cho_factor(a,lower=True,check_finite=False);mf=cho_factor(m,lower=True,check_finite=False)
        return qs,a,m,af,mf

    def evaluate(self,parameters,gradient=False):
        p=np.asarray(parameters,dtype=float)
        if p.shape!=(12,) or not np.isfinite(p).all() or any(v<a or v>b for v,(a,b) in zip(p,BOUNDS)):raise ValueError('Parameter outside bounds')
        qs,a,m,af,mf=self.matrices(p);s=self.schools;d=len(a)
        ai=cho_solve(af,np.eye(d),check_finite=False);mi=cho_solve(mf,np.eye(d),check_finite=False)
        mx=mi@self.x;info=s*self.x.T@mx;linear=s*self.x.T@mi@self.ybar
        beta=bounded_drift(info,linear) if self.mode=='ml' else np.linalg.solve(info,linear)
        r=self.ybar-self.x@beta;alpha=mi@r
        value=.5*(self.n*math.log(2*math.pi)+(s-1)*2*np.log(np.diag(af[0])).sum()+2*np.log(np.diag(mf[0])).sum()+np.sum(ai*self.scatter)+s*r@alpha)
        if self.mode=='reml':value+=.5*np.linalg.slogdet(info)[1]-math.log(2*math.pi)
        if not gradient:return float(value),beta
        sa=(s-1)*ai-ai@self.scatter@ai;sm=mi-s*np.outer(alpha,alpha)
        if self.mode=='reml':sm-=s*mx@np.linalg.inv(info)@mx.T
        grad=np.zeros(12)
        for k,dq in enumerate(derivatives(p[:3])):grad[k]=.5*s*np.sum(sm*np.kron(self.shared,dq))
        for j,t in enumerate(self.temporal,1):
            for k,dq in enumerate(derivatives(p[3*j:3*j+3])):grad[3*j+k]=.5*np.sum((sa+sm)*np.kron(t,dq))
        return float(value),grad,beta

    def solve(self,p,rhs):
        # rhs has school, contrast-coordinate, arbitrary RHS axes.
        _,_,_,af,mf=self.matrices(p);ar=np.array([cho_solve(af,r,check_finite=False) for r in rhs]);mean=np.mean(rhs,axis=0)
        correction=cho_solve(mf,mean,check_finite=False)-cho_solve(af,mean,check_finite=False)
        return ar+correction


def conditional(likelihood,p,beta,horizons=14,targets=(0,1)):
    """Latent log changes relative to origin, conditional on observed contrasts."""
    if horizons<1 or horizons>14 or len(set(targets))!=len(targets) or any(t<0 or t>=likelihood.schools for t in targets):raise ValueError('Invalid forecast target')
    qs=[covariance(p[k:k+3]) for k in range(0,12,3)];h=np.arange(horizons);t=likelihood.steps
    minimum=np.minimum.outer(h,h);lam=PHI**h-1
    temp=(np.outer(lam,lam)+PHI**np.abs(h[:,None]-h[None,:])*(1-PHI**(2*minimum)))/(1-PHI*PHI)
    total=len(targets)*2*horizons;kzz=np.zeros((total,total));cross=np.zeros((likelihood.schools,total,len(likelihood.x)))
    design=np.tile(np.kron(h[:,None],np.eye(2)),(len(targets),1))
    for j,target in enumerate(targets):
        sl=slice(j*2*horizons,(j+1)*2*horizons)
        for k,other in enumerate(targets):
            sk=slice(k*2*horizons,(k+1)*2*horizons)
            kzz[sl,sk]=np.kron(minimum,qs[0])
            if target==other:kzz[sl,sk]+=np.kron(minimum,qs[1])+np.kron(temp,qs[2])
        rows=likelihood.blocks[target]['rows'];times=np.array([r['academicYear']-likelihood.start for r in rows]);contrasts=PHI**(t-times[1:])-PHI**(t-times[0])
        cross[target,sl,:]=np.kron(np.outer(lam,contrasts)/(1-PHI*PHI),qs[2])
    residual=np.array([b['y']-b['x']@beta for b in likelihood.blocks]);alpha=likelihood.solve(p,residual)
    mean=design@beta+sum(k@a for k,a in zip(cross,alpha))
    solved=likelihood.solve(p,np.transpose(cross,(0,2,1)));cov=kzz-sum(k@a for k,a in zip(cross,solved));cov=(cov+cov.T)/2
    return mean,cov,cross,kzz,design


def forecast_draws(likelihood,p,beta,seed,count=256):
    mean,cov,*_=conditional(likelihood,p,np.asarray(beta));values,vectors=np.linalg.eigh(cov);tol=1e-10*max(1.,np.linalg.norm(cov,2))
    if min(values)<-tol:raise ValueError('Materially nonpositive conditional covariance')
    root=(vectors*np.sqrt(np.maximum(values,0)))@vectors.T
    rng=np.random.default_rng(seed);draws=mean+rng.standard_normal((count,len(mean)))@root
    draws=draws.reshape(count,2,14,2);draws[:,:,0,:]=0
    return draws


# Optimizer policy copied from frozen study, with only the likelihood substituted.
def fit_balanced(graph,mode='reml',fixed=None,warm=None,maxiter=2000):
    if graph.get('kind')!='synthetic':raise ValueError('Historical fitting blocked')
    if not isinstance(maxiter,int) or not 1<=maxiter<=2000:raise ValueError('Invalid iteration cap')
    bounds=list(BOUNDS)
    for k,v in (fixed or {}).items():
        if not isinstance(k,int) or not 0<=k<12 or not bounds[k][0]<=v<=bounds[k][1]:raise ValueError('Invalid fixed coordinate')
        bounds[k]=(v,v)
    likelihood=BalancedLikelihood(graph,mode);design=likelihood.design_diagnostic();starts=[];solutions=[];cache={}
    if not design['supported']:return {'method':mode,'status':'unsupported-design','parameters':None,'design':design,'starts':[],'historicalFittingBlocked':True}
    for sd in [0.,.02,.10]+(['warm'] if warm is not None else []):
        for drift_start in [0.,.03]:
            entry={'standardDeviation':sd,'driftStart':drift_start,'driftAnalytic':True}
            if sd==0:entry.update(status='singular-start',iterations=0);starts.append(entry);continue
            if sd in cache:entry.update(cache[sd]);entry['reusedCovarianceOptimization']=True;starts.append(entry);continue
            x0=np.array(warm).copy() if sd=='warm' else np.tile([sd,sd,0.],4)
            for k,v in (fixed or {}).items():x0[k]=v
            last=[None,None]
            def fun(x):
                if last[0] is not None and np.array_equal(x,last[0]):return last[1]
                try:out=likelihood.evaluate(x,True)[:2]
                except np.linalg.LinAlgError:out=(1e10,-1e6*np.tile([1.,1.,0.],4))
                last[:]=[x.copy(),out];return out
            result=minimize(fun,x0,jac=True,bounds=bounds,method='L-BFGS-B',options={'maxiter':maxiter,'ftol':0.,'gtol':1e-10,'maxls':40,'maxfun':100000})
            x=result.x
            try:value,g,beta=likelihood.evaluate(x,True)
            except np.linalg.LinAlgError:
                entry.update(status='singular-final',iterations=int(result.nit));starts.append(entry);cache[sd]={k:v for k,v in entry.items() if k not in ['standardDeviation','driftStart','driftAnalytic']};continue
            polish=0;stationary=False;step=None;relative=None;failure=None
            for _ in range(min(8,max(0,maxiter-int(result.nit)))):
                try:
                    h,_=curvature(likelihood,x)
                    free=np.array([k for k,(a,b)in enumerate(bounds) if a!=b and not ((x[k]<=a+1e-10 and g[k]>=0) or (x[k]>=b-1e-10 and g[k]<=0))])
                    if not len(free) or np.linalg.eigvalsh(h[np.ix_(free,free)])[0]<=0:failure='nonpositive-free-curvature';break
                    delta=np.zeros(12);delta[free]=np.linalg.solve(h[np.ix_(free,free)],g[free])
                except np.linalg.LinAlgError:failure='singular-curvature';break
                trial=np.clip(x-delta,np.array(bounds)[:,0],np.array(bounds)[:,1]);tv=fun(trial)[0];step=float(np.max(np.abs(trial-x)));relative=abs(tv-value)/max(1.,abs(value))
                if step<1e-8 and relative<1e-8:stationary=True;break
                accepted=False
                for damping in [2.**-k for k in range(20)]:
                    trial=np.clip(x-damping*delta,np.array(bounds)[:,0],np.array(bounds)[:,1]);tv=fun(trial)[0]
                    if tv<=value+1e-12*max(1.,abs(value)):
                        x=trial;value,g,beta=likelihood.evaluate(x,True);polish+=1;accepted=True;break
                if not accepted:failure='no-verifiable-polish-step';break
            valid=bool(stationary and result.nit+polish<maxiter and np.isfinite(value))
            entry.update(status='converged' if valid else 'nonconverged',objective=float(value),iterations=int(result.nit)+polish,
                optimizerExit=str(result.message),verificationFailure=failure,verifiedStep=step,verifiedRelativeObjective=relative,newtonPolishSteps=polish)
            starts.append(entry);cache[sd]={k:v for k,v in entry.items() if k not in ['standardDeviation','driftStart','driftAnalytic']}
            if valid:solutions.append((float(value),tuple(x),beta))
    report={'version':'revision-cost-predictive-1.0.0','method':mode,'starts':starts,'design':design,'historicalFittingBlocked':True,'fixedCoordinates':fixed or {}}
    if not solutions:return {**report,'status':'nonconverged','parameters':None}
    value,xt,beta=min(solutions,key=lambda z:(z[0],z[1]));x=np.array(xt);_,g,_=likelihood.evaluate(x,True)
    try:h,_=curvature(likelihood,x);diagnosis=diagnose_geometry(x,g,h,bounds,design['supported'])
    except np.linalg.LinAlgError:diagnosis={'classification':'singular-curvature'}
    return {**report,'status':'drift-contract-unsupported' if mode=='reml' and drift_contract(beta)!='interior-drift' else 'converged','objective':value,'parameters':x.tolist(),
        'drift':beta.tolist(),'driftContract':drift_contract(beta),'covariances':{n:covariance(x[3*i:3*i+3]).tolist() for i,n in enumerate(FAMILIES)},'boundaryDiagnostics':diagnosis}
