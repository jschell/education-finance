"""Frozen near-entry bill-only conditional empirical benchmark; no annual path."""
import math

import numpy as np

from retrospective_inputs import identity_hash

METHOD = 'conditional-empirical-four-year-bill-1.0.0'
PROBABILITIES = (0.1, 0.5, 0.9)
MIN_ORIGINS = 3


def predict(records, anchor, outerorigin, training_cutoff, test_unitids=()):
    """Use only observed CAL-role labels completed strictly before the origin.

    The caller supplies one sector's earlier, origin-selected CAL label bank.
    Every historical origin receives equal base mass, every institution within
    that origin equal mass. Conditional Gaussian weighting is relative to this
    base, with 20% pooled mass. The inverse CDF uses the first cumulative mass
    at or above each probability. TEST/invalid CAL roles fail closed rather
    than being silently admitted. Future labels are ignored before validation.
    """
    if not isinstance(outerorigin, (int, np.integer)) or not isinstance(training_cutoff, (int, np.integer)) or training_cutoff > outerorigin:
        raise ValueError('Integer origin and cutoff <= origin required')
    target = np.asarray(anchor, dtype=float)
    if target.shape != (2,) or not np.isfinite(target).all() or (target <= 0).any():
        raise ValueError('Positive finite paired origin anchor required')
    excluded = {int(unitid) for unitid in test_unitids}
    admitted, seen, sectors, counts = [], set(), set(), {}
    for record in records:
        last = record['lastBillYear']
        if not isinstance(last, (int, np.integer)):
            raise ValueError('Integer last bill year required')
        if last >= outerorigin or last > training_cutoff:
            continue
        origin = record['labelOrigin']
        if not isinstance(origin, (int, np.integer)) or origin < 2003 or last != origin + 3:
            raise ValueError('Four-year near-entry label identity required')
        unitid = int(record['unitid'])
        if unitid in excluded or identity_hash(unitid) % 5 != 1:
            raise ValueError('TEST or non-CAL identity in mature label bank')
        sector = str(record['sector'])
        key = (sector, unitid, origin)
        if key in seen:
            raise ValueError('Duplicate institution/origin bill label')
        seen.add(key); sectors.add(sector)
        status = str(record['status'])
        counts[status] = counts.get(status, 0) + 1
        if status != 'observed':
            continue
        prices = np.asarray(record['anchor'], dtype=float)
        bill = float(record['bill'])
        if prices.shape != (2,) or not np.isfinite(prices).all() or (prices <= 0).any() or not math.isfinite(bill) or bill <= 0:
            raise ValueError('Observed label requires finite positive prices/bill')
        admitted.append((origin, unitid, np.log(prices), math.log(bill / (4 * prices.sum()))))
    if len(sectors) > 1:
        raise ValueError('Predict one sector at a time')
    years = sorted({row[0] for row in admitted})
    result = {'method': METHOD, 'origin': int(outerorigin), 'training_cutoff': int(training_cutoff),
              'label_origins': years, 'observed_labels': len(admitted), 'status_counts': counts}
    if len(years) < MIN_ORIGINS:
        return {**result, 'status': 'unsupported-insufficient-mature-origins'}
    admitted.sort(key=lambda row: (row[0], row[1]))
    per_year = {year: sum(row[0] == year for row in admitted) for year in years}
    base = np.asarray([1 / (len(years) * per_year[row[0]]) for row in admitted])
    features = np.asarray([row[2] for row in admitted])
    mean = np.sum(base[:, None] * features, axis=0)
    scale = np.maximum(np.sqrt(np.sum(base[:, None] * (features - mean) ** 2, axis=0)), .25)
    distance = np.sum(((features - np.log(target)) / scale) ** 2, axis=1)
    conditional = base * np.exp(-.5 * distance)
    if conditional.sum() == 0:
        conditional = base.copy()
    else:
        conditional /= conditional.sum()
    weights = .8 * conditional + .2 * base
    ratios = np.asarray([row[3] for row in admitted])
    order = np.argsort(ratios, kind='stable')
    cumulative = np.cumsum(weights[order])
    cumulative[-1] = 1.0
    quantiles = [float(4 * target.sum() * np.exp(ratios[order[np.searchsorted(cumulative, q, side='left')]])) for q in PROBABILITIES]
    finite_mean = float(4 * target.sum() * np.sum(weights * np.exp(ratios)))
    if not np.isfinite(quantiles).all() or not math.isfinite(finite_mean):
        raise ValueError('Nonfinite bill prediction')
    return {**result, 'status': 'available', 'p10': quantiles[0], 'p50': quantiles[1], 'p90': quantiles[2],
            'mean': finite_mean, 'feature_scale': scale.tolist(),
            'label_weights': [{'labelOrigin': row[0], 'unitid': row[1], 'base': float(b), 'weight': float(w)}
                              for row, b, w in zip(admitted, base, weights)]}
