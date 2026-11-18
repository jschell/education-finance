# Realized-shock attribution, REML and boundary-aware diagnostics

2026-11-18 America/Los_Angeles. Research method `revision-cost-reml-study-1.0.0`, based on merged PR #13 at `3bf588bdc61a7a390eae9d88a3900e37729ce751`. [Protocol](reml-boundary-study-protocol.md) was committed at `c019c77833fe7ffecd5f6f87455c6426d8f4d32f` before implementation and experiments. Implements repair steps 1–3. **The v1 estimator, generator, tests and report—including its failed gate—remain unchanged. Production model12/defaults and the historical-fitting block are preserved.**

## Implemented

- [Separate instrumented generator](../scripts/revision_cost_trace.py) preserves the original RNG order and observed graphs exactly while retaining actual shared innovations. The first common shock is absorbed by initial school offsets; the variance attribution uses the following 23 academic transitions and keeps the first draw visible.
- [ML/oracle/REML study module](../scripts/revision_cost_reml.py) preserves the frozen v1 engine. Ordinary REML adds its drift-information determinant to the joint covariance objective and the corresponding projection to its analytic score. Known-drift ML is an explanatory oracle control. REML estimates standard unbounded GLS drift and explicitly flags fits on/outside the contract's drift box; it never applies a conventional REML adjustment to clipped drift.
- Boundary diagnostics distinguish interior regularity, a constraint-limited optimum, unresolved weak bounds, feasible negative curvature and nonstationarity. Legacy full-Hessian warnings are retained. A legitimate constrained minimum can have an indefinite full Hessian; that warning alone is not structural nonidentifiability.
- Shared-correlation profiles reoptimize the other covariance coordinates and applicable drift. They retain each optimizer/start and selected optimum. An independent check verifies that the actual profile fits are at least as good as holding nuisance coordinates fixed. These coarse curves are not confidence intervals or proof of precise identification.

[Complete study artifact](../data/calibration-diagnostics/reml-boundary-study.json) · [Runner](../scripts/validate_reml_study.py) · [Mathematical tests](../tests/reml_study_test.py) · [Actual profile verification](../tests/reml_profile_test.py)

## 1. Sampling variation explains part of the low shared variance

For the original six worlds, median realized sample variance / generating variance is **0.785 tuition, 0.853 housing**. These are the observed synthetic shared shocks themselves, not estimates extracted from prices. Original ML estimates / generating variance were **0.429 and 0.570**. Separately, median ML estimate / each world's realized sample variance is **0.723 and 0.661**; medians of ratios are not ratios of medians.

Thus this small set contained less realized shared variation than the generating covariance, and the fitted component was lower still. This identifies both a sampling contribution and an estimation/allocation contribution; it does not establish a universal multiplicative correction. The new artifact retains known-zero second moments, centered divisor-n covariance and divisor-(n-1) sample covariance for each world.

## 2. REML improves recovery, narrowly on the original worlds

Each cell below is the median fitted / generating shared variance. The six original worlds reuse their immutable v1 ML fits; all oracle/REML fits and all three fresh-world ML fits are new, prespecified synthetic fits.

| Group | Method | Tuition variance ratio | Housing variance ratio |
| --- | --- | --- | --- |
| Original six | ML | 0.429 | 0.570 |
| Original six | Known-drift ML oracle | 0.464 | 0.910 |
| Original six | REML | **0.501** | **0.685** |
| Fresh three | ML | 0.948 | 0.989 |
| Fresh three | Known-drift ML oracle | 1.047 | 1.017 |
| Fresh three | REML | **1.107** | **1.131** |

All 27 world/method combinations have numerically converged selected fits (six ML fits are reused, 21 fits are new). All nine REML GLS drifts are inside the contract. On both original and fresh groups, REML's median variance ratios for every covariance family are within the unchanged [0.5,2] comparison band, and median absolute drift errors are below 0.03. Oracle results are diagnostic only; true drift is unavailable in historical data.

The original tuition ratio **0.50117** barely clears the floor 0.5. Nine worlds, including six previously examined, are not a robust finite-sample qualification. A new estimator's comparative checks do not retroactively make v1 pass. The original failed gate is copied unchanged into the new artifact; historical fitting remains unauthorized.

## 3. Boundary flags now describe the right numerical issue

Under boundary-aware geometry, original ML has three interior-regular and three constraint-limited fits. The two earlier full-Hessian warnings (seeds 2026111804 and 2026111806) are constraint-limited optima with acceptable feasible local geometry, rather than automatic declarations of structural nonidentifiability. Under REML, the original group has four interior and two constraint-limited fits; the fresh group has two interior and one constraint-limited fit.

All selected-point and nuisance-profile fits converge; no profile point improves materially on its selected optimum. For seed 2026111804 the REML selected correlation is approximately -0.017; its explored profile objective increases by at most 0.865 across the prescribed grid. Seed 2026111806 selects the upper 0.95 correlation bound; its explored REML profile increases by at most 1.350. These shallow curves show that local numerical regularity does not establish a tightly determined shared correlation. No chi-square threshold or confidence coverage is assigned to these coarse profiles.

## Validation and evidence limits

`npm run check`: **212 Node tests** pass. Python checks: six extraction, four preceding numerical, five new mathematical/replay tests and one actual nuisance-profile test, **16 total**. New tests verify exact old/new generator replay, realized-shock statistics, v1 ML objective/gradient equivalence, dense and independent orthogonal-contrast REML, all covariance derivatives, fixed-drift handling, explicit drift-bound unsupported behavior and constrained-minimum versus feasible-saddle diagnostics. New artifact tests retain every seed, the old failed gate and the historical block.

Numerical reproduction uses pinned NumPy 2.3.5/SciPy 1.17.0 and one BLAS thread. Parameters/drift use rtol 1e-5/atol 1e-7 and objectives rtol 1e-8/atol 1e-6; optimizer messages/iteration counts are diagnostic. The full nine-world/method and four-profile rerun reproduced locally within those tolerances. CI repeats the original evidence and the new study. Software reproduction passing is separate from statistical qualification. Check the PR head for final CI acceptance.

Primary statistical references used: [statsmodels REML objective/score source](https://www.statsmodels.org/stable/_modules/statsmodels/regression/mixed_linear_model.html), [Stata mixed-model theory and REML treatment of fitted fixed effects](https://www.stata.com/manuals/memixed.pdf). Neither reference establishes recovery in our particular worlds or economic calibration.

## Next action

Steps 1–3 are implemented and yielded a useful estimator/diagnostic improvement. Before historical fitting, freeze the actual-information-depth study: 3/7/12 transitions as well as longer controls, school counts varied separately, and a larger fresh batch. Then assess uncertainty of the cumulative-cost quantities used in bills, including parameter uncertainty and shared reporting-bias sensitivity. Those are repair steps 4–5, not results delivered here. Keep strict-vintage unavailability, matched input policies, withheld protections and complete funding evidence requirements. No production probability, trend, price or forecast snapshot changes follow from this study.
