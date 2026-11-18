# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy==2.3.5", "scipy==1.17.0"]
# ///
"""Research diffuse-offset likelihood; historical fitting intentionally disabled.

School blocks plus shared-year Woodbury factorization. No diagonal jitter,
moment-estimator fallback, production imports, or automatic candidate activation.
"""
import itertools, math
from collections import defaultdict
import numpy as np
from scipy.linalg import cho_factor, cho_solve, block_diag
from scipy.optimize import minimize

PHI=.5
BOUNDS=[(0.,.5),(0.,.5),(-.95,.95)]*4
FAMILIES=['shared','permanent','temporary','measurement']

def covariance(parameters):
    s,t,r=parameters
    return np.array([[s*s,r*s*t],[r*s*t,t*t]])

def derivatives(parameters):
    s,t,r=parameters
    return [np.array([[2*s,r*t],[r*t,0.]]),np.array([[0.,r*s],[r*s,2*t]]),np.array([[0.,s*t],[s*t,0.]])]

def factor(parameters):
    s,t,r=parameters
    return np.array([[s,0.],[r*t,t*math.sqrt(1-r*r)]])

def bounded_drift(info,linear):
    candidates=[]
    try:
        free=np.linalg.solve(info,linear)
        if np.all(free>=-.1) and np.all(free<=.2):candidates.append(free)
    except np.linalg.LinAlgError:pass
    for j in [0,1]:
        k=1-j
        for bound in [-.1,.2]:
            b=np.zeros(2);b[j]=bound
            b[k]=np.clip((linear[k]-info[k,j]*bound)/info[k,k],-.1,.2)
            candidates.append(b)
    if not candidates:raise ValueError('Unidentified drift')
    return min(candidates,key=lambda b:(float(b@info@b-2*b@linear),tuple(b)))

class ObservationLikelihood:
    def __init__(self,graph):
        self.graph=graph;observations=graph['observations'];seen=set();groups=defaultdict(list)
        for r in observations:
            if r['key'] in seen:raise ValueError('Duplicate observation key')
            seen.add(r['key'])
            if not isinstance(r['academicYear'],int) or not np.isfinite(r['logValues']).all() or len(r['logValues'])!=2:raise ValueError('Invalid paired observation')
            groups[str(r['unitid'])].append(r)
        if not groups or len(groups)>200:raise ValueError('School count outside numerical bound')
        years=sorted({r['academicYear'] for r in observations});self.years=years;self.schools=len(groups)
        self.start=years[0];self.steps=years[-1]-self.start
        if self.steps<1 or self.steps>100:raise ValueError('Temporal span outside numerical bound')
        self.blocks=[]
        for unitid,rows in sorted(groups.items()):
            rows.sort(key=lambda r:(r['academicYear'],r['key']));n=len(rows)
            if not 2<=n<=200:raise ValueError('Observation count outside school block bound')
            times=np.array([r['academicYear']-self.start for r in rows],dtype=float)
            h=np.zeros((n-1,n));h[:,0]=-1.;h[:,1:]=np.eye(n-1)
            temporal=[h@np.minimum.outer(times,times)@h.T,h@(PHI**np.abs(times[:,None]-times[None,:])/(1-PHI*PHI))@h.T,h@h.T]
            exposure=(times[:,None]>=np.arange(1,self.steps+1)[None,:]).astype(float);j=np.kron(h@exposure,np.eye(2))
            self.blocks.append({'unitid':unitid,'rows':rows,'temporal':temporal,'j':j,
                'y':(h@np.array([r['logValues'] for r in rows])).ravel(),
                'x':np.kron((h@times)[:,None],np.eye(2))})
        self.n=sum(len(b['y']) for b in self.blocks)

    def design_diagnostic(self):
        # Scalar temporal family design; three paired covariance coefficients
        # repeat the same family geometry after independent column scaling.
        gram=np.zeros((4,4));jtj=sum((b['j'][::2,::2].T@b['j'][::2,::2] for b in self.blocks))
        gram[0,0]=np.sum(jtj*jtj)
        for b in self.blocks:
            j=b['j'][::2,::2]
            for f,t in enumerate(b['temporal'],1):
                gram[0,f]+=np.trace(j.T@t@j);gram[f,0]=gram[0,f]
                for g,u in enumerate(b['temporal'],1):gram[f,g]+=np.sum(t*u)
        norm=np.sqrt(np.diag(gram));scaled=gram/np.outer(norm,norm) if np.all(norm>0) else np.zeros((4,4))
        eigen=np.linalg.eigvalsh(scaled);condition=math.sqrt(max(eigen)/min(eigen)) if min(eigen)>1e-14 else math.inf
        rank=int(np.linalg.matrix_rank(scaled,tol=1e-12))
        return {'rank':rank,'condition':condition if math.isfinite(condition) else None,
            'supported':rank==4 and condition<=1e8 and len(self.years)>=4,'academicYears':len(self.years),'transitions':len(self.years)-1,'schools':self.schools}

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
        info=sum(b['x'].T@s[:,1:] for b,s in zip(blocks,solved));linear=sum(b['x'].T@s[:,0] for b,s in zip(blocks,solved));beta=bounded_drift(info,linear)
        residual=[b['y']-b['x']@beta for b in blocks];alpha=[s[:,0]-s[:,1:]@beta for s in solved]
        objective=.5*(self.n*math.log(2*math.pi)+logdet+sum(r@a for r,a in zip(residual,alpha)))
        if dense:
            j=np.concatenate([b['j'] for b in blocks]);c=block_diag(*(b['a'] for b in blocks))+j@np.kron(np.eye(self.steps),qs[0])@j.T
            return c,np.concatenate([b['y'] for b in blocks]),np.concatenate([b['x'] for b in blocks]),float(objective),beta
        if not gradient:return float(objective),beta
        grad=np.zeros(12)
        jsol=solve([b['j'] for b in blocks]);jcinvj=sum(b['j'].T@s for b,s in zip(blocks,jsol));ja=sum(b['j'].T@a for b,a in zip(blocks,alpha))
        score=jcinvj-np.outer(ja,ja)
        for k,d in enumerate(derivatives(p[:3])):grad[k]=.5*np.sum(score*np.kron(np.eye(self.steps),d))
        for b,a in zip(blocks,alpha):
            local=b['ai']-b['b']@hi@b['b'].T-np.outer(a,a)
            for family,t in enumerate(b['temporal'],1):
                for k,d in enumerate(derivatives(p[3*family:3*family+3])):grad[3*family+k]+=.5*np.sum(local*np.kron(t,d))
        return float(objective),grad,beta

