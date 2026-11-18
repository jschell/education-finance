# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy==2.3.5", "scipy==1.17.0"]
# ///
"""Separate ML/oracle/REML study; preserves the frozen v1 estimator bytes.

The block likelihood follows the independently tested v1 implementation.
REML changes the objective and covariance score, not the observation process.
"""
import math
import numpy as np
from scipy.linalg import cho_factor,cho_solve,block_diag
from scipy.optimize import minimize
from revision_cost_estimator import ObservationLikelihood,BOUNDS,FAMILIES,covariance,derivatives,factor,bounded_drift,curvature

class StudyLikelihood(ObservationLikelihood):
    def __init__(self,graph,mode='reml',fixed_drift=(.02,.01)):
        if mode not in ['ml','known-drift','reml']:raise ValueError('Unknown study objective')
        self.mode=mode;self.fixed_drift=np.array(fixed_drift,dtype=float)
        if self.fixed_drift.shape!=(2,) or not np.isfinite(self.fixed_drift).all():raise ValueError('Invalid fixed drift')
        super().__init__(graph)

    def evaluate(self,parameters,gradient=False,dense=False):
        p=np.asarray(parameters,dtype=float)
        if p.shape!=(12,) or not np.isfinite(p).all() or any(v<a or v>b for v,(a,b) in zip(p,BOUNDS)):raise ValueError('Parameter outside bounds')
        qs=[covariance(p[k:k+3]) for k in range(0,12,3)]
        shared_factor=np.kron(np.eye(self.steps),factor(p[:3]));blocks=[];h=np.eye(2*self.steps);logdet=0.
        for source in self.blocks:
            a=sum(np.kron(t,q) for t,q in zip(source['temporal'],qs[1:]));cf=cho_factor(a,lower=True,check_finite=False)
            ai=cho_solve(cf,np.eye(len(a)),check_finite=False);z=source['j']@shared_factor;b=ai@z
            h+=z.T@b;logdet+=2*np.log(np.diag(cf[0])).sum()
            blocks.append({**source,'a':a,'ai':ai,'z':z,'b':b})
        hf=cho_factor(h,lower=True,check_finite=False);hi=cho_solve(hf,np.eye(len(h)),check_finite=False)
        logdet+=2*np.log(np.diag(hf[0])).sum()
        def solve(rhs):
            ar=[b['ai']@r for b,r in zip(blocks,rhs)];w=sum(b['z'].T@r for b,r in zip(blocks,ar))
            return [r-b['b']@hi@w for b,r in zip(blocks,ar)]
        rhs=[np.column_stack([b['y'],b['x']]) for b in blocks];solved=solve(rhs)
        info=sum(b['x'].T@s[:,1:] for b,s in zip(blocks,solved));linear=sum(b['x'].T@s[:,0] for b,s in zip(blocks,solved));beta=self.fixed_drift if self.mode=="known-drift" else bounded_drift(info,linear) if self.mode=="ml" else np.linalg.solve(info,linear)
        residual=[b['y']-b['x']@beta for b in blocks];alpha=[s[:,0]-s[:,1:]@beta for s in solved]
        objective=.5*(self.n*math.log(2*math.pi)+logdet+sum(r@a for r,a in zip(residual,alpha)))
        if self.mode=="reml":
            sign,ld=np.linalg.slogdet(info)
            if sign<=0:raise np.linalg.LinAlgError("Singular drift information")
            objective+=.5*ld-math.log(2*math.pi)
        if dense:
            j=np.concatenate([b['j'] for b in blocks]);c=block_diag(*(b['a'] for b in blocks))+j@np.kron(np.eye(self.steps),qs[0])@j.T
            return c,np.concatenate([b['y'] for b in blocks]),np.concatenate([b['x'] for b in blocks]),float(objective),beta
        if not gradient:return float(objective),beta
        grad=np.zeros(12)
        jsol=solve([b['j'] for b in blocks]);jcinvj=sum(b['j'].T@s for b,s in zip(blocks,jsol));ja=sum(b['j'].T@a for b,a in zip(blocks,alpha))
        score=jcinvj-np.outer(ja,ja)
        if self.mode=="reml":
            info_inv=np.linalg.inv(info);jcx=sum(b["j"].T@s[:,1:] for b,s in zip(blocks,solved));score-=jcx@info_inv@jcx.T
        for k,d in enumerate(derivatives(p[:3])):grad[k]=.5*np.sum(score*np.kron(np.eye(self.steps),d))
        for b,a,s in zip(blocks,alpha,solved):
            local=b['ai']-b['b']@hi@b['b'].T-np.outer(a,a)
            if self.mode=="reml":local-=s[:,1:]@info_inv@s[:,1:].T
            for family,t in enumerate(b['temporal'],1):
                for k,d in enumerate(derivatives(p[3*family:3*family+3])):grad[3*family+k]+=.5*np.sum(local*np.kron(t,d))
        return float(objective),grad,beta

