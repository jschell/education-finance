"""Fixed, cutoff-isolated revised-data forecast comparison; no production use."""
import argparse
from collections import defaultdict
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
import numpy as np
from retrospective_inputs import ROOT, SECTORS, load_data, cohort_at, context, outcome
from retrospective_cost_models import fit, forecast_pair

METHOD = 'retrospective-walkforward-1.0.0'
PROTOCOL = '3700720c4cef24c71dd94d16f25d771b135a1c77'
AMENDMENT = '4f445e87e938c0846c7794d76cb74316a23c33e8'
B0_ARCHIVE = ROOT / 'data/calibration-diagnostics/retrospective-current-reference.json.gz'
TRIALS = 512
SEED = 2026112701
OUT = ROOT / 'data/calibration-diagnostics/retrospective-walkforward.json.gz'


def bill_draws(gross, anchor):
    gross = np.asarray(gross, dtype=float)
    anchor = np.asarray(anchor, dtype=float)
    if gross.ndim != 3 or gross.shape[2] != 2 or anchor.shape != (2,) or not np.isfinite(gross).all() or not (gross > 0).all() or not np.isfinite(anchor).all() or not (anchor > 0).all():
        raise ValueError('Invalid paired annual paths/anchor')
    levels = np.concatenate([np.broadcast_to(anchor, (len(gross), 1, 2)),
                             anchor[None, None, :] * np.cumprod(gross, axis=1)], axis=1)
    if not np.isfinite(levels).all():
        raise ValueError('Nonfinite cumulative price path')
    return levels


def prediction(values):
    values = np.asarray(values, dtype=float)
    if values.ndim != 1 or not len(values) or not np.isfinite(values).all():
        raise ValueError('Nonfinite/missing bill distribution')
    q = np.quantile(values, [.1, .5, .9])
    return {'p10': float(q[0]), 'p50': float(q[1]), 'p90': float(q[2]),
            'mean': float(values.mean())}


def score_prediction(p, truth, anchor):
    normalizer = 4 * float(sum(anchor))
    if not normalizer > 0 or not np.isfinite(truth):
        raise ValueError('Invalid origin normalization or outcome')
    lo, hi = p['p10'], p['p90']
    return {**p, 'normalizer': normalizer, 'actual': float(truth),
            'score': (hi-lo + 10*max(lo-truth, 0) + 10*max(truth-hi, 0))/normalizer,
            'width': (hi-lo)/normalizer, 'bias': (p['p50']-truth)/normalizer,
            'covered': bool(lo <= truth <= hi), 'below': bool(truth < lo), 'above': bool(truth > hi)}


def score_bill(values, truth, anchor):
    return score_prediction(prediction(values), truth, anchor)


def equal_mean(rows, model, field, wait=None, origin_weights=None):
    """Equal school, sector/type, origin, wait; actual matched support only."""
    groups = defaultdict(list)
    for c in rows:
        if c['outcome']['status'] != 'observed' or model not in c['scores'] or (wait is not None and c['wait'] != wait):
            continue
        groups[(c['wait'], c['origin'], c['sector'], c['kind'])].append(float(c['scores'][model][field]))
    by_origin = defaultdict(list)
    for (w, origin, sector, kind), values in groups.items():
        by_origin[(w, origin)].append(float(np.mean(values)))
    by_wait = defaultdict(list)
    for (w, origin), values in by_origin.items():
        weight = 1 if origin_weights is None else origin_weights.get(origin, 0)
        if weight:
            by_wait[w].extend([float(np.mean(values))]*weight)
    return float(np.mean([np.mean(v) for v in by_wait.values()])) if by_wait else None


def matched(rows, methods):
    return [c for c in rows if c['outcome']['status'] == 'observed' and all(m in c['scores'] for m in methods)]


