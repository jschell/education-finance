# C4 conditional joint donors and direct near-entry bill benchmark

Method `retrospective-c4-1.0.0`, base main
`31abf8c71aef4ba2434542699044f0f5499c3a93`. Publish BEFORE new model fits,
forecasts or scored outcomes. Every old study/gate/source/artifact stays immutable.
All2000–2023 years are consumed development evidence, not a fresh economic test.
Additional donor institutions add cross-sectional information, not new eras.

## Fixed institution roles and information

Keep the SAME old C2 twelve target identities/category/origin and supplied
anchors: six known and six cold-start. At each outer origin take the UNION of
all target IDs across all five categories. Exclude this entire TEST union from
ALL new population FIT, CAL and prior bill-label samples, including inner origins.
Global hash%5==0 identities never enter FIT/CAL. Within each origin-only eligible
category cohort, FIT is the first200 hash-sorted IDs with hash%5 in{2,3,4}; CAL is
first200 with hash%5==1, both after TEST exclusion. Recompute these sets at every
inner origin; no outer-survivor filter is applied to historical CAL labels.
Institution IDs are disjoint roles, including across residency/category slices.

Known TEST own history through the training cutoff is allowed ONLY to compute
its conditional volatility features and decaying state; it never estimates
population means, reversal parameters, donor distributions or feature scales.
Cold TEST receives its supplied current tuition/housing anchor and no own past
history. CAL school histories create the held-out donor-error distribution
relative to FIT calendar means; they are never used to fit those calendar means.
This is an information-role contract, not an untouched-school claim.

Views: primary origin-inclusive; sensitivity lag1 keeps old supplied origin
anchors/cohorts but uses FIT/CAL histories and known features through origin−1.
Donor level features use their cutoff prices. Target features use supplied origin
anchors (same as prior lag contract). No original publication-vintage claim.

## One coherent conditional donor law

FIT uses the unchanged C2 fit mechanics to estimate shared calendar means,
paired residual variance and signed component reversal ridge20 clipped±0.5.
Retain C2 nominal log centers log1.04/log1.03, decaying recent-sector and trial
mean state0.5^h, common paired-calendar block2 and its finite empirical law.
No C3 annual location/scale calibration or permanent school growth is added.

For each CAL school, subtract its matching FIT nominal calendar means from
paired annual log growth, then subtract that school's paired trajectory mean.
The remaining paired trajectory has zero empirical mean; retain its school
identity, variance and contiguous sequences. Features are log cutoff tuition
and log cutoff housing. Known-school matching additionally uses two log RMS
features: each component's centered residual variance shrunk toward FIT pooled
school variance with20 pseudo-observations. Test known features use its own
history solely in this analogous calculation; cold targets omit RMS features.
For exactlyzero RMS, use log(max(RMS,float64tiny)) solely to represent log0;
this is not an innovation-variance floor or path clipping.
Standardize features using the CAL feature-bank standard deviation with floor
0.25. Gaussian kernel exp(−distance²/2), normalized across CAL schools; final
weights are0.8kernel+0.2uniform. If all kernel weights underflow use uniform
(the fixed poor-overlap limit). No optimized bandwidth, feature selection,
category exception, wait switch or parameter grid.

For each trial choose ONE donor school and hold that donor identity for the
ENTIRE future path. Draw paired circular block2 innovations only inside that
school's contiguous sequences; short segments cycle as declared empirical
bootstrap assumptions. This changes the prior model's switching of school
variance across blocks. Shared calendar shocks remain common. Known TEST state
uses its own last residual against FIT calendar means, shrunk n/(n+20) and
aged with the FIT signed reversal and cutoff gap, just as C2. Unknown state0.
At leastthree usable CAL donors and three FIT transition years are required;
otherwise explicit unavailable, not a favorable fallback. All moments are
finite-support; nonfinite exponentiation fails closed, without clipping.

Also compute REFIT-C2 on exactly this FIT pool, with the same target-known state
information contract. This secondary comparator isolates donor-law effects from
changed population fitting. Preserve the frozen CURRENT B0/C2 primary processes;
they deliberately have different training footprints and are NOT role-matched.

## Direct complete-bill quantiles — wait0 only

