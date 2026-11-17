# Decision scenarios release — implementation and findings

2026-11-17 America/Los_Angeles. App 0.15.0; additive diagnostic methodology `funding-decisions-1.0.0`; core `college-funding-12.0.0`, schema5 and the active foundation remain unchanged. Plans were committed before implementation (`8e900f0`) and before historical scoring (`e310aa2`). Read the [frozen protocol](decision-release-plan.md), [current contracts](model.md#additive-decision-diagnostics--funding-decisions-100) and [compact evidence](../site/data/decision-validation.json).

## Implemented

- Attendance/support alternatives on matched paths: extra attendance, interrupted deposits, expiring grants, lost first-year income and delayed gifts. No event likelihoods, saved-input changes or automatic support extensions.
- Same-budget household policy comparison with cent conservation and no transfers. Priority reads current realized data and origin-reference future bills only; the existing gauge and verified fixed-share required-deposit proposal remain unchanged.
- Origin-only near-threshold historical evaluation alongside the original broad grid. Resource choices use fitting draws; verification and observed outcomes cannot retune them. First known/withheld public/private four-year identity is chosen by the existing deterministic origin hash order. All registered cases, missing outcomes and unsupported waits remain visible.
- Collapsed accessible tables and complete JSON assessment export; separate report hash and full static module dependency identities; CI reproduces cases/report and exercises the new tables/export at the project prefix.

## Accounting and failure checks

Four $25,000 attendance years funded by $100,000 succeed at zero returns/growth; a fifth produces a $25,000 gap. Missing twelve $500 deposits produces a $6,000 gap. Tests cover grant expiry, income removal, gift collisions/delays beyond the goal, nonborrowing opening reserves and inapplicable alternatives. Extra-year paths preserve common economic and price prefixes.

The sibling counterexample succeeds under priority and fails under fixed deposits while preserving every month's budget, dates and earmarked balances. The opposite case is retained: priority can overfund an earlier student's goal when a future gift would cover it, leaving a later student short. A nonanticipativity test changes future sampled returns, bills and gifts and requires all earlier allocations to remain identical. Fractional-cent caps round down, preventing any overrun.

## Evaluation findings

The report registers **2,160 individual plans**, with **1,296 observed** and **864 unreached** outcomes. Of the observed forecasts, **864 are between 5% and 95%**, while 196 are exactly 0/1 on the finite sample. These plans use only **four school identities** across ten overlapping origins and three nonoverlapping four-year windows; they are not independent observations or a representative school population. Equal-origin/sector Brier is **0.084** for the stochastic forecast versus **0.203** for the fixed-reference hard classification and **0.134** for the zero-return/zero-price-growth ledger. Beating these baselines does not establish economic calibration, and near-boundary selection changes the mix relative to the original broad grid.

The household study registers **90 resource-selected households**, each assessed under both policies (180 policy rows). All caps bind. There are **36 observed policy pairs**: priority improves funding success in **2**, worsens it in **0**, and ties in **34**. Mean realized unpaid bills fall by approximately **$52** across those pairs. This small retrospective comparison does not contradict the separately retained synthetic priority failure case. Wait-0 has 24 observed pairs, wait-4 has 12 and wait-8 has zero. No wait-8 success rate is inferred. Resource deduplication retains all target/multiplier aliases; none happen to tie in this source run.

Funding inputs remain controlled synthetic assumptions inherited from the existing school-plan helper: general grants at 10% of origin tuition for four years, school grants at 5% for two years, income at 5% of origin annual budget, and a gift at 25% of that budget the following September. Individual pre-entry deposits use 1% of origin annual budget with 2% annual step-ups when wait is positive; wait-0 starts with no deposits. Households instead use the frozen through-attendance 1% schedule with zero step-up. These are stress-test policies, not observed family aid or behavior.

Local `npm run check` passes **187/187 tests**. Financial, source-identity, evidence reconciliation and old report-integrity tests pass. Delivery and browser acceptance are tracked in continuity; local Chromium acceptance is not claimed. These are a retrospective diagnostic extension on already inspected histories, not a new untouched holdout, an activation gate or proof of future calibration. Underlying school cohorts and return anchors are reconstructed from revised sources rather than original publication vintages.

## Remaining work

The bounded 30-event source-price trace is still unexecuted. Use it and the retained source-quality/persistence findings before specifying one coherent cost candidate with a newly frozen protocol, known-process tests, complete-bill scores and funding checks. Do not stack a correction onto the active foundation merely because a boundary study beats a hard-classification baseline. Wait-8 household and wait-18 full-bill evidence remain unavailable. Future prospective outcomes are still pending; physical iOS Safari persistence remains unverified. Richer transfer/attendance/account schedules and optimal allocations are separate work.