def diagnose_geometry(x,gradient,hessian,bounds=BOUNDS,design_supported=True):
    x=np.asarray(x);g=np.asarray(gradient);h=np.asarray(hessian);active=[];strong=[];weak=[];fixed=[]
    for k,(a,b)in enumerate(bounds):
        if a==b:fixed.append(k);continue
        side='lower' if x[k]<=a+1e-7 else 'upper' if x[k]>=b-1e-7 else None
        if side:
            multiplier=g[k] if side=='lower' else -g[k];active.append({'parameter':k,'side':side,'inwardScore':float(multiplier)})
            (strong if multiplier>1e-6 else weak).append(k)
    free=[k for k in range(len(x)) if k not in strong+fixed]
    scales=np.maximum(np.abs(x),.02);scaled=h[np.ix_(free,free)]*np.outer(scales[free],scales[free]);full=h*np.outer(scales,scales)
    eigen=np.linalg.eigvalsh(scaled).tolist() if free else []
    delta=x-np.clip(x-g/np.maximum(1.,np.abs(np.diag(h))),np.array(bounds)[:,0],np.array(bounds)[:,1]);residual=float(np.max(np.abs(delta)))
    status='unsupported-design' if not design_supported else 'nonstationary' if residual>1e-6 else 'weak-bound-unresolved' if weak else 'nonpositive-free-curvature' if eigen and min(eigen)<=1e-8 else 'constraint-limited' if active else 'interior-regular'
    return {'classification':status,'activeBounds':active,'strongActive':strong,'weakActive':weak,'fixedCoordinates':fixed,'criticalCoordinates':free,
        'projectedScoreStep':residual,'rawScore':g.tolist(),'criticalScaledEigenvalues':eigen,
        'legacyFullScaledEigenvalues':np.linalg.eigvalsh(full).tolist(),'legacyUnconstrainedWarning':bool(np.linalg.eigvalsh(full)[0]<=1e-8),
        'limitation':'Local constrained geometry and coarse profiles do not establish economic identification or confidence coverage.'}

def drift_contract(beta):
    return 'drift-contract-unsupported' if np.any(np.asarray(beta)<=-.1) or np.any(np.asarray(beta)>=.2) else 'interior-drift'

def fit_study(graph,mode='reml',fixed=None,warm=None,maxiter=2000):
    if graph.get('kind')!='synthetic':raise ValueError('Historical fitting blocked')
    if not isinstance(maxiter,int) or not 1<=maxiter<=2000:raise ValueError('Invalid iteration cap')
    bounds=list(BOUNDS)
    for k,v in (fixed or {}).items():
        if not isinstance(k,int) or not 0<=k<12 or not bounds[k][0]<=v<=bounds[k][1]:raise ValueError('Invalid fixed coordinate')
        bounds[k]=(v,v)
    likelihood=StudyLikelihood(graph,mode);design=likelihood.design_diagnostic();starts=[];solutions=[];cache={}
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
    report={'version':'revision-cost-reml-study-1.0.0','method':mode,'starts':starts,'design':design,'historicalFittingBlocked':True,'fixedCoordinates':fixed or {}}
    if not solutions:return {**report,'status':'nonconverged','parameters':None}
    value,xt,beta=min(solutions,key=lambda z:(z[0],z[1]));x=np.array(xt);_,g,_=likelihood.evaluate(x,True)
    try:h,_=curvature(likelihood,x);diagnosis=diagnose_geometry(x,g,h,bounds,design['supported'])
    except np.linalg.LinAlgError:diagnosis={'classification':'singular-curvature'}
    return {**report,'status':'drift-contract-unsupported' if mode=='reml' and drift_contract(beta)!='interior-drift' else 'converged','objective':value,'parameters':x.tolist(),
        'drift':beta.tolist(),'driftContract':drift_contract(beta),'covariances':{n:covariance(x[3*i:3*i+3]).tolist() for i,n in enumerate(FAMILIES)},'boundaryDiagnostics':diagnosis}

def nuisance_profile(graph,mode,selected,index=2,grid=(-.95,0.,.4,.95)):
    if not selected.get('parameters'):return {'status':'selected-fit-unavailable','points':[]}
    points=[]
    for value in sorted(set([*grid,selected['parameters'][index]])):
        if abs(value-selected['parameters'][index])<1e-12:
            result=selected;reused=True
        else:result=fit_study(graph,mode,fixed={index:value},warm=selected['parameters']);reused=False
        points.append({'fixedValue':float(value),'reusedSelectedOptimum':reused,'fit':result,
            'objectiveDelta':result['objective']-selected['objective'] if result.get('parameters') else None})
    return {'status':'profiled','coordinate':index,'kind':'coarse nuisance-reoptimized profile; not a confidence interval','points':points,
        'selectedOptimumAdequacyWarning':any(p['objectiveDelta'] is not None and p['objectiveDelta']<-1e-5 for p in points)}

