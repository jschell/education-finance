# Coverage failure attribution — retained evidence only

2026-11-18 America/Los_Angeles. This is a diagnostic review of the completed
`separable-cost-1.0.0` study, not a new candidate, experiment or qualification.
No new worlds were scored. Existing failed gates, source bytes and all 960 cell
records remain unchanged.

## What the retained failures show

The matched-process four-year bill screen fails at three transitions/wait zero:
59/64 covered (0.921875; Wilson 95% 0.829805–0.966169), and at twelve
transitions/wait eight: 43/64 covered (0.671875; Wilson 95%
0.549991–0.774294). These are opposite miss directions. They do not identify a
single multiplicative width correction.

If 64 independent worlds each had exact 80% marginal coverage, the one-sided
binomial probabilities would be P(K>=59)=0.00673015 and
P(K<=43)=0.01095270. Those probabilities describe individual comparisons under
a specific null, not posterior probabilities of a coding defect. Nine matched
bill checks share worlds, and depths/horizons have overlapping simulation
streams. Do not multiply the probabilities as if the checks were independent,
or use multiple-comparison reasoning to erase the frozen failed gates.

Retained analytical marginal coverage also varies in both directions:

| Transitions | Horizon | Tuition covered / 64 | Housing covered / 64 |
|---:|---:|---:|---:|
| 3 | 4 | 57 | 54 |
| 3 | 8 | 55 | 54 |
| 3 | 12 | 53 | 52 |
| 7 | 4 | 50 | 52 |
| 7 | 8 | 52 | 47 |
| 7 | 12 | 46 | 47 |
| 12 | 4 | 51 | 51 |
| 12 | 8 | 49 | 47 |
| 12 | 12 | 51 | 49 |

## Algebra and implementation checks

The independent innovation-loading Gram construction checks the historical row
covariance K, historical/future cross covariance and future latent-change
covariance without calling estimator kernel functions. A separate diffuse
Gaussian drift-limit check verifies the conditional mean and added drift
uncertainty. Whitened regression, frozen dense likelihood agreement, affine
transformations, full joint draw covariance and analytic Student-t versus
simulation checks also pass. This review found no new covariance, conditioning,
source-key, component-order or joint-draw implementation defect. Passing these
checks does not prove complete-bill calibration.

There is a small, explicit reference-posterior versus scalar frequentist-pivot
difference. Let n be the number of scalar contrast rows, with one fitted drift
column, and let nu=n-1. Under the matched Gaussian process, the whitened residual
scatter satisfies S~Wishart(Q,nu). The GLS future prediction error is independent
of S, with row covariance R. For an individual future scalar component c,

    (Z_jc - prediction_jc) / sqrt(R_jj * S_cc / nu) ~ t_nu.

The frozen two-component reference posterior instead uses a marginal
`t_(nu-1)` with squared scale `R_jj*S_cc/(nu-1)`. Its scalar intervals are therefore
slightly conservative under repeated matched-process sampling. This follows
from the chosen prior and is not an implementation error.

| Transitions | nu | Posterior/scalar-pivot interval-width ratio | Exact scalar repeated-world coverage |
|---:|---:|---:|---:|
| 3 | 55 | 1.009444 | 0.804152 |
| 7 | 119 | 1.004276 | 0.801903 |
| 12 | 199 | 1.002539 | 0.801135 |

The coverage formula is
`2*t.cdf(t.ppf(.9,nu-1)*sqrt(nu/(nu-1)),nu)-1`.
This difference is less than half a percentage point at every depth and is
conservative. It cannot explain the observed long-wait undercoverage by itself.
Changing the prior or quantile degrees of freedom to match an inspected gate
would create a different candidate and would require a separate protocol and
untouched evaluation evidence.

A complete four-year bill is a sum of exponentials of a joint future path,
with different drift exposures by attendance year and two price components.
Scalar Student-t pivots do not supply an exact, nuisance-uniform repeated-world
coverage theorem for equal-tail intervals of that nonlinear sum. Correct
posterior algebra and finite simulated quantiles alone cannot establish that
stronger theorem. This distinction prevents attributing either failed bill
gate solely to the small scalar reference-prior difference.

## Reproduce the analytic diagnostic

Using the pinned SciPy environment from the original study:

```python
from math import sqrt
from scipy.stats import binom, t
print(binom.sf(58, 64, .8), binom.cdf(43, 64, .8))
for nu in (55, 119, 199):
    ratio = (t.ppf(.9, nu-1) / sqrt(nu-1)
             / (t.ppf(.9, nu) / sqrt(nu)))
    coverage = 2*t.cdf(t.ppf(.9, nu-1)*sqrt(nu/(nu-1)), nu)-1
    print(nu, ratio, coverage)
```

The marginal-count table is directly recoverable from
`data/calibration-diagnostics/separable-cost-study.json`,
`summary.groups[arm == "matched"].marginalCoverage`.

## Next action

No evidence-backed width, family-weight or seed change is justified by this
review. Preserve the stopped model and its failed screen. A future cause study
could precommit known-parameter oracle and drift-only controls to separate
finite-batch variation, parameter uncertainty and nonlinear bill targeting;
that would be attribution evidence, not a rescue of this screening batch.
The current plan's reporting-population and original-vintage evidence program
addresses a different, concrete historical-support barrier and can proceed
without claiming a model improvement that these results do not establish.
