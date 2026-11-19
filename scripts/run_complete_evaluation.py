"""Full fixed-grid optimizer/bootstrap/cash evaluation, including failed cases."""
import argparse,gzip,hashlib,json,platform,subprocess,time
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor,as_completed
import numpy as np
from evaluation_optimizer import fit
from revision_cost_predictive import generated,BalancedLikelihood,fit_balanced,forecast_draws,PARAMETERS,DRIFT
from validate_predictive_depth import Ledger,score,PATHS as OLD_PATHS
from verify_predictive_runtime import contract
from evaluation_decision import summarize,gates
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data/calibration-diagnostics/complete-cost-evaluation.json.gz'
SEEDS=list(range(2026112101,2026112165));B=16
SOURCES=sorted(set(OLD_PATHS+['docs/complete-cost-evaluation-protocol.md','scripts/evaluation_optimizer.py','scripts/run_complete_evaluation.py','scripts/evaluation_decision.py','scripts/covariance_coordinate_audit.py','scripts/verify_predictive_runtime.py','scripts/predictive-ledger.mjs']))

def identities():return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in SOURCES}
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
def specs():return [(s,t,8,'ideal') for s in SEEDS for t in [3,7,12]]+[(s,t,32,'ideal') for s in SEEDS[:24] for t in [3,7,12]]+[(s,t,8,'ideal') for s in SEEDS[:8] for t in [24,48]]+[(s,12,8,c) for s in SEEDS[:8] for c in ['correlated-reporting','reporting-shift','heavy-tails','permanent-jump','persistence']]

def run_cell(spec):
    seed,t,n,scenario=spec;graph,latent,shocks=generated(seed,t,n,scenario=scenario);l=BalancedLikelihood(graph);ledger=Ledger();role=lambda x:int(np.random.SeedSequence([seed,t,n,x]).generate_state(1)[0])
    try:
        truth=ledger.evaluate((latent[:2,t:t+14]-latent[:2,t,None,:])[None,:,:,:])[0]
        fits={'old':fit_balanced(graph,'reml'),'candidate':fit(graph)};pred={};boots={}
        for method in ['old','candidate']:
            f=fits[method];ok=f['status']==('converged' if method=='old' else 'qualified')
            if ok:pred[method+'-plugin']={'status':'available','scores':score(ledger.evaluate(forecast_draws(l,f['parameters'],f['drift'],role(10))),truth)}
            else:pred[method+'-plugin']={'status':'unavailable','reason':f['status']}
            if (scenario,n,t) not in [('ideal',8,k) for k in [3,7,12]]:continue
            refits=[];draws=[]
            for i in range(B):
                if not ok:refits.append({'index':i,'status':'outer-unavailable'});continue
                bg,_,_=generated(role(100+i),t,n,parameters=f['parameters'],drift=np.asarray(f['drift']),future=0)
                inner=fit_balanced(bg,'reml',warm=f['parameters']) if method=='old' else fit(bg,warm=f['parameters']);inner['index']=i;refits.append(inner)
                if inner['status']==('converged' if method=='old' else 'qualified'):draws.append(forecast_draws(l,inner['parameters'],inner['drift'],role(200+i),16))
            complete=len(draws)==B;boots[method]={'refits':refits,'complete':complete,'attempted':sum(f['status']!='outer-unavailable' for f in refits),'unavailable':B-len(draws)}
            pred[method+'-bootstrap']={'status':'available','scores':score(ledger.evaluate(np.concatenate(draws)),truth)} if complete else {'status':'unavailable','reason':'incomplete-bootstrap'}
        name='oracle' if scenario=='ideal' else 'truth-parameter-Gaussian';pred[name]={'status':'available','scores':score(ledger.evaluate(forecast_draws(l,PARAMETERS,DRIFT,role(11))),truth)}
        for name,rates in [('no-growth',[0.,0.]),('fixed-4-3',np.log([1.04,1.03]))]:pred[name]={'status':'available','scores':score(ledger.evaluate(np.tile(np.arange(14)[:,None]*rates,(1,2,1,1))),truth)}
        return {'seed':seed,'transitions':t,'schools':n,'scenario':scenario,'fits':fits,'bootstrap':boots,'predictions':pred,'truth':truth,'historicalFittingBlocked':True}
    finally:ledger.close()

