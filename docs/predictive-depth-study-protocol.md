# Predictive depth and uncertainty study — frozen protocol

Committed before implementation or outcome scoring, 2026-11-18. Dependency: PR #14, merged at `c54d4901e61170ba4d5a32b224a9b5179c67ddda`. This is a synthetic estimator/prediction study, not historical calibration. Keep every preceding artifact, failed gate, default and historical-fitting block unchanged.

## Fixed experiment

- Fresh outer seeds 2026112001–2026112024: cross 3, 7, 12 annual transitions with 8, 32 schools. Reuse the exact common innovations and school prefixes when changing school counts or history length. Two source representations per academic year. The prior 8-school/23-transition experiment is preserved separately.
- Longer-history controls: first eight seeds, 24 and 48 transitions, eight schools.
- Compare profiled ML, REML, and one prespecified simpler REML with shared tuition/housing correlation fixed to zero. Other covariance families remain paired. Same bounds and stringent optimizer verification as the earlier study; failures and out-of-contract drift remain unavailable, never silently replaced.
- Truth: drift [.02,.01]; shared [.03,.02,.4], permanent [.04,.03,.2], temporary innovation [.05,.04,.3], independent source measurement [.02,.03,.1]; stationary AR(.5) temporary level. Parameter triples are standard deviation, standard deviation, correlation.
- Misspecification: first eight seeds, 12 transitions/eight schools. Five separate alternatives: source representations sharing 50% measurement covariance; common reporting shift [.08,.06] in the last two training years; standardized Student-t(5) innovations; a permanent school jump [.12,.08] halfway through training for the first quarter of schools; temporary persistence .8. Fit the original Gaussian AR(.5) likelihood in every case. These are sensitivity controls, not model-selection data.

## Forecast and bootstrap

Forecast two known schools jointly over horizons 0–13. Condition on training observations only, predicting latent log cost changes relative to the origin. Exogenous origin budgets are scales, not observations of hidden states. Keep common future shocks, school innovations and conditional temporary-state uncertainty. Independently check conditional Gaussian formulas against a dense reference, and check balanced-school likelihood/gradient against the existing generic implementation.

For the 8-school actual-depth cells, REML additionally uses 16 joint-history parametric bootstrap refits with deterministic independent seeds. Simulate a complete training graph under fitted parameters, refit, then condition the **original** observed history under each refitted parameter vector. This includes joint drift/covariance variation without adding a second analytic drift-uncertainty term. Use 256 forecast draws (16 per refit); plug-in and true-parameter oracle also use 256. Any missing outer fit or any failed bootstrap refit makes that mixture unavailable; retain its failure count and do not select only successful replicates. Sixteen refits are a bounded pilot with substantial Monte Carlo error, not a release-quality tail estimate.

## Complete-bill decisions

Use the production compiler, row repricing, cash ledger, required-contribution solver and cent-conserving household deposit schedule. Zero CPI and zero investment return isolate cost-process errors. Four years of attendance; entry waits 0, 4, 8. First student's annual tuition/housing budgets 10000/8000, second 12000/9000; second entry is two years later. Initial balances .9/1/1.1 times four current annual bills; monthly deposits .005 times annual budget until the month before entry. Wait-zero contributes zero months. Household base balances use factor 1 and cap deposits at .00375 times combined annual budgets, allocating proportionally without pooling balances.

Record 80% complete-bill interval coverage/width/interval score, median signed bill error, funding-failure Brier score, 90th-percentile required-monthly-deposit coverage (explicit impossibility where no deposit months), household failure Brier score and binding-cap evidence. Compare plug-in, bootstrap and oracle; include no-growth and fixed 4%/3% deterministic references, labeled synthetic cash-only controls. Keep parameter recovery alongside predictive diagnostics. Count outer worlds as the independent sample unit, not draws or overlapping waits; report binomial uncertainty and denominators. Do not assert improvement from wider bands alone.

## Metadata continuity and runtime

Audit real pinned-panel exclusions for exact school-name and definition-text mismatches, with deterministic examples, hashes and component/year support. A text/name mismatch is not proof of an economic break. Do not bridge without independently reviewed semantic equivalence; publish an empty reviewed-equivalence registry until such evidence exists. This audit must not fit prices.

Implement balanced synthetic likelihood decomposition as an exact optimization, tested against the generic likelihood. Preserve previous engines verbatim. Save resumable study cells keyed by source/protocol/dependency hashes, with validation and completion status; never reuse partial or mismatched results. CI may reuse expensive validated old reproductions only under an exact source/data/toolchain key, must always run mathematical/unit checks, and must offer a forced full reproduction dispatch. Cache completion means successful reproduction, not a passed scientific gate.

## Interpretation and completion

This study cannot promote a historical candidate. No threshold is relaxed, no fresh seed is discarded, and no covariance alternative is selected after results. Publish every cell and failures, source identities, deterministic rerun instructions, runtime and known limitations. If coverage or convergence fails, report it and keep fitting blocked. Run `npm run check`, old/new numerical mathematics tests, new study reproduction and focused audit reproduction. No UI/financial defaults change.
