# C4 conditional paths and direct bill benchmark — retained results

C4 improves complete-bill interval score **20.78% against current B0** and
**4.918% against current C2**, with narrower bands and coverage closer to80%.
It nevertheless misses the frozen5% C2 improvement rule and fails **two of20**
subgroup protections: **reject-fixed-C4**. The direct near-entry bill benchmark
is12.42% better than B0 but5.36% worse than C2 and fails four of ten subgroup
protections: **reject-fixed-DIRECT-BILL**. Neither replaces production.

The [joint protocol](retrospective-c4-protocol.md) was published at
[`e48be163a1a9ee8492c651cabe90c16d669fdcba`](https://github.com/jschell/education-finance/commit/e48be163a1a9ee8492c651cabe90c16d669fdcba)
before new fitting/outcomes, from main
`31abf8c71aef4ba2434542699044f0f5499c3a93`. All earlier C1/C2/C3 rejections,
sources, models and raw cases remain unchanged. These are repeatedly reused
2000–2023 revised-data development histories, not fresh or real-time-vintage tests.

## What was implemented

**Three institution roles.** The old twelve target identities per category and
origin remain fixed for comparability. At each outer origin, the union of TEST
identities across all five categories is excluded from all new population FIT,
CAL and historical bill-label samples. FIT hash roles2/3/4 and CAL role1 are
separate, capped200 each; global role0 never fits or calibrates. Cohorts are
selected at their own origin. A known TEST school's own past contributes only
its conditional volatility/state features; cold-start TEST has no own history.
Neither TEST type contributes population parameters or donor trajectories.

**Conditional coherent paths.** FIT supplies the shared calendar law and retained
C2 provisional4%/3% nominal log centers with decaying recent/mean states. CAL
supplies paired, per-school-centered residual trajectories. Donors match current
log tuition/housing and, for known targets, past volatility features, using
fixed80% conditional/20% pooled weights. One donor identity is held across an
entire trial, with paired within-school block2 draws. This preserves school
variance identity across the path instead of selecting a new variance population
at every block. No C3 permanent drift correction, optimizer, failed-group rule,
spread multiplier or horizon switch was used. Finite empirical paths retain
shared calendar dependence; this is a school-cost experiment, not a qualified
household funding model.

**Direct near-entry quantiles.** The separate benchmark uses only CAL-school
complete four-year bills with `innerOrigin+3 < outerOrigin` and label end no
later than the cutoff. It learns weighted empirical bill/origin-budget ratio
quantiles, conditional on origin prices with equal calendar-origin base weights.
At leastthree distinct mature origins are required. It predicts wait0 bills
only and does not produce annual paths or invent long-wait labels.

## Fixed primary C4 comparison

All1,001 complete current-B0/C2 lag0 wait0/4 cases have C4 forecasts. Weighted
means give equal school/category/type/origin/wait influence and normalize proper
interval score, width and median error by the known-origin four-year budget.
Current B0/C2 keep their original fitting definitions. Their training footprints
are deliberately different from new C4 and must not be called role-matched.

| Method | Interval score |80% coverage| Width | Signed median error |
|---|---:|---:|---:|---:|
| Current B0 |0.428754|41.38%|0.070934|−0.003368|
| Current C2 |0.357242|89.37%|0.244323|−0.003658|
| REFIT-C2, new FIT pool |0.358706|89.46%|0.245043|−0.004256|
| C4 |**0.339672**|85.67%|0.209415|−0.004965|

C4 improves5.306% versus role-matched REFIT-C2, supporting an improvement beyond
the changed FIT footprint. The PRIMARY improvement against current C2 remains
4.918%; the favorable secondary result cannot replace its frozen comparator.
The5% gate misses by0.0818 percentage points, with no rounding waiver. Descriptive
calendar-block95% score-difference intervals are [−0.138365,−0.058394] versus B0
and [−0.026206,−0.006998] versus C2. They describe dependent reused histories,
not prospective confirmation or proof of a5% population gain.

Two frozen subgroup protections fail:

| Category/type/wait | Cases/origins | C4 score | Failed comparison | Absolute difference95% interval |
|---|---:|---:|---|---|
| Public2 out-of-state known,4 |32/7|0.358412|25.07% worse than B0|+0.071842 [0.021147,0.122537]|
| Private4 known,4 |38/7|0.293427|12.63% worse than C2|+0.032910 [−0.011950,0.074650]|

Eighteen protections pass. The private subgroup's interval includes zero, so
its population harm is uncertain; it still fails the prespecified point rule.
No absence-of-significance safety claim or retrospective threshold change is
made. The public subgroup remains a substantive reliability concern even though
C4 improves it versus C2. All cold-start subgroup point protections pass here;
this is development evidence, not a universal cold-start guarantee.

Exact current-B0/C2 common support by wait:

| Wait | Cases | Current C2 score | C4 score | C4 coverage | C4 median error |
|---|---:|---:|---:|---:|---:|
|0|626|0.177881|0.168505|87.52%|+0.000274|
|4|375|0.536603|0.510840|83.83%|−0.010205|
|8, secondary|146|0.816493|0.757002|77.89%|−0.006874|

Wait8 has only three B0-supported origins and one nonoverlapping full window;
146 cases are not146 independent long-horizon histories. No funding or
long-horizon calibration qualification follows.

## Direct complete-bill benchmark

All626 fixed near-entry B0/C2 cases have benchmark forecasts:

| Method | Interval score |80% coverage| Width | Signed median error |
|---|---:|---:|---:|---:|
| B0 |0.213994|44.21%|0.044323|+0.003492|
| C2 |**0.177881**|87.97%|0.120771|+0.000167|
| Direct bill |0.187424|72.36%|0.107851|+0.015861|

The benchmark improves12.42% versus B0 but loses5.36% versus C2. Its bands
undercover at72.36%, despite being slightly closer to80% in aggregate distance
than C2's overcoverage. Score and four subgroup protections fail: public4 known,
public4 cold-start, private4 known and private4 cold-start. All failures are
retained. Descriptive score-difference95% intervals are [−0.033680,−0.018921]
versus B0 and [+0.001751,+0.017616] versus C2.

The artifact records2,160 benchmark diagnostics:1,440 available forecasts and
720 early-history unsupported forecasts, without dropping baseline cases.
Its71 content-addressed label banks retain45,677 slots, missing/changed outcomes,
strict maturity and global TEST exclusions. The repeated per-label weight vector
is omitted from each diagnostic for packaging size; raw labels, kernel scales,
counts and pinned source reproduce every weight and quantile exactly. No weights
or scientific predictions were changed for packaging. There are no direct
wait4/wait8 forecasts or annual funding-path claims.

## Verification, limits and stopping

All6,480 prior case/view records remain. New C4/REFIT-C2 fits are available in
175/180 category/view cells; the original five early lag1 cells lack the required
three transition years and stay unavailable. Lag sensitivity holds supplied
origin anchors/cohorts fixed; it is not actual publication-lag evidence. Raw role
IDs, model bank scales, cutoff/input hashes, bill-label hashes, forecasts, scores
and source identities are in
`data/calibration-diagnostics/retrospective-c4.json.gz`.

The first complete forecast pass took31.1seconds locally before the prespecified
aggregate/subgroup block resampling. All old source hashes are checked; the new
runner refuses overwrite from its first launch. All86 targeted mathematical/independent tests, all216 application checks and
complete numerical reproduction pass locally. Independent raw-case review
confirms all6,480 prior cases unchanged, all4,347 C4 and4,347 REFIT-C2 score
identities, fixed primary decisions and source hashes. Independent benchmark
review rebuilds all1,440 quantile forecasts and1,038,816 weight entries, retaining
720 unsupported diagnostics. Recovery independently reconstructs all180 role/cutoff/input-hash records and
all71 mature-label banks, confirming disjoint roles and strict maturity. Dedicated
[CI44665647813](https://github.com/jschell/education-finance/actions/runs/44665647813)
passes at scientific source`009ec940c27a1b11aa6ece21044dd8841c7af88b`, including
all86 targeted tests, fresh unchanged B0 replay/archive verification, the full
C4/direct-bill numerical reproduction and all216 application checks. The whole
published scientific tree exactly matches tested local source. Subsequent handoff
changes are documentation only; ready research integration does not activate either
rejected candidate. The final merge receipt is recorded in its pull request.

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 OPENBLAS_CORETYPE=Haswell \
NPY_DISABLE_CPU_FEATURES=AVX512F,AVX512CD,AVX512_KNL,AVX512_KNM,AVX512_SKX,AVX512_CLX,AVX512_CNL,AVX512_ICL,AVX512_SPR \
python scripts/run_retrospective_c4.py --verify
python -m unittest discover -s tests -p 'retrospective*test.py'
npm run check
```

Use pinned Python3.12.14/NumPy2.3.5/Node24, single-thread Haswell settings and
predeclared numeric abs1e−8+relative1e−10 tolerance; source/support/status/decision
identities are exact. Benchmark-only quantiles must not be treated as coherent
joint paths. Both rejected findings and the C4 aggregate/cold-start improvements
are useful research evidence. This bounded task stops without C5, threshold
chasing, failed-group routing, production activation or automatic new acquisition.
