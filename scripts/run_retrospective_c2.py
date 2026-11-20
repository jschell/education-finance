"""One preregistered, development-only anchored-state comparison."""
import argparse
import copy
import gzip
import hashlib
import json
import time
from collections import defaultdict
import numpy as np
from retrospective_inputs import ROOT, SECTORS, load_data, cohort_at, context
from retrospective_c2_models import fit, forecast_pair
from run_retrospective_walkforward import bill_draws, prediction, score_prediction, equal_mean, compare, nonoverlap_count

PROTOCOL='ffe318860a8702866fafcef7934b26f8a169ae5f'
BASE=ROOT/'data/calibration-diagnostics/retrospective-walkforward.json.gz'
OUT=ROOT/'data/calibration-diagnostics/retrospective-c2.json.gz'
SEED=2026112701
TRIALS=512

def interval(rows, baseline):
    origins=sorted({c['origin'] for c in rows})
    rng=np.random.default_rng(2026112802)
    diffs=[]
    for _ in range(1000):
        ix=[]
        while len(ix)<len(origins):
            start=int(rng.integers(len(origins)))
            ix.extend((start+j)%len(origins) for j in range(4))
        weights=defaultdict(int)
        for i in ix[:len(origins)]:weights[origins[i]]+=1
        diffs.append(equal_mean(rows,'C2','score',origin_weights=weights)-equal_mean(rows,baseline,'score',origin_weights=weights))
    return {'low':float(np.quantile(diffs,.025)),'high':float(np.quantile(diffs,.975)),'block':4,'resamples':1000,'seed':2026112802,'interpretation':'descriptive reused-development calendar blocks'}

def summarize(cases):
    # FIX denominator from baseline availability, never successful C2 intersection.
    primary=[c for c in cases if c['lag']==0 and c['wait'] in (0,4) and all(m in c['scores'] for m in ('B0','B2'))]
    available=all('C2' in c['scores'] for c in primary)
    metrics={m:{f:equal_mean(primary,m,f) for f in ('score','covered','width','bias','below','above')} for m in ('B0','B2','C1','C2')}
    strata=[]
    for sector in SECTORS:
        for kind in ('known','unknown'):
            for wait in (0,4):
                rows=[c for c in primary if (c['sector'],c['kind'],c['wait'])==(sector,kind,wait)]
                scores={m:equal_mean(rows,m,'score') for m in ('B0','B2','C2')}
                ok=bool(rows and all('C2' in c['scores'] for c in rows) and all(scores['C2']<=1.1*scores[m] for m in ('B0','B2')))
                strata.append({'sector':sector,'kind':kind,'wait':wait,'cases':len(rows),'scores':scores,'pass':ok})
    checks={'availability':available,'score5PercentBoth':available and all(metrics['C2']['score']<=.95*metrics[m]['score'] for m in ('B0','B2')),'stratumProtectionBoth':all(s['pass'] for s in strata),'coverageNoFartherBoth':available and all(abs(metrics['C2']['covered']-.8)<=abs(metrics[m]['covered']-.8) for m in ('B0','B2'))}
    intervals={m:interval(primary,m) for m in ('B0','B2')} if available else {}
    passed=all(checks.values())
    decision='reject-fixed-C2' if not passed else ('promising-inconclusive' if any(x['low']<=0<=x['high'] for x in intervals.values()) else 'descriptive-research-win')
    secondary=[]
    for lag in (0,1):
        for wait in (0,4,8):
            rows=[c for c in cases if c['lag']==lag and c['wait']==wait]
            for m in ('B0','B2','C1','C2'):
                good=[c for c in rows if m in c['scores']]
                secondary.append({'lag':lag,'wait':wait,'model':m,'planned':len(rows),'observed':sum(c['outcome']['status']=='observed' for c in rows),'availableObserved':len(good),'origins':len({c['origin'] for c in good}),'nonoverlappingWindows':nonoverlap_count(good),**{f:equal_mean(good,m,f) for f in ('score','covered','width','bias','below','above')}})
    return {'primary':{'fixedBaselineCases':len(primary),'C2Available':sum('C2' in c['scores'] for c in primary),'metrics':metrics,'relativeScoreChange':{m:metrics['C2']['score']/metrics[m]['score']-1 if available else None for m in ('B0','B2')},'checks':checks,'decision':decision,'pairedDifference95':intervals,'strata':strata},'secondary':secondary,'productionActivation':False,'freshHoldout':False}

