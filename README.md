# Education Finance

A static, browser-local college funding planner. **App v0.10.0 · model college-funding-9.0.0 · schema 5 · MIT license.**

[Open the planner](https://jschell.github.io/education-finance/)

## Use the planner

1. Enter a student's current savings, enrollment month and annual tuition/housing budget. Other inputs are optional. Try an example opens temporary fictional data; Exit example restores your workspace.
2. Savings, contributions, investments, gifts and general aid belong to the student. Education scenarios share that funding while keeping their own costs, attendance and school-specific aid. Copying or switching a school path never copies money.
3. Calculate produces one assessment: a range across cautious/central/favorable assumptions, simulated outcome bands, an estimated central-case monthly contribution and historical validation. These cases have no probability weights or confidence level. The fixed-rate reference is a separate illustration inside the same assessment. Historical replay remains an optional calculation method.
4. Multiple students share economic paths. Household success requires all selected goals to be funded; earmarked money is not automatically transferred between students. A household deposit limit can constrain planned contributions.
5. Edits save in the current browser. Export a backup for another device; no cloud sync or telemetry exists. Example data does not replace saved plans. Schema-5 plans receive a metadata-only model upgrade. Incompatible schemas 1–4 and old backup formats remain unsupported.

## Current model and evidence

- Investments, rates and inflation use 70 complete joint years (1954–2023), regularized persistence and seven disjoint decade windows. Five-year Treasury bonds are repriced monthly; cash uses three-month bill discount-price accrual. Forward anchors are documented survey assumptions.
- College prices use separate fixed-institution IPEDS panels (2000–2023), with in-state/out-of-state and on-campus housing series. Older macro years use inflation-conditioned cost donors. These are indexed published prices, not net family costs or measured pre-2000 school prices.
- Rolling cost corrections stop at each forecast origin and shrink by unique target-year count. A further uncertainty candidate was evaluated in v0.10: coverage improved but the interval score worsened beyond the declared limit. It was rejected; the v0.9 cost process remains the default.
- The production path factory and bill ledger now undergo whole-plan historical checks with 0/4/8-year waits, four attendance years, five cost sectors and three funding levels. Results include reliability bands, Brier scores, cost coverage and distinct start-year counts. They expose poor cost-band coverage for longer waits. There are no eligible complete 18-year-wait checks.
- Monthly contribution estimates include a declared sampling reserve, then a separate 5,000-path check. Confirmation requires its one-sided 95% Wilson lower sampling bound to meet the requested target. This controls simulation noise; it does not establish future economic accuracy.

The component comparisons and whole-plan checks are retrospective. Overlapping starts, related sectors, selected surviving schools, reconstructed instruments, training-mean historical anchors and long-horizon extrapolation limit their interpretation. **Passing software checks does not establish calibrated future funding probabilities.** Actual-price uncertainty remains an open model issue, with failure results visible in the app.

[Current model](docs/model.md) · [Fix plan](docs/critique-fix-plan.md) · [Completion status](docs/critique-fix-status.md) · [Fresh review](docs/critique-review-v0.10.0.md)

## Develop and reproduce

No framework, installation or build step is required for the static app. Use a local HTTP server rooted at `site/`. Node 24+ runs checks:

```sh
npm run check
```

Rebuild the current release from pinned existing bundles:

```sh
node scripts/review-calibration.mjs
node scripts/build_reviewed_release.mjs
node scripts/validate-savings-stability.mjs
```

The worker loads `site/data/calibration-reviewed.json` and verifies linked validation hashes. `site/data/critique-validation.json` and `site/data/funding-validation.json` are the v0.10 evaluation reports. Generation is deterministic; validation does not send user plans anywhere.

[Data sources and rights](data/NOTICE.md) · [Deployment](docs/deployment.md) · [Browser checks](tests/browser-results.md) · [Archived v0.9 documentation and older rebuild instructions](docs/archive/v0.9.0-readme.md)

## Repository layout

- `site/`: buildless HTML, CSS, pure finance modules, browser persistence, worker, presentation and pinned data.
- `scripts/`: offline data preparation and reproducible evaluation.
- `tests/`: financial behavior, provenance, persistence, versioning and browser evidence.
- `docs/`: current methodology, plans/results and archived release history.

GitHub Actions checks the repository and deploys `site/` to GitHub Pages. Physical iOS Safari persistence testing remains outstanding; browser recovery and locking have automated tests.
