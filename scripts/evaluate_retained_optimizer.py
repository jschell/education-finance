"""New optimizer on all retained cases, using identical frozen graphs on two backends."""
import argparse,gzip,hashlib,json,os,platform,io,contextlib
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor,as_completed
import numpy as np
import scipy
from evaluation_optimizer import fit
from audit_covariance_refits import cases
from revision_cost_predictive import generated
from verify_predictive_runtime import contract
ROOT=Path(__file__).resolve().parents[1];AVX=ROOT/'data/calibration-diagnostics/evaluation-retained-avx2.json.gz';DEFAULT=ROOT/'data/calibration-diagnostics/evaluation-retained-default.json.gz';COMPARISON=ROOT/'data/calibration-diagnostics/evaluation-portability.json'
SOURCES=['docs/complete-cost-evaluation-protocol.md','scripts/evaluate_retained_optimizer.py','scripts/evaluation_optimizer.py','scripts/covariance_coordinate_audit.py','scripts/audit_covariance_refits.py','scripts/revision_cost_predictive.py','scripts/revision_cost_estimator.py','scripts/revision_cost_reml.py','data/calibration-diagnostics/predictive-depth-avx2.json.gz','data/calibration-diagnostics/covariance-refit-audit.json.gz','tests/evaluation_optimizer_test.py']
def identities():return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in SOURCES}
def graph_hash(g):return hashlib.sha256(json.dumps(g,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def run(item):return {**item,'fit':fit(item['graph'],warm=item['outerParameters'])}
def items():
    result=[]
    for c in cases():
        g,_,_=generated(c['refitSeed'],c['transitions'],c['schools'],parameters=c['outerParameters'],drift=np.array(c['outerDrift']),future=0)
        result.append({**{k:c[k] for k in ['outerSeed','transitions','schools','index','refitSeed','kind','outerParameters']},'graph':g,'graphSha256':graph_hash(g)})
    return result

def compare_backends(a,b):
    differences=[];missing=[]
    if len(a['cases'])!=185 or len(b['cases'])!=185:raise ValueError('Retained denominator differs')
    for x,y in zip(a['cases'],b['cases']):
        if x['graphSha256']!=y['graphSha256'] or any(x[k]!=y[k] for k in ['outerSeed','transitions','index','refitSeed']):raise ValueError('Graphs/cases changed across backends')
        af=x['fit'];bf=y['fit'];reasons=[]
        if af['status']!=bf['status']:reasons.append('status')
        if af.get('parameters') is None or bf.get('parameters') is None:
            missing.append({k:x[k] for k in ['outerSeed','transitions','index']})
        else:
            if not np.allclose(af['parameters'],bf['parameters'],rtol=1e-5,atol=1e-7):reasons.append('parameters')
            if not np.isclose(af['objective'],bf['objective'],rtol=1e-8,atol=1e-6):reasons.append('objective')
        if reasons:differences.append({**{k:x[k] for k in ['outerSeed','transitions','index']},'reasons':reasons,'avxStatus':af['status'],'defaultStatus':bf['status'],'avxObjective':af.get('objective'),'defaultObjective':bf.get('objective')})
    return {'id':'complete-evaluation-portability-v1','sourceHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [AVX,DEFAULT]},'passed':not differences and not missing,'state':'fail' if differences else 'unsupported' if missing else 'pass','cases':185,'differences':differences,'uncomparable':missing,'scope':'Two local numerical backends on identical graphs; finite search adequacy is not proof of a global optimum.','historicalFits':0,'productionActivated':False}

def compare_fit(a,b):
    if a['status']!=b['status'] or a['reasons']!=b['reasons']:raise ValueError('New fit qualification changed')
    for k in ['parameters','drift','coordinates']:
        if a.get(k) is None and b.get(k) is None:continue
        np.testing.assert_allclose(a[k],b[k],rtol=1e-5,atol=1e-7)
    if a.get('objective') is not None:np.testing.assert_allclose(a['objective'],b['objective'],rtol=1e-8,atol=1e-6)

def main():
    p=argparse.ArgumentParser();p.add_argument('--record-avx',action='store_true');p.add_argument('--record-default',action='store_true');p.add_argument('--verify',action='store_true');p.add_argument('--workers',type=int,default=2);args=p.parse_args()
    if not 1<=args.workers<=8:raise ValueError('Worker limit')
    if args.record_default:
        if os.environ.get('OPENBLAS_CORETYPE') or os.environ.get('NPY_DISABLE_CPU_FEATURES'):raise ValueError('Default backend must not force AVX2 settings')
        template=json.loads(gzip.decompress(AVX.read_bytes()));target=DEFAULT;inputs=[{k:v for k,v in c.items() if k!='fit'} for c in template['cases']]
    else:contract();target=AVX;inputs=items()
    out={}
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        jobs={pool.submit(run,x):i for i,x in enumerate(inputs)}
        for future in as_completed(jobs):out[jobs[future]]=future.result()
    runtime=io.StringIO()
    with contextlib.redirect_stdout(runtime):np.show_runtime()
    report={'id':'complete-evaluation-retained-v1','sourceHashes':identities(),'backend':'default' if args.record_default else 'avx2','runtimeDisplay':runtime.getvalue(),'versions':{'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__},'cases':[out[i] for i in range(len(inputs))],'historicalFits':0,'productionActivated':False}
    if args.verify:
        expected=json.loads(gzip.decompress(AVX.read_bytes()))
        if report['sourceHashes']!=expected['sourceHashes']:raise ValueError('Retained source changed')
        for a,b in zip(report['cases'],expected['cases']):
            if a['graphSha256']!=b['graphSha256']:raise ValueError('Input graph changed')
            compare_fit(a['fit'],b['fit'])
        print('All 185 new-optimizer retained cases reproduced.');return
    if not(args.record_avx or args.record_default):raise ValueError('Select record or verify')
    if target.exists():raise ValueError('Preserve existing retained result')
    target.write_bytes(gzip.compress(json.dumps(report,separators=(',',':'),allow_nan=False).encode(),mtime=0));print('Recorded '+str(target.relative_to(ROOT)))
    if args.record_default:
        comparison=compare_backends(json.loads(gzip.decompress(AVX.read_bytes())),report);COMPARISON.write_text(json.dumps(comparison,indent=2,allow_nan=False)+'\n');print(json.dumps({k:comparison[k] for k in ['passed','state','cases']}))
if __name__=='__main__':main()
