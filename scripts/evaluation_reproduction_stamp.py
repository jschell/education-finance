"""Exact-input completion markers, one per independently reproduced partition."""
import argparse,gzip,hashlib,json,os,platform,subprocess
from pathlib import Path
import numpy,scipy
from verify_predictive_runtime import contract
ROOT=Path(__file__).resolve().parents[1]
def payload(study):
    if study not in ['retained',*[str(i) for i in range(8)]]:raise ValueError('Unknown partition')
    paths=['scripts/evaluation_reproduction_stamp.py','scripts/verify_evaluation_partition.py','.github/workflows/check.yml','scripts/finalize_cost_evaluation.py','scripts/summarize_complete_evaluation.py','data/calibration-diagnostics/complete-evaluation-decision.json','tests/evaluation_optimizer_test.py','tests/complete_evaluation_test.py','tests/evaluation_delivery_test.py']
    if study=='retained':paths+=['scripts/evaluate_retained_optimizer.py','data/calibration-diagnostics/evaluation-retained-avx2.json.gz','data/calibration-diagnostics/evaluation-retained-default.json.gz','data/calibration-diagnostics/evaluation-portability.json']
    else:paths+=['scripts/run_complete_evaluation.py','data/calibration-diagnostics/complete-cost-evaluation.json.gz']
    seen=set(paths);pending=list(seen)
    while pending:
        p=pending.pop()
        if p.endswith(('.json','.json.gz')):
            raw=(ROOT/p).read_bytes();r=json.loads(gzip.decompress(raw) if p.endswith('.gz') else raw)
            for name in r.get('sourceHashes',{}):
                if name not in seen:seen.add(name);pending.append(name)
    return {'schema':1,'partition':study,'sources':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sorted(seen)},'runtime':contract(),'toolchain':{'python':platform.python_version(),'numpy':numpy.__version__,'scipy':scipy.__version__,'node':subprocess.check_output(['node','--version'],text=True).strip(),'platform':platform.platform(),'blas':str(numpy.__config__.CONFIG.get('Build Dependencies',{}))}}
def marker(study):
    body=payload(study);key=hashlib.sha256(json.dumps(body,sort_keys=True).encode()).hexdigest();return {'key':key,'inputs':body}
def check_marker(expected,actual):
    if expected!=actual:raise ValueError('Complete-evaluation reproduction marker mismatch')
def main():
    p=argparse.ArgumentParser();p.add_argument('study');p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args();m=marker(args.study);path=ROOT/'.cache/reproductions/complete-evaluation'/args.study/'validated.json'
    if args.write:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(m,sort_keys=True)+'\n')
    elif args.check:check_marker(m,json.loads(path.read_text()))
    else:print(m['key'])
if __name__=='__main__':main()
