"""Frozen realistic-depth study. All worlds retained; hash-keyed cell checkpoints.

Run OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python3 scripts/validate_predictive_depth.py
--verify reruns numerical fits; --validate checks artifact identities/shape only.
"""
import argparse,gzip,hashlib,json,platform,subprocess,time
from concurrent.futures import ProcessPoolExecutor,as_completed
from pathlib import Path
import numpy as np
import scipy
from revision_cost_predictive import generated,BalancedLikelihood,fit_balanced,forecast_draws,PARAMETERS,DRIFT

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/calibration-diagnostics/predictive-depth-study.json.gz'
PATHS=['docs/predictive-depth-study-protocol.md','scripts/revision_cost_predictive.py','scripts/validate_predictive_depth.py','scripts/predictive-ledger.mjs','scripts/revision_cost_estimator.py','scripts/revision_cost_reml.py',*['site/js/'+p for p in ['engine.js','domain.js','deposit-policy.js','planning-decisions.js','planning.js']]]
# All transitive production sources invalidate ledger checkpoints, including query imports.
PATHS=sorted(set(PATHS+[str(p.relative_to(ROOT)) for p in (ROOT/'site/js').glob('*.js')]))
SEEDS=list(range(2026112001,2026112025))
SCENARIOS=['correlated-reporting','reporting-shift','heavy-tails','permanent-jump','persistence']
METHODS=['ml','reml','diagonal-shared-reml']
B=16;DRAWS=256

def identities():
    return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in PATHS}

def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def specifications():
    return [(s,t,n,'ideal') for s in SEEDS for t in [3,7,12] for n in [8,32]]+[(s,t,8,'ideal') for s in SEEDS[:8] for t in [24,48]]+[(s,12,8,c) for s in SEEDS[:8] for c in SCENARIOS]

def interval(x,truth,scale):
    lo,med,hi=np.quantile(x,[.1,.5,.9]);score=hi-lo+10*max(0,lo-truth)+10*max(0,truth-hi)
    return {'covered':bool(lo<=truth<=hi),'widthOverBudget':float((hi-lo)/scale),'intervalScoreOverBudget':float(score/scale),'medianErrorOverBudget':float((med-truth)/scale)}

def score(results,truth):
    out=[]
    for wi,wait in enumerate([0,4,8]):
        values=[r[wi] for r in results];actual=truth[wi];bill=interval([r['individual'][1]['total'] for r in values],actual['individual'][1]['total'],72000)
        funding=[]
        for j,factor in enumerate([.9,1,1.1]):
            rs=[r['individual'][j] for r in values];target=actual['individual'][j];p=np.mean([r['failed'] for r in rs]);impossible=float(np.mean([r['impossible'] for r in rs]));deposits=np.array([np.inf if r['impossible'] else r['required'] for r in rs])
            # Order-statistic quantile handles explicit infinity without interpolation NaNs.
            q=float(np.sort(deposits)[int(np.ceil(.9*len(deposits)))-1]);needed=np.inf if target['impossible'] else target['required']
            funding.append({'balanceFactor':factor,'failureProbability':float(p),'failed':target['failed'],'brier':float((p-target['failed'])**2),'truthUnpaid':target['unpaid'],'truthRequired':target['required'],'truthImpossible':target['impossible'],'requiredP90':q if np.isfinite(q) else None,'p90Impossible':not np.isfinite(q),'requiredCoverage':bool(needed<=q),'impossibleProbability':impossible,'depositMonths':target['depositMonths']})
        hp=float(np.mean([r['household']['failed'] for r in values]));hh=actual['household']
        out.append({'wait':wait,'bills':bill,'funding':funding,'household':{'failureProbability':hp,'failed':hh['failed'],'brier':float((hp-hh['failed'])**2),'truthUnpaid':hh['unpaid'],'bindingMonths':hh['bindingMonths'],'peak':hh['peak']}})
    return out


