"""Reevaluate the two retained, fixed-correlation local solutions on one graph."""
import gzip,hashlib,json
from pathlib import Path
import numpy as np
from revision_cost_predictive import generated,BalancedLikelihood
from covariance_coordinate_audit import DirectLikelihood,to_coordinate
from verify_predictive_runtime import contract
ROOT=Path(__file__).resolve().parents[1]
PATHS=['scripts/audit-cross-runtime-minimum.py','scripts/covariance_coordinate_audit.py','scripts/revision_cost_predictive.py','data/calibration-diagnostics/predictive-depth-study.json.gz','data/calibration-diagnostics/predictive-depth-avx2.json.gz']
def main():
    runtime=contract();fits={}
    for label,path in [('primary',PATHS[-2]),('avx2',PATHS[-1])]:
        source=json.loads(gzip.decompress((ROOT/path).read_bytes()));c=next(x for x in source['cells'] if (x['seed'],x['transitions'],x['schools'],x['scenario'])==(2026112003,3,8,'ideal'));fits[label]=c['fits']['diagonal-shared-reml']
    graph,_,_=generated(2026112003,3,8);direct=DirectLikelihood(graph);old=BalancedLikelihood(graph,'reml');evaluated={}
    for label,fit in fits.items():
        p=np.array(fit['parameters']);f,b=old.evaluate(p);d,bb=direct.evaluate(to_coordinate(p));evaluated[label]={'recordedObjective':fit['objective'],'reevaluatedFrozenObjective':f,'reevaluatedDirectObjective':d,'objectiveDifference':d-f,'parameters':fit['parameters'],'drift':b.tolist()}
    result={'id':'cross-runtime-minimum-review-v1','sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in PATHS},'runtime':runtime,'case':{'seed':2026112003,'transitions':3,'schools':8,'method':'diagonal-shared-reml'},'solutions':evaluated,'higherMinusLower':evaluated['avx2']['reevaluatedDirectObjective']-evaluated['primary']['reevaluatedDirectObjective'],'historicalFits':0,'limitations':['Reevaluation does not establish global optimality, KKT qualification, or economic calibration.','The two original runs can differ at floating precision in synthetic input generation; both solutions are reevaluated on this identical common-runtime graph.']}
    path=ROOT/'data/calibration-diagnostics/cross-runtime-minimum.json';output=json.dumps(result,indent=2,allow_nan=False)+'\n'
    import sys
    if '--verify' in sys.argv:
        expected=json.loads(path.read_text())
        if expected['sourceHashes']!=result['sourceHashes'] or expected['runtime']!=result['runtime']:raise ValueError('Source mismatch')
        for key in ['primary','avx2']:
            for field in ['recordedObjective','reevaluatedFrozenObjective','reevaluatedDirectObjective','objectiveDifference']:
                np.testing.assert_allclose(expected['solutions'][key][field],result['solutions'][key][field],rtol=1e-8,atol=1e-6)
        np.testing.assert_allclose(expected['higherMinusLower'],result['higherMinusLower'],rtol=1e-8,atol=1e-6)
    elif path.exists():raise ValueError('Preserve previous diagnostic')
    else:path.write_text(output)
    print(json.dumps({'higherMinusLower':result['higherMinusLower'],'sourceAgreement':[v['objectiveDifference'] for v in evaluated.values()]}))
if __name__=='__main__':main()
