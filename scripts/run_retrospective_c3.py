"""One preregistered past-only annual location/scale calibration comparison."""
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
from retrospective_c3_models import calibrate, apply
from retrospective_inputs import price_at, identity_hash
from run_retrospective_walkforward import bill_draws, prediction, score_prediction, equal_mean, compare, nonoverlap_count

PROTOCOL='fb5ebcb1d92b6e2dac14c6689a794b5f2734a4cc'
BASE=ROOT/'data/calibration-diagnostics/retrospective-c2.json.gz'
OUT=ROOT/'data/calibration-diagnostics/retrospective-c3.json.gz'
SEED=2026112701
TRIALS=512

def interval(rows, baseline):
    origins=sorted({c['origin'] for c in rows})
    rng=np.random.default_rng(2026112902)
    diffs=[]
    for _ in range(1000):
        ix=[]
        while len(ix)<len(origins):
            start=int(rng.integers(len(origins)))
            ix.extend((start+j)%len(origins) for j in range(4))
        weights=defaultdict(int)
        for i in ix[:len(origins)]:weights[origins[i]]+=1
        diffs.append(equal_mean(rows,'C3','score',origin_weights=weights)-equal_mean(rows,baseline,'score',origin_weights=weights))
    return {'low':float(np.quantile(diffs,.025)),'high':float(np.quantile(diffs,.975)),'block':4,'resamples':1000,'seed':2026112902,'interpretation':'descriptive reused-development calendar blocks'}

def summarize(cases):
    # FIX denominator from baseline availability, never successful C3 intersection.
    primary=[c for c in cases if c['lag']==0 and c['wait'] in (0,4) and all(m in c['scores'] for m in ('B0','B2','C2'))]
    available=all('C3' in c['scores'] for c in primary)
    metrics={m:{f:equal_mean(primary,m,f) for f in ('score','covered','width','bias','below','above')} for m in ('B0','B2','C2','C3')}
    strata=[]
    for sector in SECTORS:
        for kind in ('known','unknown'):
            for wait in (0,4):
                rows=[c for c in primary if (c['sector'],c['kind'],c['wait'])==(sector,kind,wait)]
                scores={m:equal_mean(rows,m,'score') for m in ('B0','B2','C2','C3')}
                ok=bool(rows and all('C3' in c['scores'] for c in rows) and all(scores['C3']<=1.1*scores[m] for m in ('B0','B2','C2')))
                strata.append({'sector':sector,'kind':kind,'wait':wait,'cases':len(rows),'scores':scores,'pass':ok})
    checks={'availability':available,'score5PercentAll':available and all(metrics['C3']['score']<=.95*metrics[m]['score'] for m in ('B0','B2','C2')),'stratumProtectionAll':all(s['pass'] for s in strata),'coverageNoFartherAll':available and all(abs(metrics['C3']['covered']-.8)<=abs(metrics[m]['covered']-.8) for m in ('B0','B2','C2'))}
    intervals={m:interval(primary,m) for m in ('B0','B2','C2')} if available else {}
    passed=all(checks.values())
    decision='reject-fixed-C3' if not passed else ('promising-inconclusive' if any(x['low']<=0<=x['high'] for x in intervals.values()) else 'descriptive-research-win')
    secondary=[]
    for lag in (0,1):
        for wait in (0,4,8):
            rows=[c for c in cases if c['lag']==lag and c['wait']==wait]
            for m in ('B0','B2','C2','C3'):
                good=[c for c in rows if m in c['scores']]
                secondary.append({'lag':lag,'wait':wait,'model':m,'planned':len(rows),'observed':sum(c['outcome']['status']=='observed' for c in rows),'availableObserved':len(good),'origins':len({c['origin'] for c in good}),'nonoverlappingWindows':nonoverlap_count(good),**{f:equal_mean(good,m,f) for f in ('score','covered','width','bias','below','above')}})
    return {'primary':{'fixedBaselineCases':len(primary),'C3Available':sum('C3' in c['scores'] for c in primary),'metrics':metrics,'relativeScoreChange':{m:metrics['C3']['score']/metrics[m]['score']-1 if available else None for m in ('B0','B2','C2')},'checks':checks,'decision':decision,'pairedDifference95':intervals,'strata':strata},'secondary':secondary,'productionActivation':False,'freshHoldout':False}

def source_hashes():
    paths=['docs/retrospective-c3-protocol.md','scripts/retrospective_c3_models.py','scripts/run_retrospective_c3.py','data/calibration-diagnostics/retrospective-c2.json.gz','scripts/retrospective_c2_models.py','scripts/run_retrospective_c2.py','scripts/retrospective_inputs.py','scripts/retrospective_cost_models.py','scripts/run_retrospective_walkforward.py','data/raw/ipeds/selected.csv.gz','data/raw/cpi.csv','data/calibration-diagnostics/retrospective-walkforward.json.gz','data/calibration-diagnostics/retrospective-current-reference.json.gz']
    return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}

