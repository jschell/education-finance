"""Synthetic-only separable covariance posterior. No production adapter.

Method separable-cost-1.0.0: fixed equal four-family kernels; reference posterior.
"""
import numpy as np
from scipy.linalg import block_diag, cho_factor, cho_solve
from scipy.stats import invwishart, t
from revision_cost_estimator import ObservationLikelihood, PHI

METHOD = 'separable-cost-1.0.0'


def fit(graph):
    if graph.get('kind') != 'synthetic':
        raise ValueError('Historical fitting blocked')
    base = ObservationLikelihood(graph)
    # Exact existing per-school offset contrasts, with scalar row coordinates.
    ys = [b['y'].reshape(-1, 2) for b in base.blocks]
    xs = [b['x'][::2, ::2] for b in base.blocks]
    js = [b['j'][::2, ::2] for b in base.blocks]
    independent = [sum(b['temporal']) for b in base.blocks]
    j = np.concatenate(js)
    k = block_diag(*independent) + j @ j.T
    y = np.concatenate(ys)
    x = np.concatenate(xs)
    out = posterior(y, x, k)
    return {**out, 'base': base, 'method': METHOD,
            'historicalFittingBlocked': True, 'transitions': base.steps}


def posterior(y, x, k):
    """GLS sufficient statistics; one unbounded drift vector, two outcomes."""
    y, x, k = (np.asarray(v, dtype=float) for v in (y, x, k))
    if (y.ndim != 2 or y.shape[1] != 2 or x.shape != (len(y), 1)
            or k.shape != (len(y), len(y)) or not all(np.isfinite(v).all() for v in (y, x, k))):
        raise ValueError('Invalid finite paired regression inputs')
    if not np.allclose(k, k.T, atol=1e-12, rtol=0):
        raise ValueError('Asymmetric row covariance')
    nu = len(y) - 1
    if nu <= 3:
        raise ValueError('Posterior propriety/finite-mean unsupported')
    cf = cho_factor(k, lower=True)
    kix = cho_solve(cf, x)
    information = float((x.T @ kix).item())
    if not information > 0:
        raise ValueError('Unsupported drift information')
    v = 1 / information
    b = v * (kix.T @ y)
    residual = y - x @ b
    scale = residual.T @ cho_solve(cf, residual)
    scale = (scale + scale.T) / 2
    # Both exact rank failure and numerically unsupported near rank failure close.
    eig = np.linalg.eigvalsh(scale)
    if eig[0] <= np.finfo(float).eps * max(1., eig[-1]) * len(y):
        raise ValueError('Singular posterior scale')
    np.linalg.cholesky(scale)
    return {'y': y, 'x': x, 'rowCovariance': k, 'factor': cf,
            'information': information, 'driftVariance': v, 'drift': b,
            'scale': scale, 'nu': nu, 'status': 'available'}


def future_rows(model, horizons=13, target=0):
    """Scalar future latent-change kernels and source-observation cross kernel."""
    if not isinstance(horizons, int) or not 2 <= horizons <= 14:
        raise ValueError('Unsupported horizon')
    base = model['base']
    if not isinstance(target, int) or not 0 <= target < base.schools:
        raise ValueError('Unsupported target')
    h = np.arange(horizons, dtype=float)
    minimum = np.minimum.outer(h, h)
    lam = PHI**h - 1
    temporary = (np.outer(lam, lam) + PHI**np.abs(h[:, None] - h[None, :])
                 * (1 - PHI**(2 * minimum))) / (1 - PHI**2)
    # Shared and permanent equal Q each; future reporting error is not a bill.
    kzz = 2 * minimum + temporary
    widths = [len(b['y']) // 2 for b in base.blocks]
    cross = np.zeros((horizons, sum(widths)))
    rows = base.blocks[target]['rows']
    times = np.array([r['academicYear'] - base.start for r in rows])
    contrasts = PHI**(base.steps - times[1:]) - PHI**(base.steps - times[0])
    left = sum(widths[:target])
    cross[:, left:left + widths[target]] = np.outer(lam, contrasts) / (1 - PHI**2)
    return h[:, None], cross, kzz


def conditional(model, horizons=13, target=0, integrate_drift=True):
    z, cross, kzz = future_rows(model, horizons, target)
    solve = lambda value: cho_solve(model['factor'], value)
    correction = z - cross @ solve(model['x'])
    mean = z @ model['drift'] + cross @ solve(model['y'] - model['x'] @ model['drift'])
    row = kzz - cross @ solve(cross.T)
    if integrate_drift:
        row += correction @ correction.T * model['driftVariance']
    row = (row + row.T) / 2
    return mean, row


def marginal_interval(model, horizon, component, mass=.8):
    if not isinstance(component, int) or component not in (0, 1) or horizon < 1:
        raise ValueError('Invalid marginal target')
    mean, row = conditional(model, horizon + 1)
    df = model['nu'] - 1
    scale = np.sqrt(row[horizon, horizon] * model['scale'][component, component] / df)
    return t.ppf([(1-mass)/2, (1+mass)/2], df) * scale + mean[horizon, component]


def draws(model, seed, count=2048, horizons=13, integrated=True):
    if not isinstance(count, int) or count < 2:
        raise ValueError('Invalid draw count')
    mean, row = conditional(model, horizons, integrate_drift=integrated)
    root = np.linalg.cholesky(row[1:, 1:])
    # Separate RNG streams give exact common normals between both methods.
    rng_q = np.random.default_rng(np.random.SeedSequence([int(seed), 0]))
    rng_z = np.random.default_rng(np.random.SeedSequence([int(seed), 1]))
    if integrated:
        cov = invwishart.rvs(df=model['nu'], scale=model['scale'], size=count, random_state=rng_q)
        qroot = np.linalg.cholesky(cov)
    else:
        qroot = np.broadcast_to(np.linalg.cholesky(model['scale'] / model['nu']), (count, 2, 2))
    normal = rng_z.standard_normal((count, horizons-1, 2))
    paired = np.einsum('nij,nkj->nik', normal, qroot)
    changes = np.zeros((count, horizons, 2))
    changes[:, 1:, :] = mean[None, 1:, :] + np.einsum('ij,njk->nik', root, paired)
    return changes