def paired_interval(rows, a='B2', b='C1', resamples=1000):
    selected = matched([c for c in rows if c['wait'] in (0, 4)], (a, b))
    origins = sorted({c['origin'] for c in selected})
    if len(origins) < 4:
        return None
    rng = np.random.default_rng(2026112702)
    values = []
    for _ in range(resamples):
        indices = []
        while len(indices) < len(origins):
            start = int(rng.integers(len(origins)))
            indices.extend((start+j) % len(origins) for j in range(4))
        weights = defaultdict(int)
        for i in indices[:len(origins)]:
            weights[origins[i]] += 1
        values.append(equal_mean(selected, b, 'score', origin_weights=weights)-equal_mean(selected, a, 'score', origin_weights=weights))
    return {'low': float(np.quantile(values, .025)), 'high': float(np.quantile(values, .975)),
            'resamples': resamples, 'block': 4, 'origins': len(origins),
            'interpretation': 'descriptive calendar-block interval; dependent reused histories'}


def nonoverlap_count(rows):
    last = None; count = 0
    for start, end in sorted({(r['origin'],r['outcome']['lastBillYear']) for r in rows}):
        if last is None or start > last:
            count += 1; last = end
    return count


def summarize(cases):
    summaries = []
    for lag in (0, 1):
        rows = [c for c in cases if c['lag'] == lag]
        for wait in (0, 4, 8):
            group = [c for c in rows if c['wait'] == wait]
            for model in ('B2', 'C1', 'no-real-growth', 'fixed-4-3', 'B0'):
                good = [c for c in group if model in c['scores']]
                summaries.append({'lag': lag, 'wait': wait, 'model': model, 'cases': len(group),
                                  'observed': sum(c['outcome']['status'] == 'observed' for c in group),
                                  'availableObserved': len(good),
                                  'origins': len({c['origin'] for c in good}),'nonoverlappingWindows':nonoverlap_count(good),
                                  **{key: equal_mean(good, model, key) for key in ('score','covered','width','bias','below','above')}})
    primary = matched([c for c in cases if c['lag'] == 0 and c['wait'] in (0, 4)], ('B2', 'C1'))
    a, b = equal_mean(primary, 'B2', 'score'), equal_mean(primary, 'C1', 'score')
    coverage_a, coverage_b = equal_mean(primary, 'B2', 'covered'), equal_mean(primary, 'C1', 'covered')
    strata = []
    for sector in SECTORS:
        for kind in ('known', 'unknown'):
            for wait in (0, 4):
                xs = [c for c in primary if c['sector'] == sector and c['kind'] == kind and c['wait'] == wait]
                old, new = equal_mean(xs, 'B2', 'score'), equal_mean(xs, 'C1', 'score')
                strata.append({'sector':sector,'kind':kind,'wait':wait,'cases':len(xs),
                               'B2':old,'C1':new,'protectionPass': bool(old is not None and new <= 1.1*old)})
    ci = paired_interval(primary)
    checks = {'score5Percent': bool(a and b <= .95*a),
              'stratumProtection': all(s['protectionPass'] for s in strata),
              'coverageNoFarther': bool(a and abs(coverage_b-.8) <= abs(coverage_a-.8)),
              'availabilityNoLower': sum('C1' in c['scores'] for c in cases) >= sum('B2' in c['scores'] for c in cases)}
    passed = all(checks.values())
    state = 'reject-first-C1-comparison' if not passed else ('promising-inconclusive' if ci and ci['low'] <= 0 <= ci['high'] else 'descriptive-research-win')
    current = matched([c for c in cases if c['lag']==0 and c['wait'] in (0,4)],('B0','B2','C1'))
    return {'rows':summaries,'primary': {'matchedCases':len(primary),'B2Score':a,'C1Score':b,
                'relativeScoreChange':(b/a-1) if a else None,'B2Coverage':coverage_a,'C1Coverage':coverage_b,
                'pairedScoreDifference95':ci,'checks':checks,'decision':state,'strata':strata},
            'currentCommonSupport': {'cases':len(current),**{m:equal_mean(current,m,'score') for m in ('B0','B2','C1')}},
            'realTimeVintageQualified':False,'forwardFundingCalibration':False,'productionActivation':False}


