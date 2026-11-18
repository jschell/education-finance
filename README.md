# Education Finance

A static, browser-local college funding planner. **App v0.15.0 · model college-funding-12.0.0 · schema 5 · MIT license.**

[Open the planner](https://jschell.github.io/education-finance/)

**Continuing development in a new session?** Start with [project continuity](docs/continuity.md), [the active work plan](docs/active-work-plan.md) and [decisions](docs/decisions.md). They distinguish the deployed release from active calibration research and include a resume prompt.

[Deep model/scenario review](docs/model-and-scenario-review.md) · [Reusable research/models](docs/model-research-sources.md) · [Scenario design](docs/scenario-design-plan.md)

## Use the planner

1. Enter a student's current savings, enrollment month and annual tuition/housing budget. Other inputs are optional. Try an example opens temporary fictional data; Exit example restores your workspace.
2. Savings, contributions, investments, gifts and general aid belong to the student. Education scenarios share that funding while keeping their own costs, attendance and school-specific aid. Copying or switching a school path never copies money.
3. Calculate produces one assessment: a range across cautious/central/favorable assumptions, simulated outcome bands, an estimated central-case monthly contribution and historical validation. These cases have no probability weights or confidence level. The fixed-rate reference is a separate illustration inside the same assessment. Historical replay remains an optional calculation method.
4. Multiple students share economic paths. Household success requires all selected goals to be funded; earmarked money is not automatically transferred between students. A household deposit limit can constrain planned contributions.
5. Edits save in the current browser. Export a backup for another device; no cloud sync or telemetry exists. Example data does not replace saved plans. Schema-5 plans receive a metadata-only model upgrade. Incompatible schemas 1–4 and old backup formats remain unsupported.

## Decision scenarios and deposit policies

Calculate also includes collapsed attendance/support alternatives and a household comparison of proportional deposits with dated-bill priority. They use up to 256 matched paths and leave saved funding and the main forecast unchanged. Priority only reallocates new deposits within eligible dates and the same monthly budget; it can help or hurt and is not an optimizer. JSON assessment export includes diagnostic method/version and reference-world dated allocations.

[Release plan](docs/decision-release-plan.md) · [Method and results](docs/decision-release-results.md). The separate origin-only boundary study selects resources around fitted 80/90/95% thresholds, compares stronger simple ledger baselines and tests genuinely binding sibling caps. It supplements the original broad grid; no economic candidate or probability calibration is activated.

## Current-model calibration evidence

School-level origin-only cohorts, withheld-school tests and complete individual/household funding replays now accompany the earlier sector diagnostics. The app distinguishes research qualification, unsupported horizons and production activation. Financial defaults remain unchanged. New prospective snapshots use the same active bundle as the worker; future outcomes require reviewed, source-backed comparable indices.

The [bounded source-price trace](docs/calibration-price-trace-results.md) now documents same-academic-year revisions across pinned annual files, including values flagged Reported. These findings motivate a revision-aware source panel before the next economic candidate; no prices or forecasts were automatically corrected.

[Plan and frozen protocol](docs/forecast-calibration-plan.md) · [Results and fresh review](docs/forecast-calibration-results.md) · [Error-dispersion audit](docs/calibration-dispersion-audit.md) · [Next calibration work](docs/calibration-next-steps.md)

## Staged overhaul D

Practical planning now shows affordable annual budget ranges, first unpaid bill details, and jointly verified household deposit proposals with dated cap conflicts. Target-specific binomial sampling reserves replace the uniform cushion; independent verification remains mandatory.

The foundation release corrects conditional equity anchor enforcement and September–August market/cost pairing. The active snapshot is `site/data/calibration-foundation.json`; `foundation-validation.json` checks its process contracts. The old selection gate is explicitly oracle-infeasible, with unsupported horizons marked insufficient evidence. No new cost candidate has been promoted. Forecast probability coverage remains unresolved.

[Delivery status and fresh review](docs/overhaul-status.md) · [Authorized scope and stages](docs/overhaul-plan.md) · [Current methodology](docs/model.md) · [Prior model and evidence](docs/archive/model9.md)

All prior reports remain archived model-9 evidence. Reproduce them at commit `d0d536ca74103ef29853db1db340f47db5e182a9` or run the manual archived evidence workflows. Archived source copies retain their report-input identities; they are not current implementation checks.

## Develop and reproduce

Use Node 24+ and a local HTTP server rooted at `site/`. The app needs no installation or build step.

```sh
npm run check
node scripts/build_foundation.mjs
node scripts/validate-foundation.mjs
node scripts/validate-planning.mjs
node scripts/validate-hierarchy.mjs
node scripts/validate-current-calibration.mjs
node scripts/verify-current-snapshot.mjs
node scripts/validate-decision-boundaries.mjs
```

CI reproduces current reports, runs financial tests and checks synthetic browser behavior at the project prefix. Pages deployment has separate live byte/browser verification. Physical iOS Safari persistence testing remains outstanding.

[Data sources and rights](data/NOTICE.md) · [Deployment](docs/deployment.md) · [Prior browser checks](tests/browser-results.md)

The coherent cost candidate is implemented and evaluated, but remains inactive: its interval score worsened and long-wait eligibility is insufficient. The app displays current comparisons, school-growth variation and matched-path stresses. Audited 1990s tuition files remain a research bridge because a population-definition break and missing comparable housing prevent a clean production extension. No forecast-coverage guarantee follows from these releases.

To reproduce the optional official archive audit (network required):

```sh
python scripts/prepare_legacy_ipeds.py --fetch
```

Raw ZIP hashes and field definitions are pinned in `data/legacy-ipeds-audit.json`.