def source_hashes():
    paths=['docs/retrospective-c2-protocol.md','scripts/retrospective_c2_models.py','scripts/run_retrospective_c2.py','scripts/retrospective_inputs.py','scripts/retrospective_cost_models.py','scripts/run_retrospective_walkforward.py','data/raw/ipeds/selected.csv.gz','data/raw/cpi.csv','data/calibration-diagnostics/retrospective-walkforward.json.gz','data/calibration-diagnostics/retrospective-current-reference.json.gz']
    return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}

def run():
    original=json.loads(gzip.decompress(BASE.read_bytes()))
    for p,sha in original['sourceHashes'].items():
        if hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=sha:raise ValueError('Changed old generating source '+p)
    if len(original['cases'])!=6480:raise ValueError('Old grid incomplete')
    cases=copy.deepcopy(original['cases'])
    lookup={tuple(c[k] for k in ('origin','sector','lag','kind','unitid','wait')):c for c in cases}
    if len(lookup)!=6480:raise ValueError('Duplicate baseline identity')
    table,cpi=load_data();start=time.monotonic();fits=[]
    for origin in range(2003,2021):
        for sector in SECTORS:
            selection=cohort_at(table,origin,sector)
            for lag in (0,1):
                ctx=context(table,cpi,origin,sector,lag=lag,selection=selection)
                try:
                    fitted=fit(ctx['records'],origin,excluded_unitids=selection['withheld_ids']);reason=None
                except ValueError as exc:fitted=None;reason=str(exc)
                fits.append({'origin':origin,'sector':sector,'lag':lag,'inputHash':ctx['input_sha256'],'status':'available' if fitted else 'unavailable','reason':reason})
                for kind,ids in (('known',selection['known_ids']),('unknown',selection['unknown_ids'])):
                    for unitid in ids:
                        predictions={};failure=reason
                        if fitted:
                            try:
                                paths=forecast_pair(fitted,unitid if kind=='known' else None,11,TRIALS,SEED+origin+10000*lag,school_key=f'{kind}:{unitid}')
                                anchor=[selection['anchors'][str(unitid)][k] for k in ('tuition','housing')]
                                for m,gross in paths.items():
                                    levels=bill_draws(gross,anchor)
                                    predictions[m]={w:prediction(levels[:,w:w+4,:].sum(axis=(1,2))) for w in (0,4,8)}
                            except (ValueError,FloatingPointError,OverflowError) as exc:failure=str(exc)
                        for wait in (0,4,8):
                            row=lookup[(origin,sector,lag,kind,unitid,wait)]
                            if row['inputHash']!=ctx['input_sha256']:raise ValueError('Cutoff input mismatch')
                            for m in ('B2','C1','no-real-growth'):
                                if m in predictions:compare(row['predictions'][m],predictions[m][wait],'old-output-parity')
                            if 'C2' in predictions:
                                row['predictions']['C2']=predictions['C2'][wait]
                                if row['outcome']['status']=='observed':row['scores']['C2']=score_prediction(predictions['C2'][wait],row['outcome']['total'],row['anchor'])
                            else:row['unavailable']['C2']=failure or 'unavailable'
        print(f'origin {origin}: C2 complete {time.monotonic()-start:.1f}s',flush=True)
        if time.monotonic()-start>1200:raise RuntimeError('Frozen runtime ceiling exceeded')
    return {'method':'retrospective-c2-1.0.0','protocolCommit':PROTOCOL,'seed':SEED,'trials':TRIALS,'sourceHashes':source_hashes(),'baselineProtocol':original['protocolCommit'],'fits':fits,'cases':cases,'summary':summarize(cases)}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args()
    if not args.verify and OUT.exists():raise SystemExit('Refusing to overwrite retained C2 evidence; use --verify')
    output=run()
    if args.verify:
        expected=json.loads(gzip.decompress(OUT.read_bytes()))
        generating=expected['sourceHashes']['scripts/run_retrospective_c2.py']
        snapshot=(ROOT/'data/calibration-diagnostics/retrospective-c2-generating-runner.py').read_bytes()
        if hashlib.sha256(snapshot).hexdigest()!=generating:raise ValueError('Generating runner snapshot mismatch')
        output['sourceHashes']['scripts/run_retrospective_c2.py']=generating
        compare(expected,output);print('Full C2 reproduction matches stored artifact')
    else:
        OUT.write_bytes(gzip.compress((json.dumps(output,sort_keys=True,separators=(',',':'))+'\n').encode(),mtime=0))
        print(json.dumps(output['summary']['primary'],indent=2))
