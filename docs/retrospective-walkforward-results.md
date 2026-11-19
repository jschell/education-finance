# Revised-data walk-forward comparison — results

Method `retrospective-walkforward-1.0.0`. The frozen [protocol](retrospective-walkforward-protocol.md) was published at `3700720c4cef24c71dd94d16f25d771b135a1c77`, followed before aggregate outcomes by precision/current-process-footprint clarification `4f445e87e938c0846c7794d76cb74316a23c33e8`. No production behavior, financial default or earlier study changed.

**The historical experiment ran to completion. C1 improves 2.51% over the strong B2 baseline, below the frozen 5% requirement, so this first C1 comparison is rejected.** Better coverage alone does not qualify it; the current-production comparator also has a better aggregate interval score on their common support.

## What actually ran

- Pinned revised AY3 tuition/fees and on-campus housing, 2000–2023; September origins 2003–2020; five sector/residency categories, six known and six withheld identities per origin/category, at most 200 admitted training identities.
- 512 paths per model/target, seed 2026112701. B2/C1 share empirical common-year/paired school noise and year-mean uncertainty. C1 adds only the frozen damped sector adjustment and strongly shrunk signed known-school reversal term; unknown institutions receive no withheld-history feature. No inner hyperparameter selection occurred.
- Two views: origin-inclusive training under an assumed-known current budget/CPI convention, and training lagged one year while keeping the supplied anchor/cohort fixed. Neither is an original-vintage backtest.
- 6,480 case-view records and 180 origin/sector fits. There are 2,254 observed, 720 unreached, 108 changed-sector, 106 missing-row and 52 missing-positive-price cases in each 3,240-case view. These duplicate views do not create additional independent observations.
- Primary view: all 90 fits available. Lag view: 85 available and five origin-2003 fits unavailable because only two transitions remain. These failures remain in denominators.

All 18 origin forecast loops completed in 11.4 seconds locally. The unchanged-production reference completed separately in 7.17 seconds after exact replay checks; summary calculation and independent reproduction are additional work. These timings describe this environment, not a performance guarantee.

## Frozen primary decision: waits zero and four

| Measure | B2 | C1 |
|---|---:|---:|
| Matched observed cases | 1765 | 1765 |
| Normalized 80% interval score | 0.437239 | 0.426272 |
| 80% interval coverage | 74.56% | 76.84% |

The score improves by 2.508%. The paired score difference has descriptive calendar-block 95% limits [-0.021481, -0.002359], using four-origin circular blocks, 1,000 resamples and 18 origins. These limits describe reused, dependent retrospective histories; they are not a prospective calibration guarantee.

All twenty primary sector/type/wait strata meet the frozen no-more-than-10% score-regression protection. Aggregate coverage is closer to 80% and availability is no lower. The 5% primary improvement criterion fails. The decision therefore remains **reject-first-C1-comparison**, despite a favorable smaller average difference. No threshold, seed, parameter or additional layer was changed after seeing these results.

## Every wait and training view

Lower interval score is better; width and median signed bias use the known four-year origin budget as denominator. Counts below are observed cases with available forecasts; all missing/unreached cases remain in the full artifact. Wait eight is exploratory.