def validate(r):
    if r['sourceHashes']!=identities() or r['runtime']!=contract():raise ValueError('Evaluation source/runtime changed')
    if [(c['seed'],c['transitions'],c['schools'],c['scenario']) for c in r['cells']]!=specs():raise ValueError('Missing/reordered/duplicate cases')
    for c in r['cells']:
        for method,b in c['bootstrap'].items():
            if len(b['refits'])!=B or [f['index'] for f in b['refits']]!=list(range(B)):raise ValueError('Incomplete slot accounting')
            complete=all(f['status']==('converged' if method=='old' else 'qualified') for f in b['refits'])
            if b['complete']!=complete or (c['predictions'][method+'-bootstrap']['status']=='available')!=complete:raise ValueError('Partial bootstrap used')
    if r['summary']!=summarize(r['cells']):raise ValueError('Summary differs')
    if r['historicalFits']!=0 or r['productionActivated'] is not False:raise ValueError('Unexpected historical fit/activation')
    return r

def compare(a,b,path='root'):
    if isinstance(a,dict):
        if not isinstance(b,dict) or a.keys()!=b.keys():raise ValueError(path+' fields differ')
        for k in a:
            if k in ['iterations','evaluations','exit','optimizerExit','optimizerMessage','verificationFailure','projectionCycles','changes','y','rawScore','criticalScaledEigenvalues','legacyFullScaledEigenvalues','projectedScoreStep','step','relativeObjective']:continue
            compare(a[k],b[k],path+'.'+k)
    elif isinstance(a,list):
        if not isinstance(b,list) or len(a)!=len(b):raise ValueError(path+' shape differs')
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+f'[{i}]')
    elif isinstance(a,float):
        if not isinstance(b,(float,int)) or not np.isfinite(a) or not np.isclose(a,b,rtol=1e-5,atol=1e-7):raise ValueError(path+f' numeric differs {a} vs {b}')
    elif a!=b or type(a)!=type(b):raise ValueError(path+' exact metadata/status differs')

def main():
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');p.add_argument('--validate',action='store_true');p.add_argument('--workers',type=int,default=6);args=p.parse_args();runtime=contract()
    if args.validate:validate(json.loads(gzip.decompress(OUT.read_bytes())));print('Complete evaluation source/support/summary verified.');return
    if not 1<=args.workers<=8:raise ValueError('Workers outside 1–8')
    source=identities();toolchain={'runtime':runtime,'node':subprocess.check_output(['node','--version'],text=True).strip(),'platform':platform.platform()};key=digest({'sources':source,'toolchain':toolchain});cache=ROOT/'.cache/complete-cost-evaluation'/key;cache.mkdir(parents=True,exist_ok=True)
    ss=specs();cells={};pending=[];start=time.monotonic()
    for i,s in enumerate(ss):
        path=cache/f'{i:03}.json.gz'
        if path.exists() and not args.verify:
            record=json.loads(gzip.decompress(path.read_bytes()))
            if record.get('key')==key and record.get('spec')==list(s) and record.get('digest')==digest(record['cell']):cells[i]=record['cell'];continue
        pending.append((i,s))
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        jobs={pool.submit(run_cell,s):(i,s) for i,s in pending}
        for task in as_completed(jobs):
            i,s=jobs[task];c=task.result();cells[i]=c;path=cache/f'{i:03}.json.gz';tmp=path.with_suffix('.tmp');tmp.write_bytes(gzip.compress(json.dumps({'key':key,'spec':s,'cell':c,'digest':digest(c)},allow_nan=False).encode(),mtime=0));tmp.replace(path)
            print(json.dumps({'completed':len(cells),'total':len(ss),'case':s,'seconds':round(time.monotonic()-start,1),'newOuter':c['fits']['candidate']['status'],'newBootstrap':c['bootstrap'].get('candidate',{}).get('complete')}),flush=True)
    ordered=[cells[i] for i in range(len(ss))];report={'id':'complete-cost-evaluation-v1','sourceHashes':source,'runtime':runtime,'toolchain':toolchain,'historicalFits':0,'productionActivated':False,'cells':ordered,'summary':summarize(ordered),'decision':gates(ordered,summarize(ordered))}
    validate(report)
    if args.verify:
        expected=validate(json.loads(gzip.decompress(OUT.read_bytes())));actual=json.loads(json.dumps(report));actual.pop('toolchain');expected.pop('toolchain');compare(actual,expected);print('Full 320-cell evaluation reproduced.');return
    if OUT.exists():raise ValueError('Do not overwrite the frozen evaluation')
    OUT.write_bytes(gzip.compress(json.dumps(report,separators=(',',':'),allow_nan=False).encode(),mtime=0));print('Recorded complete evaluation: '+report['decision']['syntheticDecision'])
if __name__=='__main__':main()
