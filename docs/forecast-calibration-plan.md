# Current-model forecast calibration: plan and frozen protocol

Authorized 2026-11-16. Starting revision: 58dbed827ccba10c248721080475e8314e40012a (app 0.13/model 12). This protocol is committed before scoring. Release adds evidence and prospective infrastructure; financial defaults remain unchanged unless a separately reviewed promotion is justified. No old report or prospective record is rewritten.

## Work sequence

1. Build origin-only school cohorts from pinned raw IPEDS selected rows, with exact UNITID, sector/residency, positive tuition/on-campus room-board, and supplied imputation flags. Audit missing outcomes and train/test identities.
2. Evaluate prespecified baseline, existing coherent hierarchy and one earlier-error correction on school-level four-year bills. Separate known and withheld-history schools, development and reserved periods, bias and interval width, nominal and real costs.
3. Evaluate current-model complete funding ledgers and capped two-student households with observed cost and reconstructed asset paths, including grants, income, gifts and dated deposits. Publish reliability bins, Brier scores, uncertainty/support diagnostics and first missed bills.
4. Correct snapshot defaults to the same active bundle used by the worker, freeze a new current-model synthetic forecast record, and add source-checked outcome ingestion/scoring with missing outcomes explicit.
5. Publish current results in the app and documentation, verify deterministic reports, financial tests, phone/iPad/keyboard/project-prefix behavior, merge and verify Pages/live bytes/browser.

## Data and selection fixed before scoring

- Sources: `data/raw/ipeds/selected.csv.gz`, `data/raw/cpi.csv` and the active foundation bundle. No new live scraping or private family data. The 1990s research bridge is not spliced.
- Origin years 2010–2020; outer four-year bill forecasts use 2011–2020, waits 0/4/8. Price levels start 2000. Require positive tuition and housing and a stable raw sector for every year 2000 through the origin, never beyond it. This selects established schools as of origin, not all institutions. Revised source vintages remain a limitation.
- UNITID hash modulo five reserves approximately 20% of institutions as unknown-school tests. Their pre-origin histories never enter sector or hierarchy fits; only their entered origin budgets are used. Known-school tests come from the remaining training identities. Choose up to six per sector/type by fixed identity hash, never future outcomes or prices. All cohort and missingness counts are retained.
- Sector panels are rebuilt from the origin-selected training schools, using equal-school geometric levels and August CPI. Hierarchy fitting uses at most 200 deterministic training schools per sector for bounded runtime; sampled known schools come from this fit pool. All observations stop at origin; macro/donor transitions stop before origin. No current SPF survey anchors enter historical tests.
- Baseline is the current production path factory and 4% tuition/3% housing nominal cost process. Hierarchy is the unchanged previously specified candidate, with exact known UNITID or an explicit unknown key. It cannot stack old residual layers.

## Prespecified earlier-error candidate

Fit errors from baseline school endpoint forecasts at 2/5/10 years, using 128 paths and seed 850213. Each error comes from that earlier origin's own origin-only cohort and factory. Fit only endpoints published as historical levels through the outer origin; fit by sector using known training identities only, then evaluate the same fitted correction separately on known and withheld-history schools. Withheld-school endpoint errors are retained for diagnostics and never enter correction fitting. Never use outer complete-bill scores to tune the candidate.

For each horizon, group paired log actual/median errors by target year. Three target years permit a median-of-year-medians bias multiplied by n/(n+10). Five permit an empirical paired year-then-school residual draw centered on that bias, scaled by sqrt(n/(n+10)). Sample target years equally, then one school within the selected year, preserving paired errors and avoiding school-count inflation of temporal support. Interpolate cumulative log factors through zero and available horizons; explicitly flag extrapolation. Apply this candidate alone to the baseline's academic-year costs before repricing ledger bills; do not combine it with the hierarchy or other corrections.

## Scoring and dependence

Outer forecasts use 400 paths, seed 850213. Retain all sampled cases; unobserved outcome components or changed raw sector make a complete-bill outcome unavailable with a reason. Evaluate bill totals and tuition/housing separately, 80% interval score and width normalized by the four-year budget known at the origin (never the realized outcome), median signed/absolute bias, lower/upper misses and PIT rank. Real-dollar comparisons use preceding-month observed CPI and each forecast path's own deflator once.

