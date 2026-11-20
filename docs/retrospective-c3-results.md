# C3 past-only annual calibration — retained rejection

C3 does **not** improve C2's complete-bill forecasts: proper interval score is
**2.96% worse**, and **five of 20** subgroup protection checks fail. Its 80%
interval coverage moves from 89.37% to 85.81%, but that improvement alone does not
qualify the method. Frozen decision: **reject-fixed-C3**. Production remains
unchanged; no new candidate or subgroup exception follows automatically.

The [protocol](retrospective-c3-protocol.md) was published at
[`fb5ebcb1d92b6e2dac14c6689a794b5f2734a4cc`](https://github.com/jschell/education-finance/commit/fb5ebcb1d92b6e2dac14c6689a794b5f2734a4cc)
before C3 fitting or outcomes, from integrated main
`8f4b6a154d990331133a82ccb9d32c523fb825ec`. PRs 17–23 were integrated before
this experiment. All previous studies, rejected gates and artifacts remain
unchanged. Every historical period is reused development evidence, not an
untouched or original-vintage holdout.

## The one tested change

C2's four subgroup failures involved both over-wide bands and a different
undercentered group. C3 therefore tested joint annual location/scale learning,
not a uniform narrowing or four manually selected exceptions. It used the
last five matured one-year C2 pseudo-forecast target years strictly before each
outer origin. Only known inner-cohort identities contributed; hash-withheld
identities were excluded throughout. The same category algorithm applies to
known and unknown schools and all waits. No hyperparameter grid or outer score
selected a path law.

Location and scale shrink toward 0 and 1 with five calendar-year prior units;
fewer than three years uses the fixed identity fallback. Within-year school
weights are equal, and years receive equal weight. The paired affine transform
acts on annual log increments with 512-draw sample moments; the origin anchor
remains unchanged. Its location correction is permanent annual drift, a declared
risk rather than a promise of long-horizon calibration. The lag sensitivity
reuses the lag0 pseudo corpus subject to its cutoff; it is not matched-timeliness
or actual publication-vintage calibration.

All 480 expected pseudo slots are retained: 473 observed, four changed-sector and
three missing-row targets. Across 180 outer category/view fits, 140 calibration
records use the fitted rule and 40 use the declared early-history identity
fallback. The original five 2003 lag cost-fit failures remain; the calibrator
does not manufacture their missing history. Complete forecasts, including this
pseudo corpus, took 17.9 seconds on the recorded local environment.

## Fixed primary results

All 1,001 baseline-complete primary cases have C3 scores. Primary means use the
same equal-school/category/type/origin/wait weighting and known-origin budget
normalization. They are not unweighted school-level population estimates.

| Method | Interval score |80% coverage| Width | Signed median error |
|---|---:|---:|---:|---:|
| Current B0 |0.428754|41.38%|0.070934|−0.003368|
| B2 |0.453912|69.55%|0.266332|+0.061986|
| C2 |**0.357242**|89.37%|0.244323|−0.003658|
| C3 |0.367804|85.81%|0.240787|+0.012821|

C3 is 14.22% better than B0 and 18.97% better than B2, but 2.96% worse than C2.
Thus the required 5% gain against every comparator fails. Availability and
coverage-distance protections pass; subgroup protection fails. Descriptive
calendar-block 95% score-difference intervals are [−0.101870,−0.032019] versus B0,
[−0.098221,−0.074856] versus B2, and **[+0.004132,+0.020084] versus C2**.
These intervals describe dependent, reused histories and are not fresh-test
confidence claims.

| Failed category/type/wait | Cases | C3 score | Comparator loss above 10% |
|---|---:|---:|---|
| Public2 in-state unknown,4 |38|1.014005|B2|
| Public2 out-of-state known,4 |32|0.490997|B0|
| Private4 known,4 |38|0.341598|C2|
| Private4 unknown,0 |63|0.100966|B0, C2|
| Private4 unknown,4 |35|0.308034|B0, C2|

Every baseline and case remains in the artifact; an unavailable C3 cannot shrink
the baseline denominator. No subgroup rule or threshold is waived.

## Horizon support and interpretation

Exact current-B0 common support, separately by wait:

| Wait | Cases | C2 score | C3 score | C3 coverage | C3 median error |
|---|---:|---:|---:|---:|---:|
|0|626|0.177881|0.180297|86.00%|+0.004805|
|4|375|0.536603|0.555312|85.62%|+0.020838|
|8, secondary|146|0.816493|0.859317|81.00%|+0.088767|

Wait 8 has three current-B0-supported origins and one nonoverlapping full window.
Closer coverage does not offset its worse score and larger median bias. Past
one-year calibration is insufficient to preserve the best observed multi-year
bill performance. The permanent location correction can accumulate across years;
this experiment does not isolate every source of its losses.

On all-origin complete C3 support, scores are 0.193730/0.562885/0.862612 at
waits 0/4/8 on 1,023/742/489 cases. Lag 1 scores are 0.192340/0.560702/0.844663 on
963/689/441 forecastable cases. All 6,480 case/view slots retain missing,
changed-sector, nonpositive and unreached outcomes. The artifact includes all
known/unknown and category results. No conclusion depends on favorable support
selection. Different support means must not be compared as if matched.

## Verification and reproducibility

Separate files implement this study; old C2 generators and artifacts are
immutable. The source-stamped artifact is
`data/calibration-diagnostics/retrospective-c3.json.gz`, containing the full raw
pseudo-label audit, admitted calibration years, fit records, forecasts, scores,
fixed decisions and source hashes. The runner refuses to overwrite it from the
first launch. The old C2 first-generator snapshot is checked against its retained
source stamp; new source identities are recorded independently.

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 OPENBLAS_CORETYPE=Haswell \
NPY_DISABLE_CPU_FEATURES=AVX512F,AVX512CD,AVX512_KNL,AVX512_KNM,AVX512_SKX,AVX512_CLX,AVX512_CNL,AVX512_ICL,AVX512_SPR \
python scripts/run_retrospective_c3.py --verify
python -m unittest discover -s tests -p 'retrospective*test.py'
npm run check
```

Pinned Python 3.12.14/NumPy 2.3.5/Node 24, single-thread Haswell settings and the
predeclared abs 1e−8 plus relative 1e−10 tolerance apply. Statuses, source hashes,
case/support and decisions must match exactly. All 60 targeted mathematical/past-only checks, all 216 application tests and full
numerical reproduction pass locally. Independent raw-case review verifies every
prior case unchanged, all 4,347 C3 score identities, 480 pseudo records with 473
observed error vectors, all 80 inner input hashes and all 180 calibration fits.
The five subgroup failures and rejection independently reconcile. Dedicated [CI 44652461960](https://github.com/jschell/education-finance/actions/runs/44652461960) accepts scientific implementation `4bd6690b4d911173c086b488eda647d1623a191d`: all 60 targeted tests, fresh B0/archive verification, complete C3 numerical reproduction and 216 application tests pass. Independent remote Git-blob comparison confirms every scientific/workflow file matches the tested source.

This bounded comparison stops at rejection. It adds useful evidence about an
origin-only calibration mechanism, not a qualified forecasting replacement,
funding probability, source bridge, production activation or automatic C4 search.
