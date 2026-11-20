"""Fixed conditional joint-donor paths and mature near-entry bill benchmark."""
import argparse
import copy
import gzip
import hashlib
import json
import time
from collections import defaultdict
import numpy as np
from retrospective_inputs import ROOT, SECTORS, load_data, cohort_at, digest
from retrospective_c4_inputs import test_selections, role_context, records_for, bill_records
from retrospective_c4_models import fit, forecast, refit_c2
from retrospective_bill_benchmark import predict as predict_bill
from run_retrospective_walkforward import bill_draws, prediction, score_prediction, equal_mean, compare, nonoverlap_count

PROTOCOL='e48be163a1a9ee8492c651cabe90c16d669fdcba'
BASE=ROOT/'data/calibration-diagnostics/retrospective-c3.json.gz'
OUT=ROOT/'data/calibration-diagnostics/retrospective-c4.json.gz'
SEED=2026112701
TRIALS=512


def interval(rows,model,baseline,resamples=1000):
    if not rows or any(model not in c['scores'] for c in rows):return None
    origins=sorted({c['origin'] for c in rows})
    if len(origins)<4:return None
    rng=np.random.default_rng(2026113002);diffs=[]
    for _ in range(resamples):
        ix=[]
        while len(ix)<len(origins):
            start=int(rng.integers(len(origins)));ix.extend((start+j)%len(origins) for j in range(4))
        weights=defaultdict(int)
        for i in ix[:len(origins)]:weights[origins[i]]+=1
        diffs.append(equal_mean(rows,model,'score',origin_weights=weights)-equal_mean(rows,baseline,'score',origin_weights=weights))
    return {'low':float(np.quantile(diffs,.025)),'high':float(np.quantile(diffs,.975)),'block':4,'resamples':resamples,'seed':2026113002,'origins':len(origins),'interpretation':'descriptive reused-development calendar blocks, not fresh-test evidence'}


def evaluate(cases,model,waits):
    rows=[c for c in cases if c['lag']==0 and c['wait'] in waits and all(m in c['scores'] for m in ('B0','C2'))]
    expected=1001 if waits==(0,4) else 626
    if len(rows)!=expected:raise ValueError('Frozen baseline denominator changed')
    available=all(model in c['scores'] for c in rows)
    methods=('B0','C2',model)
    metrics={m:{f:equal_mean(rows,m,f) for f in ('score','covered','width','bias','below','above')} for m in methods}
    strata=[]
    for sector in SECTORS:
        for kind in ('known','unknown'):
            for wait in waits:
                xs=[c for c in rows if (c['sector'],c['kind'],c['wait'])==(sector,kind,wait)]
                scores={m:equal_mean(xs,m,'score') for m in methods}
                ok=bool(xs and all(model in c['scores'] for c in xs) and all(scores[model]<=1.1*scores[m] for m in ('B0','C2')))
                strata.append({'sector':sector,'kind':kind,'wait':wait,'cases':len(xs),'origins':len({c['origin'] for c in xs}),'scores':scores,'absoluteDifference':{m:scores[model]-scores[m] if scores[model] is not None else None for m in ('B0','C2')},'difference95':{m:interval(xs,model,m) for m in ('B0','C2')},'pass':ok})
    checks={'availability':available,'score5PercentBoth':available and all(metrics[model]['score']<=.95*metrics[m]['score'] for m in ('B0','C2')),'stratumProtectionBoth':all(s['pass'] for s in strata),'coverageNoFartherBoth':available and all(abs(metrics[model]['covered']-.8)<=abs(metrics[m]['covered']-.8) for m in ('B0','C2'))}
    intervals={m:interval(rows,model,m) for m in ('B0','C2')}
    passed=all(checks.values())
    decision=f'reject-fixed-{model}' if not passed else ('promising-inconclusive' if any(x and x['low']<=0<=x['high'] for x in intervals.values()) else 'descriptive-research-win')
    return {'model':model,'fixedBaselineCases':len(rows),'available':sum(model in c['scores'] for c in rows),'metrics':metrics,'relativeScoreChange':{m:metrics[model]['score']/metrics[m]['score']-1 if available else None for m in ('B0','C2')},'checks':checks,'decision':decision,'pairedDifference95':intervals,'strata':strata}


def summarize(cases):
    secondary=[]
    for lag in (0,1):
        for wait in (0,4,8):
            xs=[c for c in cases if c['lag']==lag and c['wait']==wait]
            for m in ('B0','B2','C2','REFIT-C2','C4','DIRECT-BILL'):
                good=[c for c in xs if m in c['scores']]
                secondary.append({'lag':lag,'wait':wait,'model':m,'planned':len(xs),'observed':sum(c['outcome']['status']=='observed' for c in xs),'availableObserved':len(good),'origins':len({c['origin'] for c in good}),'nonoverlappingWindows':nonoverlap_count(good),**{f:equal_mean(good,m,f) for f in ('score','covered','width','bias','below','above')}})
    return {'primary':evaluate(cases,'C4',(0,4)),'directBenchmark':evaluate(cases,'DIRECT-BILL',(0,)),'secondary':secondary,'productionActivation':False,'freshHoldout':False,'roleMatchedPrimary':False}


def source_hashes():
    paths=['docs/retrospective-c4-protocol.md','scripts/retrospective_c4_models.py','scripts/retrospective_bill_benchmark.py','scripts/retrospective_c4_inputs.py','scripts/run_retrospective_c4.py','scripts/retrospective_c2_models.py','scripts/retrospective_c3_models.py','scripts/retrospective_inputs.py','scripts/retrospective_cost_models.py','scripts/run_retrospective_walkforward.py','data/raw/ipeds/selected.csv.gz','data/raw/cpi.csv','data/calibration-diagnostics/retrospective-c3.json.gz','data/calibration-diagnostics/retrospective-c2.json.gz','data/calibration-diagnostics/retrospective-current-reference.json.gz']
    return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}


