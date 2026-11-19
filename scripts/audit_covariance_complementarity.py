"""Additional KKT complementarity screen on already-recorded candidates only."""
import argparse,gzip,hashlib,json
from pathlib import Path
import numpy as np
from covariance_coordinate_audit import BOUNDS,cones,cone_jac
ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/'data/calibration-diagnostics/covariance-refit-audit.json.gz';OUT=ROOT/'data/calibration-diagnostics/covariance-complementarity.json'
SOURCES=['docs/covariance-complementarity-protocol.md','scripts/audit_covariance_complementarity.py','scripts/covariance_coordinate_audit.py','tests/covariance_complementarity_test.py','data/calibration-diagnostics/covariance-refit-audit.json.gz']

def complementarity(candidate):
    if not isinstance(candidate,dict):return {'status':'unresolved','reason':'missing-candidate'}
    z=candidate.get('coordinates');k=candidate.get('kkt')
    if not isinstance(z,list) or len(z)!=12 or not isinstance(k,dict):return {'status':'unresolved','reason':'missing-data'}
    z=np.asarray(z,dtype=float)
    if not np.isfinite(z).all() or k.get('zeroGradientCones'):return {'status':'unresolved','reason':'zero-gradient-or-invalid'}
    labels=k.get('active');multipliers=k.get('multipliers')
    if not isinstance(labels,list) or not isinstance(multipliers,list) or len(labels)!=len(multipliers):return {'status':'unresolved','reason':'missing-multipliers'}
    h=cones(z);j=cone_jac(z);items=[]
    for label,multiplier in zip(labels,multipliers):
        if not isinstance(label,str) or not np.isfinite(multiplier) or multiplier<0:return {'status':'unresolved','reason':'invalid-multiplier'}
        try:kind,index=label.split(':');i=int(index)
        except (ValueError,TypeError):return {'status':'unresolved','reason':'invalid-label'}
        if kind=='cone' and 0<=i<4:
            norm=float(np.linalg.norm(j[i]));
            if norm<=1e-10:return {'status':'unresolved','reason':'zero-gradient-cone'}
            slack=float(h[i]/norm)
        elif kind=='lower' and 0<=i<12:slack=float(z[i]-BOUNDS[i][0])
        elif kind=='upper' and 0<=i<12:slack=float(BOUNDS[i][1]-z[i])
        else:return {'status':'unresolved','reason':'invalid-label'}
        items.append({'constraint':label,'multiplier':float(multiplier),'normalizedSlack':slack,'absoluteProduct':abs(float(multiplier)*slack)})
    maximum=max((x['absoluteProduct'] for x in items),default=0.)
    prior=candidate.get('status')=='first-order-verified'
    return {'status':'supplemental-kkt-screen-pass' if prior and maximum<=1e-6 else 'unresolved','reason':None if prior and maximum<=1e-6 else 'prior-screen-or-complementarity-failed','priorStationarityScreen':prior,'maximumAbsoluteProduct':maximum,'constraints':items}

def summarize(cases):
    groups=[]
    for t in [3,7,12]:
        for kind in ['failed','control']:
            group=[c for c in cases if c['transitions']==t and c['kind']==kind];groups.append({'transitions':t,'kind':kind,'cases':len(group),'priorStationarityPass':sum(c['priorStatus']=='first-order-verified' for c in group),'supplementalPass':sum(c['complementarity']['status']=='supplemental-kkt-screen-pass' for c in group),'unresolved':sum(c['complementarity']['status']!='supplemental-kkt-screen-pass' for c in group)})
    return groups

def generate():
    original=json.loads(gzip.decompress(INPUT.read_bytes()));cases=[]
    for c in original['cases']:
        a=c['alternative'];cases.append({**{k:c[k] for k in ['outerSeed','transitions','schools','index','refitSeed','kind']},'priorStatus':a['status'],'complementarity':complementarity(a)})
    return {'id':'covariance-complementarity-v1','sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in SOURCES},'priorStationarityScreenOnly':True,'thresholdObjectiveUnits':1e-6,'summary':summarize(cases),'cases':cases,'historicalFits':0,'productionActivated':False,'limitations':['Passing necessary first-order tests does not prove a minimum or global optimum.','This is a post-failure check, not a validated bootstrap or economic calibration.','The frozen prior 87/179 stationarity result and all previous failures remain unchanged.']}

def compare(a,b,path='root'):
    if isinstance(a,dict):
        if not isinstance(b,dict) or a.keys()!=b.keys():raise ValueError(path+' fields differ')
        for k in a:compare(a[k],b[k],path+'.'+k)
    elif isinstance(a,list):
        if not isinstance(b,list) or len(a)!=len(b):raise ValueError(path+' shape differs')
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+f'[{i}]')
    elif isinstance(a,float):
        if not isinstance(b,(int,float)) or not np.isfinite(a) or not np.isclose(a,b,rtol=1e-10,atol=1e-14):raise ValueError(path+' numeric value differs')
    elif a!=b or type(a)!=type(b):raise ValueError(path+' status differs')

def main():
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args();report=generate()
    if args.verify:compare(report,json.loads(OUT.read_text()));print('All complementarity checks reproduced.')
    else:
        if OUT.exists():raise ValueError('Preserve existing complementarity evidence')
        OUT.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n');print(json.dumps(report['summary']))
if __name__=='__main__':main()
