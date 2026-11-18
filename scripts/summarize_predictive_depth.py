"""Compact transparent summaries; matched comparisons never mix fit denominators."""
import argparse,gzip,hashlib,json
from pathlib import Path
import numpy as np
from validate_predictive_depth import validate
from revision_cost_predictive import PARAMETERS,DRIFT
ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'data/calibration-diagnostics/predictive-depth-study.json.gz';OUT=ROOT/'data/calibration-diagnostics/predictive-depth-summary.json'

def generate():
    report=validate(json.loads(gzip.decompress(SOURCE.read_bytes())));cells=report['cells'];pairs=[];recovery=[];bootstrap=[]
    keys=sorted(set((c['transitions'],c['schools'],c['scenario']) for c in cells))
    for t,n,scenario in keys:
        group=[c for c in cells if(c['transitions'],c['schools'],c['scenario'])==(t,n,scenario)]
        for left,right in [('ml','reml'),('reml','diagonal-shared-reml'),('reml','bootstrap-reml'),('reml','oracle'),('reml','no-growth'),('reml','fixed-4-3')]:
            matched=[c for c in group if all(c['predictions'].get(m,{}).get('status')=='available' for m in [left,right])]
            for wi,wait in enumerate([0,4,8]):
                comparisons=[]
                for c in matched:
                    a=c['predictions'][left]['scores'][wi];b=c['predictions'][right]['scores'][wi]
                    comparisons.append([int(b['bills']['covered'])-int(a['bills']['covered']),b['bills']['widthOverBudget']-a['bills']['widthOverBudget'],b['bills']['intervalScoreOverBudget']-a['bills']['intervalScoreOverBudget'],b['funding'][1]['brier']-a['funding'][1]['brier'],b['household']['brier']-a['household']['brier']])
                delta=np.mean(comparisons,axis=0).tolist() if comparisons else [None]*5
                pairs.append({'transitions':t,'schools':n,'scenario':scenario,'left':left,'right':right,'wait':wait,'matchedWorlds':len(matched),'rightMinusLeft':dict(zip(['billCoverage80','billWidthOverBudget','billIntervalScoreOverBudget','baseFundingBrier','householdBrier'],delta))})
        for method in ['ml','reml','diagonal-shared-reml']:
            fs=[c['fits'][method] for c in group if c['fits'][method]['status']=='converged'];p=np.array([f['parameters'] for f in fs]);betas=np.array([f['drift'] for f in fs])
            recovery.append({'transitions':t,'schools':n,'scenario':scenario,'method':method,'worlds':len(fs),'totalWorlds':len(group),'varianceMedianRatios':{name:np.median(p[:,3*j:3*j+2]**2/PARAMETERS[3*j:3*j+2]**2,axis=0).tolist() if fs else None for j,name in enumerate(['shared','permanent','temporary','measurement'])},'correlationMedians':np.median(p[:,2::3],axis=0).tolist() if fs else None,'driftMedianError':np.median(betas-DRIFT,axis=0).tolist() if fs else None})
        bs=[c['bootstrap'] for c in group if c['bootstrap']]
        if bs:bootstrap.append({'transitions':t,'schools':n,'outerWorlds':len(bs),'attemptedOuterWorlds':sum(b['attemptedRefits']>0 for b in bs),'completeOuterWorlds':sum(b['attemptedRefits']==16 and b['failedRefits']==0 for b in bs),'attemptedRefits':sum(b['attemptedRefits'] for b in bs),'failedRefits':sum(b['failedRefits'] for b in bs)})
    sources=['scripts/summarize_predictive_depth.py','data/calibration-diagnostics/predictive-depth-study.json.gz','data/calibration-diagnostics/metadata-continuity.json']
    return {'id':'predictive-depth-summary-v1','sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sources},'cellSummaries':report['summary'],'parameterRecovery':recovery,'matchedComparisons':pairs,'bootstrapSupport':bootstrap,'historicalFits':0,'productionActivated':False,'interpretation':['Available-world diagnostics condition on passing estimation; missing worlds prevent unconditional coverage claims.','Matched comparisons reuse identical outer worlds, truth and financial budgets; comparisons across grid cells are not independent.','Positive interval width is not itself improvement; lower interval score and Brier are better.','Wait-zero deposit requirements may be impossible. Extended-real required-deposit coverage (infinity<=infinity) is not a feasible saving recommendation.','Small outer batches and 16-refit pilot mixtures do not establish calibrated tails or a universal estimator winner.']}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args();output=json.dumps(generate(),indent=2,allow_nan=False)+'\n'
    if args.verify:
        if OUT.read_text()!=output:raise ValueError('Compact predictive summary differs')
    else:OUT.write_text(output)
    print('Compact matched predictive summary '+('verified' if args.verify else 'written'))