def run():
    original=json.loads(gzip.decompress(BASE.read_bytes()))
    for p,sha in original['sourceHashes'].items():
        if hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=sha:raise ValueError('Changed old source '+p)
    cases=copy.deepcopy(original['cases'])
    lookup={tuple(c[k] for k in ('origin','sector','lag','kind','unitid','wait')):c for c in cases}
    if len(cases)!=6480 or len(lookup)!=6480:raise ValueError('Baseline grid changed')
    table,cpi=load_data();start=time.monotonic();audits=[];labels={};benchmark_audits=[]
    # Pure origin-local cache. No mutable global cache survives future-poisoning tests.
    bank={(o,s):cohort_at(table,o,s,fit_cap=10**9) for o in range(2003,2021) for s in SECTORS}
    for origin in range(2003,2021):
        selections,test_ids=test_selections(table,origin,SECTORS)
        for sector in SECTORS:
            selection=selections[sector]
            label_rows=bill_records(table,origin,sector,test_ids,origin-1,cohort_bank=bank)
            label_hash=digest(label_rows);labels[label_hash]=label_rows
            for lag in (0,1):
                ctx=role_context(table,cpi,origin,sector,lag,test_ids,eligible=bank[(origin,sector)])
                try:
                    fitted=fit(ctx['fit_records'],ctx['cal_records'],origin,test_unitids=test_ids,training_cutoff=ctx['cutoff']);fit_failure=None
                except ValueError as exc:fitted=None;fit_failure=str(exc)
                audit={'origin':origin,'sector':sector,'lag':lag,'inputHash':ctx['inputHash'],'cutoff':ctx['cutoff'],'fit_ids':ctx['fit_ids'],'cal_ids':ctx['cal_ids'],'test_ids':test_ids,'labelHash':label_hash,'status':'available' if fitted is not None else 'unavailable','reason':fit_failure}
                if fitted is not None:audit['modelAudit']=fitted['audit']
                audits.append(audit)
                for kind,ids in (('known',selection['known_ids']),('unknown',selection['unknown_ids'])):
                    for unitid in ids:
                        anchor=[selection['anchors'][str(unitid)][k] for k in ('tuition','housing')]
                        history=records_for(table,cpi,[unitid],ctx['cutoff'],sector) if kind=='known' else None
                        preds={};failures={}
                        if fitted is not None:
                            for model,fn in (('REFIT-C2',refit_c2),('C4',forecast)):
                                try:
                                    gross=fn(fitted,anchor,11,TRIALS,SEED+origin+10000*lag,unitid=unitid if kind=='known' else None,history=history,school_key=f'{kind}:{unitid}')
                                    levels=bill_draws(gross,anchor)
                                    preds[model]={w:prediction(levels[:,w:w+4,:].sum(axis=(1,2))) for w in (0,4,8)}
                                except (ValueError,FloatingPointError,OverflowError) as exc:failures[model]=str(exc)
                        else:failures={m:fit_failure for m in ('REFIT-C2','C4')}
                        try:
                            bp=predict_bill(label_rows,anchor,origin,ctx['cutoff'],test_unitids=test_ids)
                            benchmark_audits.append({'origin':origin,'sector':sector,'lag':lag,'kind':kind,'unitid':unitid,'labelHash':label_hash,'diagnostic':{k:v for k,v in bp.items() if k not in ('p10','p50','p90','mean','label_weights')}})
                            if bp['status']=='available':preds['DIRECT-BILL']={0:{k:float(bp[k]) for k in ('p10','p50','p90','mean')}}
                            else:failures['DIRECT-BILL']=bp['status']
                        except (ValueError,FloatingPointError,OverflowError) as exc:failures['DIRECT-BILL']=str(exc)
                        for wait in (0,4,8):
                            row=lookup[(origin,sector,lag,kind,unitid,wait)]
                            if row['anchor']!=anchor:raise ValueError('Frozen target anchor mismatch')
                            row['C4InputHash']=ctx['inputHash']
                            for model in ('C4','REFIT-C2','DIRECT-BILL'):
                                if model in preds and wait in preds[model]:
                                    row['predictions'][model]=preds[model][wait]
                                    if row['outcome']['status']=='observed':row['scores'][model]=score_prediction(preds[model][wait],row['outcome']['total'],anchor)
                                else:row['unavailable'][model]=failures.get(model,'near-entry-only-benchmark')
        print(f'origin {origin}: conditional paths/bill forecasts complete {time.monotonic()-start:.1f}s',flush=True)
        if time.monotonic()-start>1200:raise RuntimeError('Frozen runtime ceiling exceeded; no smaller rerun')
    return {'method':'retrospective-c4-1.0.0','protocolCommit':PROTOCOL,'seed':SEED,'trials':TRIALS,'sourceHashes':source_hashes(),'baselineProtocol':original['protocolCommit'],'roleAudits':audits,'billLabels':labels,'benchmarkAudits':benchmark_audits,'cases':cases,'summary':summarize(cases)}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args()
    if not args.verify and OUT.exists():raise SystemExit('Refusing to overwrite retained C4 evidence; use --verify')
    result=run()
    if args.verify:compare(json.loads(gzip.decompress(OUT.read_bytes())),result);print('Complete C4 and direct-bill reproduction matches retained artifact')
    else:
        OUT.write_bytes(gzip.compress((json.dumps(result,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode(),mtime=0))
        print(json.dumps({'primary':result['summary']['primary'],'directBenchmark':result['summary']['directBenchmark']},indent=2))