def source_hashes():
    paths = ['docs/retrospective-walkforward-protocol.md','data/raw/ipeds/selected.csv.gz',
             'data/raw/cpi.csv','site/data/calibration-foundation.json','scripts/retrospective_inputs.py',
             'scripts/retrospective_cost_models.py','scripts/run_retrospective_walkforward.py',
             'scripts/retrospective_current_baseline.mjs']
    return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths if (ROOT/p).exists()}


def run(b0_path):
    table, cpi = load_data()
    b0 = {}
    b0_reference = {'status': 'unsupported-not-produced'}
    if b0_path and b0_path.exists():
        raw = json.loads(b0_path.read_text())
        if raw.get('trials') != TRIALS or raw.get('seed') != SEED or len(raw.get('records', [])) != 3240:
            raise ValueError('Current-process reference does not match frozen grid/seed/trials')
        for path, sha in raw['sourceHashes'].items():
            if hashlib.sha256((ROOT/path).read_bytes()).hexdigest() != sha:
                raise ValueError('Current-process source identity mismatch')
        semantic = {k:v for k,v in raw.items() if k != 'elapsedSeconds'}
        if B0_ARCHIVE.exists():
            compare(json.loads(gzip.decompress(B0_ARCHIVE.read_bytes())), semantic, 'B0-reference')
        else:
            B0_ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
            B0_ARCHIVE.write_bytes(gzip.compress((json.dumps(semantic, sort_keys=True, separators=(',',':'))+'\n').encode(), mtime=0))
        b0_reference = {'status':'available-verified-current-reference','sourceHashes':raw['sourceHashes'],
                        'archiveSha256':hashlib.sha256(B0_ARCHIVE.read_bytes()).hexdigest()}
        for row in raw['records']:
            key = (row['origin'],row['sector'],row['kind'],row['unitid'],row['wait'])
            if key in b0: raise ValueError('Duplicate current-process reference identity')
            b0[key] = row
    cases, fits = [], []
    start = time.monotonic()
    for origin in range(2003,2021):
        for sector in SECTORS:
            selection = cohort_at(table,origin,sector)
            for lag in (0,1):
                ctx = context(table,cpi,origin,sector,lag=lag,selection=selection)
                try:
                    fitted = fit(ctx['records'],origin,excluded_unitids=selection['withheld_ids'])
                    fits.append({'origin':origin,'sector':sector,'lag':lag,'inputHash':ctx['input_sha256'],
                                 'status':'available','cutoff':ctx['training_cutoff'],'years':fitted['years'],
                                 'trainingInstitutions':fitted['training_institutions'],
                                 'mu':fitted['mu'].tolist(),'rho':fitted['rho'].tolist()})
                except ValueError as exc:
                    fitted = None
                    fits.append({'origin':origin,'sector':sector,'lag':lag,'inputHash':ctx['input_sha256'],
                                 'status':'unavailable','reason':str(exc),'cutoff':ctx['training_cutoff']})
                for kind, ids in (('known',selection['known_ids']),('unknown',selection['unknown_ids'])):
                    for unitid in ids:
                        anchor = [selection['anchors'][str(unitid)][k] for k in ('tuition','housing')]
                        preds, failure = {}, None
                        if fitted:
                            try:
                                paths = forecast_pair(fitted,unitid if kind=='known' else None,11,TRIALS,
                                                      SEED+origin+10000*lag,school_key=f'{kind}:{unitid}')
                                # Predictions are constructed before any future outcome is read.
                                for model,gross in paths.items():
                                    levels = bill_draws(gross,anchor)
                                    preds[model] = {wait:prediction(levels[:,wait:wait+4,:].sum(axis=(1,2))) for wait in (0,4,8)}
                            except ValueError as exc:
                                failure = str(exc)
                        for wait in (0,4,8):
                            truth = outcome(table,unitid,origin,wait,sector)
                            row = {'origin':origin,'sector':sector,'lag':lag,'kind':kind,'unitid':unitid,
                                   'wait':wait,'anchor':anchor,'inputHash':ctx['input_sha256'],
                                   'outcome':truth,'predictions':{m:ps[wait] for m,ps in preds.items()},'scores':{},'unavailable':{}}
                            if truth['status']=='observed':
                                for model,values in preds.items():
                                    row['scores'][model]=score_prediction(values[wait],truth['total'],anchor)
                                fixed = float(sum(anchor[j]*sum((1+rate)**h for h in range(wait,wait+4)) for j,rate in enumerate((.04,.03))))
                                row['scores']['fixed-4-3']=score_prediction(prediction([fixed]),truth['total'],anchor)
                                prior = b0.get((origin,sector,kind,unitid,wait)) if lag==0 else None
                                if prior and prior.get('status')=='available':
                                    if prior['anchor'] != dict(zip(('tuition','housing'), anchor)) or len(prior['bills']) != TRIALS:
                                        raise ValueError('Current-process anchor/path identity mismatch')
                                    bp = {k:float(prior[k]) for k in ('p10','p50','p90')}
                                    bp['mean'] = float(np.mean(prior['bills']))
                                    row['scores']['B0']=score_prediction(bp,truth['total'],anchor)
                                else:
                                    row['unavailable']['B0']='original-history-minimum-or-not-produced' if lag==0 else 'primary-view-only-reference'
                            if fitted is None or failure:
                                for model in ('B2','C1','no-real-growth'):
                                    row['unavailable'][model]=failure or 'minimum-three-transition-years'
                            cases.append(row)
        print(f'origin {origin}: forecasts complete, {time.monotonic()-start:.1f}s',flush=True)
        if time.monotonic()-start>1200:
            raise RuntimeError('Frozen 20-minute bound exceeded; no smaller rerun permitted')
    return {'method':METHOD,'protocolCommit':PROTOCOL,'amendedProtocolCommit':AMENDMENT,'B0Reference':b0_reference,'seed':SEED,'trials':TRIALS,
            'sourceHashes':source_hashes(),'runtime':{'python':sys.version.split()[0],'numpy':np.__version__},
            'fits':fits,'cases':cases,'summary':summarize(cases)}


