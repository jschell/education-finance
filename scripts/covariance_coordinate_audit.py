"""Synthetic REML in direct covariance coordinates; historical fitting blocked."""
import math
import numpy as np
from scipy.linalg import cho_factor,cho_solve
from scipy.optimize import minimize,nnls
from revision_cost_predictive import BalancedLikelihood
from revision_cost_estimator import covariance

SCALE=.01;RHO=.95;UPPER=25.
BASIS=[np.array([[1.,0.],[0.,0.]]),np.array([[0.,0.],[0.,1.]]),np.array([[0.,1.],[1.,0.]])]
BOUNDS=[(0.,UPPER),(0.,UPPER),(-RHO*UPPER,RHO*UPPER)]*4

def to_coordinate(p):
    return np.concatenate([[q[0,0],q[1,1],q[0,1]] for q in [covariance(p[i:i+3])/SCALE for i in range(0,12,3)]])

def to_parameters(z):
    out=[]
    for a,b,c in np.asarray(z).reshape(4,3):
        if a<0 or b<0 or c*c>RHO**2*a*b+1e-9:raise ValueError('Outside covariance cone')
        a=max(a,0);b=max(b,0);rho=c/math.sqrt(a*b) if a*b>0 else 0.
        out.extend([math.sqrt(a*SCALE),math.sqrt(b*SCALE),float(np.clip(rho,-RHO,RHO))])
    return np.array(out)

def cones(z):
    a=np.asarray(z).reshape(4,3);return RHO**2*a[:,0]*a[:,1]-a[:,2]**2

def cone_jac(z):
    a=np.asarray(z).reshape(4,3);j=np.zeros((4,12))
    for i,(x,y,c) in enumerate(a):j[i,3*i:3*i+3]=[RHO**2*y,RHO**2*x,-2*c]
    return j

def violation(z):
    z=np.asarray(z);return float(max(0.,max(-cones(z)),max(lo-v for v,(lo,hi) in zip(z,BOUNDS)),max(v-hi for v,(lo,hi) in zip(z,BOUNDS))))

class DirectLikelihood:
    def __init__(self,graph):
        if graph.get('kind')!='synthetic':raise ValueError('Historical fitting blocked')
        self.base=BalancedLikelihood(graph,'reml')
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
        for basis in BASIS:g.append(.5*s*SCALE*np.sum(sm*np.kron(l.shared,basis)))
        for t in l.temporal:
            for basis in BASIS:g.append(.5*SCALE*np.sum((sa+sm)*np.kron(t,basis)))
        return float(f),np.array(g),beta

def kkt(z,g,active_tol=1e-7):
    z=np.asarray(z);g=np.asarray(g);h=cones(z);jac=cone_jac(z);normals=[];labels=[];bad=[]
    for i,v in enumerate(h):
        if v<=active_tol:
            row=jac[i];norm=np.linalg.norm(row)
            if norm<=1e-10:bad.append(i)
            else:normals.append(row/norm);labels.append('cone:'+str(i))
    for i,(v,(lo,hi)) in enumerate(zip(z,BOUNDS)):
        if v<=lo+active_tol:
            row=np.zeros(12);row[i]=1;normals.append(row);labels.append('lower:'+str(i))
        if v>=hi-active_tol:
            row=np.zeros(12);row[i]=-1;normals.append(row);labels.append('upper:'+str(i))
    if normals:
        mat=np.array(normals).T;rank=int(np.linalg.matrix_rank(mat,tol=1e-9));condition=float(np.linalg.cond(mat)) if rank==len(normals) else None
        multipliers,_=nnls(mat,g,maxiter=1000);res=g-mat@multipliers
    else:rank=0;condition=1.;multipliers=np.array([]);res=g
    absolute=float(np.max(np.abs(res)));relative=absolute/max(1.,float(np.max(np.abs(g))));v=violation(z)
    qualified=not bad and rank==len(normals) and condition is not None and condition<=1e8
    return {'violation':v,'absoluteResidual':absolute,'relativeResidual':relative,'active':labels,'multipliers':multipliers.tolist(),'zeroGradientCones':bad,'activeRank':rank,'constraintCondition':condition,'qualification':bool(qualified),'firstOrderVerified':bool(v<=1e-8 and absolute<=1e-4 and relative<=1e-6 and qualified)}

def directions(l,z,f):
    evaluated=0;best=0.;step=1e-6
    for k in range(12):
        for direction in [-1,1]:
            x=z.copy();x[k]+=direction*step
            if violation(x)>1e-12:continue
            try:d=l.evaluate(x)[0]-f
            except np.linalg.LinAlgError:continue
            evaluated+=1;best=min(best,float(d))
    return {'step':step,'feasibleDirections':evaluated,'bestObjectiveChange':best,'descentDetected':best< -1e-7}

def fit_coordinates(graph,warm):
    l=DirectLikelihood(graph);starts=[]
    for label,p in [('sd-.02',np.tile([.02,.02,0.],4)),('sd-.10',np.tile([.10,.10,0.],4)),('outer',np.asarray(warm))]:
        x0=to_coordinate(p);last=[None,None]
        def fun(x):
            if last[0] is not None and np.array_equal(last[0],x):return last[1]
            try:v,g,_=l.evaluate(x,True)
            except np.linalg.LinAlgError:v,g=1e10,np.zeros(12)
            last[:]=[x.copy(),(v,g)];return v,g
        result=minimize(fun,x0,jac=True,bounds=BOUNDS,constraints=[{'type':'ineq','fun':cones,'jac':cone_jac}],method='SLSQP',options={'maxiter':2000,'ftol':1e-12,'disp':False})
        x=result.x
        try:
            value,g,beta=l.evaluate(x,True);feasible=violation(x)<=1e-8 and np.isfinite(value);diagnosis=kkt(x,g) if feasible else None
            direction=directions(l,x,value) if feasible else None
            drift_ok=bool(np.all(beta>-.1) and np.all(beta<.2));verified=bool(feasible and diagnosis['firstOrderVerified'] and drift_ok and not direction['descentDetected'])
            entry={'start':label,'optimizerSuccess':bool(result.success),'optimizerMessage':str(result.message),'iterations':int(result.nit),'evaluations':int(result.nfev),'objective':float(value),'coordinates':x.tolist(),'drift':beta.tolist(),'violation':violation(x),'kkt':diagnosis,'directional':direction,'driftSupported':drift_ok,'firstOrderVerified':verified}
        except (np.linalg.LinAlgError,RuntimeError,ValueError) as e:
            entry={'start':label,'optimizerSuccess':bool(result.success),'optimizerMessage':str(result.message),'iterations':int(result.nit),'evaluations':int(result.nfev),'objective':None,'error':str(e),'firstOrderVerified':False}
        starts.append(entry)
    feasible=[r for r in starts if r['objective'] is not None and r['violation']<=1e-8]
    selected=min(feasible,key=lambda r:(r['objective'],r['start'])) if feasible else None
    if not selected:return {'status':'no-feasible-candidate','starts':starts,'selected':None,'historicalFittingBlocked':True}
    # Selection is based on objective, never on whether the verification passed.
    return {'status':'first-order-verified' if selected['firstOrderVerified'] else 'unresolved','selected':selected['start'],'objective':selected['objective'],'coordinates':selected['coordinates'],'drift':selected['drift'],'kkt':selected['kkt'],'directional':selected['directional'],'starts':starts,'historicalFittingBlocked':True}