def curvature(likelihood,x):
    steps=np.maximum(1e-5,np.abs(x)*1e-3);hessian=np.zeros((12,12));profiles=[]
    for k,step in enumerate(steps):
        lo=max(BOUNDS[k][0],x[k]-step);hi=min(BOUNDS[k][1],x[k]+step)
        a=x.copy();z=x.copy();a[k]=lo;z[k]=hi
        fa,ga,_=likelihood.evaluate(a,True);fz,gz,_=likelihood.evaluate(z,True)
        hessian[:,k]=(gz-ga)/(hi-lo)
        profiles.append({'parameter':k,'low':float(lo),'high':float(hi),'lowObjective':float(fa),'highObjective':float(fz)})
    return (hessian+hessian.T)/2,profiles

def directional_profiles(likelihood,x,objective):
    # Finite difference curvature and directional profiles; not nuisance profiles.
    hessian,profiles=curvature(likelihood,x)
    for p in profiles:
        p['lowObjectiveDelta']=p.pop('lowObjective')-objective;p['highObjectiveDelta']=p.pop('highObjective')-objective
    scaled=(hessian+hessian.T)/2*np.outer(np.maximum(np.abs(x),.02),np.maximum(np.abs(x),.02))
    eigen=np.linalg.eigvalsh(scaled)
    return {'kind':'directional finite-difference profiles, not confidence intervals','scaledCurvatureEigenvalues':eigen.tolist(),
        'flatOrNonpositive':bool(eigen[0]<=1e-8),'profiles':profiles}

