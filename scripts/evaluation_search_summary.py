"""Descriptive search/projection accounting; does not alter fit qualification."""
import argparse,collections,gzip,hashlib,json
from pathlib import Path
import numpy as np
from scipy.stats import qmc
from evaluation_optimizer import project,to_y,to_z
from covariance_coordinate_audit import violation
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data/calibration-diagnostics/evaluation-search-summary.json.gz'
PATHS=['scripts/evaluation_search_summary.py','scripts/evaluation_optimizer.py','scripts/covariance_coordinate_audit.py','data/calibration-diagnostics/complete-cost-evaluation.json.gz','data/calibration-diagnostics/evaluation-retained-avx2.json.gz','data/calibration-diagnostics/evaluation-retained-default.json.gz']
def fits(r):
    if 'cells' in r:
        for c in r['cells']:
            identity={k:c[k] for k in ['seed','transitions','schools','scenario']}
            yield identity|{'role':'outer'},c['fits']['candidate']
            for f in c['bootstrap'].get('candidate',{}).get('refits',[]):
                if f['status']!='outer-unavailable':yield identity|{'role':'bootstrap','index':f['index']},f
    else:
        for c in r['cases']:yield {k:c[k] for k in ['outerSeed','transitions','schools','index','kind']},c['fit']
def generate():
    records=[]
    directions=[*np.eye(12),*(-np.eye(12))]
    for d in qmc.Sobol(12,scramble=True,seed=1730).random_base2(4)*2-1:directions.append(d/np.linalg.norm(d))
    for source in PATHS[3:]:
        r=json.loads(gzip.decompress((ROOT/source).read_bytes()))
        for identity,f in fits(r):
            starts=[{'start':s['start'],'rawFeasibilityViolation':violation(np.array(s['rawCoordinates'])),'projectedFeasibilityViolation':violation(np.array(s['coordinates'])) if s.get('coordinates') is not None else None,'projectionStepInfinity':float(np.max(np.abs(np.array(s['rawCoordinates'])-np.array(s['coordinates'])))) if s.get('coordinates') is not None else None} for s in f['starts']]
            steps=[]
            if f.get('probes'):
                y=to_y(f['coordinates'])
                for radius in [1e-4,1e-3]:
                    for i,d in enumerate(directions):
                        z,_=project(y+radius*d);steps.append({'radius':radius,'directionIndex':i,'projectedStepInfinity':float(np.max(np.abs(z-y)))})
                if len(steps)!=len(f['probes']['changes']):raise ValueError('Missing probe outcomes')
            records.append({'source':source,'case':identity,'status':f['status'],'starts':starts,'probeSteps':steps})
    return {'id':'evaluation-search-accounting-v1','sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in PATHS},'fits':records,'count':len(records),'qualificationChanged':False,'historicalFits':0,'productionActivated':False}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args();r=generate()
    if args.verify:
        expected=json.loads(gzip.decompress(OUT.read_bytes()))
        if r!=expected:raise ValueError('Search accounting differs')
    else:
        if OUT.exists():raise ValueError('Preserve search accounting')
        OUT.write_bytes(gzip.compress(json.dumps(r,separators=(',',':'),allow_nan=False).encode(),mtime=0))
    print(f"Search/projection/probe accounting verified for {r['count']} fits.")
