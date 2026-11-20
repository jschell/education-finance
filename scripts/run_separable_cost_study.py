"""Fixed fresh screening batch for separable-cost-1.0.0; synthetic only."""
import argparse
import hashlib
import json
import math
import pathlib
import sys
import time
import numpy as np
from separable_cost_predictive import fit, draws, marginal_interval, METHOD
from revision_cost_predictive import generated, PARAMETERS

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/calibration-diagnostics/separable-cost-study.json'
PROTOCOL_COMMIT = 'c725ca9f5ce7176e7f22c36b655f82013ea6a0e9'
ARMS = ('matched', 'unequal-family', 'correlated-reporting', 'heavy-tails', 'persistence')
BUDGET = np.array([18000., 21000.])


def score(values, truth):
    if not np.isfinite(values).all() or not np.isfinite(truth):
        raise ValueError('Nonfinite bill draws or truth')
    lo, hi = np.quantile(values, [.1, .9])
    norm = 4 * BUDGET.sum()
    interval = hi-lo + 10 * max(lo-truth, 0) + 10 * max(truth-hi, 0)
    result = {'covered': bool(lo <= truth <= hi), 'intervalScore': float(interval/norm),
              'width': float((hi-lo)/norm), 'bias': float((values.mean()-truth)/norm)}
    if not all(np.isfinite(v) for v in result.values()):
        raise ValueError('Nonfinite bill score')
    return result


def wilson(successes, count):
    if not count:
        return None
    z = 1.959963984540054
    p = successes / count
    center = (p + z*z/(2*count))/(1 + z*z/count)
    radius = z * math.sqrt(p*(1-p)/count + z*z/(4*count*count))/(1 + z*z/count)
    return [center-radius, center+radius]


def cell(seed, depth, arm):
    params = np.tile([.04, .03, .25], 4) if arm == 'matched' else PARAMETERS
    scenario = 'ideal' if arm in ('matched', 'unequal-family') else arm
    graph, latent, _ = generated(seed, transitions=depth, schools=8, parameters=params, scenario=scenario)
    result = {'seed': seed, 'depth': depth, 'arm': arm, 'status': 'unavailable'}
    try:
        model = fit(graph)
        draw_seed = int(np.random.SeedSequence([seed, depth, ARMS.index(arm)]).generate_state(1)[0])
        result.update(status='available', nu=model['nu'], drift=model['drift'].ravel().tolist(), scale=model['scale'].tolist())
        truth = latent[0, depth:depth+13] - latent[0, depth]
        for name, integrated in (('integrated', True), ('plugin', False)):
            paths = draws(model, draw_seed, count=2048, integrated=integrated)
            result[name] = {}
            for wait in (0, 4, 8):
                with np.errstate(over='raise', invalid='raise'):
                    bills = (np.exp(paths[:, wait:wait+4]) * BUDGET).sum(axis=(1, 2))
                    actual = float((np.exp(truth[wait:wait+4]) * BUDGET).sum())
                result[name][str(wait)] = score(bills, actual)
        result['marginalCoverage'] = {}
        for horizon in (4, 8, 12):
            for component in (0, 1):
                lo, hi = marginal_interval(model, horizon, component)
                result['marginalCoverage'][f'{horizon}:{component}'] = bool(lo <= truth[horizon, component] <= hi)
    except (ValueError, np.linalg.LinAlgError, FloatingPointError) as exc:
        result.update(status='unavailable', failure=str(exc))
        # Preserve failure status even if fitting succeeded before prediction failed.
        for key in ('integrated', 'plugin', 'marginalCoverage'):
            result.pop(key, None)
    return result


