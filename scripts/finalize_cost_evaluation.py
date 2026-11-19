"""Join every completed, source-identified experiment into one frozen decision."""
import argparse,collections,gzip,hashlib,json,itertools
from pathlib import Path
import numpy as np
from evaluation_decision import summarize,gates,mean_ci
from revision_cost_predictive import PARAMETERS,DRIFT
from run_complete_evaluation import validate
from evaluate_retained_optimizer import compare_backends,identities
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/calibration-diagnostics/complete-evaluation-decision.json'
PATHS=['docs/complete-cost-evaluation-protocol.md','scripts/finalize_cost_evaluation.py','scripts/evaluation_decision.py','data/calibration-diagnostics/complete-cost-evaluation.json.gz','data/calibration-diagnostics/evaluation-retained-avx2.json.gz','data/calibration-diagnostics/evaluation-retained-default.json.gz','data/calibration-diagnostics/evaluation-portability.json','data/calibration-diagnostics/evaluation-source-support.json','data/calibration-diagnostics/cross-runtime-minimum.json','data/calibration-diagnostics/evaluation-search-summary.json.gz']
def read(p):
    b=(ROOT/p).read_bytes();return json.loads(gzip.decompress(b) if p.endswith('.gz') else b)
def paired(cells):
    records=[]
    for key in sorted(set((c['transitions'],c['schools'],c['scenario']) for c in cells)):
        group=[c for c in cells if(c['transitions'],c['schools'],c['scenario'])==key]
        methods=sorted(set(m for c in group for m in c['predictions']))
        for a,b in itertools.combinations(methods,2):
            matched=[c for c in group if all(c['predictions'].get(m,{}).get('status')=='available' for m in [a,b])]
            rows=[]
            for wi,wait in enumerate([0,4,8]):
                pairs=[(c['predictions'][a]['scores'][wi],c['predictions'][b]['scores'][wi]) for c in matched]
                rows.append({'wait':wait,'matchedWorlds':len(pairs),'intervalScoreDifference':mean_ci([y['bills']['intervalScoreOverBudget']-x['bills']['intervalScoreOverBudget'] for x,y in pairs]),'individualBrierDifference':mean_ci([y['funding'][1]['brier']-x['funding'][1]['brier'] for x,y in pairs]),'householdBrierDifference':mean_ci([y['household']['brier']-x['household']['brier'] for x,y in pairs])})
            records.append({'transitions':key[0],'schools':key[1],'scenario':key[2],'first':a,'second':b,'difference':'second minus first; negative is better','worlds':len(group),'rows':rows})
    return records

def financial_details(cells):
    out=[]
    for key in sorted(set((c['transitions'],c['schools'],c['scenario']) for c in cells)):
        group=[c for c in cells if(c['transitions'],c['schools'],c['scenario'])==key]
        for method in sorted(set(m for c in group for m in c['predictions'])):
            available=[c for c in group if c['predictions'].get(method,{}).get('status')=='available'];rows=[]
            for wi,wait in enumerate([0,4,8]):
                scores=[c['predictions'][method]['scores'][wi] for c in available];levels=[]
                for fi,factor in enumerate([.9,1.,1.1]):
                    fs=[s['funding'][fi] for s in scores];finite=[f for f in fs if not f['truthImpossible']]
                    levels.append({'balanceFactor':factor,'availableWorlds':len(fs),'brier':mean_ci([f['brier'] for f in fs]),'meanFailureProbability':mean_ci([f['failureProbability'] for f in fs]),'empiricalFailureRate':float(np.mean([f['failed'] for f in fs])) if fs else None,'meanImpossibleProbability':mean_ci([f['impossibleProbability'] for f in fs]),'truthImpossibleWorlds':sum(f['truthImpossible'] for f in fs),'recommendedBoundImpossibleWorlds':sum(f['p90Impossible'] for f in fs),'finiteTruthWorlds':len(finite),'finiteRecommendationCoverage':sum(not f['p90Impossible'] and f['requiredCoverage'] for f in finite)/len(finite) if finite else None})
                rows.append({'wait':wait,'savingsLevels':levels,'householdTruthBindingMonths':mean_ci([s['household']['bindingMonths'] for s in scores]),'householdEmpiricalFailureRate':float(np.mean([s['household']['failed'] for s in scores])) if scores else None,'householdMeanFailureProbability':mean_ci([s['household']['failureProbability'] for s in scores])})
            out.append({'transitions':key[0],'schools':key[1],'scenario':key[2],'method':method,'worlds':len(group),'rows':rows})
    return out

