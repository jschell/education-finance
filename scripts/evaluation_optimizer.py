"""Synthetic-only bounded covariance multistart and projected-gradient evaluation."""
import math
import numpy as np
from scipy.linalg import cho_factor,cho_solve
from scipy.optimize import minimize
from scipy.stats import qmc
from covariance_coordinate_audit import DirectLikelihood,BOUNDS,cones,cone_jac,violation,to_coordinate,to_parameters,BASIS,SCALE
from revision_cost_estimator import covariance
from revision_cost_predictive import BalancedLikelihood


class EvaluationLikelihood(DirectLikelihood):
    # Only constant Kronecker derivative matrices are cached; arithmetic is unchanged.
    def __init__(self,graph):
        super().__init__(graph)
        self.cached_derivatives=[np.kron(t,b) for t in [self.base.shared,*self.base.temporal] for b in BASIS]
    def evaluate(self,z,gradient=False):
        z=np.asarray(z,dtype=float)
        if z.shape!=(12,) or not np.isfinite(z).all():raise ValueError('Invalid covariance coordinates')
        q=[SCALE*np.array([[a,c],[c,b]]) for a,b,c in z.reshape(4,3)];l=self.base;s=l.schools
        A=sum(np.kron(t,v) for t,v in zip(l.temporal,q[1:]));M=A+s*np.kron(l.shared,q[0]);d=len(A)
        af=cho_factor(A,lower=True,check_finite=False);mf=cho_factor(M,lower=True,check_finite=False)
        ai=cho_solve(af,np.eye(d),check_finite=False);mi=cho_solve(mf,np.eye(d),check_finite=False)
        mx=mi@l.x;info=s*l.x.T@mx;beta=np.linalg.solve(info,s*l.x.T@mi@l.ybar);r=l.ybar-l.x@beta;alpha=mi@r
        f=.5*(l.n*math.log(2*math.pi)+(s-1)*2*np.log(np.diag(af[0])).sum()+2*np.log(np.diag(mf[0])).sum()+np.sum(ai*l.scatter)+s*r@alpha)+.5*np.linalg.slogdet(info)[1]-math.log(2*math.pi)
        if not gradient:return float(f),beta
        sa=(s-1)*ai-ai@l.scatter@ai;sm=mi-s*np.outer(alpha,alpha)-s*mx@np.linalg.inv(info)@mx.T
        g=[]
        for d in self.cached_derivatives[:3]:g.append(.5*s*SCALE*np.sum(sm*d))
        combined=sa+sm
        for d in self.cached_derivatives[3:]:g.append(.5*SCALE*np.sum(combined*d))
        return float(f),np.array(g),beta


FACTOR=.95/math.sqrt(2)

def to_y(z):
    x=np.asarray(z,dtype=float).copy().reshape(4,3);x[:,2]/=FACTOR;return x.ravel()

def to_z(y):
    x=np.asarray(y,dtype=float).copy().reshape(4,3);x[:,2]*=FACTOR;return x.ravel()

def project(y,tol=1e-12,maxiter=10000):
    x=np.asarray(y,dtype=float).reshape(4,3).copy()
    if not np.isfinite(x).all():raise ValueError('Nonfinite projection input')
    p=np.zeros_like(x);q=np.zeros_like(x)
    for iteration in range(maxiter):
        old=x.copy();a=x+p;mat=np.zeros((4,2,2));mat[:,0,0]=a[:,0];mat[:,1,1]=a[:,1];mat[:,0,1]=mat[:,1,0]=a[:,2]/math.sqrt(2)
        val,vec=np.linalg.eigh(mat);psd=(vec*np.maximum(val,0)[:,None,:])@np.transpose(vec,(0,2,1));v=np.column_stack([psd[:,0,0],psd[:,1,1],math.sqrt(2)*psd[:,0,1]])
        p=a-v;a=v+q;x=a.copy();x[:,:2]=np.minimum(x[:,:2],25.);q=a-x
        if np.max(np.abs(x-old))<=tol and violation(to_z(x.ravel()))<=1e-10:
            return x.ravel(),iteration+1
    raise ValueError('Projection did not converge')

def starts(warm=None):
    points=[('sd-.02',np.tile([.02,.02,0.],4)),('sd-.10',np.tile([.10,.10,0.],4)),('warm',np.asarray(warm) if warm is not None else np.tile([.05,.05,0.],4))]
    for i,row in enumerate(qmc.Sobol(12,scramble=True,seed=1729).random_base2(3)):
        p=row.copy().reshape(4,3);p[:,:2]=np.exp(np.log(.005)+p[:,:2]*np.log(.15/.005));p[:,2]=-.8+1.6*p[:,2];points.append((f'sobol-{i}',p.ravel()))
    return points

def evaluate_y(l,y,gradient=False):
    out=l.evaluate(to_z(y),gradient)
    if not gradient:return out
    f,g,b=out;g=g.copy().reshape(4,3);g[:,2]*=FACTOR;return f,g.ravel(),b

def mapping(y,g):
    projected,_=project(y-g);return float(np.max(np.abs(y-projected)))