def summary(cells):
    expected = {(s, d, a) for s in range(2026112301, 2026112365) for d in (3, 7, 12) for a in ARMS}
    actual = [(c['seed'], c['depth'], c['arm']) for c in cells]
    if len(actual) != len(expected) or set(actual) != expected:
        raise ValueError('Incomplete or duplicate fixed screening grid')
    groups = []
    for arm in ARMS:
        for depth in (3, 7, 12):
            group = [c for c in cells if c['arm'] == arm and c['depth'] == depth]
            available = [c for c in group if c['status'] == 'available']
            record = {'arm': arm, 'depth': depth, 'total': len(group), 'available': len(available),
                      'availabilityPass': len(available) >= .9 * len(group), 'waits': {}}
            for wait in ('0', '4', '8'):
                entry = {}
                for method in ('integrated', 'plugin'):
                    vals = [c[method][wait] for c in available]
                    k = sum(v['covered'] for v in vals)
                    entry[method] = {'count': len(vals), 'coverage': k/len(vals) if vals else None,
                                     'wilson95': wilson(k, len(vals))}
                    entry[method].update({key: float(np.mean([v[key] for v in vals])) if vals else None
                                          for key in ('intervalScore', 'width', 'bias')})
                effects = np.array([c['integrated'][wait]['intervalScore']-c['plugin'][wait]['intervalScore'] for c in available])
                delta = float(effects.mean()) if len(effects) else None
                half = 1.959963984540054 * float(effects.std(ddof=1)) / math.sqrt(len(effects)) if len(effects)>1 else None
                ci = entry['integrated']['wilson95']
                entry.update(pairedScoreDifference=delta, pairedNormal95=[delta-half, delta+half] if half is not None else None,
                             billCoveragePass=bool(ci and .7<=entry['integrated']['coverage']<=.9 and ci[0]<=.8<=ci[1]),
                             scorePass=bool(delta is not None and delta <= .05 * entry['plugin']['intervalScore']))
                record['waits'][wait] = entry
            record['marginalCoverage'] = {key: {'count': len(available), 'coverage': float(np.mean([c['marginalCoverage'][key] for c in available])) if available else None}
                                           for key in (f'{h}:{c}' for h in (4, 8, 12) for c in (0, 1))}
            groups.append(record)
    matched = [g for g in groups if g['arm'] == 'matched']
    return {'groups': groups, 'availabilityPass': all(g['availabilityPass'] for g in groups),
            'matchedScreenPass': all(w['billCoveragePass'] and w['scorePass'] for g in matched for w in g['waits'].values()),
            'historicalEligibility': 'unsupported', 'productionActivation': False,
            'fullFinancialQualification': 'not-evaluated', 'oldModelSuperiority': 'not-evaluated'}


def identities():
    paths = ['docs/separable-cost-study-protocol.md', 'scripts/separable_cost_predictive.py',
             'scripts/run_separable_cost_study.py', 'scripts/revision_cost_predictive.py',
             'scripts/revision_cost_estimator.py']
    return {p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    import scipy
    toolchain = {'python': sys.version.split()[0], 'numpy': np.__version__, 'scipy': scipy.__version__}
    start = time.monotonic()
    cells = []
    for arm in ARMS:
        for depth in (3, 7, 12):
            for seed in range(2026112301, 2026112365):
                cells.append(cell(seed, depth, arm))
            print(f'{arm} depth {depth}: {sum(c["status"]=="available" for c in cells[-64:])}/64 available', flush=True)
    output = {'method': METHOD, 'protocolCommit': PROTOCOL_COMMIT, 'sourceHashes': identities(),
              'toolchain': toolchain, 'biasDefinition': 'finite 2048-draw mean bill error; not a predictive expectation (exp Student-t has infinite mean)',
              'cells': cells, 'summary': summary(cells)}
    encoded = json.dumps(output, indent=2, sort_keys=True, allow_nan=False) + '\n'
    if args.verify:
        previous = json.loads(OUTPUT.read_text())
        # Full recalculation; no completion cache. Numeric tolerance only handles
        # independently repeated floating arithmetic, never changes screen gates.
        if previous != output:
            raise SystemExit('Exact full study reproduction mismatch')
    else:
        if OUTPUT.exists():
            raise SystemExit('Refusing to overwrite existing fresh study')
        OUTPUT.write_text(encoded)
    print(json.dumps(output['summary'], indent=2), flush=True)
    print(f'Completed {len(cells)} cells in {time.monotonic()-start:.1f}s', flush=True)


if __name__ == '__main__':
    main()