def generate_pseudo(table,cpi):
    """Fixed lag0 known-school prequential corpus; outer admission is separate."""
    records=[]
    for origin in range(2003,2019):
        for sector in SECTORS:
            selection=cohort_at(table,origin,sector)
            ctx=context(table,cpi,origin,sector,selection=selection)
            fitted=fit(ctx['records'],origin,excluded_unitids=selection['withheld_ids'])
            for unitid in selection['known_ids']:
                if identity_hash(unitid)%5==0:raise ValueError('Withheld calibration target')
                row={'origin':origin,'targetYear':origin+1,'sector':sector,'unitid':unitid,'inputHash':ctx['input_sha256']}
                gross=forecast_pair(fitted,unitid,1,TRIALS,SEED+origin,school_key=f'known:{unitid}')['C2'][:,0,:]
                logs=np.log(gross);mean=logs.mean(axis=0);variance=logs.var(axis=0,ddof=0)
                target=price_at(table,unitid,origin+1,sector)
                row['status']=target['status']
                row['predictedMeanLog']=mean.tolist();row['variance']=variance.tolist()
                if target['status']=='observed':
                    anchor=selection['anchors'][str(unitid)]
                    truth=np.log([target[k]/anchor[k] for k in ('tuition','housing')])
                    row['actualLogGrowth']=truth.tolist();row['error']=(truth-mean).tolist()
                records.append(row)
    return records


def run():
    original=json.loads(gzip.decompress(BASE.read_bytes()))
    for p,sha in original['sourceHashes'].items():
        source=ROOT/p
        if p=='scripts/run_retrospective_c2.py':source=ROOT/'data/calibration-diagnostics/retrospective-c2-generating-runner.py'
        if hashlib.sha256(source.read_bytes()).hexdigest()!=sha:raise ValueError('Changed old generating source '+p)
    if len(original['cases'])!=6480:raise ValueError('Old grid incomplete')
    cases=copy.deepcopy(original['cases'])
    lookup={tuple(c[k] for k in ('origin','sector','lag','kind','unitid','wait')):c for c in cases}
    if len(lookup)!=6480:raise ValueError('Duplicate baseline identity')
    table,cpi=load_data();start=time.monotonic();fits=[]
    pseudo=generate_pseudo(table,cpi)
    for origin in range(2003,2021):
        for sector in SECTORS:
            selection=cohort_at(table,origin,sector)
            for lag in (0,1):
                ctx=context(table,cpi,origin,sector,lag=lag,selection=selection)
                try:
                    calibration=calibrate([r for r in pseudo if r['sector']==sector and r['status']=='observed'],origin,ctx['training_cutoff'])
                    calibration={k:(v.tolist() if isinstance(v,np.ndarray) else v) for k,v in calibration.items()}
                    calibration_failure=None
                except ValueError as exc:calibration=None;calibration_failure=str(exc)
                try:
                    fitted=fit(ctx['records'],origin,excluded_unitids=selection['withheld_ids']);reason=None
                except ValueError as exc:fitted=None;reason=str(exc)
                fits.append({'origin':origin,'sector':sector,'lag':lag,'inputHash':ctx['input_sha256'],'status':'available' if fitted else 'unavailable','reason':reason,'calibration':calibration,'calibrationFailure':calibration_failure})
                for kind,ids in (('known',selection['known_ids']),('unknown',selection['unknown_ids'])):
                    for unitid in ids:
                        predictions={};failure=reason
                        if fitted:
                            try:
                                paths=forecast_pair(fitted,unitid if kind=='known' else None,11,TRIALS,SEED+origin+10000*lag,school_key=f'{kind}:{unitid}')
                                if calibration is None:raise ValueError(calibration_failure)
                                paths['C3']=apply(paths['C2'],calibration)
                                anchor=[selection['anchors'][str(unitid)][k] for k in ('tuition','housing')]
                                for m,gross in paths.items():
                                    levels=bill_draws(gross,anchor)
                                    predictions[m]={w:prediction(levels[:,w:w+4,:].sum(axis=(1,2))) for w in (0,4,8)}
                            except (ValueError,FloatingPointError,OverflowError) as exc:failure=str(exc)
                        for wait in (0,4,8):
                            row=lookup[(origin,sector,lag,kind,unitid,wait)]
                            if row['inputHash']!=ctx['input_sha256']:raise ValueError('Cutoff input mismatch')
                            for m in ('B2','C1','no-real-growth','C2'):
                                if m in predictions:compare(row['predictions'][m],predictions[m][wait],'old-output-parity')
                            if 'C3' in predictions:
                                row['predictions']['C3']=predictions['C3'][wait]
                                if row['outcome']['status']=='observed':row['scores']['C3']=score_prediction(predictions['C3'][wait],row['outcome']['total'],row['anchor'])
                            else:row['unavailable']['C3']=failure or 'unavailable'
        print(f'origin {origin}: C3 complete {time.monotonic()-start:.1f}s',flush=True)
        if time.monotonic()-start>1200:raise RuntimeError('Frozen runtime ceiling exceeded')
    return {'method':'retrospective-c3-1.0.0','protocolCommit':PROTOCOL,'seed':SEED,'trials':TRIALS,'sourceHashes':source_hashes(),'baselineProtocol':original['protocolCommit'],'pseudoRecords':pseudo,'fits':fits,'cases':cases,'summary':summarize(cases)}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args()
    if not args.verify and OUT.exists():raise SystemExit('Refusing to overwrite retained C3 evidence; use --verify')
    output=run()
    if args.verify:
        expected=json.loads(gzip.decompress(OUT.read_bytes()))
        compare(expected,output);print('Full C3 reproduction matches stored artifact')
    else:
        OUT.write_bytes(gzip.compress((json.dumps(output,sort_keys=True,separators=(',',':'))+'\n').encode(),mtime=0))
        print(json.dumps(output['summary']['primary'],indent=2))
