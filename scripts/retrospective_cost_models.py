"""Finite-support paired-growth forecasts for revised-data research only.

The outputs are future ANNUAL nominal gross increments, not cumulative prices.
Neither model identifies latent economic/reporting-error variance components.
"""
import hashlib
import math

import numpy as np

METHOD = 'revised-paired-growth-1.0.0'
MIN_TRANSITIONS = 3
BLOCK_LENGTH = 2
PHI = 0.5
KAPPA = 20.0
RHO_BOUND = 0.5


def _segments(rows):
    """Indices in contiguous (group, calendar-year) sequences."""
    result = []
    for i, (group, year) in enumerate(rows):
        if i == 0 or group != rows[i - 1][0] or year != rows[i - 1][1] + 1:
            result.append([])
        result[-1].append(i)
    return result


def fit(records, origin, excluded_unitids=()):
    """Fit one sector using paired positive origin-or-earlier level records.

    Input fields: unitid, year, tuition, housing, deflator. Future rows are
    removed before any price validation or calculation. Explicit withheld IDs
    are removed from every fitted quantity, including school states.
    """
    if not isinstance(origin, (int, np.integer)):
        raise ValueError('Origin must be an integer academic year')
    excluded = {str(value) for value in excluded_unitids}
    grouped = {}
    for record in records:
        year = record['year']
        if not isinstance(year, (int, np.integer)):
            raise ValueError('Academic year must be integer')
        if year > origin:
            continue
        unitid = str(record['unitid'])
        if unitid in excluded:
            continue
        values = np.array([record[k] for k in ('tuition', 'housing', 'deflator')], dtype=float)
        if not np.isfinite(values).all() or not (values > 0).all():
            raise ValueError('Paired training prices and deflator must be positive finite')
        key = (unitid, int(year))
        if key in grouped:
            raise ValueError('Duplicate training institution-year')
        grouped[key] = values
    transitions = []
    for (unitid, year), current in sorted(grouped.items()):
        previous = grouped.get((unitid, year - 1))
        if previous is None:
            continue
        nominal = np.log(current[:2]) - np.log(previous[:2])
        inflation = math.log(current[2]) - math.log(previous[2])
        transitions.append((unitid, year, np.r_[nominal - inflation, inflation]))
    years = sorted({row[1] for row in transitions})
    if len(years) < MIN_TRANSITIONS:
        raise ValueError('At least three distinct training transition years required')
    common = []
    for year in years:
        values = np.array([v for _, y, v in transitions if y == year])
        if not np.allclose(values[:, 2], values[0, 2], rtol=0, atol=1e-12):
            raise ValueError('Training institutions disagree on calendar CPI')
        common.append(values.mean(axis=0))
    common = np.asarray(common)
    mu = common.mean(axis=0)
    by_year = {year: common[i, :2] for i, year in enumerate(years)}
    residual_rows = [(unitid, year, value[:2] - by_year[year])
                     for unitid, year, value in transitions]
    residuals = np.array([r[2] for r in residual_rows])
    row_lookup = {(unitid, year): value for unitid, year, value in residual_rows}
    adjacent = [(row_lookup[(unitid, year - 1)], value)
                for unitid, year, value in residual_rows if (unitid, year - 1) in row_lookup]
    rho = np.zeros(2)
    if adjacent:
        previous = np.array([r[0] for r in adjacent])
        current = np.array([r[1] for r in adjacent])
        variance = np.mean(residuals ** 2, axis=0)
        denominator = np.sum(previous ** 2, axis=0) + KAPPA * variance
        np.divide(np.sum(previous * current, axis=0), denominator, out=rho, where=denominator > 0)
        rho = np.clip(rho, -RHO_BOUND, RHO_BOUND)
    states = {}
    for unitid, year, value in residual_rows:
        state = states.setdefault(unitid, {'n': 0})
        state.update(n=state['n'] + 1, last_year=year, last_residual=value)
    return {
        'method': METHOD, 'origin': int(origin), 'years': years,
        'mu': mu, 'recent_delta': common[-3:, :2].mean(axis=0) - mu[:2],
        'rho': rho, 'school_states': states,
        'common_vectors': common - mu,
        'common_segments': _segments([('sector', year) for year in years]),
        'school_vectors': residuals,
        'school_segments': _segments([(u, y) for u, y, _ in residual_rows]),
        'training_institutions': len(states), 'training_transitions': len(transitions),
        'max_training_year': max(years),
    }