class Ledger:
    def __init__(self):self.p=subprocess.Popen(['node','scripts/predictive-ledger.mjs'],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
    def evaluate(self,paths):
        self.p.stdin.write(json.dumps({'paths':np.asarray(paths).tolist()},allow_nan=False,separators=(',',':'))+'\n');self.p.stdin.flush()
        line=self.p.stdout.readline()
        if not line:raise RuntimeError('Ledger process exited')
        r=json.loads(line)
        if 'error'in r:raise RuntimeError(r['error'])
        return r['results']
    def close(self):
        self.p.stdin.close();self.p.stdout.close()
        if self.p.wait()!=0:raise RuntimeError('Ledger failed')


def run_cell(spec):
    seed,t,n,scenario=spec;graph,latent,shocks=generated(seed,t,n,scenario=scenario);likelihood=BalancedLikelihood(graph)
    truth=(latent[:2,t:t+14]-latent[:2,t,None,:])[None,:,:,:]
    ledger=Ledger()
    try:
        observed=ledger.evaluate(truth)[0];predictions={};fits={};boot=None
        role=lambda r:np.random.SeedSequence([seed,t,n,r]).generate_state(1)[0].item()
        for method in METHODS:
            mode='ml' if method=='ml' else 'reml';fit=fit_balanced(graph,mode,fixed={2:0.} if method=='diagonal-shared-reml' else None);fits[method]=fit
            if fit['status']!='converged':predictions[method]={'status':fit['status']};continue
            draws=forecast_draws(likelihood,fit['parameters'],fit['drift'],role(10))
            predictions[method]={'status':'available','scores':score(ledger.evaluate(draws),observed)}
        reml=fits['reml']
        if scenario=='ideal' and n==8 and t in [3,7,12]:
            refits=[];draws=[]
            if reml['status']=='converged':
                for b in range(B):
                    bg,_,_=generated(role(100+b),t,n,parameters=reml['parameters'],drift=np.array(reml['drift']),future=0)
                    fit=fit_balanced(bg,'reml',warm=reml['parameters']);refits.append(fit)
                    if fit['status']=='converged':draws.append(forecast_draws(likelihood,fit['parameters'],fit['drift'],role(200+b),DRAWS//B))
            boot={'expectedRefits':B,'attemptedRefits':len(refits),'failedRefits':sum(f['status']!='converged' for f in refits),'refits':refits}
            if len(draws)==B:predictions['bootstrap-reml']={'status':'available','scores':score(ledger.evaluate(np.concatenate(draws)),observed)}
            else:predictions['bootstrap-reml']={'status':'bootstrap-unavailable'}
        oracle='oracle' if scenario=='ideal' else 'truth-parameter-Gaussian'
        predictions[oracle]={'status':'available','scores':score(ledger.evaluate(forecast_draws(likelihood,PARAMETERS,DRIFT,role(11))),observed)}
        for name,rates in [('no-growth',[0.,0.]),('fixed-4-3',np.log([1.04,1.03]))]:
            paths=np.tile(np.arange(14)[:,None]*rates,(1,2,1,1));predictions[name]={'status':'available','scores':score(ledger.evaluate(paths),observed)}
        return {'seed':seed,'transitions':t,'schools':n,'scenario':scenario,'fits':fits,'bootstrap':boot,'predictions':predictions,'realizedSharedSampleVarianceRatio':(np.var(shocks[1:t+1],axis=0,ddof=1)/PARAMETERS[:2]**2).tolist()}
    finally:ledger.close()


def summary(cells):
    groups=[]
    keys=sorted(set((c['transitions'],c['schools'],c['scenario']) for c in cells))
    for t,n,scenario in keys:
        group=[c for c in cells if(c['transitions'],c['schools'],c['scenario'])==(t,n,scenario)]
        methods=sorted(set(m for c in group for m in c['predictions']))
        for method in methods:
            available=[c for c in group if c['predictions'].get(method,{}).get('status')=='available'];rows=[]
            for wait in [0,4,8]:
                scores=[next(s for s in c['predictions'][method]['scores'] if s['wait']==wait) for c in available];count=len(scores)
                coverage=float(np.mean([s['bills']['covered'] for s in scores])) if scores else None
                # Wilson interval across independent outer worlds at a fixed cell/wait.
                z=1.959963984540054
                if count:
                    den=1+z*z/count;center=(coverage+z*z/(2*count))/den;half=z*np.sqrt(coverage*(1-coverage)/count+z*z/(4*count*count))/den;bounds=[float(center-half),float(center+half)]
                else:bounds=None
                avg=lambda f:float(np.mean([f(s) for s in scores])) if scores else None
                rows.append({'wait':wait,'worlds':count,'billCoverage80':coverage,'coverageWilson95':bounds,'billWidthOverBudget':avg(lambda s:s['bills']['widthOverBudget']),'billIntervalScoreOverBudget':avg(lambda s:s['bills']['intervalScoreOverBudget']),'medianBillErrorOverBudget':avg(lambda s:s['bills']['medianErrorOverBudget']),'baseFundingBrier':avg(lambda s:s['funding'][1]['brier']),'baseRequiredCoverage90':avg(lambda s:s['funding'][1]['requiredCoverage']),'householdBrier':avg(lambda s:s['household']['brier'])})
            ratios=[np.asarray(c['fits'][method]['parameters'])[:2]**2/PARAMETERS[:2]**2 for c in available] if method in METHODS else []
            groups.append({'transitions':t,'schools':n,'scenario':scenario,'method':method,'totalWorlds':len(group),'availableWorlds':len(available),'sharedVarianceMedianRatio':np.median(ratios,axis=0).tolist() if len(ratios) else None,'rows':rows})
    return groups


def validate(report):
    if report['sourceHashes']!=identities():raise ValueError('Predictive source identity changed')
    if report['worldCount']!=200 or report['independentFreshSeeds']!=24 or report['bootstrapRefits']!=B or report['draws']!=DRAWS:raise ValueError('Study counts changed')
    specs=specifications();actual=[(c['seed'],c['transitions'],c['schools'],c['scenario']) for c in report['cells']]
    if actual!=specs:raise ValueError('Missing, reordered or duplicate worlds')
    if report['summary']!=summary(report['cells']):raise ValueError('Predictive summary differs')
    if report['historicalFits']!=0 or report['productionActivated'] is not False:raise ValueError('Unexpected activation')
    for c in report['cells']:
        if set(c['fits'])!=set(METHODS):raise ValueError('Missing method')
        for method,f in c['fits'].items():
            if f['historicalFittingBlocked'] is not True:raise ValueError('Historical block missing')
            if f['status']=='converged':
                if len(f['parameters'])!=12 or not np.isfinite(f['parameters']).all():raise ValueError('Invalid fit')
                if c['predictions'][method]['status']!='available':raise ValueError('Missing forecast')
        b=c['bootstrap']
        if b:
            if b['expectedRefits']!=B or b['attemptedRefits']!=len(b['refits']) or b['failedRefits']!=sum(f['status']!='converged' for f in b['refits']):raise ValueError('Bootstrap counts differ')
            available=c['predictions']['bootstrap-reml']['status']=='available'
            if available!=(b['attemptedRefits']==B and b['failedRefits']==0):raise ValueError('Partial bootstrap incorrectly used')
    return report


def compare(actual,expected):
    # Exact scientific statuses/identities/shapes; numerical fields across supported builds.
    if isinstance(actual,dict):
        if not isinstance(expected,dict) or actual.keys()!=expected.keys():raise ValueError('Field set changed')
        for k in actual:
            if k in ['starts','rawScore','criticalScaledEigenvalues','legacyFullScaledEigenvalues','projectedScoreStep']:continue
            # Optimizer paths/finite-difference curvature are diagnostics, not reproduction targets.
            if k=='objective':
                np.testing.assert_allclose(actual[k],expected[k],rtol=1e-8,atol=1e-6)
            else:compare(actual[k],expected[k])
    elif isinstance(actual,list):
        if not isinstance(expected,list) or len(actual)!=len(expected):raise ValueError('List shape changed')
        for a,e in zip(actual,expected):compare(a,e)
    elif isinstance(actual,float):
        if not isinstance(expected,(int,float)) or not np.isfinite(actual) or not np.isfinite(expected) or not np.isclose(actual,expected,rtol=1e-5,atol=1e-7):raise ValueError(f'Numerical result differs: {actual} vs {expected}')
    elif actual!=expected or type(actual)!=type(expected):raise ValueError('Exact metadata/status changed')


def main():
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');p.add_argument('--validate',action='store_true');p.add_argument('--workers',type=int,default=4);args=p.parse_args()
    if args.validate:validate(json.loads(gzip.decompress(OUT.read_bytes())));print('Predictive artifact identities, support and summaries verified (no refitting).');return
    if not 1<=args.workers<=8:raise ValueError('Workers outside 1–8')
    source=identities();toolchain={'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__,'node':subprocess.check_output(['node','--version'],text=True).strip()};key=digest({'source':source,'toolchain':toolchain});cache=ROOT/'.cache/predictive-depth'/key;cache.mkdir(parents=True,exist_ok=True)
    specs=specifications();cells={};pending=[];start=time.monotonic()
    for i,spec in enumerate(specs):
        path=cache/f'{i:03}.json'
        if path.exists() and not args.verify:
            record=json.loads(path.read_text())
            if record.get('key')==key and record.get('spec')==list(spec) and record.get('sha256')==digest(record['cell']):cells[i]=record['cell'];continue
        pending.append((i,spec))
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        tasks={pool.submit(run_cell,spec):(i,spec) for i,spec in pending}
        for future in as_completed(tasks):
            i,spec=tasks[future];cell=future.result();cells[i]=cell;path=cache/f'{i:03}.json';temp=path.with_suffix('.tmp');temp.write_text(json.dumps({'key':key,'spec':spec,'cell':cell,'sha256':digest(cell)},allow_nan=False));temp.replace(path)
            print(json.dumps({'completed':len(cells),'total':len(specs),'spec':spec,'seconds':round(time.monotonic()-start,1),'fits':{m:f['status'] for m,f in cell['fits'].items()},'bootstrap':None if not cell['bootstrap'] else cell['bootstrap']['failedRefits']}),flush=True)
    ordered=[cells[i] for i in range(len(specs))]
    report={'id':'predictive-depth-study-v1','sourceHashes':source,'generatingToolchain':toolchain,'historicalFits':0,'productionActivated':False,'worldCount':len(specs),'independentFreshSeeds':len(SEEDS),'bootstrapRefits':B,'draws':DRAWS,'cells':ordered,'summary':summary(ordered),'limitations':['Synthetic cash-only laboratory; not historical calibration or a production deposit recommendation.','Only 24 independent main worlds and 16 bootstrap refits; wide coverage uncertainty and unstable tails.','Unavailable fits/mixtures are retained, never imputed; available-world scores can be selected and cannot imply unconditional coverage.','Stress truth-parameter Gaussian control is not an oracle for misspecified distributions.','Overlapping waits, school counts and outcomes reuse worlds; only within-cell outer worlds are independent.','A stricter verified optimizer may mark finite boundary optima unavailable; no tolerance is relaxed here.']}
    validate(report)
    if args.verify:
        expected=validate(json.loads(gzip.decompress(OUT.read_bytes())));actual=dict(report);wanted=dict(expected)
        actual.pop('generatingToolchain');wanted.pop('generatingToolchain');compare(actual,wanted);print('Full predictive numerical reproduction passed.')
    else:OUT.write_bytes(gzip.compress((json.dumps(report,separators=(',',':'),allow_nan=False)+'\n').encode(),mtime=0));print('Wrote '+str(OUT.relative_to(ROOT)))

if __name__=='__main__':main()
