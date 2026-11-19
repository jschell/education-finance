"""Separate common-AVX2 runtime arm. Never replaces the primary failed gate."""
import argparse,gzip,hashlib,json,os,platform,subprocess
from pathlib import Path
import numpy as np
import scipy
from validate_predictive_depth import OUT as PRIMARY,validate,summary
from verify_predictive_reproduction import generate,portable_verify
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data/calibration-diagnostics/predictive-depth-avx2.json.gz';DIFF=ROOT/'data/calibration-diagnostics/predictive-runtime-comparison.json'
DISABLE='AVX512F,AVX512CD,AVX512_KNL,AVX512_KNM,AVX512_SKX,AVX512_CLX,AVX512_CNL,AVX512_ICL,AVX512_SPR'
ENV={'OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1','OPENBLAS_CORETYPE':'Haswell','NPY_DISABLE_CPU_FEATURES':DISABLE}

def contract():
    if any(os.environ.get(k)!=v for k,v in ENV.items()):raise ValueError('AVX2 runtime contract mismatch')
    if(platform.python_version(),np.__version__,scipy.__version__)!=('3.12.14','2.3.5','1.17.0'):raise ValueError('Pinned numerical versions differ')
    return {'id':'avx2-haswell-v1','python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__,'environment':ENV}

def sources():
    paths=['scripts/verify_predictive_runtime.py','docs/predictive-runtime-contract.md']
    return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}

def build(template,workers):
    runtime=contract();actual=generate(template,workers)
    actual.update(runtimeArm='avx2-haswell-v1',runtimeContract=runtime,runtimeSourceHashes=sources(),primaryReferenceSha256=hashlib.sha256(PRIMARY.read_bytes()).hexdigest(),primaryCrossRuntimeGate='failed',productionActivated=False)
    actual['generatingToolchain']={'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__,'node':subprocess.check_output(['node','--version'],text=True).strip()}
    return actual

def changed_fit(a,b):
    changed=a['status']!=b['status'];p=None;delta=None
    if a.get('parameters') is not None and b.get('parameters') is not None:
        p=float(np.max(np.abs(np.array(a['parameters'])-b['parameters'])));delta=b['objective']-a['objective']
        changed|=not np.allclose(a['parameters'],b['parameters'],rtol=1e-5,atol=1e-7) or not np.isclose(a['objective'],b['objective'],rtol=1e-8,atol=1e-6)
    return {'primaryStatus':a['status'],'avx2Status':b['status'],'maximumParameterDifference':p,'objectiveDeltaAvx2MinusPrimary':delta} if changed else None

def comparison(primary,actual):
    differences=[];inner=[]
    for a,b in zip(primary['cells'],actual['cells']):
        key={k:a[k] for k in ['seed','transitions','schools','scenario']}
        for method in a['fits']:
            d=changed_fit(a['fits'][method],b['fits'][method])
            if d:differences.append({**key,'method':method,**d})
        ar=a['bootstrap']['refits'] if a['bootstrap'] else [];br=b['bootstrap']['refits'] if b['bootstrap'] else []
        if len(ar)!=len(br):inner.append({**key,'primaryAttempts':len(ar),'avx2Attempts':len(br)})
        else:
            for i,(af,bf) in enumerate(zip(ar,br)):
                d=changed_fit(af,bf)
                if d:inner.append({**key,'refit':i,**d})
    return {'id':'predictive-runtime-comparison-v1','sourceHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [PRIMARY,OUT]},'runtimeContract':actual['runtimeContract'],'primaryCrossRuntimeGate':'failed','primaryHistoricalFits':0,'avx2HistoricalFits':0,'productionActivated':False,'pointFitDifferences':differences,'bootstrapDifferences':inner,'primarySummary':primary['summary'],'avx2Summary':actual['summary'],'limitation':'Matching a fixed backend is an engineering reproducibility check; multiple minima and primary cross-runtime robustness failure remain unresolved.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--record',action='store_true');p.add_argument('--validate',action='store_true');p.add_argument('--workers',type=int,default=4);args=p.parse_args()
    if not 1<=args.workers<=8:raise ValueError('Workers outside 1–8')
    runtime=contract();primary=validate(json.loads(gzip.decompress(PRIMARY.read_bytes())))
    if args.record:
        if OUT.exists():raise ValueError('Runtime reference already exists; do not overwrite')
        actual=build(primary,args.workers);OUT.write_bytes(gzip.compress(json.dumps(actual,separators=(',',':'),allow_nan=False).encode(),mtime=0));DIFF.write_text(json.dumps(comparison(primary,actual),indent=2,allow_nan=False)+'\n');print('Recorded separate AVX2 arm; primary cross-runtime gate remains failed.');return
    expected=validate(json.loads(gzip.decompress(OUT.read_bytes())))
    if expected.get('runtimeContract')!=runtime or expected.get('runtimeSourceHashes')!=sources() or expected.get('primaryCrossRuntimeGate')!='failed' or expected.get('primaryReferenceSha256')!=hashlib.sha256(PRIMARY.read_bytes()).hexdigest():raise ValueError('Runtime evidence identity changed')
    if json.loads(DIFF.read_text())!=comparison(primary,expected):raise ValueError('Runtime comparison differs')
    if args.validate:print('Both runtime-arm identities and comparison verified; primary gate remains failed.');return
    actual=build(expected,args.workers);artifact=ROOT/'.cache/predictive-reproduction/actual-runtime.json.gz';artifact.parent.mkdir(parents=True,exist_ok=True);artifact.write_bytes(gzip.compress(json.dumps(actual,allow_nan=False).encode(),mtime=0))
    portable_verify(actual,expected);print('All 200 cells reproduced under the AVX2 contract; primary cross-runtime robustness gate remains failed.')

if __name__=='__main__':main()
