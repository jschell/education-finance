"""Validate a successful reproduction cache marker against exact inputs/toolchain.

A scientific failed gate can reproduce successfully; a crashed verifier cannot stamp.
The caller writes only after its commands succeed. No partial/prefix cache restore.
"""
import argparse,gzip,hashlib,json,os,platform,subprocess
from pathlib import Path
import numpy,scipy
ROOT=Path(__file__).resolve().parents[1]

def payload(study):
    if study not in ['estimator','reml','predictive']:raise ValueError('Unknown study')
    shared=['scripts/reproduction-stamp.py','tests/reproduction_stamp_test.py','scripts/revision_cost_estimator.py']
    if study=='estimator':paths=shared+['scripts/revision_cost_synthetic.py','scripts/validate_revision_estimator.py','tests/revision_estimator_test.py','data/calibration-diagnostics/revision-estimator-recovery.json','data/calibration-diagnostics/observation-graph-support.json','docs/revision-cost-estimator-execution.md']
    elif study=='reml':paths=shared+['scripts/revision_cost_synthetic.py','scripts/revision_cost_trace.py','scripts/revision_cost_reml.py','scripts/validate_reml_study.py','scripts/verify_reml_reproduction.py','tests/reml_study_test.py','tests/reml_profile_test.py','tests/reml_reproduction_test.py','data/calibration-diagnostics/reml-boundary-study.json','data/calibration-diagnostics/revision-estimator-recovery.json','docs/reml-boundary-study-protocol.md']
    else:
        from validate_predictive_depth import PATHS
        paths=shared+PATHS+['tests/predictive_study_test.py','tests/predictive_reproduction_test.py','tests/metadata-continuity.test.js','scripts/summarize_predictive_depth.py','data/calibration-diagnostics/predictive-depth-summary.json','tests/predictive-ledger.test.js','data/calibration-diagnostics/predictive-depth-study.json.gz','docs/predictive-depth-implementation-notes.md']
    # Include every recursively declared evidence dependency, not only runner files.
    pending=list(paths);seen=set(paths)
    while pending:
        name=pending.pop()
        if name.endswith(('.json','.json.gz')):
            record=json.loads(gzip.decompress((ROOT/name).read_bytes()) if name.endswith('.gz') else (ROOT/name).read_text())
            for dependency in record.get('sourceHashes',{}):
                if dependency not in seen:seen.add(dependency);pending.append(dependency)
    files={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sorted(seen)}
    return {'schema':1,'study':study,'sources':files,'toolchain':{'python':platform.python_version(),'numpy':numpy.__version__,'scipy':scipy.__version__,'node':subprocess.check_output(['node','--version'],text=True).strip(),'platform':platform.platform(),'threadEnvironment':{k:os.environ.get(k) for k in ['OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS']},'blas':str(numpy.__config__.CONFIG.get('Build Dependencies',{}))}}

def main():
    p=argparse.ArgumentParser();p.add_argument('study',choices=['estimator','reml','predictive']);p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args()
    body=payload(args.study);key=hashlib.sha256(json.dumps(body,sort_keys=True).encode()).hexdigest();path=ROOT/'.cache/reproductions'/args.study/'validated.json'
    if args.write:
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps({'key':key,'inputs':body},sort_keys=True)+'\n')
    elif args.check:
        if not path.exists() or json.loads(path.read_text())!={'key':key,'inputs':body}:raise ValueError('Validated reproduction marker mismatch')
    else:print(key)

if __name__=='__main__':main()
