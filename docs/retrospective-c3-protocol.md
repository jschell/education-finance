# C3 past-only annual location/scale calibration — frozen protocol

Method `retrospective-c3-1.0.0`. Base integrated main
`8f4b6a154d990331133a82ccb9d32c523fb825ec`. Publish this contract BEFORE C3
calibration fitting, forecast generation or new scoring. All2000–2023 periods
and prior C1/C2 findings are consumed development evidence; no fresh holdout claim.
The prior C2 rejection, four losses and scientific artifacts remain immutable.

## One mechanism and exact law

Existing C2 diagnostic finds three failed strata dominated by excess width,
while public-two-year unknown/wait4 has negative centering error and costly
upper misses. A uniform spread reduction cannot address both. Test ONE joint
location/scale learner using only matured past one-year forecast errors. Apply
the identical algorithm to all five categories and known/unknown targets; no
routing by the four failed groups, waits or outer scores and no parameter grid.

Generate C2 one-year pseudo-forecasts at inner origins2003 through2018 inclusive,
using the unchanged origin-only cohort/context, capped200 training identities,
firstsix KNOWN target identities,512 paths, and seed2026112701+inner_origin.
Inner pseudo-forecasts use lag0 only; the same fixed corpus is reused for outer
lag1 with its label cutoff. It is not matched-timeliness recalibration.
All hash-withheld identities are excluded from fitting AND calibration targets.
Each pseudo-record keeps inner input hash, institution, category, targetyear,
status, observed paired annual nominal log growth, predictive mean of the512
annual log increments, and variance with ddof0. Cohorts and features use inner
origin only. Missing/changed/nonpositive target pairs remain explicit unavailable;
no favorable future cohort filter. Outcomes are one-year labels, not future bills.

At an outer origin and category, admit targetyear STRICTLY LESS than outerorigin
and at most its training cutoff. Use the lastfive distinct available targetyears.
Within each year, weight admitted schools equally; weight years equally. Fewer
thanthree distinct years => fixed identity calibration b=0,s=1. Let n be the
number of admitted years; e_ik is observed log growth minus predicted meanlog,
V_ik is its predictive log variance. For each paired component k:

`b_k = sum_y mean_i(e_ik)/(n+5)`

`s_k^2 = (5 + sum_y mean_i((e_ik-b_k)^2 / V_ik))/(n+5)`.

The five-year prior shrinks location to0 and scale to1. V=0 with e-b=0 contributes
neutral ratio1; V=0 with a nonzero residual => explicit unsupported calibration,
not a winning fallback. Negative/nonfinite variance/error/statistics fail closed.
No fitted scale clipping, optimizer, adaptive window or tuning is permitted.

For each outer512-path C2 forecast, let m_hk be its SAMPLE mean annual log
increment at horizon h. C3 applies

`log g_C3[h,k] = m_hk + b_k + s_k*(log g_C2[h,k]-m_hk)`.

This transforms ANNUAL increments, not cumulative levels or bill quantiles.
Origin anchor h0 is unchanged. Positive component scales preserve the paired
shock dependence and one coherent path across all waits. The location correction
is permanent annual drift: the long-run log anchor becomes a+b. This deliberately
reintroduces an adaptive mean, restricted to recent out-of-sample annual errors;
it could recreate long-horizon bias and must pass the actual bill comparison.
One-year calibration does NOT establish long-horizon serial calibration.
Unknown schools use the same category learner without their withheld outcomes.

## Fixed execution and decision

Reuse the exact C2 case grid,512 paths, seed2026112701, origins2003–2020, five
categories, six known/six unknown identities, both origin-inclusive/lag1 views,
and waits0/4/8. Calibration records never access outer-future outcomes. Lag1 keeps
supplied origin cohort/anchors as before and restricts calibration labels to
cutoff; it is not original-publication validation. No2024 fresh claim. Keep all
6,480 records, missing/unreached outcomes and failed fits. Runtime ceiling20min;
if exceeded preserve incomplete evidence, do not reduce trials or identities.

Primary: lag0 waits0/4, FIXED1,001 complete B0/B2/C2 baseline cases. A C3 failure
cannot remove a baseline case. Same complete-four-year nominal bill, known-origin
budget normalization and equal school/category/type/origin/wait weights as C2.
Require ALL: (1) at least5% lower interval score than EACH B0,B2,C2; (2) every
category/type/wait score at most10% worse than EACH baseline; (3) aggregate80%
coverage distance from.8 no worse than EACH baseline; (4) C3 available on all
fixed baseline cases. Retain coverage tails, widths, signed median errors,
known/unknown strata, wait8 and lag sensitivity. Every failed gate rejects C3.

Report descriptive paired calendar-block95% score-difference intervals versus
allthree, block4,1,000 resamples, seed2026112902. If point gates pass but an
interval includeszero label promising/inconclusive; otherwise descriptive
research win. Reused dependent evidence is not prospective confirmation.
No anchor/window/prior/scale/case or threshold changes after outcomes. Stop this
one candidate; no automatic further model iteration or subgroup substitution.

## Verification and deliverables

Independent tests: exact manual year weighting and formula; strict targetyear
purging/cutoff/withheld exclusion; fixed fallback/unsupported failures; coherent
horizon prefixes, untouched h0 anchor, paired path transformation; future-price,
CPI/directory poisoning invariance; fixed denominators, baseline parity and proper
score/decision arithmetic. Preserve prior source/artifact hashes, all C2 cases
and rejections; separate new modules/artifacts only. Use pinned Python3.12.14,
NumPy2.3.5, Node24, single-thread Haswell/AVX512-disabled environment and prior
numeric tolerance abs1e-8+relative1e-10; exact statuses/support/decisions/source
identities. Preserve first generator/outcomes and refuse overwrite from the start.

Deliver code, raw pseudo-label audit and full case artifact, readable outcomes,
independent review, full reproduction, targeted tests, npm run check, fast CI and
reviewable PR. No production-default change, activation, funding calibration,
source bridge or deployment is part of this experiment. Research merge is
separate from production adoption; any activation requires separate review.
