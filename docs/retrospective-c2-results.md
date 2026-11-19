# C2 anchored-state retrospective result

C2 improves aggregate four-year bill interval score by **16.68% against the current
B0 process and 21.30% against B2**, but **fails four of 20 subgroup protection
checks**. The frozen decision is **reject-fixed-C2**. No production replacement,
subgroup switch, funding calibration, or prospective accuracy claim follows.

Protocol published before C2 outcomes at
[`ffe318860a8702866fafcef7934b26f8a169ae5f`](https://github.com/jschell/education-finance/commit/ffe318860a8702866fafcef7934b26f8a169ae5f).
This follows consumed C1 development results: all historical periods here have
already informed research. The new improvement is a mechanism-based development
result, not an untouched test or a rescue of C1's retained rejection.

## What changed and why

C1 retained permanent all-history mean growth and permanent trial mean uncertainty
despite decaying recent adjustments. Its long-wait positive median bias and wide
bands supported changing both the center and persistence of that uncertainty.
C2 uses the current B0 policy's 4%/3% nominal log centers, decays recent deviations
and mean uncertainty at 0.5 per year, and retains the identical paired empirical
annual innovations and signed school state. One coherent law generates every
wait. No grid, wait-specific switch, clipping or post-outcome parameter change was
used. The anchor is a hypothetical present-policy assumption at historical
origins; neither an estimated truth nor an historically observed expectation.
The full shock distribution still differs from B0's conditional donor mechanism.

## Fixed primary comparison

All 1,001 complete B0/B2 primary cases have C2 forecasts. These use origin-inclusive
training, waits 0/4, and the existing equal-school/sector/type/origin/wait weights.
Scores, widths and median errors divide by the known-origin four-year budget.

| Method | Interval score | 80% coverage | Width | Signed median error |
|---|---:|---:|---:|---:|
| Current B0 |0.428754|41.38%|0.070934|−0.003368|
| B2 |0.453912|69.55%|0.266332|+0.061986|
| C1 (retained) |0.436866|73.49%|0.265181|+0.056970|
| C2 |**0.357242**|89.37%|0.244323|−0.003658|

C2 passes the 5% improvement requirement against both comparators, availability,
and aggregate coverage-distance rule. Coverage 89.37% is overcoverage of an 80%
interval, not a claim of nominal calibration. Its bands remain much wider than
B0's. Paired descriptive calendar-block 95% score-difference intervals are
[−0.114227,−0.048383] against B0 and [−0.111467,−0.087225] against B2.
Dependent and reused histories prevent interpreting these as fresh confirmation.

The prespecified no-harm requirement fails:

| Category/type/wait | Cases | C2 score | Failed comparison |
|---|---:|---:|---|
| Public2 in-state, unknown,4 |38|1.056624|14.84% worse than B2|
| Public2 out-of-state, known,4 |32|0.481749|68.11% worse than B0|
| Private4, unknown,0 |63|0.075703|25.66% worse than B0|
| Private4, unknown,4 |35|0.226309|11.70% worse than B0|

All other 16 protections pass. Small subgroup denominators do not waive the rule.

## Horizons and sensitivity

Exact B0-common support, separately by wait:

| Wait | Cases | B0 score | C1 score | C2 score | C2 coverage | C2 median error |
|---|---:|---:|---:|---:|---:|---:|
|0|626|0.213994|0.189285|0.177881|87.97%|+0.000167|
|4|375|0.643515|0.684446|0.536603|90.76%|−0.007483|
|8 (secondary)|146|1.161072|1.561775|0.816493|89.22%|+0.004588|

Wait 8 has only three B0-supported origins and one nonoverlapping full window.
These are correlated outcomes, not 146 independent long-horizon experiments.
The all-origin C2 scores are 0.190817/0.547467/0.827363 for waits 0/4/8, with
1,023/742/489 complete cases. Lag-one sensitivity scores are
0.189009/0.542097/0.803522 on 963/689/441 forecastable complete cases; the five
2003 lag fits retain their minimum-history failures. This is a training-cutoff
sensitivity holding origin prices/cohorts supplied, not true publication-lag
validation. The artifact retains known/unknown strata and every missing/unreached
case across the complete 6,480-case grid.

## Reproduction and limits

The inputs are revised 2000–2023 source data. Selection uses each origin's
available history, with unknown institutions excluded from the whole training
pool. Forecasts are generated before reading their future outcomes. Future-price,
CPI and directory poisoning tests verify cutoff invariance. No missing original
vintage is invented; retrospective conditional accuracy is the declared estimand.
Current B0 keeps all eligible training institutions while B2/C2 cap 200, so this
is a comparison of actual processes with differing data footprints.

The first generating runner and artifact are retained unchanged. A later wrapper
adds overwrite refusal and validates the preserved generating runner's SHA before
full scientific reproduction; it restores only that source-stamp field for the
comparison. The snapshot is
`data/calibration-diagnostics/retrospective-c2-generating-runner.py`.
The active runner, model and all other source identities remain reviewable.
No scientific cells, thresholds, seeds, parameters or scores were amended.

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 OPENBLAS_CORETYPE=Haswell \
NPY_DISABLE_CPU_FEATURES=AVX512F,AVX512CD,AVX512_KNL,AVX512_KNM,AVX512_SKX,AVX512_CLX,AVX512_CNL,AVX512_ICL,AVX512_SPR \
python scripts/run_retrospective_c2.py --verify
python -m unittest discover -s tests -p 'retrospective*test.py'
npm run check
```

Use Python 3.12.14/NumPy 2.3.5/Node 24. Numeric reproduction uses the predeclared
abs 1e−8 plus relative 1e−10 tolerance; support, statuses, decisions and source
identities are exact. Dedicated [CI 44625178134](https://github.com/jschell/education-finance/actions/runs/44625178134) passes at scientific head `9d3013a60d7bd67d421803e6427c3c3ca4503f41`: all 43 targeted tests, fresh B0 replay/archive verification, the full C2 comparison and 216 application tests. The first workflow attempt (44624782372) compared nondeterministic `elapsedSeconds` against an archive intentionally omitting it; the corrected check excludes timing only and retains every scientific/source/status field. No generating source, artifact, score, seed or criterion changed. The workflow creates `.cache` before B0 regeneration. All prior generating code/artifacts are immutable.

The useful learning is that nominal centering and temporary mean uncertainty
materially improve aggregate observed bill forecasts without waiting for new
calendar years. The remaining obstacle is subgroup reliability, especially
public2 known out-of-state and private unknown forecasts. A future separately
specified candidate would need to explain those errors using origin-known
features and reproduce improvement without selecting favorable outer outcomes.
This study stops with the fixed rejection; it does not automatically launch a
new mixture, anchor search or subgroup rule.