Report all origins descriptively. Development outcomes end by 2016; 2017–2019 completed bills are transitional diagnostics; final outcomes end 2020–2023. These reserved outcomes were previously examined in other studies: this is a newly frozen comparison, not an untouched economic experiment. Any candidate parameters for an outer origin use only then-completed endpoint records, not later final results.

Average schools within origin/sector/type, sectors within origin/type, then origins equally. Do not weight 10,000 related plans as independent economic histories. Report distinct origin and target years, greedy nonoverlapping outcome windows, and an origin-cluster bootstrap interval (seed 461809, 1,000 resamples) as a dependence diagnostic, not a formal confidence guarantee under overlapping windows.

## Horizon-specific qualification, not automatic activation

For each candidate, school type and wait, consider final matched cases only. Require at least three distinct origins; residual candidates additionally require at least three earlier target years for every fitted knot actually used and a supported knot at or beyond the last attendance-year forecast horizon. Require 5% lower interval score, coverage closer to 80% (equal distance is acceptable), absolute signed bias no more than baseline +0.02, and no more than 10% score degradation in any sector. Also report a zero-score oracle feasibility check on these same eligible cases. Zero/unsupported baselines are unavailable, not a pass. Report `passed`, `failed` or `insufficient-evidence` separately per horizon. A passing research comparison is not automatic production activation or a claim about unsupported horizons or today's survey anchors.

## Complete funding tests

Use five opening-savings factors 0.55/0.70/0.85/1/1.15 times four origin annual budgets, cash and balanced profiles, base deposits 1% of the origin annual budget per month until entry, 2% annual deposit step-up, general grants 10% of tuition for four years, school grants 5% for two years, direct income 5% of annual budget, and one gift 25% of annual budget in September after origin. Reprice actual bills using school prices and observed CPI; replay five-year Treasury repricing, bill accrual and equity months on the same production ledger. Compare covered-bill success and first shortfalls, not just ending balances. These are synthetic fixed-policy plans, not observed family decisions.

Report current-baseline funding probabilities only; candidate promotion would additionally require its own funding evidence. Reliability bins [0,.2),[.2,.4),[.4,.6),[.6,.8),[.8,.9),[.9,.95),[.95,1], with predicted/observed frequencies and distinct origins. Brier scores compare a fixed 50% reference and an expanding base rate using only earlier completed outcomes in the same wait/profile/type. Explicitly mark bins with fewer than three origin years as thin support.

Two-student cases use known schools: same institution versus different institutions, second enrollment two years later, waits 0/4/8, opening factors .70/1, balanced profiles, and caps absent or 0.75% of the combined two origin annual budgets. Preserve student ownership and proportional monthly cap allocation before both simulated and realized ledgers. Joint success requires both students to pay every bill. Incomplete joint windows stay unavailable, including unsupported wait-8 cases.

## Prospective record

The worker and snapshot generator share the active bundle filename. Default snapshots must verify its canonical hash and source commit; nonproduction bundles require an explicit flag and label. Keep the model-9 snapshot immutable. New current-model records use synthetic budgets, model/bundle/source hashes, as-of date, annual academic-year target definitions and null outcomes. Reject overwrite, future/unpublished outcomes, mismatched definitions/identity and nonpositive prices. Score only comparable observed baseline AND target levels supplied with their sources/publication dates. Missing or unreached targets never become successes. This synthetic price record does not validate household funding probabilities.

Pre-score arithmetic amendment: the initially proposed 1.5% combined-budget cap would not bind the specified 1% deposits over these waits. Before any financial scores, replace it with 0.75% so the capped cases actually exercise the constraint.

Implementation-review amendment, before interpreting any scores: error curves must never learn from withheld-school identities, including their older endpoint errors. The baseline does not use individual school history, so its training-school residual curve transfers to the withheld population; transfer performance is evaluated separately. Unreviewed implementation passes are not release evidence. No score-based parameter tuning is permitted.

Scoring implementation clarification before inspecting results: normalize interval scores by the known four-year origin budget, not by realized actual costs. Outcome-dependent weights would compromise the proper-score comparison. Signed relative bias remains a separate descriptive diagnostic.
