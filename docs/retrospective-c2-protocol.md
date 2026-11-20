# C2 anchored-state follow-up — frozen protocol

Method `retrospective-c2-1.0.0`, base accepted PR22 head
`a37d3203`. Publish before C2 fitting, forecasting or scoring. All C1 outcomes
and 2000–2023 periods are consumed development evidence; no untouched historical
holdout is claimed. Retain every old source, artifact, gate and rejection.

## Mechanism and one changed law

The existing C1 comparison found better near-entry coverage but excessive
longer-horizon width and positive median bias. C1's decaying adjustments cannot
change its permanent all-history mean growth or the per-trial permanent mean
uncertainty, which accumulates as horizon-squared log variance. A read-only
proper-score decomposition identifies both miscentering and width penalties.
This motivates ONE coherent annual-path hypothesis, not a wait-based switch.

Reuse the existing origin-only fit, paired block-two common/school innovations,
IID year-mean uncertainty, fixed school shrinkage20 and signed reversal clipped
at +/-0.5. Let h=1 be the first future annual increment; a=log([1.04,1.03]);
r=the last-three-year average NOMINAL sector log-growth; d=the trial's paired
nominal year-mean bootstrap deviation; u_h=the matched centered nominal shared
innovation; e_h=the matched paired school residual. C2 uses

`log growth_h = a + 0.5^h * (r - a + d) + u_h + e_h + school_state_h`.

The known-school state is the unchanged `n/(n+20)*rho^(h+gap)*last_residual`;
unknown future institutions have zero such feature and no withheld history.
Lag sensitivity uses its older training features, the same .5^h sector rule
and the existing known-school gap rule. The asymptotic conditional LOG center
is a; exponentiating finite innovations means arithmetic expected growth need
not equal4%/3%. These anchors are borrowed from today's provisional B0 policy,
not estimated economic truths or historically observed forecaster expectations.
Every past origin is a counterfactual evaluation of that fixed present policy.

Unlike C1, cumulative temporary mean uncertainty is bounded by the geometric
sum; annual innovation uncertainty remains. All horizons use the same law.
There is no horizon/wait gate, mixture selected from outer outcomes, arbitrary
variance multiplier, optimizer, new source or hyperparameter search. Preserve
B2/C1/no-real-growth output arrays exactly; implement C2 in a separate module.
All innovations have finite empirical support. Nonfinite C2 output is explicitly
unavailable and cannot erase a valid baseline forecast.

## Fixed corpus and execution

Reuse exactly PR22's data, input adapter, cohort/split, views, 512 draws and seed
2026112701: origins2003–2020, five categories, six known/six unknown sampled
identities, first200 training identities for new models, origin-inclusive and
one-year-lag training with fixed supplied origin anchors/cohorts. Future truths
remain scorer-only. No-real-time-vintage claim, 2024 endpoint, housing splice or
new acquisition. Reuse the unchanged current B0 reference's all-eligible pool
and supported origins2010 onward, explicitly differing from capped new models.

Run all6,480 case/view records including missing/unreached cases. Primary scores
use lag0, waits0/4, EXACT common complete support of B0, B2 and C2; the previous
corpus has1,001 such baseline cases. Do not narrow support after seeing C2.
Also report earlier origins, C1, wait8, known/unknown, sectors and lag sensitivity
as secondary diagnostics. All are reused retrospective evidence.

The runtime ceiling is20 minutes; preserve checkpoints and report incomplete
rather than changing samples/trials after outcomes. No pilot scores tune the
method. Fitting uses annual observations only, with fixed constants; no inner
model selection or future multi-year labels are used. Refit from each cutoff;
future-poisoning invariance must hold for inputs and C2 forecasts. No funding
ledger, investment-return or production claim follows from this cost-only run.

## Prespecified decision

Use the same complete four-year nominal bill and known-origin normalization,
equal school/sector/type/origin weights and equal primary-wait weights as PR22.
The primary decision requires ALL of:

- C2 interval score at least5% below B0 AND at least5% below B2 on the fixed
  common primary support.
- No primary sector/type/wait score exceeds either comparator by more than10%.
- Aggregate80% coverage no farther from.8 than either comparator; retain miss
  direction, sharpness and median bias rather than using coverage alone.
- C2 available on every otherwise complete B0/B2 primary case. No favorable
  successful-only matching or substitution.

Report paired descriptive calendar-block95% intervals against both baselines,
blocklength4,1,000 resamples, seed2026112802. If point criteria pass but the
corresponding score-difference interval includeszero, call it promising/inconclusive;
otherwise a descriptive research win. Failure rejects this fixed C2 comparison.
These are new declared criteria, not alterations to C1's retained failed rule.
No claim of prospective calibration or automatic activation is permitted.

## Verification and publication

Independent tests must verify the formula, limiting log-center/bounded temporary
uncertainty, signed state, identical innovations/old outputs, same-school keys,
unknown exclusion, anchor identity, proper scores and cutoff/future invariance.
Verify all case identities, baseline archives/source hashes and decision arithmetic.
Use the earlier Python3.12.14/NumPy2.3.5/Node24 Haswell/AVX512-disabled single-thread
runtime, numeric leaf abs1e-8+relative1e-10 tolerance; exact source/support/status/
decision identities and exact within-process future-poisoning equality.

Deliver separate code/tests, raw compact artifact, readable mechanism/results,
reproducible full comparison, npm run check and fast CI. Publication workflow must
create `.cache` before B0 generation. No old generating file/artifact modification,
merge, deployment or production activation. Stop after this one fixed comparison;
no another anchor, damping value or layer is tried to obtain a win.
