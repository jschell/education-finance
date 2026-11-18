# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy==2.3.5", "scipy==1.17.0"]
# ///
"""Registered synthetic recovery suite. Never fits real school observations."""
from pathlib import Path
import argparse,hashlib,json,math,sys
import numpy as np
import scipy
from revision_cost_estimator import fit_synthetic,covariance,FAMILIES
from revision_cost_synthetic import synthetic_graph,PARAMETERS
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/calibration-diagnostics/revision-estimator-recovery.json'
SEEDS=list(range(2026111801,2026111807))

def generate():
    worlds=[]
    for bias in [False,True]:
        for seed in SEEDS:
            result=fit_synthetic(synthetic_graph(seed,bias=bias))
            worlds.append({'scenario':'shared-reporting-bias' if bias else 'ideal','seed':seed,'result':result})
            print(json.dumps({'scenario':worlds[-1]['scenario'],'seed':seed,'status':result['status']}),flush=True)
    ideal=[w['result'] for w in worlds if w['scenario']=='ideal'];estimated=[r for r in ideal if r.get('parameters')]
    ratios={family:[] for family in FAMILIES};drifts=[]
    if estimated:
        drifts=np.median([np.abs(np.array(r['drift'])-[.02,.01]) for r in estimated],axis=0).tolist()
        for k,name in enumerate(FAMILIES):
            truth=np.diag(covariance(PARAMETERS[3*k:3*k+3]))
            ratios[name]=np.median([np.diag(r['covariances'][name])/truth for r in estimated],axis=0).tolist()
    checks={'allSixNumericallyConverged':len(estimated)==6,'allSixIdentificationSupported':all(r['status']=='supported-synthetic-fit' for r in ideal),
        'medianDriftWithin003':len(drifts)==2 and max(drifts)<=.03,
        'medianVarianceRatiosWithinHalfToTwo':all(len(r)==2 and all(.5<=x<=2 for x in r) for r in ratios.values())}
    paths=['docs/revision-aware-cost-candidate-protocol.md','docs/revision-cost-estimator-execution.md','docs/revision-estimator-numerical-amendment.md',
        'scripts/revision_cost_estimator.py','scripts/revision_cost_synthetic.py','scripts/validate_revision_estimator.py','scripts/price-panel/observation-graph.mjs',
        'tests/revision_estimator_test.py','tests/observation-graph.test.js']
    return {'id':'revision-estimator-recovery-v1','method':'revision-cost-estimator-1.0.0','kind':'synthetic finite-sample recovery and misspecification; zero historical fits',
        'runtime':{'numpy':np.__version__,'scipy':scipy.__version__},'sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths},
        'truth':{'drift':[.02,.01],'parameters':PARAMETERS.tolist(),'schools':8,'academicYears':24,'representationsPerYear':2},
        'worlds':worlds,'gate':{'checks':checks,'passed':all(checks.values()),'medianAbsoluteDriftError':drifts,'medianVarianceRatios':ratios,
            'estimatedIdealReplicates':len(estimated),'denominatorWarning':'Missing fits are retained; conditional medians cannot pass the all-six gate.'},
        'historicalFittingAuthorized':False,'limitations':['Six shared synthetic time histories are not economic calibration or independent real histories.',
            'Directional profiles are not nuisance-reoptimized confidence intervals; parameter-boundary and weak-curvature results remain visible.',
            'The added common reporting bias is observationally confounded with genuine changes; this sensitivity does not identify economic truth.',
            'Passing numerical recovery would still require a separate review before historical fitting; a failed gate blocks it.',
            'No original price, active forecast, financial default, production probability or existing report is changed.']}

def verify(actual,expected):
    if actual['sourceHashes']!=expected['sourceHashes']:raise ValueError('Recovery source identities changed')
    if actual['gate']['checks']!=expected['gate']['checks']:raise ValueError('Recovery gate changed')
    for a,e in zip(actual['worlds'],expected['worlds']):
        if (a['scenario'],a['seed'],a['result']['status'])!=(e['scenario'],e['seed'],e['result']['status']):raise ValueError('Recovery status changed')
        for field in ['parameters','drift']:
            if a['result'].get(field) is None and e['result'].get(field) is None:continue
            np.testing.assert_allclose(a['result'][field],e['result'][field],rtol=1e-5,atol=1e-7)
        if 'objective'in a['result']:np.testing.assert_allclose(a['result']['objective'],e['result']['objective'],rtol=1e-8,atol=1e-6)
    # Optimizer iteration counts, messages and roundoff-level profile curvature
    # are retained as execution evidence, not required bitwise across BLAS builds.

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');args=parser.parse_args();body=generate()
    if args.verify:verify(body,json.loads(OUT.read_text()))
    else:OUT.write_text(json.dumps(body,sort_keys=True,indent=2,allow_nan=False)+'\n')
    print(json.dumps({'gate':body['gate'],'historicalFits':0}))