| Training lag | Wait | Model | Available observed | Origins | Nonoverlapping origin-to-last-bill windows | Score | Coverage | Width | Median bias |
|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | B2 | 1023 | 18 | 5 | 0.2048 | 79.2% | 0.1297 | +0.0166 |
| 0 | 0 | C1 | 1023 | 18 | 5 | 0.1995 | 82.8% | 0.1290 | +0.0129 |
| 0 | 0 | no-real-growth | 1023 | 18 | 5 | 0.3356 | 32.1% | 0.0319 | -0.0288 |
| 0 | 0 | fixed-4-3 | 1023 | 18 | 5 | 0.3839 | 0.0% | 0.0000 | -0.0114 |
| 0 | 4 | B2 | 742 | 14 | 2 | 0.6697 | 69.9% | 0.4297 | +0.0853 |
| 0 | 4 | C1 | 742 | 14 | 2 | 0.6531 | 70.9% | 0.4280 | +0.0803 |
| 0 | 4 | no-real-growth | 742 | 14 | 2 | 1.1910 | 24.8% | 0.0930 | -0.1300 |
| 0 | 4 | fixed-4-3 | 742 | 14 | 2 | 1.1728 | 0.0% | 0.0000 | -0.0608 |
| 0 | 8 | B2 | 489 | 10 | 1 | 1.4104 | 59.5% | 0.8093 | +0.2337 |
| 0 | 8 | C1 | 489 | 10 | 1 | 1.3955 | 60.2% | 0.8074 | +0.2297 |
| 0 | 8 | no-real-growth | 489 | 10 | 1 | 2.1410 | 19.6% | 0.1509 | -0.2401 |
| 0 | 8 | fixed-4-3 | 489 | 10 | 1 | 1.9760 | 0.0% | 0.0000 | -0.1149 |
| 1 | 0 | B2 | 963 | 17 | 5 | 0.2067 | 77.0% | 0.1302 | +0.0193 |
| 1 | 0 | C1 | 963 | 17 | 5 | 0.2013 | 80.3% | 0.1297 | +0.0161 |
| 1 | 0 | no-real-growth | 963 | 17 | 5 | 0.3193 | 32.9% | 0.0315 | -0.0267 |
| 1 | 0 | fixed-4-3 | 1023 | 18 | 5 | 0.3839 | 0.0% | 0.0000 | -0.0114 |
| 1 | 4 | B2 | 689 | 13 | 2 | 0.7085 | 65.7% | 0.4326 | +0.0965 |
| 1 | 4 | C1 | 689 | 13 | 2 | 0.6882 | 67.8% | 0.4311 | +0.0917 |
| 1 | 4 | no-real-growth | 689 | 13 | 2 | 1.1201 | 27.4% | 0.0918 | -0.1196 |
| 1 | 4 | fixed-4-3 | 742 | 14 | 2 | 1.1728 | 0.0% | 0.0000 | -0.0608 |
| 1 | 8 | B2 | 441 | 9 | 1 | 1.4840 | 56.8% | 0.8117 | +0.2506 |
| 1 | 8 | C1 | 441 | 9 | 1 | 1.4731 | 57.6% | 0.8100 | +0.2475 |
| 1 | 8 | no-real-growth | 441 | 9 | 1 | 2.0549 | 18.9% | 0.1410 | -0.2243 |
| 1 | 8 | fixed-4-3 | 489 | 10 | 1 | 1.9760 | 0.0% | 0.0000 | -0.1149 |

Fixed 4%/3% is a deterministic reference with zero-width intervals, not a competing calibrated probabilistic model. No-real-growth retains the shared simulated CPI path. The lag view has a different available-origin set; raw view means must not be interpreted as matched causal effects of publication delay. Nonoverlap counts are conservative calendar diagnostics, not estimated effective sample sizes.

## Comparison with the unchanged current process

The B0 adapter reconstructs current-production origin bundles and preserves its eleven-price-level minimum (origin 2010 onward). Unlike capped B2/C1 training, the original B0 sector index uses all eligible nonwithheld origin institutions. This declared data-footprint difference is retained. B0 still uses its original monthly pricing/cent-rounding; new models directly predict four annual reported charges, so this first cost experiment does not assert a complete monthly household-policy equivalence.

Exact cached factor replay passed ninety strict-equality comparisons against the original factory across five sectors, two school-history kinds, three waits and three trials, plus a hand-checkable four-year budget fixture. The full B0 archive has 3,240 records and 1,260 numeric forecast distributions for calendar-reached windows. Of these, 1,147 have complete observed outcomes; the remaining forecast distributions cannot supply missing truths. Its cache is independently checked against pinned source hashes, seed/trials, anchors and unique case identities.

| Wait | Common observed cases | B0 score | B2 score | C1 score | B0 coverage | C1 coverage |
|---:|---:|---:|---:|---:|---:|---:|
| 0 | 626 | 0.213994 | 0.198532 | 0.189285 | 44.21% | 83.15% |
| 4 | 375 | 0.643515 | 0.709291 | 0.684446 | 38.55% | 63.83% |
| 8 | 146 | 1.161072 | 1.573515 | 1.561775 | 28.39% | 45.83% |

Across the 1,001 common primary cases, equal-wait aggregate scores are B0 0.428754, B2 0.453912, C1 0.436866. C1 is 1.89% worse than B0 on that primary aggregate.