def _sample_blocks(vectors, segments, horizon, trials, rng):
    """Circular block bootstrap within a contiguous training segment.

    Each block starts uniformly over all observed vectors. Wrapping within its
    own segment is a bootstrap assumption, not an observed calendar transition.
    It preserves exact empirical one-step marginals, including short segments.
    """
    vectors = np.asarray(vectors, dtype=float)
    if not len(vectors) or not segments:
        raise ValueError('Nonempty empirical bootstrap support required')
    if sorted(i for segment in segments for i in segment) != list(range(len(vectors))):
        raise ValueError('Bootstrap segments must partition the empirical vectors')
    next_index = np.empty(len(vectors), dtype=int)
    for segment in segments:
        for position, index in enumerate(segment):
            next_index[index] = segment[(position + 1) % len(segment)]
    output = np.empty((trials, horizon, vectors.shape[1]))
    for h in range(0, horizon, BLOCK_LENGTH):
        indices = rng.integers(0, len(vectors), size=trials)
        for offset in range(min(BLOCK_LENGTH, horizon - h)):
            output[:, h + offset] = vectors[indices]
            indices = next_index[indices]
    return output


def _seed(seed, school_key):
    identity = hashlib.sha256(str(school_key).encode('utf-8')).digest()
    return (int(seed) ^ int.from_bytes(identity[:8], 'little')) & ((1 << 64) - 1)


def forecast_pair(fitted, unitid, horizon, trials=400, seed=850213, school_key=None):
    """Return matched annual gross increment arrays [trial, future year, 2].

    The no-real-growth reference retains the identical CPI draw and adds no
    real component drift or school noise. B2 and C1 retain all paired noise.
    """
    if not isinstance(horizon, (int, np.integer)) or horizon < 1:
        raise ValueError('Positive integer forecast horizon required')
    if not isinstance(trials, (int, np.integer)) or trials < 1:
        raise ValueError('Positive integer trial count required')
    if school_key is None:
        if unitid is None:
            raise ValueError('Unknown school requires an explicit stable school_key')
        school_key = str(unitid)
    common_rng = np.random.default_rng(int(seed))
    school_rng = np.random.default_rng(_seed(seed, school_key))
    mu = fitted['mu']
    centered = fitted['common_vectors']
    # IID YEAR means, not length-N circular blocks (which degenerate at N=3).
    mean_indices = common_rng.integers(0, len(centered), size=(trials, len(centered)))
    mean_uncertainty = centered[mean_indices].mean(axis=1)
    common = _sample_blocks(centered, fitted['common_segments'], horizon, trials, common_rng)
    individual = _sample_blocks(fitted['school_vectors'], fitted['school_segments'],
                                horizon, trials, school_rng)
    shared = mu[None, None, :] + mean_uncertainty[:, None, :] + common
    baseline_log = shared[:, :, :2] + shared[:, :, 2, None] + individual
    h = np.arange(1, horizon + 1)[:, None]
    adjustment = PHI ** h * fitted['recent_delta'][None, :]
    state = fitted['school_states'].get(str(unitid)) if unitid is not None else None
    if state is not None:
        gap = fitted['origin'] - state['last_year']
        if gap < 0:
            raise ValueError('School state exceeds origin')
        adjustment = adjustment + (state['n'] / (state['n'] + KAPPA)
            * fitted['rho'][None, :] ** (h + gap) * state['last_residual'][None, :])
    candidate_log = baseline_log + adjustment[None, :, :]
    with np.errstate(over='raise', invalid='raise', under='raise'):
        try:
            baseline = np.exp(baseline_log)
            candidate = np.exp(candidate_log)
            no_real = np.broadcast_to(np.exp(shared[:, :, 2, None]), baseline.shape).copy()
        except FloatingPointError as error:
            raise ValueError('Nonfinite or underflowed predictive increment') from error
    if not all(np.isfinite(p).all() and (p > 0).all() for p in (baseline, candidate, no_real)):
        raise ValueError('Invalid predictive increments')
    return {'B2': baseline, 'C1': candidate, 'no-real-growth': no_real}


def forecast(fitted, unitid, horizon, trials=400, seed=850213, candidate='B2', school_key=None):
    if candidate not in ('B2', 'C1', 'no-real-growth'):
        raise ValueError('Unknown paired-growth method')
    return forecast_pair(fitted, unitid, horizon, trials, seed, school_key)[candidate]
