# Education Finance

A static, browser-local college funding planner. **App v0.12.0 · model college-funding-11.0.0 · schema 5 · MIT license.**

[Open the planner](https://jschell.github.io/education-finance/)

## Use the planner

1. Enter a student's current savings, enrollment month and annual tuition/housing budget. Other inputs are optional. Try an example opens temporary fictional data; Exit example restores your workspace.
2. Savings, contributions, investments, gifts and general aid belong to the student. Education scenarios share that funding while keeping their own costs, attendance and school-specific aid. Copying or switching a school path never copies money.
3. Calculate produces one assessment: a range across cautious/central/favorable assumptions, simulated outcome bands, an estimated central-case monthly contribution and historical validation. These cases have no probability weights or confidence level. The fixed-rate reference is a separate illustration inside the same assessment. Historical replay remains an optional calculation method.
4. Multiple students share economic paths. Household success requires all selected goals to be funded; earmarked money is not automatically transferred between students. A household deposit limit can constrain planned contributions.
5. Edits save in the current browser. Export a backup for another device; no cloud sync or telemetry exists. Example data does not replace saved plans. Schema-5 plans receive a metadata-only model upgrade. Incompatible schemas 1–4 and old backup formats remain unsupported.

## Staged overhaul in progress

Practical planning now shows affordable annual budget ranges, first unpaid bill details, and jointly verified household deposit proposals with dated cap conflicts. Target-specific binomial sampling reserves replace the uniform cushion; independent verification remains mandatory.

The foundation release corrects conditional equity anchor enforcement and September–August market/cost pairing. The active snapshot is `site/data/calibration-foundation.json`; `foundation-validation.json` checks its process contracts. The old selection gate is explicitly oracle-infeasible, with unsupported horizons marked insufficient evidence. No new cost candidate has been promoted. Forecast probability coverage remains unresolved.

[Authorized scope and stages](docs/overhaul-plan.md) · [Current methodology](docs/model.md) · [Prior model and evidence](docs/archive/model9.md)

All prior reports remain archived model-9 evidence. Reproduce them at commit `d0d536ca74103ef29853db1db340f47db5e182a9` or run the manual archived evidence workflows. Archived source copies retain their report-input identities; they are not current implementation checks.

## Develop and reproduce

Use Node 24+ and a local HTTP server rooted at `site/`. The app needs no installation or build step.

```sh
npm run check
node scripts/build_foundation.mjs
node scripts/validate-foundation.mjs
node scripts/validate-planning.mjs
```

CI reproduces current reports, runs financial tests and checks synthetic browser behavior at the project prefix. Pages deployment has separate live byte/browser verification. Physical iOS Safari persistence testing remains outstanding.

[Data sources and rights](data/NOTICE.md) · [Deployment](docs/deployment.md) · [Prior browser checks](tests/browser-results.md)