def compare(expected,actual,path='root'):
    if isinstance(expected,bool) or isinstance(actual,bool):
        if expected is not actual:raise ValueError(f'Boolean mismatch {path}')
    elif isinstance(expected,(float,int)) and isinstance(actual,(float,int)):
        if type(expected) is int and type(actual) is int:
            if expected!=actual:raise ValueError(f'Integer mismatch {path}')
        elif not math.isclose(expected,actual,rel_tol=1e-10,abs_tol=1e-8):
            raise ValueError(f'Numeric mismatch {path}: {expected} vs {actual}')
    elif isinstance(expected,dict) and isinstance(actual,dict):
        if expected.keys()!=actual.keys():raise ValueError(f'Keys mismatch {path}')
        for k in expected:compare(expected[k],actual[k],path+'.'+str(k))
    elif isinstance(expected,list) and isinstance(actual,list):
        if len(expected)!=len(actual):raise ValueError(f'Length mismatch {path}')
        for i,(a,b) in enumerate(zip(expected,actual)):compare(a,b,f'{path}[{i}]')
    elif expected!=actual:raise ValueError(f'Value mismatch {path}')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true')
    parser.add_argument('--b0',type=Path,default=ROOT/'.cache/retrospective-b0.json')
    args=parser.parse_args()
    if not args.verify and OUT.exists():raise SystemExit('Refusing to overwrite original outcome artifact')
    result=run(args.b0)
    if args.verify:
        expected=json.loads(gzip.decompress(OUT.read_bytes()));compare(expected,result)
    else:
        OUT.parent.mkdir(exist_ok=True,parents=True)
        OUT.write_bytes(gzip.compress((json.dumps(result,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode(),mtime=0))
    print(json.dumps(result['summary'],indent=2),flush=True)


if __name__=='__main__':main()
