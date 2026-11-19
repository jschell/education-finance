"""Cutoff-isolated revised AY3 research inputs; not original-vintage evidence."""
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SECTORS = {'public4': (1, 'CHG2AY3'), 'public4out': (1, 'CHG3AY3'),
           'public2': (4, 'CHG2AY3'), 'public2out': (4, 'CHG3AY3'),
           'private4': (2, 'CHG2AY3')}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def identity_hash(unitid):
    return ((int(unitid) ^ 0x9e3779b9) * 0x85ebca6b) & 0xffffffff


def load_data(root=ROOT):
    table = {}
    with gzip.open(root / 'data/raw/ipeds/selected.csv.gz', 'rt', newline='') as stream:
        for row in csv.DictReader(stream):
            unitid, year = int(row['UNITID']), int(row['YEAR'])
            if year in table.setdefault(unitid, {}):
                raise ValueError('Duplicate institution-year')
            table[unitid][year] = row
    cpi = {}
    with (root / 'data/raw/cpi.csv').open(newline='') as stream:
        for row in csv.DictReader(stream):
            month, day, year = map(int, row['date'].split('/'))
            if month == 8:
                cpi[year] = float(row['CPI'])
    return table, cpi


def price_at(table, unitid, year, sector):
    row = table.get(unitid, {}).get(year)
    if row is None:
        return {'status': 'missing-school-row'}
    raw, field = SECTORS[sector]
    if int(row['SECTOR']) != raw:
        return {'status': 'changed-sector'}
    try:
        tuition, housing = float(row[field]), float(row['CHG5AY3'])
    except (ValueError, TypeError):
        return {'status': 'missing-positive-price'}
    if not (math.isfinite(tuition) and math.isfinite(housing) and tuition > 0 and housing > 0):
        return {'status': 'missing-positive-price'}
    return {'status': 'observed', 'tuition': tuition, 'housing': housing}


def cohort_at(table, origin, sector, sample=6, fit_cap=200):
    eligible = []
    for unitid in table:
        if all(price_at(table, unitid, year, sector)['status'] == 'observed' for year in range(2000, origin+1)):
            eligible.append(unitid)
    eligible.sort(key=lambda u: (identity_hash(u), u))
    withheld = [u for u in eligible if identity_hash(u) % 5 == 0]
    fit_ids = [u for u in eligible if identity_hash(u) % 5 != 0][:fit_cap]
    known, unknown = fit_ids[:sample], withheld[:sample]
    anchors = {str(u): price_at(table, u, origin, sector) for u in known+unknown}
    return {'fit_ids': fit_ids, 'known_ids': known, 'unknown_ids': unknown,
            'withheld_ids': withheld, 'anchors': anchors, 'eligible_count': len(eligible)}


def context(table, cpi, origin, sector, lag=0, selection=None):
    """For lag tests pass the frozen origin-known selection/anchors explicitly.

    The lag sensitivity holds those supplied observables fixed and changes only
    training information. It is not a claim about original publication dates.
    """
    if origin < 2003 or origin > 2020 or lag not in (0, 1):
        raise ValueError('Outside frozen origin/lag grid')
    selected = cohort_at(table, origin, sector) if selection is None else selection
    cutoff = origin-lag
    records = []
    for unitid in selected['fit_ids']:
        if identity_hash(unitid) % 5 == 0:
            raise ValueError('Withheld identity in training pool')
        for year in range(2000, cutoff+1):
            price = price_at(table, unitid, year, sector)
            if price['status'] != 'observed' or not cpi.get(year, 0) > 0:
                raise ValueError('Missing admitted training price/CPI')
            records.append({'unitid': unitid, 'year': year, 'tuition': price['tuition'],
                            'housing': price['housing'], 'deflator': cpi[year]})
    payload = {'origin': origin, 'training_cutoff': cutoff, 'sector': sector, 'lag': lag,
               'selection': selected, 'records': records}
    payload['input_sha256'] = digest(payload)
    return payload


def outcome(table, unitid, origin, wait, sector):
    last = origin+wait+3
    if last > 2023:
        return {'status': 'unreached-window', 'lastBillYear': last}
    levels = []
    for year in range(origin, last+1):
        price = price_at(table, unitid, year, sector)
        if price['status'] != 'observed':
            return {'status': price['status'], 'missingYear': year, 'lastBillYear': last}
        levels.append([price['tuition'], price['housing']])
    total = sum(sum(p) for p in levels[wait:wait+4])
    return {'status': 'observed', 'lastBillYear': last, 'total': total}