Near entry, C1 improves the observed common-case interval score by approximately 11.55% and coverage rises from 44.21% to 83.15%. That is a useful prespecified horizon-specific finding, not a post-hoc promotion gate. At wait four the C1 score is worse than B0, and at wait eight it is substantially worse with only three common origins and one nonoverlapping full window. Broader intervals improve coverage while sacrificing sharpness and increasing long-horizon positive median bias. These results do not establish dominance or an activated near-entry model.

## Known and unknown institutions

| Type, primary waits | Cases | B2 score | C1 score | B2 coverage | C1 coverage |
|---|---:|---:|---:|---:|---:|
| known | 868 | 0.399631 | 0.387068 | 73.52% | 76.31% |
| unknown | 897 | 0.474847 | 0.465476 | 75.60% | 77.38% |

Unknown institution IDs provide stable simulation keys only; their histories are excluded from every training mean, residual pool and conditional feature. The case population remains established positive-price on-campus schools under the original origin-only cohort rule. Results do not generalize automatically to national-average indices, institutions with missing housing histories or actual family attendance/aid choices.

## Isolation, artifacts and verification

Independent review validates all 6,480 unique grid records, 180 cutoff traces and 18,696 score/formula/origin-budget identities. Real-data future-poisoning changes post-cutoff prices, CPI and directory metadata—including added future identities—and proves exact input/fit/forecast invariance. Lag tests preserve the explicitly supplied origin anchor/cohort while poisoning everything after the earlier training cutoff. Separate B0 checks poison future foundation macro/cost data and prove unchanged cutoff cohorts/factors. Tests also cover signed reversal, same-identity draws, unknown-state exclusion, anchor identity, hand-computed bill totals, proper normalization and matched missing denominators.

Local targeted tests, independent full frozen forecast reproduction and `npm run check` pass. Dedicated CI [44604821126](https://github.com/jschell/education-finance/actions/runs/44604821126) accepts implementation `9c9f7420ab0fd1644b01e79cf97fb0647385fabc`: 26 targeted tests, fresh B0 replay, the full 6,480-case numerical comparison and 216 application/financial tests. The first attempt, CI 44604466105, passed the tests/replay but failed writing a missing temporary `.cache` directory; the workflow and commands now create it. This packaging correction changed no scientific source, artifact, seed, tolerance or score. Exact delivery/checkpoint identities belong in continuity. The fast workflow regenerates the B0 reference and independently recomputes the complete new experiment, using the predeclared numeric tolerances. The earlier 320/960-cell experiments are not rerun or altered.

- [Full compact walk-forward artifact](../data/calibration-diagnostics/retrospective-walkforward.json.gz)
- [Current-process reference archive](../data/calibration-diagnostics/retrospective-current-reference.json.gz)
- [As-of data adapter](../scripts/retrospective_inputs.py)
- [Pure finite-support B2/C1 models](../scripts/retrospective_cost_models.py)
- [Fixed experiment and scoring](../scripts/run_retrospective_walkforward.py)

```sh
mkdir -p .cache
node scripts/retrospective_current_baseline.mjs --self-test
node scripts/retrospective_current_baseline.mjs --output .cache/retrospective-b0.json
python -m unittest discover -s tests -p 'retrospective*test.py'
python scripts/run_retrospective_walkforward.py --verify --b0 .cache/retrospective-b0.json
npm run check
```

## Conclusion and limits

This run demonstrates that genuine historical forecast comparisons can be executed now with available data and enforced future-information isolation. It does not establish a qualified replacement: C1 misses its 5% criterion and loses to the current process on the common primary score aggregate. The near-entry improvement and longer-horizon bias are diagnostic findings for a separately justified future hypothesis, not permission to tune this batch. Stop this first comparison.

Revised-data hindsight, origin-price/CPI availability assumptions, shared calendar shocks, overlapping windows, selective on-campus cohorts and thin long-wait evidence remain explicit limitations. The lag check is not actual release-vintage or source-coherent evidence. Investment returns, required deposits and individual/capped-household funding reliability were not evaluated in this first cost-only stage. No historical real-time qualification, forward funding calibration, production activation, merge or deployment occurred.

Artifact SHA-256 `data/calibration-diagnostics/retrospective-walkforward.json.gz`: `f4a6de1d7d987c2efca6ca950f7b435a9ce3a831c521025b3e110e1d3a0e78a7`.

Artifact SHA-256 `data/calibration-diagnostics/retrospective-current-reference.json.gz`: `fbfc49e8ed0797f4d19392aaa805f79e08faada2c53fb66c2cd17fa1f89b9f4b`.
