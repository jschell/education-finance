# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy==2.3.5", "scipy==1.17.0"]
# ///
"""Frozen synthetic attribution/ML/oracle/REML comparison. No historical fit."""
from pathlib import Path
import argparse,hashlib,json
import numpy as np
import scipy
from revision_cost_estimator import curvature,covariance,FAMILIES
from revision_cost_reml import StudyLikelihood,fit_study,diagnose_geometry,nuisance_profile
from revision_cost_trace import traced_synthetic_graph,PARAMETERS
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data/calibration-diagnostics/reml-boundary-study.json'
OLD=ROOT/'data/calibration-diagnostics/revision-estimator-recovery.json'
ORIGINAL=list(range(2026111801,2026111807));FRESH=list(range(2026111901,2026111904))

def summarize(worlds,group,method):
    all_rows=[w for w in worlds if w['group']==group];rows=[w for w in all_rows if w['methods'][method].get('parameters')]
    fits=[w['methods'][method] for w in rows];ratios={};drift=[];geometry={}
    for fit in [w['methods'][method] for w in all_rows]:
        status=fit.get('boundaryDiagnostics',{}).get('classification',fit['status']);geometry[status]=geometry.get(status,0)+1
    if fits:
        drift=np.median([np.abs(np.array(f['drift'])-[.02,.01]) for f in fits],axis=0).tolist()
        for i,name in enumerate(FAMILIES):ratios[name]=np.median([np.diag(f['covariances'][name])/np.diag(covariance(PARAMETERS[3*i:3*i+3])) for f in fits],axis=0).tolist()
    return {'group':group,'method':method,'registered':len(all_rows),'estimated':len(fits),'geometryCounts':geometry,'medianAbsoluteDriftError':drift,'medianVarianceRatios':ratios,
        'comparativeThresholdChecks':{'allNumericallyConverged':len(fits)==len(all_rows) and all(f['status']=='converged' for f in fits),
            'medianDriftWithin003':len(drift)==2 and max(drift)<=.03,
            'medianVarianceRatiosWithinHalfToTwo':len(ratios)==4 and all(.5<=v<=2 for p in ratios.values() for v in p)},
        'historicalFittingAuthorized':False,'warning':'Conditional medians do not erase failed fits; comparative checks do not supersede the original failed gate.'}

