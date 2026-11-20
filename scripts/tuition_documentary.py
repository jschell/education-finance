"""Bounded date-claimed tuition facts, never original-vintage/paired eligibility."""
import argparse
import datetime as dt
from functools import lru_cache
import json
from pathlib import Path
import subprocess
from source_evidence import ROOT, DEFAULT as SOURCE_PATH, verify_capture

METHOD = 'tuition-documentary-1.0.0'
REGISTRY = ROOT / 'data/research/tuition-documentary.json'
MEASURE = 'annual-gross-tuition-required-fees-lowest-reported-residency-FTFT-degree-certificate-undergraduate'
PROOF = 'date-claimed-documentary-fact'
CONFIG = {f'dfr-{y}-{u}': (y, u) for y in (2005, 2006) for u in (100654, 100663)}
FORBIDDEN = ('originalByteVintageVerified', 'historicalFitAuthorized', 'populationBridgeAuthorized',
             'productionActivation', 'fullPairedHistorySupported')


@lru_cache(maxsize=16)
def page_text(path, sha256, page):
    # Hash has already been independently verified; key prevents stale-byte reuse.
    return ' '.join(subprocess.check_output(['pdftotext', '-f', str(page), '-l', str(page),
                                             '-layout', str(path), '-'], text=True).split())


def independently_reviewed(review):
    if not isinstance(review, dict) or review.get('state') != 'approved':
        return False
    author, reviewer = review.get('author'), review.get('reviewer')
    return bool(isinstance(author, str) and isinstance(reviewer, str) and author.strip() and reviewer.strip()
                and author.strip().casefold() != reviewer.strip().casefold())


def _derive(registry, root=ROOT):
    if (registry.get('method') != METHOD or registry.get('measure') != MEASURE
            or registry.get('proofLevel') != PROOF
            or any(registry.get(k) is not False for k in FORBIDDEN)):
        raise ValueError('Unsupported measure/proof/activation claim')
    source = json.loads((root / SOURCE_PATH.relative_to(ROOT)).read_text())
    if registry.get('policyEvidence') != source['policyReview']:
        raise ValueError('Preservation guidance claim changed or overstated')
    captures = {c['id']: c for c in source['captures']}
    reports = registry.get('reports', [])
    ids = [r['captureId'] for r in reports]
    if len(ids) != len(CONFIG) or set(ids) != set(CONFIG):
        raise ValueError('Missing, duplicate or unknown fixed report')
    slots = {}
    for report in reports:
        cid = report['captureId']; year, unitid = CONFIG[cid]
        capture = verify_capture(captures[cid], root)
        if report.get('proofLevel', PROOF) != PROOF or any(report.get(k, False) is not False for k in FORBIDDEN):
            raise ValueError('Unsupported nested report proof claim')
        if (report.get('sha256') != capture['sha256'] or report.get('unitid') != unitid
                or report.get('reportYear') != year or report.get('figure') != 3
                or report.get('figurePage') != 3 or report.get('issueDatePage') != 2
                or report.get('measurePage') != 8 or report.get('series') != 'institution'
                or not independently_reviewed(report.get('review'))):
            raise ValueError('Unbound report provenance/series/review')
        try:
            printed = dt.datetime.strptime(report['issueDateText'], '%B %d, %Y').date()
            if printed.isoformat() != report['issueDate']:
                raise ValueError('Issue-date labels disagree')
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError('Malformed printed date claim') from exc
        path = root / capture['path']
        if report['issueDateText'] not in page_text(str(path), capture['sha256'], 2):
            raise ValueError('Issue date not bound to pinned letter page')
        methodology = page_text(str(path), capture['sha256'], 8).lower()
        if 'lowest tuition rate' not in methodology or 'full-time first-time' not in methodology:
            raise ValueError('Lowest-residency/cohort measure not bound to methodology')
        rows = report.get('slots', [])
        years = [r['academicYear'] for r in rows]
        if len(years) != 3 or set(years) != set(range(year-3, year)):
            raise ValueError('Missing, duplicate or unknown academic-year slot')
        for row in rows:
            if row.get('proofLevel', PROOF) != PROOF or any(row.get(k, False) is not False for k in FORBIDDEN):
                raise ValueError('Unsupported nested point proof claim')
            if not independently_reviewed(row.get('review')):
                raise ValueError('Missing independent point-label review')
            status = row.get('status'); amount = row.get('amount')
            if status == 'readable':
                if type(amount) is not int or amount < 0 or row.get('valueBasis') != 'visible-institution-point-label':
                    raise ValueError('Readable fact requires visible numeric institution label')
            elif status == 'unreadable':
                if amount is not None or not row.get('reason'):
                    raise ValueError('Unreadable slot must retain missing value/reason')
            else:
                raise ValueError('Unknown legibility state')
            slots[(cid, row['academicYear'])] = row
    comparisons = []
    for unitid in (100654, 100663):
        left, right = f'dfr-2005-{unitid}', f'dfr-2006-{unitid}'
        for year in (2003, 2004):
            a, b = slots[(left, year)], slots[(right, year)]
            state = 'unavailable' if any(v['status'] != 'readable' for v in (a, b)) else ('equal' if a['amount'] == b['amount'] else 'different')
            comparisons.append({'unitid': unitid, 'academicYear': year, 'leftReport': left,
                                'rightReport': right, 'leftAmount': a['amount'], 'rightAmount': b['amount'],
                                'state': state, 'proofLevel': PROOF})
    summary = {'method': METHOD, 'reports': len(reports), 'expectedSlots': 12,
               'documentaryEligibleSlots': sum(v['status'] == 'readable' for v in slots.values()),
               'unreadableSlots': sum(v['status'] == 'unreadable' for v in slots.values()),
               'overlapPairs': 4, 'equalPairs': sum(c['state'] == 'equal' for c in comparisons),
               'differentPairs': sum(c['state'] == 'different' for c in comparisons),
               'unavailablePairs': sum(c['state'] == 'unavailable' for c in comparisons),
               'originalVintagePairs': 0, 'populationBridges': 0, 'pairedHistorySupported': False,
               'historicalFits': 0, 'productionActivation': False}
    return comparisons, summary


def derive(registry, root=ROOT):
    try:
        return _derive(registry, root)
    except (KeyError, TypeError, OSError, subprocess.SubprocessError) as exc:
        raise ValueError('Malformed documentary record or unavailable proof extraction') from exc


def validate(registry, root=ROOT):
    comparisons, summary = derive(registry, root)
    if registry.get('comparisons') != comparisons or registry.get('summary') != summary:
        raise ValueError('Recorded documentary comparison/summary mismatch')
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('path', nargs='?', type=Path, default=REGISTRY)
    args = parser.parse_args()
    print(json.dumps(validate(json.loads(args.path.read_text())), indent=2))


if __name__ == '__main__':
    main()
