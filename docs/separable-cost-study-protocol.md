# Separable covariance study — frozen protocol

2026-11-18 America/Los_Angeles. Research method `separable-cost-1.0.0`.
Commit this document before implementation or fresh outcomes. This is a separate
synthetic screening study, not a retuning of the rejected complete evaluation.
All earlier sources, artifacts, seeds, gates and the rejection stay unchanged.
No historical fit, production integration or financial-default change is allowed.

## Hypothesis and restriction

The failed twelve-coordinate covariance search motivates a smaller comparator:
set all four paired innovation covariances equal to a single positive-definite
2x2 matrix Q. Keep the existing shared-year, permanent-school, AR(.5) temporary
and exact source-observation kernels. Equal weights are fixed before outcomes;
they are a simplifying assumption, not evidence of equal economic components.
This reduces twelve covariance coordinates to three. Differing family scales or
correlations become explicit misspecification, rather than estimated quantities.

The observation contrast matrix follows the existing diffuse school-level
construction. Write Y = X beta + error, with row covariance K and column
covariance Q. X has one drift column and Y has tuition/housing columns. K is
the sum of the four existing scalar kernels, including shared-school blocks.
Use unrestricted drift and unrestricted positive-definite Q: this statistical
family differs from the old bounded model and does not replace its gates.

## Exact inference and failure conditions

Use the reference density p(beta,Q) proportional to |Q|^(-3/2), uniform in drift.
Whiten by K; V=(X'K^-1 X)^-1, b=V X'K^-1Y,
S=(Y-Xb)'K^-1(Y-Xb), nu=n-1. The posterior is
Q|Y ~ inverse-Wishart(nu,S), beta|Q,Y ~ matrix-normal(b,V,Q).
It is proper only if nu>1 and S is positive definite; its covariance mean exists
only if nu>3. Require both, finite inputs and full-rank positive-definite K,
positive drift information and supported synthetic graph. Reject singular data;
no jitter, pseudo-inverse or plug-in substitution. At three transitions/eight
schools/two representations, n=56 scalar contrast rows, nu=55; short macro
history is still only three transitions. The fixed shape assumption permits
pooling school residuals; these rows are not 55 independent macro years.

For future latent changes, derive cross-row covariance C and Kzz using the
original AR/innovation keys. Conditional row covariance after integrating drift
is R=Kzz-C K^-1 C' + (Z-C K^-1 X)V(Z-C K^-1 X)'.
Mean is Zb+C K^-1(Y-Xb). Draw Q from its posterior and changes from
matrix-normal(mean,R,Q); horizon zero is exactly zero. A scalar marginal has
t degrees of freedom nu-1 and squared scale Rjj*Scc/(nu-1). Compare this exact
formula independently with simulation. Preserve tuition/housing and whole-path
dependence. No optimizer and no bootstrap failures are bypassed: these are
posterior draws under a different model, not renamed old bootstrap slots.

References: [SciPy inverse-Wishart API](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.invwishart.html)
and [multivariate regression derivation](https://statproofbook.github.io/P/mblr-post.html).
The reference-prior specialization and correlated-future formulas above must
also be independently tested algebraically; citations alone do not verify code.

## Fixed fresh screening batch

Use seeds 2026112301 through 2026112364 inclusive, eight schools, two original
representations, and 3/7/12 transitions. Never reuse inspected seeds. Five arms:
matched (all four parameter triples [.04,.03,.25]); unequal-family (the existing
predictive generator default parameters); correlated-reporting, heavy-tails,
and persistence (default parameters plus the existing named stress). All 960
cells run; no selection of weights, seeds, arms or thresholds follows results.
Use the original prefix-stable generator and latent truth. For each cell,
retain fitted status, degrees of freedom, drift, S and distinct transitions.
Forecast school zero at horizons 0..12 with 2048 joint draws, seed derived from
outer seed, depth and arm. Compare integrated prediction with same-model plug-in
Q=S/nu and fixed drift b, using common standard-normal draws where applicable.

Score complete four-year bills at waits 0/4/8: annual synthetic origin tuition
18000 and housing 21000, attendance at wait through wait+3, sum exp(latent change)
by component. Report 80% equal-tail coverage, Wilson interval, normalized 80%
interval score and width (divide by 4*(18000+21000)), signed bias, and paired
interval-score change on common worlds. Also check exact marginal t coverage at
horizons 4/8/12 for both components. All missing cells remain in availability
denominators; conditional scores explicitly report their sample sizes.

This screening passes computational availability only at >=90% in every depth
and arm. Matched-model bill coverage must be 70–90% with Wilson interval containing
.8 at every depth/wait; paired mean interval score must not worsen more than 5%
versus the reduced-model plug-in. All stress results remain visible; failures
limit the candidate and prohibit qualification claims. Report binomial and paired
Monte Carlo uncertainty. No claim of superiority to the old optimizer follows
from a comparison to this reduced-model plug-in; any later financial/old-model
comparison requires another precommitted experiment. No household probability,
deposit coverage, historical eligibility or promotion is established here.

## Deliverables

Separate implementation, independent mathematical/guard tests, raw compact cell
records and deterministic summary/report, source hashes and protocol commit SHA.
Run targeted tests and npm run check. Record all failures honestly, stop after
the fixed batch, and recommend continuation or rejection without tuning this
study. Repeat numerical computation only for a defect disclosed with retained
failed output, never to improve coverage by changing the method.
