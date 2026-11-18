"""Fixed synthetic worlds for pre-registered recovery tests; no school data."""
import numpy as np
from revision_cost_estimator import covariance

PARAMETERS=np.array([.03,.02,.4,.04,.03,.2,.05,.04,.3,.02,.03,.1])

def traced_synthetic_graph(seed=2026111801,schools=8,years=24,bias=False):
    rng=np.random.default_rng(seed);p=PARAMETERS;shared=np.zeros(2);levels=np.zeros((schools,2))
    deviations=rng.multivariate_normal([0.,0.],covariance(p[6:9])/(1-.25),size=schools);rows=[];shared_draws=[]
    for year in range(years):
        draw=rng.multivariate_normal([0.,0.],covariance(p[:3]));shared_draws.append(draw.tolist())
        shared+=np.array([.02,.01])+draw
        levels+=rng.multivariate_normal([0.,0.],covariance(p[3:6]),size=schools)
        deviations=.5*deviations+rng.multivariate_normal([0.,0.],covariance(p[6:9]),size=schools)
        for i in range(schools):
            for lag in [0,1]:
                error=rng.multivariate_normal([0.,0.],covariance(p[9:12]))
                y=shared+levels[i]+deviations[i]+error
                if bias and year>=12:y+=np.array([.10,.08])
                rows.append({'key':f'{i}:{year}:{lag}','unitid':f'synthetic-{i}','academicYear':2000+year,'collectionYear':2000+year+lag,'logValues':y.tolist()})
    graph={'schema':1,'kind':'synthetic','policy':'replicated-source-known-process','observations':rows}


    draws=np.array(shared_draws[1:]);mean=draws.mean(axis=0);centered=draws-mean
    trace={'sharedInnovations':shared_draws,'effectiveTransitions':len(draws),'excludedFirstDraw':True,
        'transitionMean':mean.tolist(),'knownZeroSecondMoment':(draws.T@draws/len(draws)).tolist(),
        'centeredCovarianceN':(centered.T@centered/len(draws)).tolist(),
        'sampleCovarianceNMinus1':(centered.T@centered/(len(draws)-1)).tolist() if len(draws)>1 else None}
    return graph,trace
