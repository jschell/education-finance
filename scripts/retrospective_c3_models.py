"""Calendar-weighted joint location/scale calibration of annual C2 log paths.

This is a fixed development hypothesis, not a conformal coverage guarantee.
Every category and school type uses the same rule; no enrollment wait enters.
"""
import numpy as np
from retrospective_inputs import identity_hash

METHOD = 'annual-prequential-location-scale-1.0.0'
MAX_YEARS = 5
MIN_YEARS = 3
PRIOR_YEARS = 5.0


def calibrate(records, outerorigin, training_cutoff):
    """Use the last five mature, cutoff-admissible annual target years.

    Records contain targetYear, unitid, sector, error[2] and variance[2]. Error
    is observed nominal log growth minus the earlier C2 simulation mean log
    growth; variance uses the same 512 draws and ddof=0. A year gets one unit
    of weight regardless of its number of observed pseudo-target institutions.
    """
    if not isinstance(outerorigin, (int, np.integer)) or not isinstance(training_cutoff, (int, np.integer)):
        raise ValueError('Integer origin/cutoff required')
    if training_cutoff > outerorigin:
        raise ValueError('Training cutoff cannot exceed origin')
    admitted = []
    for record in records:
        year = record['targetYear']
        if not isinstance(year, (int, np.integer)):
            raise ValueError('Integer annual target year required')
        if year >= outerorigin or year > training_cutoff:
            continue
        admitted.append(record)
    years = sorted({int(r['targetYear']) for r in admitted})[-MAX_YEARS:]
    admitted = [r for r in admitted if r['targetYear'] in years]
    admitted.sort(key=lambda r: (int(r['targetYear']), str(r['sector']), str(r['unitid'])))
    seen, sectors, by_year = set(), set(), {}
    for record in admitted:
        if identity_hash(record['unitid']) % 5 == 0:
            raise ValueError('Withheld identity cannot enter calibration')
        key = (str(record['sector']), str(record['unitid']), int(record['targetYear']))
        if key in seen:
            raise ValueError('Duplicate annual calibration institution/target')
        seen.add(key); sectors.add(str(record['sector']))
        error, variance = (np.asarray(record[k], dtype=float) for k in ('error', 'variance'))
        if error.shape != (2,) or variance.shape != (2,) or not np.isfinite(error).all() or not np.isfinite(variance).all() or (variance < 0).any():
            raise ValueError('Finite paired errors and nonnegative variances required')
        by_year.setdefault(int(record['targetYear']), []).append((error, variance))
    if len(sectors) > 1:
        raise ValueError('One sector per calibration fit required')
    result = {'method': METHOD, 'targetYears': years, 'nYears': len(years),
              'recordCount': len(admitted), 'sector': next(iter(sectors), None),
              'outerOrigin': int(outerorigin), 'trainingCutoff': int(training_cutoff)}
    if len(years) < MIN_YEARS:
        return {**result, 'status': 'identity-fallback', 'b': np.zeros(2), 'scale': np.ones(2)}
    denominator = PRIOR_YEARS + len(years)
    year_errors = [np.mean([error for error, _ in by_year[year]], axis=0) for year in years]
    bias = np.sum(year_errors, axis=0) / denominator
    ratios_by_year = []
    for year in years:
        ratios = []
        for error, variance in by_year[year]:
            residual = error - bias
            zero = variance == 0
            if np.any(zero & (residual != 0)):
                raise ValueError('Zero forecast variance with nonzero calibration residual')
            ratio = np.ones(2)
            np.divide(residual ** 2, variance, out=ratio, where=~zero)
            if not np.isfinite(ratio).all():
                raise ValueError('Nonfinite standardized calibration residual')
            ratios.append(ratio)
        ratios_by_year.append(np.mean(ratios, axis=0))
    scale_squared = (PRIOR_YEARS + np.sum(ratios_by_year, axis=0)) / denominator
    scale = np.sqrt(scale_squared)
    if not np.isfinite(bias).all() or not np.isfinite(scale).all() or not (scale > 0).all():
        raise ValueError('Invalid location/scale calibration')
    return {**result, 'status': 'available', 'b': bias, 'scale': scale}


def apply(paths, calibration):
    """Transform annual log increments; origin anchor levels remain external."""
    gross = np.asarray(paths, dtype=float)
    if gross.ndim != 3 or gross.shape[2] != 2 or gross.shape[0] < 1 or gross.shape[1] < 1 or not np.isfinite(gross).all() or not (gross > 0).all():
        raise ValueError('Positive finite paired annual paths required')
    if calibration.get('status') not in ('available', 'identity-fallback'):
        raise ValueError('Unavailable annual calibration')
    bias, scale = (np.asarray(calibration[k], dtype=float) for k in ('b', 'scale'))
    if bias.shape != (2,) or scale.shape != (2,) or not np.isfinite(bias).all() or not np.isfinite(scale).all() or not (scale > 0).all():
        raise ValueError('Finite bias and positive paired scale required')
    # An exact identity fallback preserves original finite sample output bytes.
    if np.array_equal(bias, np.zeros(2)) and np.array_equal(scale, np.ones(2)):
        return gross.copy()
    log_paths = np.log(gross)
    center = log_paths.mean(axis=0, keepdims=True)
    transformed = center + bias[None, None, :] + scale[None, None, :] * (log_paths - center)
    with np.errstate(over='raise', under='raise', invalid='raise'):
        try:
            result = np.exp(transformed)
        except FloatingPointError as error:
            raise ValueError('Nonfinite or underflowed calibrated increment') from error
    if not np.isfinite(result).all() or not (result > 0).all():
        raise ValueError('Invalid calibrated increments')
    return result