def recovery(cells):
    rows=[]
    for t,n in sorted(set((c['transitions'],c['schools']) for c in cells if c['scenario']=='ideal')):
        group=[c for c in cells if(c['transitions'],c['schools'],c['scenario'])==(t,n,'ideal')]
        for method in ['old','candidate']:
            good='converged' if method=='old' else 'qualified';fits=[c['fits'][method] for c in group if c['fits'][method]['status']==good];families={}
            if fits:
                p=np.array([f['parameters'] for f in fits]);d=np.array([f['drift'] for f in fits])
                for j,name in enumerate(['shared','permanent','temporary','measurement']):
                    ratio=p[:,3*j:3*j+2]**2/PARAMETERS[3*j:3*j+2]**2
                    families[name]={'varianceRatioQuantiles10_50_90':np.quantile(ratio,[.1,.5,.9],axis=0).tolist(),'correlationErrorQuantiles10_50_90':np.quantile(p[:,3*j+2]-PARAMETERS[3*j+2],[.1,.5,.9]).tolist()}
            rows.append({'transitions':t,'schools':n,'method':method,'qualifiedWorlds':len(fits),'worlds':len(group),'families':families,'medianDriftBias':np.median(d-DRIFT,axis=0).tolist() if fits else None})
    return rows

def failure_counts(cells):
    result=[]
    for t in [3,7,12]:
        group=[c for c in cells if(c['transitions'],c['schools'],c['scenario'])==(t,8,'ideal')]
        for method in ['old','candidate']:
            good='converged' if method=='old' else 'qualified';outer=[c['fits'][method] for c in group];inner=[f for c in group for f in c['bootstrap'][method]['refits']];attempted=[f for f in inner if f['status']!='outer-unavailable']
            result.append({'transitions':t,'method':method,'outerWorlds':len(group),'qualifiedOuter':sum(f['status']==good for f in outer),'bootstrapSlots':len(inner),'attemptedRefits':len(attempted),'notAttemptedSlots':len(inner)-len(attempted),'qualifiedRefits':sum(f['status']==good for f in attempted),'completeMixtures':sum(c['bootstrap'][method]['complete'] for c in group),'outerReasons':dict(collections.Counter(reason for f in outer if f['status']!=good for reason in f.get('reasons',[f['status']]))),'refitReasons':dict(collections.Counter(reason for f in attempted if f['status']!=good for reason in f.get('reasons',[f['status']])) )})
    return result

def generate():
    r=validate(read(PATHS[3]));a=read(PATHS[4]);b=read(PATHS[5]);port=read(PATHS[6]);support=read(PATHS[7]);control=read(PATHS[8])
    if a['sourceHashes']!=identities() or b['sourceHashes']!=identities():raise ValueError('Retained input sources changed')
    if compare_backends(a,b)!=port:raise ValueError('Portability comparison does not follow retained fits')
    if len(support['groups'])!=15 or support['approvedGraphBridges']!=0 or support['historicalFits']!=0:raise ValueError('Unapproved support')
    if not all(g['original']==g['reviewed'] for g in support['groups']):raise ValueError('Unsupported population bridge entered a graph')
    if control['higherMinusLower']<=1e-6:raise ValueError('Known multiple-minimum control disappeared')
    search=read(PATHS[9])
    if search['qualificationChanged'] or search['historicalFits']:raise ValueError('Search accounting changed evaluation')
    for name,h in search['sourceHashes'].items():
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=h:raise ValueError('Search accounting input changed')
    ss=summarize(r['cells']);decision=gates(r['cells'],ss,port if port['state']!='unsupported' else None,support['historicalEligibility'])
    return {'id':'complete-cost-evaluation-decision-v1','sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in PATHS},'decision':decision,'gateCounts':dict(collections.Counter(g['state'] for g in decision['gates'])),'worlds':len(r['cells']),'summary':ss,'allSavingsLevelFinancials':financial_details(r['cells']),'failureAccounting':failure_counts(r['cells']),'parameterRecovery':recovery(r['cells']),'pairedComparisons':paired(r['cells']),'retainedQualification':{'avx2Qualified':sum(c['fit']['status']=='qualified' for c in a['cases']),'defaultQualified':sum(c['fit']['status']=='qualified' for c in b['cases']),'total':185},'portability':{k:port[k] for k in ['state','passed','cases','differences','uncomparable']},'sourceEligibility':support['historicalEligibility'],'knownMultipleMinimumControl':{'source':PATHS[8],'higherMinusLower':control['higherMinusLower'],'newFreeCorrelationFitIsNotFixedCorrelationControl':True},'historicalFits':0,'productionActivated':False,'limitations':['Available-case forecasts are conditional on numerical qualification; unconditional availability and failed slots remain explicit.','Paired normal intervals describe Monte Carlo uncertainty; 64 main worlds and 16 inner refits are a bounded qualification experiment.','Finite multistart, projected-gradient and directional probes do not certify a global optimum.','Synthetic evaluation is not a historical-availability backtest or a promise of financial improvement.','The frozen financial laboratory holds CPI and investment returns at zero to isolate cost forecast consequences; it does not calibrate the full joint economic model.']}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args();r=generate();out=json.dumps(r,indent=2,allow_nan=False)+'\n'
    if args.verify:
        if OUT.read_text()!=out:raise ValueError('Final decision differs')
    else:
        if OUT.exists():raise ValueError('Preserve completed decision')
        OUT.write_text(out)
    print(json.dumps({'worlds':r['worlds'],'decision':r['decision']['syntheticDecision'],'gates':r['gateCounts'],'historical':r['decision']['historicalEvaluation']}))