def fit_synthetic(graph,maxiter=2000,profiles=True):
    if graph.get('kind')!='synthetic':raise ValueError('Historical fitting blocked pending recovery review')
    if not isinstance(maxiter,int) or not 1<=maxiter<=2000:raise ValueError('Iteration limit outside contract')
    likelihood=ObservationLikelihood(graph);design=likelihood.design_diagnostic();starts=[];solutions=[];cache={}
    if not design['supported']:return {'method':'revision-cost-estimator-1.0.0','starts':[],'design':design,'historicalFittingBlocked':True,'status':'identification-unsupported','parameters':None}
    for sd in [0.,.02,.10]:
        for drift in [0.,.03]:
            entry={'standardDeviation':sd,'driftStart':drift,'driftProfiled':True}
            if sd==0:entry.update(status='singular-start',iterations=0);starts.append(entry);continue
            if sd in cache:
                entry.update(cache[sd]);entry['reusedCovarianceOptimization']=True;starts.append(entry);continue
            x0=np.tile([sd,sd,0.],4);history=[];converged=False
            def fun(x):
                try:return likelihood.evaluate(x,True)[:2]
                except np.linalg.LinAlgError:
                    # Finite search barrier prevents infinity arithmetic from
                    # stalling L-BFGS-B at the singular all-zero corner. The
                    # exact likelihood is re-evaluated before accepting a fit.
                    return 1e10,-1e6*np.tile([1.,1.,0.],4)
            def callback(x):
                nonlocal converged
                f=fun(x)[0]
                if history:
                    old,of=history[-1];change=float(np.max(np.abs(x-old)));relative=abs(f-of)/max(1.,abs(of))
                    if change<1e-8 and relative<1e-8:converged=True
                history.append((x.copy(),f))
                # Callback stagnation is recorded, never by itself accepted.
            result=minimize(fun,x0,jac=True,bounds=BOUNDS,method='L-BFGS-B',callback=callback,options={'maxiter':maxiter,'ftol':0.,'gtol':1e-10,'maxls':40,'maxfun':100000})
            x=result.x
            try:value,grad,beta=likelihood.evaluate(x,True)
            except np.linalg.LinAlgError:
                entry.update(status='singular-final',iterations=int(result.nit),optimizerExit=str(result.message));cache[sd]={k:v for k,v in entry.items() if k not in ['standardDeviation','driftStart','driftProfiled']};starts.append(entry);continue
            polish=0;verified_step=math.inf;verified_relative=math.inf;stationary=False;verification_failure=None
            # Independent bounded Newton verification/polish of the same
            # objective. No covariance jitter or relaxed stopping tolerance.
            for _ in range(min(8,max(0,maxiter-int(result.nit)))):
                try:hessian,_=curvature(likelihood,x)
                except np.linalg.LinAlgError:verification_failure='singular-curvature';break
                free=np.array([k for k,(a,b)in enumerate(BOUNDS) if not ((x[k]<=a+1e-10 and grad[k]>=0) or (x[k]>=b-1e-10 and grad[k]<=0))])
                if not len(free) or np.linalg.eigvalsh(hessian[np.ix_(free,free)])[0]<=0:verification_failure='nonpositive-free-curvature';break
                try:
                    delta=np.zeros(12);delta[free]=np.linalg.solve(hessian[np.ix_(free,free)],grad[free])
                except np.linalg.LinAlgError:verification_failure='singular-curvature';break
                probe=np.clip(x-delta,np.array(BOUNDS)[:,0],np.array(BOUNDS)[:,1])
                verified_step=float(np.max(np.abs(probe-x)));probe_value=fun(probe)[0];verified_relative=abs(probe_value-value)/max(1.,abs(value))
                if verified_step<1e-8 and verified_relative<1e-8:stationary=True;break
                accepted_trial=False
                for scale in [2.**(-k) for k in range(20)]:
                    trial=np.clip(x-scale*delta,np.array(BOUNDS)[:,0],np.array(BOUNDS)[:,1]);trial_value=fun(trial)[0]
                    if trial_value<=value+1e-12*max(1.,abs(value)):
                        x=trial;value,grad,beta=likelihood.evaluate(x,True);polish+=1;accepted_trial=True;break
                if not accepted_trial:break
            accepted=bool(stationary and result.nit+polish<maxiter and np.isfinite(value))
            entry.update(status='converged' if accepted else 'nonconverged',iterations=int(result.nit)+polish,optimizerExit=str(result.message),objective=float(value),
                newtonPolishSteps=polish,verificationFailure=verification_failure,verifiedStep=verified_step if math.isfinite(verified_step) else None,verifiedRelativeObjective=verified_relative if math.isfinite(verified_relative) else None)
            cache[sd]={k:v for k,v in entry.items() if k not in ['standardDeviation','driftStart','driftProfiled']};starts.append(entry)
            if accepted:solutions.append((float(value),tuple(x),beta))
    report={'method':'revision-cost-estimator-1.0.0','starts':starts,'design':design,'historicalFittingBlocked':True}
    if not solutions:return {**report,'status':'nonconverged','parameters':None}
    value,xt,beta=min(solutions,key=lambda s:(s[0],s[1]));x=np.array(xt)
    boundaries=[k for k,(a,b)in enumerate(BOUNDS) if min(abs(x[k]-a),abs(x[k]-b))<1e-7]
    try:diagnosis=directional_profiles(likelihood,x,value) if profiles else {'flatOrNonpositive':None,'kind':'not-requested'}
    except np.linalg.LinAlgError:diagnosis={'flatOrNonpositive':True,'kind':'singular-profile-curvature'}
    supported=design['supported'] and diagnosis['flatOrNonpositive'] is False
    return {**report,'status':'supported-synthetic-fit' if supported else 'identification-unsupported','objective':value,'parameters':x.tolist(),
        'drift':beta.tolist(),'covariances':{name:covariance(x[3*i:3*i+3]).tolist() for i,name in enumerate(FAMILIES)},'boundaryParameters':boundaries,'likelihoodDiagnostics':diagnosis}