A separate offline benchmark learns conditional empirical quantiles of the
complete four-year reported bill ratio `bill/(4*originAnnualBudget)` from CAL
institutions at earlier origin-only cohorts, with outer TEST IDs excluded.
A label is admissible ONLY when `innerOrigin+3 < outerOrigin` and its last bill
year is at most the training cutoff. Keep missing/changed/unreached labels as
explicit statuses. Use inner origins2003 onward and their first200 CAL IDs;
no use of wait4/wait8 immature labels or unseen original vintages.

Use features log origin tuition and log origin housing and the same Gaussian
kernel, floor0.25 and0.8conditional+0.2pooled weights. Normalize base weights to
EQUAL inner-origin/calendar weights, equal institutions within origin; kernel
weights reweight this base. At leastthree distinct mature inner origins are
required, otherwise benchmark unsupported. Weighted empirical inverse-CDF
quantiles0.1/0.5/0.9 of the log ratio, repriced using the target's known four-year
origin budget, define the prediction; report the weighted finite empirical mean
if needed. No quantile optimizer, model selection or conformal guarantee.
This is a bill-only benchmark, NOT a coherent annual funding path or household
probability. Known/cold targets use the same origin-price features here.

## Bounded execution and frozen evaluation

Reuse all6,480 old case/view identities, eighteen origins2003–2020, waits0/4/8,
512 trials, seed2026112701+origin+10000lag, old outcome lookup/scoring, known-origin
budget normalization and equal school/category/type/origin/wait weights.
Compute one11-year path before future outcomes are scored. The whole run has
20minute ceiling, no smaller successful-only rerun or post-outcome alternatives.
Cache purely repeated past-only fits/labels only with full role/cutoff hashes.

C4 primary support FIXED1,001 baseline-complete lag0 waits0/4 B0/C2 cases; missing
C4 cannot narrow this denominator. Require all: (a) at least5% score improvement
versus EACH current B0 and C2; (b) no category/type/wait score >10% worse than
EITHER comparator; (c) aggregate80% coverage distance from.8 no worse than either;
(d) availability on every fixed complete baseline case. Any failed point rule
rejects fixed C4, preserving every prior rejection. REFIT-C2, B2, wait8, lag and
known/cold diagnostics remain secondary; do not select from outer outcomes.

Report descriptive calendar-block95% difference intervals versus B0/C2,
block4,1,000 resamples, seed2026113002. Point criteria passing with an interval
including0 is promising/inconclusive; otherwise descriptive research win.
Also audit subgroup uncertainty by calendar clustering, retaining the frozen
point failures: uncertainty cannot rescue them. Absolute score differences and
origin counts accompany percentage losses (small denominators can inflate ratios).
No generalization guarantee follows from overlapping, repeatedly reused histories.

Benchmark near-entry support is the FIXED626 B0/C2-complete wait0 cases, not
successful-benchmark intersection. Its point gates use the same5% against both,
10% subgroup protection, coverage-distance and availability rules restricted to
wait0; unavailable early/weak labels cannot erase baseline cases. Benchmark is
separately evaluated, cannot silently substitute for failed C4 or claim other
horizons. Sparse long-horizon maturation remains explicit.

## Verification and stopping

Pure modules/method versions and raw source hashes; independent tests for role
exclusion across slices, known feature-only versus cold history, inner-origin
cohorts, strict bill maturity, equal-calendar weights, donor feature/variance
formulas, one-donor-per-path and paired block dependence, same-path prefixes,
cutoff/future price+CPI+directory poisoning, fixed support, proper score and
all decision arithmetic. Preserve baseline case fields exactly. Compare REFIT-C2
with an independent construction. No fabricated unavailable source or result.

Pinned Python3.12.14/NumPy2.3.5/Node24, Haswell single-thread/AVX512-disabled,
numeric abs1e−8+relative1e−10 tolerance; exact hashes/support/status/decisions.
Refuse overwrite from the initial launch; retain first outputs and generating
source, any defect/amendment chronology and scientific failure. Deliver separate
code/tests/artifact/report, full reproduction, npm check, dedicated CI and PR.
No C5, broader source acquisition, optimizer search, production activation or
funding claim follows automatically. Research merge is separate from adoption.
