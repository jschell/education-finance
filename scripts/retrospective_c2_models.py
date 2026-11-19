"""Anchored nominal growth-state follow-up; revised-data development only.

The 4%/3% anchors specify nominal LOG centers, not arithmetic expected growth.
They are inherited policy assumptions, not fitted historical truths. The
original B2/C1 implementation and all its outputs are preserved unchanged.
"""
import numpy as np

from retrospective_cost_models import fit, forecast_pair as original_forecast_pair, PHI, KAPPA

METHOD = 'anchored-nominal-growth-state-1.0.0'
NOMINAL_ANCHOR = np.log1p(np.array([.04, .03]))


def _mean_uncertainty_nominal(fitted, trials, seed):
    """Reproduce the original first RNG draw without changing its noise stream."""
    centered = fitted['common_vectors']
    rng = np.random.default_rng(int(seed))
    indices = rng.integers(0, len(centered), size=(trials, len(centered)))
    delta = centered[indices].mean(axis=1)
    return delta[:, :2] + delta[:, 2, None]


def _log_adjustment(fitted, unitid, horizon, trials, seed):
    """Add this to original B2 log increments to obtain the fixed C2 law."""
    mu = fitted['mu']
    nominal_mu = mu[:2] + mu[2]
    recent = (fitted['common_vectors'][-3:] + mu).mean(axis=0)
    recent_nominal = recent[:2] + recent[2]
    delta = _mean_uncertainty_nominal(fitted, trials, seed)
    h = np.arange(1, horizon + 1)[:, None]
    decay = PHI ** h
    adjustment = (NOMINAL_ANCHOR - nominal_mu)[None, None, :] \
        + decay[None, :, :] * (recent_nominal - NOMINAL_ANCHOR)[None, None, :] \
        + (decay[None, :, :] - 1) * delta[:, None, :]
    state = fitted['school_states'].get(str(unitid)) if unitid is not None else None
    if state is not None:
        gap = fitted['origin'] - state['last_year']
        if gap < 0:
            raise ValueError('School state exceeds origin')
        adjustment = adjustment + (state['n'] / (state['n'] + KAPPA)
            * fitted['rho'][None, :] ** (h + gap) * state['last_residual'][None, :])[None, :, :]
    return adjustment


def forecast_pair(fitted, unitid, horizon, trials=400, seed=850213, school_key=None):
    """Return unchanged B2/C1/CPI references plus coherent annual C2 increments.

    C2 reuses exactly their common-calendar and paired-school empirical draws.
    Only the conditional nominal mean/parameter state changes. No wait, bill
    target, realized outcome, source score or horizon-specific switch enters.
    """
    paths = original_forecast_pair(fitted, unitid, horizon, trials, seed, school_key)
    adjustment = _log_adjustment(fitted, unitid, horizon, trials, seed)
    with np.errstate(over='raise', invalid='raise', under='raise'):
        try:
            candidate = np.exp(np.log(paths['B2']) + adjustment)
        except FloatingPointError as error:
            raise ValueError('Nonfinite or underflowed anchored-state increment') from error
    if not np.isfinite(candidate).all() or not (candidate > 0).all():
        raise ValueError('Invalid anchored-state predictive increments')
    return {**paths, 'C2': candidate}


def forecast(fitted, unitid, horizon, trials=400, seed=850213, candidate='C2', school_key=None):
    if candidate not in ('B2', 'C1', 'no-real-growth', 'C2'):
        raise ValueError('Unknown anchored-state comparison method')
    return forecast_pair(fitted, unitid, horizon, trials, seed, school_key)[candidate]
