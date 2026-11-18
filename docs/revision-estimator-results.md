# Matched observation graph and bounded estimator — recovery gate failed

2026-11-18 America/Los_Angeles. Research method `revision-cost-estimator-1.0.0`; base main `30ad4b391fddebebc952071104b0debbb91c8932`. The [execution contract](revision-cost-estimator-execution.md) was committed remotely at `f7af7074296c3eb65dcc06c5a3298c703914001d` before implementation/experiments. The [numerical amendment](revision-estimator-numerical-amendment.md) was committed locally at `5039c18` before the complete registered suite and published as `06ac5fc286e1eff259871fd63d191075aacda181`. Prior failures and recovery thresholds were retained. **No historical school-cost likelihood, forecast score or production activation was computed.**

## Delivered

- [Matched observation-graph adapter](../scripts/price-panel/observation-graph.mjs): verifies the pinned panel/dictionary/shard bytes, filters source collections before origin, matches original and same-file representations, enforces paired positive prices/CPI and stable directory/definition support, and selects the longest contiguous matched segment without bridging breaks. Both policies use the identical school/year edges. Exact source endpoints are deduplicated across edges with conflicting payloads rejected. Withheld identities never enter fitting graphs/common pools.
- [Bounded estimator](../scripts/revision_cost_estimator.py): joint paired Gaussian diffuse-offset likelihood, school blocks and shared-year Woodbury solve, analytic covariance derivatives, bounded analytic drift profiling, fixed-start bounded optimization, independent stationarity verification, boundary/curvature/profile diagnostics and explicit unsupported/nonconvergent results. Historical fitting is programmatically blocked; only synthetic graphs are accepted by the fitting entry point.
- [Registered synthetic worlds](../scripts/revision_cost_synthetic.py), [recovery runner](../scripts/validate_revision_estimator.py), independent dense covariance/likelihood/gradient tests, origin/identity/definition/missingness tests, and versioned evidence below. No application dependency, UI, financial default, original dataset/report or prospective record changed. NumPy/SciPy are pinned isolated research dependencies.

## Actual panel support audit — extraction only

The [source-identified support report](../data/calibration-diagnostics/observation-graph-support.json) reproduces offline at three example origins. Each entry is `fitting institutions / matched annual paired edges`; six eligible withheld identities per sector/origin are separately named and excluded. Counts do not imply independent economic histories.

| Sector | Origin 2011 | Origin 2015 | Origin 2020 |
| --- | --- | --- | --- |
| public4 | 200 / 600 | 200 / 1,323 | 200 / 2,155 |
| public4out | 200 / 600 | 200 / 1,323 | 200 / 2,155 |
| public2 | 156 / 468 | 177 / 1,137 | 187 / 1,918 |
| public2out | 156 / 468 | 177 / 1,137 | 187 / 1,918 |
| private4 | 200 / 600 | 200 / 1,300 | 200 / 2,064 |

The respective graphs have only 3, 7 and 12 distinct academic transition years across institutions; more endpoint records do not add macro years. Longest-segment, stable-name and matched-definition restrictions change sample composition. A changed name is a conservative exclusion, not proof of a new economic identity. Three example origins are not the full future evaluation. **Collection-year proxy, not an actual vintage backtest**; strict original-vintage support remains zero.

## Synthetic recovery results

[Full twelve-world report](../data/calibration-diagnostics/revision-estimator-recovery.json): six prespecified ideal seeds, eight schools, 24 years and two independent source representations per academic year, plus the same six worlds with systematic reporting bias. All six ideal worlds have numerically converged selected starts; four satisfy the conservative local identification checks. Seeds 2026111804 and 2026111806 have nonpositive full scaled curvature at a shared-correlation boundary. Their analytic design rank is still four. This is a conservative local curvature/boundary warning, not proof of structural nonidentifiability of the ideal model.

| Variance family | Median estimated / true tuition variance | Median estimated / true housing variance |
| --- | --- | --- |
| Shared sector | **0.429** | 0.570 |
| Permanent school levels | 0.973 | 0.805 |
| Temporary innovations | 1.007 | 1.181 |
| Source measurement | 1.085 | 1.005 |

Median absolute annual drift errors are 0.00384 and 0.00384 real log units. The frozen gate requires all six supported fits and all variance ratios in [0.5,2], as well as the drift check. **It fails both identification support and shared tuition variance recovery.** Successful arithmetic checks and small drift errors cannot override that failure. Six simulated histories are a small diagnostic suite, not an estimator bias theorem or economic coverage study.

All six reporting-bias worlds numerically converge and pass these local curvature checks. This does not validate the misspecified model: a shared reporting shift is absorbed into the inferred economic process. The same worlds' observed paths could result from a genuine shared economic shift; additional independent representations do not identify a bias they all share. Better numerical support under misspecification is itself a caution against reading a converged likelihood as a true economic decomposition.

## Numerical failure handling and verification

The first development run exposed a singular-corner L-BFGS-B stagnation exit with a large gradient. The committed amendment requires independent feasible Newton verification/polish of the exact objective with the unchanged 1e-8 parameter/objective criteria and iteration cap. Singular trial covariances are never repaired with diagonal jitter or returned as finite fitted likelihoods. A singular curvature solve exposed by seed 2026111805 was changed to an explicit unavailable start; alternate prescribed starts may still converge. Every start, reused profiled-drift start, boundary and rejected solution remains in the report.

Tests independently assemble raw cross-school/cross-source covariance and compare the transformed dense likelihood with the block solve, check all 12 analytic derivatives against finite differences, verify school-offset invariance and correlated active drift bounds, and reject duplicate observations, short/single-school designs, exhausted iterations and historical fitting. Five graph tests and two artifact-integrity tests accompany the four Python numerical tests.

Validation: `npm run check` passes **210 Node tests**; six existing Python extraction tests and four new numerical tests pass. Support audit reproduces byte-for-byte. Numerical recovery reproduction uses pinned NumPy 2.3.5/SciPy 1.17.0 with one BLAS thread and compares statuses/gates exactly, parameter/drift values at rtol 1e-5/atol 1e-7, objectives at rtol 1e-8/atol 1e-6. Iteration counts, messages and roundoff-level curvature are execution diagnostics, not bitwise portable values. CI installs these isolated versions and runs the full suite; final PR acceptance is linked from continuity.

Primary numerical API references: [SciPy bounded L-BFGS-B](https://docs.scipy.org/doc/scipy/reference/optimize.minimize-lbfgsb.html), [Cholesky factorization](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.cho_factor.html), [Cholesky solve](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.cho_solve.html). These libraries do not validate the statistical assumptions.

## Next action — preserve the failed gate

Historical fitting stays blocked. First diagnose shared-variance recovery and boundary geometry in a newly committed finite-sample design study: distinguish realized common-shock sampling variation from estimation error, compare profiled versus known synthetic drift as an explanatory control, and vary economic years separately from institution counts. Also profile forecast-relevant latent cumulative-cost variance along weak decomposition directions; local covariance curvature alone is not a confidence interval. No new correction, threshold relaxation, seed replacement or historical score selection is justified by this release.

Only after that study can a separately frozen estimator revision or reduced estimand be proposed. Preserve this candidate/report as a failed prerequisite rather than silently substituting a simpler model and claiming the original gate passed. Production model12 and its provisional assumptions remain unchanged.