def polish(l,initial):
    x,_=project(initial);f,g,b=evaluate_y(l,x,True);step=.01;last_step=None;relative=None;verified=False;reason='iteration-cap';count=0
    for iteration in range(2000):
        accepted=False
        for backtrack in range(50):
            try:
                trial,_=project(x-step*g);delta=trial-x;tf,tg,tb=evaluate_y(l,trial,True)
                if tf<=f+g@delta+(delta@delta)/(2*step)+1e-12:
                    accepted=True;break
            except (ValueError,np.linalg.LinAlgError):pass
            step*=.5
        if not accepted:reason='line-search-failed';break
        last_step=float(np.max(np.abs(delta)));relative=abs(tf-f)/max(1.,abs(f));count=iteration+1
        if last_step<1e-8 and relative<1e-8 and mapping(trial,tg)<=1e-6:
            x,f,g,b=trial,tf,tg,tb;verified=True;reason='verified';break
        dg=tg-g;den=delta@dg
        next_step=float(delta@delta/den) if den>0 else step
        x,f,g,b=trial,tf,tg,tb;step=float(np.clip(next_step,1e-6,10.))
    return {'objective':float(f),'y':x.tolist(),'drift':b.tolist(),'iterations':count,'projectedGradient':mapping(x,g),'step':last_step,'relativeObjective':relative,'verified':verified,'reason':reason}

def probe(l,y,f):
    axes=np.eye(12);directions=[*axes,*(-axes)]
    for d in qmc.Sobol(12,scramble=True,seed=1730).random_base2(4)*2-1:directions.append(d/np.linalg.norm(d))
    changes=[]
    for radius in [1e-4,1e-3]:
        for d in directions:
            try:trial,_=project(y+radius*d);value,_=evaluate_y(l,trial);changes.append(float(value-f))
            except (ValueError,np.linalg.LinAlgError):return {'passed':False,'failure':'probe-evaluation','changes':changes}
    return {'passed':bool(min(changes)>=-1e-6),'minimumChange':min(changes),'changes':changes}

def fit(graph,warm=None):
    if graph.get('kind')!='synthetic':raise ValueError('Historical fitting blocked')
    l=EvaluationLikelihood(graph);records=[];candidates=[]
    for label,p in starts(warm):
        z0=to_coordinate(p);last=[None,None]
        def fun(z):
            if last[0] is not None and np.array_equal(z,last[0]):return last[1]
            try:v,g,_=l.evaluate(z,True)
            except np.linalg.LinAlgError:v,g=1e10,np.zeros(12)
            last[:]=[z.copy(),(v,g)];return v,g
        result=minimize(fun,z0,jac=True,bounds=BOUNDS,constraints=[{'type':'ineq','fun':cones,'jac':cone_jac}],method='SLSQP',options={'maxiter':2000,'ftol':1e-12,'disp':False})
        entry={'start':label,'success':bool(result.success),'exit':str(result.message),'iterations':int(result.nit),'evaluations':int(result.nfev),'rawCoordinates':result.x.tolist()}
        try:
            y,cycles=project(to_y(result.x));v,b=evaluate_y(l,y);entry.update(objective=float(v),coordinates=to_z(y).tolist(),projectionCycles=cycles)
            candidates.append((float(v),label,y))
        except (ValueError,np.linalg.LinAlgError) as e:entry.update(objective=None,failure=str(e))
        records.append(entry)
    base={'id':'covariance-evaluation-optimizer-v1','starts':records,'historicalFittingBlocked':True}
    if not candidates:return {**base,'status':'unavailable','reasons':['no-finite-candidate'],'parameters':None}
    _,label,best=min(candidates,key=lambda v:(v[0],v[1]));routes=[]
    for name,initial in [('best-'+label,best),('independent-sd-.10',to_y(to_coordinate(np.tile([.10,.10,0.],4))))]:
        try:r=polish(l,initial);r['route']=name;routes.append(r)
        except (ValueError,np.linalg.LinAlgError) as e:routes.append({'route':name,'verified':False,'objective':None,'reason':str(e)})
    finite=[r for r in routes if r.get('objective') is not None]
    minimum=min([v[0] for v in candidates]+[r['objective'] for r in finite]);near=[r for r in finite if r['objective']<=minimum+1e-10]
    selected=min(near,key=lambda r:(r['objective'],r['route'])) if near else None
    if selected is None:return {**base,'status':'unavailable','reasons':['projected-route-objective-disagreement'],'routes':routes,'parameters':None,'bestObjective':minimum}
    y=np.array(selected['y']);z=to_z(y);f,g,b=evaluate_y(l,y,True);reasons=[]
    agreement=sum(v[0]<=f+1e-5 for v in candidates)
    if agreement<3:reasons.append('insufficient-multistart-agreement')
    if not selected['verified']:reasons.append('projected-polish-not-verified')
    if not np.all((b>-.1)&(b<.2)):reasons.append('unsupported-drift')
    pv,_=project(y);projection_residual=float(np.max(np.abs(pv-y)))
    if projection_residual>1e-10 or violation(z)>1e-10:reasons.append('feasibility')
    safe=z.copy().reshape(4,3);safe[:,:2]=np.maximum(safe[:,:2],0.);limit=.95*np.sqrt(safe[:,0]*safe[:,1]);safe[:,2]=np.clip(safe[:,2],-limit,limit)
    p=to_parameters(safe.ravel());round_trip=float(np.max(np.abs(to_coordinate(p)-z)))
    if round_trip>1e-10:reasons.append('round-trip-error')
    try:old=BalancedLikelihood(graph,'reml').evaluate(p)[0];objective_error=float(old-f)
    except np.linalg.LinAlgError:return {**base,'status':'unavailable','reasons':['singular-round-trip'],'parameters':None,'routes':routes}
    if abs(objective_error)>1e-6:reasons.append('likelihood-disagreement')
    probes=probe(l,y,f)
    if not probes['passed']:reasons.append('feasible-descent')
    return {**base,'status':'qualified' if not reasons else 'unavailable','reasons':reasons,'parameters':p.tolist(),'coordinates':z.tolist(),'drift':b.tolist(),'objective':float(f),'agreementStarts':agreement,'routes':routes,'projectionResidual':projection_residual,'roundTripError':round_trip,'objectiveError':objective_error,'probes':probes}