def generate():
    old=json.loads(OLD.read_text());worlds=[]
    for seed in ORIGINAL+FRESH:
        graph,trace=traced_synthetic_graph(seed);methods={}
        if seed in ORIGINAL:
            source=next(w['result'] for w in old['worlds'] if w['scenario']=='ideal' and w['seed']==seed);ml={**source,'method':'ml','sourceStatus':source['status'],'status':'converged','parameterSource':'immutable v1 ideal fit'}
            likelihood=StudyLikelihood(graph,'ml');objective,gradient,beta=likelihood.evaluate(np.array(ml['parameters']),True);h,_=curvature(likelihood,np.array(ml['parameters']))
            np.testing.assert_allclose(objective,source['objective'],rtol=1e-8,atol=1e-6)
            ml['boundaryDiagnostics']=diagnose_geometry(np.array(ml['parameters']),gradient,h);methods['ml']=ml
        else:methods['ml']=fit_study(graph,'ml')
        for method in ['known-drift','reml']:
            methods[method]=fit_study(graph,method)
            print(json.dumps({'seed':seed,'method':method,'status':methods[method]['status']}),flush=True)
        truth=np.diag(covariance(PARAMETERS[:3]));realized=np.diag(trace['sampleCovarianceNMinus1'])
        attribution={'realizedSampleVarianceOverGenerating':(realized/truth).tolist(),'knownZeroSecondMomentOverGenerating':(np.diag(trace['knownZeroSecondMoment'])/truth).tolist(),
            'fittedSharedVarianceOverRealizedSample':{m:(np.diag(f['covariances']['shared'])/realized).tolist() if f.get('parameters') else None for m,f in methods.items()}}
        worlds.append({'seed':seed,'group':'original' if seed in ORIGINAL else 'fresh','trace':trace,'attribution':attribution,'methods':methods})
    profiles=[]
    for seed in [2026111804,2026111806]:
        graph,_=traced_synthetic_graph(seed);world=next(w for w in worlds if w['seed']==seed)
        for mode in ['ml','reml']:
            profile=nuisance_profile(graph,mode,world['methods'][mode]);profiles.append({'seed':seed,'method':mode,'profile':profile})
            print(json.dumps({'profileSeed':seed,'method':mode,'status':profile['status']}),flush=True)
    paths=['docs/reml-boundary-study-protocol.md','scripts/revision_cost_reml.py','scripts/revision_cost_trace.py','scripts/validate_reml_study.py','tests/reml_study_test.py',
        'scripts/revision_cost_estimator.py','scripts/revision_cost_synthetic.py','data/calibration-diagnostics/revision-estimator-recovery.json']
    return {'id':'reml-boundary-study-v1','method':'revision-cost-reml-study-1.0.0','kind':'synthetic attribution and estimator diagnostics; zero historical fits',
        'runtime':{'numpy':np.__version__,'scipy':scipy.__version__},'sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths},
        'originalGate':old['gate'],'originalGateUnchanged':True,'historicalFittingAuthorized':False,
        'worlds':worlds,'summaries':[summarize(worlds,g,m) for g in ['original','fresh'] for m in ['ml','known-drift','reml']], 'nuisanceProfiles':profiles,
        'limitations':['Nine synthetic time histories, including six previously inspected worlds, are not economic calibration.',
            'Oracle known drift is an explanatory control, unavailable for historical fitting.',
            'Ordinary REML uses unbounded drift integration; a resulting drift on/outside the drift box is explicitly unsupported.',
            'Constraint-limited geometry is not a declaration of economic identification, and does not change the v1 failed gate.',
            'Coarse nuisance profiles are not confidence intervals; failures and potentially better profile optima remain visible.',
            'Actual temporal-depth studies, larger fresh batches, reporting-bias sensitivity, forecast-functional uncertainty and complete funding evidence remain unfinished.']}

def verify(actual,expected):
    if actual['sourceHashes']!=expected['sourceHashes'] or actual['originalGate']!=expected['originalGate']:raise ValueError('Source/gate identities changed')
    if len(actual['worlds'])!=len(expected['worlds']):raise ValueError('World count changed')
    for a,e in zip(actual['worlds'],expected['worlds']):
        if (a['seed'],a['group'],a['trace'])!=(e['seed'],e['group'],e['trace']):raise ValueError('Synthetic trace changed')
        for name in ['ml','known-drift','reml']:check_fit(a['methods'][name],e['methods'][name])
    for a,e in zip(actual['nuisanceProfiles'],expected['nuisanceProfiles']):
        if (a['seed'],a['method'],a['profile']['status'])!=(e['seed'],e['method'],e['profile']['status']):raise ValueError('Profile identity changed')
        if len(a['profile']['points'])!=len(e['profile']['points']):raise ValueError('Profile points changed')
        for ap,ep in zip(a['profile']['points'],e['profile']['points']):
            np.testing.assert_allclose(ap['fixedValue'],ep['fixedValue'],rtol=1e-5,atol=1e-7);check_fit(ap['fit'],ep['fit'])

def check_fit(a,e):
    if a['status']!=e['status']:raise ValueError('Fit status changed')
    for field in ['parameters','drift']:
        if a.get(field)is None and e.get(field)is None:continue
        np.testing.assert_allclose(a[field],e[field],rtol=1e-5,atol=1e-7)
    if 'objective'in a:np.testing.assert_allclose(a['objective'],e['objective'],rtol=1e-8,atol=1e-6)
    if a.get('boundaryDiagnostics',{}).get('classification')!=e.get('boundaryDiagnostics',{}).get('classification'):raise ValueError('Boundary diagnosis changed')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');args=parser.parse_args();report=generate()
    if args.verify:verify(report,json.loads(OUT.read_text()))
    else:OUT.write_text(json.dumps(report,sort_keys=True,indent=2,allow_nan=False)+'\n')
    print(json.dumps({'summaries':report['summaries'],'historicalFits':0}))
