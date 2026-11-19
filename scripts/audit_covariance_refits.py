"""Reconstruct every predeclared failed refit and evaluate covariance coordinates."""
import argparse,gzip,hashlib,json,sys
from concurrent.futures import ProcessPoolExecutor,as_completed
from pathlib import Path
import numpy as np
from covariance_coordinate_audit import DirectLikelihood,fit_coordinates,to_coordinate
from revision_cost_predictive import generated,BalancedLikelihood
from verify_predictive_runtime import contract,OUT as INPUT
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data/calibration-diagnostics/covariance-refit-audit.json.gz'
SOURCES=['docs/boundary-covariance-audit-protocol.md','scripts/audit_covariance_refits.py','scripts/covariance_coordinate_audit.py','tests/covariance_coordinate_test.py','scripts/revision_cost_predictive.py','scripts/revision_cost_estimator.py','scripts/revision_cost_reml.py','data/calibration-diagnostics/predictive-depth-avx2.json.gz']

def cases():
    report=json.loads(gzip.decompress(INPUT.read_bytes()));result=[];controls={3:0,7:0,12:0}
    for c in report['cells']:
        b=c['bootstrap']
        if not b:continue
        for i,old in enumerate(b['refits']):
            kind='failed' if old['status']!='converged' else 'control' if controls[c['transitions']]<2 else None
            if kind=='control':controls[c['transitions']]+=1
            if kind:
                seed=int(np.random.SeedSequence([c['seed'],c['transitions'],c['schools'],100+i]).generate_state(1)[0])
                result.append({'outerSeed':c['seed'],'transitions':c['transitions'],'schools':c['schools'],'index':i,'refitSeed':seed,'kind':kind,'outerParameters':c['fits']['reml']['parameters'],'outerDrift':c['fits']['reml']['drift'],'original':old})
    return result

def run_case(case):
    graph,_,_=generated(case['refitSeed'],case['transitions'],case['schools'],parameters=case['outerParameters'],drift=np.array(case['outerDrift']),future=0)
    alt=fit_coordinates(graph,case['outerParameters']);old=case['original'];comparison=None
    if old.get('parameters'):
        direct=DirectLikelihood(graph).evaluate(to_coordinate(old['parameters']))[0];frozen=BalancedLikelihood(graph,'reml').evaluate(old['parameters'])[0]
        comparison={'directObjective':direct,'frozenObjective':frozen,'difference':direct-frozen,'alternativeMinusOriginal':alt['objective']-frozen if alt.get('objective') is not None else None,'lowerAlternative':bool(alt.get('objective') is not None and alt['objective']<frozen-1e-6)}
    return {**{k:v for k,v in case.items() if k not in ['outerParameters','outerDrift']},'alternative':alt,'originalObjectiveComparison':comparison}

def identities():return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in SOURCES}

def summarize(cells):
    groups=[]
    for t in [3,7,12]:
        for kind in ['failed','control']:
            x=[c for c in cells if c['transitions']==t and c['kind']==kind];groups.append({'transitions':t,'kind':kind,'cases':len(x),'firstOrderVerified':sum(c['alternative']['status']=='first-order-verified' for c in x),'unresolved':sum(c['alternative']['status']=='unresolved' for c in x),'noFeasibleCandidate':sum(c['alternative']['status']=='no-feasible-candidate' for c in x),'zeroGradientOrUnqualified':sum(bool(c['alternative'].get('kkt') and not c['alternative']['kkt']['qualification']) for c in x),'lowerThanAcceptedControl':sum(bool(c['originalObjectiveComparison'] and c['originalObjectiveComparison']['lowerAlternative']) for c in x)})
    return groups

def compare(a,b,path='root'):
    if isinstance(a,dict):
        if not isinstance(b,dict) or a.keys()!=b.keys():raise ValueError(path+' fields differ')
        for k in a:
            # Iteration traces and first-order numeric residuals are retained, not portability targets.
            if k in ['iterations','evaluations','optimizerMessage','absoluteResidual','relativeResidual','multipliers','constraintCondition','bestObjectiveChange']:continue
            compare(a[k],b[k],path+'.'+k)
    elif isinstance(a,list):
        if not isinstance(b,list) or len(a)!=len(b):raise ValueError(path+' shape differs')
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+f'[{i}]')
    elif isinstance(a,float):
        if not isinstance(b,(float,int)) or not np.isfinite(a) or not np.isclose(a,b,rtol=1e-5,atol=1e-7):raise ValueError(path+f' differs: {a} vs {b}')
    elif a!=b or type(a)!=type(b):raise ValueError(path+' metadata/status differs')

def main():
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');p.add_argument('--validate',action='store_true');p.add_argument('--workers',type=int,default=4);p.add_argument('--pilot',action='store_true');args=p.parse_args();runtime=contract();specs=cases()
    if not 1<=args.workers<=8:raise ValueError('Worker limit')
    if args.validate:
        r=json.loads(gzip.decompress(OUT.read_bytes()))
        if r['sourceHashes']!=identities() or r['runtime']!=runtime or r['summary']!=summarize(r['cases']) or len(r['cases'])!=len(specs):raise ValueError('Audit identity/support changed')
        print('Covariance audit artifact identity and support verified.');return
    if args.pilot:specs=specs[:1]
    data={}
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        pending={pool.submit(run_case,s):i for i,s in enumerate(specs)}
        for f in as_completed(pending):
            i=pending[f];data[i]=f.result()
            if len(data)%10==0:print(json.dumps({'completed':len(data),'total':len(specs)}),flush=True)
    cells=[data[i] for i in range(len(specs))];report={'id':'covariance-refit-audit-v1','sourceHashes':identities(),'runtime':runtime,'historicalFits':0,'productionActivated':False,'summary':summarize(cells),'cases':cells,'limitations':['First-order KKT is necessary, not proof of a global or even local minimum.','Constraint qualification fails at some zero-variance boundaries; those cases remain unresolved.','This is a post-failure synthetic diagnostic, not an independent qualification or bootstrap replacement.','Previously failed gates and cross-runtime failure remain unchanged.']}
    if args.pilot:print(json.dumps({'case':cells[0]['outerSeed'],'status':cells[0]['alternative']['status'],'starts':[(x['start'],x.get('objective'),x.get('optimizerMessage')) for x in cells[0]['alternative']['starts']]}));return
    if args.verify:
        expected=json.loads(gzip.decompress(OUT.read_bytes()));compare(report,expected);print('All covariance refit diagnostics reproduced.');return
    if OUT.exists():raise ValueError('Existing audit must not be overwritten')
    OUT.write_bytes(gzip.compress(json.dumps(report,separators=(',',':'),allow_nan=False).encode(),mtime=0));print('Recorded covariance audit with historical fitting blocked.')
if __name__=='__main__':main()
