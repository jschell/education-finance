# Separable covariance study — results

As of 2026-11-18 America/Los_Angeles. Method `separable-cost-1.0.0`. The [protocol](separable-cost-study-protocol.md) was published at `c725ca9f5ce7176e7f22c36b655f82013ea6a0e9` before implementation and fresh outcomes.

**Computational availability passes. The matched-model screening fails. Historical eligibility remains unsupported; production activation is false.**

The fixed batch completed all 960 cells: 64 fresh worlds at each of three depths in five arms. All 960 exact-posterior fits and joint forecasts are available. No optimizer or bootstrap refit is used. This is a different, smaller statistical family; its availability is not a paired improvement measurement over the old optimizer, and none of the old unavailable bootstrap slots is relabeled.

The four innovation covariances are constrained to one paired matrix. GLS and inverse-Wishart integration propagate parameter uncertainty exactly under that fixed shape. The shape restriction permits information pooling across schools and reporting representations; it does not create more macroeconomic years. No genuine reporting-population or source-vintage gap is resolved.

## Matched-process coverage and proper scores

The table reports 80% complete four-year bill interval coverage and normalized interval score. Lower interval score is better. Coverage uses all 64 worlds per row. The score comparison is integrated versus the same reduced model with plug-in covariance and drift, not the rejected old model.

| Transitions | Wait | Covered / 64 | Coverage | 95% Wilson interval | Integrated score | Plug-in score | Coverage gate |
|---:|---:|---:|---:|---|---:|---:|---|
| 3 | 0 | 59 | 0.922 | 0.830–0.966 | 0.1530 | 0.1471 | fail |
| 3 | 4 | 54 | 0.844 | 0.736–0.913 | 0.4952 | 0.5095 | pass |
| 3 | 8 | 54 | 0.844 | 0.736–0.913 | 0.8671 | 1.0218 | pass |
| 7 | 0 | 54 | 0.844 | 0.736–0.913 | 0.1895 | 0.1891 | pass |
| 7 | 4 | 50 | 0.781 | 0.666–0.865 | 0.4684 | 0.4989 | pass |
| 7 | 8 | 46 | 0.719 | 0.599–0.814 | 0.7665 | 0.8557 | pass |
| 12 | 0 | 49 | 0.766 | 0.649–0.853 | 0.1565 | 0.1582 | pass |
| 12 | 4 | 49 | 0.766 | 0.649–0.853 | 0.4629 | 0.4736 | pass |
| 12 | 8 | 43 | 0.672 | 0.550–0.774 | 0.7115 | 0.7776 | fail |

Two of nine matched coverage gates fail: three transitions/wait zero overcovers at 59/64, while twelve transitions/wait eight undercovers at 43/64. Their Wilson intervals also exclude 0.8. All nine matched score gates pass the prespecified limit of no more than 5% worsening. At wait eight the integrated mean interval score improves by 15.1%, 10.4% and 8.5% at 3/7/12 transitions. These gains are limited to this reduced-model plug-in comparison and do not establish calibrated funding probabilities.

## Every stress arm remains visible

The table shows wait eight for compactness. The [raw artifact](../data/calibration-diagnostics/separable-cost-study.json) retains every wait, cell, marginal coverage, width, finite-draw error and paired normal Monte Carlo interval. No arm was selected for the stopping decision.

| Arm | Transitions | Available / 64 | Wait-eight coverage | Integrated score | Plug-in score | Coverage gate |
|---|---:|---:|---:|---:|---:|---|
| unequal-family | 3 | 64 | 0.766 | 0.8217 | 1.0164 | pass |
| unequal-family | 7 | 64 | 0.672 | 0.6553 | 0.7455 | fail |
| unequal-family | 12 | 64 | 0.688 | 0.6168 | 0.6793 | fail |
| correlated-reporting | 3 | 64 | 0.688 | 0.8505 | 1.0667 | fail |
| correlated-reporting | 7 | 64 | 0.656 | 0.6810 | 0.7762 | fail |
| correlated-reporting | 12 | 64 | 0.625 | 0.6475 | 0.7162 | fail |
| heavy-tails | 3 | 64 | 0.766 | 0.7865 | 0.9944 | pass |
| heavy-tails | 7 | 64 | 0.734 | 0.7161 | 0.7748 | pass |
| heavy-tails | 12 | 64 | 0.828 | 0.5045 | 0.5048 | pass |
| persistence | 3 | 64 | 0.766 | 0.8101 | 1.0409 | pass |
| persistence | 7 | 64 | 0.734 | 0.6795 | 0.7589 | pass |
| persistence | 12 | 64 | 0.625 | 0.7226 | 0.7963 | fail |

Across all arms, 9/45 complete-bill coverage gates fail; all 45 same-model score gates pass. Correlated reporting and persistence reach only 40/64 coverage at twelve transitions/wait eight. Every comparison has 64 paired worlds. Reusing the same seed streams across arms makes arm results dependent; they are not 960 independent macro histories.

## Guard correction and provenance

The first run completed in 23.9 seconds and is preserved at implementation commit `63ed743` and in `data/calibration-diagnostics/separable-initial-run/` with the exact runner, gzip scientific JSON and full run log. Independent review caught missing finite-derived-statistic checks and a distributional interpretation problem while that run was already in flight. The [guard amendment](separable-cost-study-guard-amendment.md) was published at `babc8760a0fb11d8c5633cf008b7f7e2778adc7c` before the corrective recomputation.

The corrected source adds finite-score/overflow rejection and labels the frozen `bias` statistic explicitly. Exponentiated Student-t log changes have no finite expectation: the 2048-draw mean error is a finite simulation diagnostic, not an expected-bill bias or a screening gate. No candidate, prior, seed, draw count, score or gate changed. The corrective 24.8-second run preserves **all 960 scientific cell records and the entire summary exactly**. Only source hashes and the explicit interpretation label differ. No rejection was tuned away.

Corrected artifact SHA-256: `3461af3cd92ec079c565d776d3ba1135983e0940a801dde6a2bb13c2b93464ed`. The artifact pins generating source hashes, Python/NumPy/SciPy versions and the original protocol commit. An independent reviewer confirmed archived/current cell and summary equality.

## Verification and stopping decision

Local verification passes 11 targeted tests and all 216 Node application/financial tests. The independent tests compare dense frozen likelihood and conditional covariance, whitened GLS, analytic marginal Student-t intervals, full joint path covariance, affine outcome transformations, an augmented-drift Gaussian limit, direct innovation covariance construction and singular/historical/overflow/failure guards. Dedicated CI independently recomputes all 960 cells under the pinned AVX2 toolchain without a completion cache. Read its exact-head result before claiming CI acceptance.

```sh
python -m unittest discover -s tests -p 'separable*test.py'
python scripts/run_separable_cost_study.py --verify
npm run check
```

Use the pinned runtime/environment from the [protocol](separable-cost-study-protocol.md) and [dedicated workflow](../.github/workflows/separable-study.yml). The `--verify` command performs the complete frozen numerical computation; it cannot turn a scientific failure into a pass.

This comparator supplies an optimizer-free uncertainty baseline and shows measurable score benefit from parameter integration, but it fails its own matched-process screening. Stop this batch. Do not tune family weights, expand seeds or relax coverage criteria to rescue it. No old-model superiority, household/deposit evidence, historical calibration or production qualification was evaluated. The immediate practical continuation is to finish independent delivery acceptance, preserve both rejections, and prioritize separately scoped reporting-population/original-vintage acquisition. Any different model or repeated screening batch requires another precommitted hypothesis and untouched evidence.
