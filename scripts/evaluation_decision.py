"""Predeclared synthetic evaluation gates. Missing support never passes."""
import math
import numpy as np
from revision_cost_predictive import PARAMETERS,DRIFT

def wilson(p,n):
    if n==0:return None
    z=1.959963984540054;den=1+z*z/n;c=(p+z*z/(2*n))/den;h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;return [c-h,c+h]

def mean_ci(x):
    if not x:return {'mean':None,'n':0,'normal95':None}
    a=np.asarray(x,dtype=float);m=float(a.mean());h=1.959963984540054*float(a.std(ddof=1))/math.sqrt(len(a)) if len(a)>1 else None
    return {'mean':m,'n':len(a),'normal95':[m-h,m+h] if h is not None else None}

def summarize(cells):
    out=[]
    for key in sorted(set((c['transitions'],c['schools'],c['scenario']) for c in cells)):
        group=[c for c in cells if(c['transitions'],c['schools'],c['scenario'])==key]
        for method in sorted(set(m for c in group for m in c['predictions'])):
            available=[c for c in group if c['predictions'].get(method,{}).get('status')=='available'];rows=[]
            for wi,wait in enumerate([0,4,8]):
                scores=[c['predictions'][method]['scores'][wi] for c in available];n=len(scores);p=float(np.mean([s['bills']['covered'] for s in scores])) if n else None
                finite=[s['funding'][1] for s in scores if not s['funding'][1]['truthImpossible']]
                finite_pass=sum(not s['p90Impossible'] and s['requiredCoverage'] for s in finite)
                rows.append({'wait':wait,'availableWorlds':n,'coverage80':p,'coverageWilson95':wilson(p,n) if n else None,'intervalScore':mean_ci([s['bills']['intervalScoreOverBudget'] for s in scores]),'width':mean_ci([s['bills']['widthOverBudget'] for s in scores]),'individualBrier':mean_ci([s['funding'][1]['brier'] for s in scores]),'householdBrier':mean_ci([s['household']['brier'] for s in scores]),'finiteTruthDepositWorlds':len(finite),'finiteRecommendedDepositWorlds':sum(not s['p90Impossible'] for s in finite),'finiteDepositCoverage90':finite_pass/len(finite) if finite else None,'impossibleTruthWorlds':n-len(finite)})
            out.append({'transitions':key[0],'schools':key[1],'scenario':key[2],'method':method,'worlds':len(group),'availableWorlds':len(available),'availability':len(available)/len(group),'rows':rows})
    return out

def gates(cells,summaries,portability=None,metadata=None):
    result=[]
    def add(name,state,detail):result.append({'gate':name,'state':state,'detail':detail})
    add('retained-case-portability','unsupported' if portability is None else ('pass' if portability['passed'] else 'fail'),portability)
    for t in [3,7,12]:
        group=[c for c in cells if(c['transitions'],c['schools'],c['scenario'])==(t,8,'ideal')];n=len(group)
        outer=[c for c in group if c['fits']['candidate']['status']=='qualified'];available=[c for c in group if c['predictions']['candidate-bootstrap']['status']=='available']
        add(f'{t}:outer-availability','pass' if n and len(outer)/n>=.9 else 'fail',{'available':len(outer),'total':n,'minimum':.9})
        add(f'{t}:complete-bootstrap','pass' if n and len(available)/n>=.9 else 'fail',{'available':len(available),'total':n,'minimum':.9})
        if outer:
            ps=np.array([c['fits']['candidate']['parameters'] for c in outer]);ds=np.array([c['fits']['candidate']['drift'] for c in outer]);bias=np.median(ds-DRIFT,axis=0);ratios={family:np.median(ps[:,3*j:3*j+2]**2/PARAMETERS[3*j:3*j+2]**2,axis=0).tolist() for j,family in enumerate(['shared','permanent','temporary','measurement'])}
            recovered=all(.5<=v<=2 for a in ratios.values() for v in a) and bool(np.all(np.abs(bias)<=.01));add(f'{t}:parameter-recovery','pass' if recovered else 'fail',{'medianVarianceRatios':ratios,'medianDriftBias':bias.tolist(),'available':len(outer),'total':n})
        else:add(f'{t}:parameter-recovery','unsupported',{'available':0,'total':n})
        summ=next(s for s in summaries if(s['transitions'],s['schools'],s['scenario'],s['method'])==(t,8,'ideal','candidate-bootstrap'))
        for wi,wait in enumerate([0,4,8]):
            r=summ['rows'][wi];p=r['coverage80'];interval=r['coverageWilson95'];good=p is not None and .7<=p<=.9 and interval[0]<=.8<=interval[1]
            add(f'{t}:{wait}:bill-coverage','unsupported' if p is None else 'pass' if good else 'fail',r)
            add(f'{t}:{wait}:finite-deposit-coverage','unsupported' if r['finiteDepositCoverage90'] is None else 'pass' if r['finiteDepositCoverage90']>=.8 else 'fail',{'coverage':r['finiteDepositCoverage90'],'finiteTruth':r['finiteTruthDepositWorlds'],'finiteBound':r['finiteRecommendedDepositWorlds'],'impossibleTruth':r['impossibleTruthWorlds']})
            matched=[c for c in available if c['predictions']['old-plugin']['status']=='available'];pairs=[]
            for c in matched:
                a=c['predictions']['old-plugin']['scores'][wi];b=c['predictions']['candidate-bootstrap']['scores'][wi];pairs.append((a,b))
            if len(pairs)<32:add(f'{t}:{wait}:paired-improvement','unsupported',{'matched':len(pairs),'minimum':32});continue
            old=float(np.mean([a['bills']['intervalScoreOverBudget'] for a,b in pairs]));new=float(np.mean([b['bills']['intervalScoreOverBudget'] for a,b in pairs]));improvement=(old-new)/old if old>0 else None
            di=[b['funding'][1]['brier']-a['funding'][1]['brier'] for a,b in pairs];dh=[b['household']['brier']-a['household']['brier'] for a,b in pairs]
            score_ok=improvement is not None and improvement>=.05;brier_ok=np.mean(di)<=.02 and np.mean(dh)<=.02 and min(np.mean(di),np.mean(dh))<=-.01
            add(f'{t}:{wait}:paired-improvement','pass' if score_ok and brier_ok else 'fail',{'matched':len(pairs),'intervalScoreImprovement':improvement,'pairedIntervalDifference':mean_ci([b['bills']['intervalScoreOverBudget']-a['bills']['intervalScoreOverBudget'] for a,b in pairs]),'pairedIndividualBrierDifference':mean_ci(di),'pairedHouseholdBrierDifference':mean_ci(dh)})
    states=[r['state'] for r in result];decision='reject' if 'fail'in states else 'unsupported' if 'unsupported'in states else 'pass'
    source=metadata or {'state':'unsupported','reason':'No reviewed continuity or strict-vintage evidence supplied'}
    historical='eligible' if decision=='pass' and source.get('state')=='pass' else 'unsupported'
    return {'syntheticDecision':decision,'gates':result,'historicalEvaluation':historical,'historicalEvidence':source,'productionActivation':False,'stoppingRule':'This is a completed evaluation decision. Reject/unsupported does not authorize another correction or a historical fit.'}
