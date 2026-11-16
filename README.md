# Education Finance

A browser-local college funding planner, entered one student at a time, designed for GitHub Pages.

**Status: working v0.4.0 calculator.** One Calculate action produces historical investment, expense, and funding-gap ranges, a savings target, actual historical-period comparisons, and a fixed-rate reference. Multiple students/scenarios, automatic local saves, and portable backup are implemented. Static published school-budget presets and an attendance-overlap overview are included. Joint household assessment now uses shared economic paths, saved scenario choices and an optional monthly savings-deposit limit. Live school-price lookup and tax/aid eligibility calculation remain future work.

Live application: https://jschell.github.io/education-finance/

## Use the planner

1. Start with four inputs: current savings, university start month, annual tuition/fees, and annual housing/food (or try the example).
2. Names, attendance length (four years by default), semester/quarter tuition billing, nine/twelve living months, published budget presets, extra costs, and structured source notes are under More details. Future contributions, gifts, scholarships, and income payments are optional.
3. Optional assumptions select an allocation profile, dated asset-allocation overrides, historical period, block length, fees, or fixed expense growth. The default uses jointly sampled monthly stock/bond/cash returns, general CPI, and tuition CPI from 1978–2024. Allocation presets are illustrative developer choices.
4. Click Calculate for the full assessment. Valid edits also refresh the same assessment after a short pause. Complete simulated path examples include their own annual schedules; the fixed-rate reference is collapsed separately. No separate Monte Carlo button is needed. The solver uses your contribution dates even when the current contribution is zero.
5. Duplicate a scenario to change education costs, funding, or return assumptions; compare alternatives for the same student.
6. Changes save automatically in this browser. Export a plan backup, and optionally export the calculated assessment (exact inputs, model, seed, trial count, and results) or outcome-range CSV. New students can be assessed independently.

A shared pool supports explicit allocations only. Restrict each student's earmarked balance to their own funds; do not also include shared money there. Scenario alternatives reuse that student's allocation. Browser storage is not a backup and does not synchronize devices.

## Verification

`npm run check` runs packaging/module checks and financial/input tests. The release checks are recorded in [verification](docs/verification.md). No claim of measured physical iPad performance is made.

## Planned experience

1. Add a student and expected enrollment date.
2. Compare education paths and living arrangements.
3. Enter earmarked savings, planned contributions, and college-year income support.
4. Review dated assumptions and run one historical assessment.
5. Compare funding gaps, payment timing, and additional savings requirements.
6. Export a portable backup; add another student independently.

Household assessment combines selected student scenarios on the same economic paths. Funds remain earmarked; allocation optimization is not implemented.

## Project guide

- [Requirements and scope](docs/requirements.md)
- [Calculation and simulation specification](docs/model.md)
- [Assumption register](docs/assumptions.md)
- [Data contract and architecture](docs/architecture.md)
- [Milestones and acceptance criteria](docs/roadmap.md)
- [GitHub Pages setup](docs/deployment.md)

## Local development

Requires Node.js 24 for checks; the website itself requires only a modern browser.

```sh
npm run check
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000`. No npm dependencies, bundler, database, server API, external fonts, or analytics are required. Only `site/` is uploaded to Pages; documentation and future local exports are excluded.

## Hosting

The deployment workflow publishes main after its checks pass and also supports manual runs. GitHub Actions must be selected in **Settings → Pages → Source**. See the deployment guide for verification and troubleshooting. A live URL is not claimed until deployment succeeds.

Never commit real student information, balances, account numbers, or exported plans. Browser-local processing does not make publicly committed data private.

## License

[MIT](LICENSE) · Copyright (c) 2026 J. Schell.

## Historical data

The checked-in snapshot has 564 complete joint months, January 1978–December 2024. Stocks and cash use Fama/French factors; bonds use a yield-reconstructed US 10-year sovereign proxy; costs use BLS general and college-tuition CPI. See [data attribution](data/NOTICE.md), [manifest](data/manifest.json), and [methodology](docs/model.md). This is an empirical historical model, not a forward-looking capital-market forecast. Recent-history and actual-period comparisons expose some sensitivity to the selected data.

Rebuild the bundled data offline with `python3 scripts/prepare_history.py`. Only `site/` is deployed. Application code is MIT; source data retains its separate attribution and terms. Saved older plans and backups migrate to the current schema without changing balances, dates, or original manual rates.

The funding outlook includes a semicircular likelihood-of-success gauge. Its percentage is the existing simulated frequency of paying every covered bill when due. The target tick and Target met / Near target / Below target label use the selected success threshold; a missing college budget shows no percentage. No separate control or new probability calculation is introduced.

Outcome distributions display actual simulation frequencies across dollar bands for funding gaps, entry savings and total college costs. Fully funded paths are counted separately. The selector changes only the displayed summary and does not rerun the calculation. Percentile columns rank rows independently and do not describe a single combined scenario.

Try an example opens a temporary fictional workspace. Exit example restores the previous student/scenario selection and all valid unsaved edits. Example mode disables local save, import and local-data deletion so a demonstration cannot overwrite the stored plan. It does not add a separate calculation action. Unsaved real work retains the normal navigation warning; example edits can be discarded by exiting.

## Automatic saves and reload recovery (v0.2.2)

Valid real-plan changes—including adding students/scenarios—automatically save. Save now forces an immediate save. A synchronous local recovery copy protects the latest valid plan while the browser database transaction is pending; reload restores the selected student/scenario and retries interrupted saves. Header status reports completion or storage/validation failures. Unfinished inputs are now recovered separately as raw drafts; only valid inputs enter calculations. Example-mode changes are deliberately temporary and never replace the real plan; exit before entering real students. Changes that existed only in memory in earlier releases cannot be reconstructed after the tab is gone. Exported backups remain portable; browser saves do not sync devices.

## Session samples and gauge colors (v0.2.3)

Each independent tab session starts with a cryptographically generated unsigned 32-bit seed. Reloads and repeated calculations retain it; edit Random seed under Calculation settings to choose another sample. Clearing the field reuses the current session seed. The seed is included in assessment exports, so a report can be reproduced with the same inputs/model/data. Browser-duplicated or restored tabs may retain copied session state. If session storage is blocked, the seed remains stable in the current page but cannot be retained through reload.

The entire gauge arc changes to a single shade as the percentage updates: brown/red at low likelihood, yellow by 45%, light green at 60%, and dark green at the selected target, with smooth interpolation between these points. A contrasting marker shows the actual result and a tick shows the target. Percentages and Below target / Near target / Target met labels remain available; no budget remains neutral gray. No extra calculation button is introduced.

## Workbook-inspired planning improvements (v0.3.0)

- Semester tuition/grants: two bills at enrollment and five months later. Quarter tuition/grants: three bills at enrollment and three/six months later. Investment compounding remains monthly.
- Living costs and direct income support can span nine or twelve months per school year. Choosing twelve changes timing; enter a full-year budget if including summer costs.
- Preview published 2026–27 on-campus budgets for public in-state, public out-of-state and private nonprofit sectors, or a specifically labeled Harvard high-cost example. Use selected budget replaces five cost categories and source metadata, preserves funding/tuition calendar, and sets nine living months. All amounts remain editable; no aid is inferred. See [budget sources and attribution](data/school-costs.md).
- Year-by-year funding now appears directly in results as a clearly labeled fixed-rate reference, with opening savings, growth, deposits, withdrawals, unpaid bills and closing savings. It is not a median Monte Carlo path.
- Family attendance calendar shows remaining academic months and peak simultaneous students, not a joint funding probability.
- Dated allocation changes optionally replace automatic investment stages from their starting month onward. Cash is the remainder after stocks/bonds. These affect historical simulations and the history-derived reference; custom fixed reference rates remain separate.

Saved schema-1 and schema-2 plans migrate to schema 3/model college-funding-2.1.0 while preserving existing amounts, dates, IDs and manual rates. The default remains semester tuition and nine living months. In v0.4.0, integer-cent shares distribute remainder cents across payments so a zero-growth annual budget reconciles exactly without negative bills.

## Model and reliability improvements (v0.4.0)

- One editing tab prevents conflicting browser saves; unfinished form drafts survive reload without becoming financial inputs. Close the editor and reload a reader to switch tabs.
- Published tuition keeps the chosen annual trend (4% initially, illustrative), with historical tuition-index deviations as an explicitly imperfect variability proxy. Raw index mode is labeled separately. Tuition reprices annually, and integer-cent payment allocation eliminates negative remainder bills.
- Whole-percentage gauge, sampling interval, near-target status and provisional savings estimates distinguish model frequency from target attainment.
- Three complete simulated paths reconcile costs, investments, missed bills and annual cash flow. Marginal percentile tables and the deterministic reference remain expandable.
- Each calculation includes period/block sensitivity, defined stress cases and walk-forward diagnostics with training cutoffs. Long horizons can have insufficient data for complete held-out testing.
- Multiple students receive joint household outcomes from common economic paths. Choose one scenario per student under Household scenarios & attendance and optionally limit combined monthly savings deposits. Shared funds are counted once; no account transfers or allocation optimization are assumed.

Schema-1/2/3 plans migrate to schema 4/model college-funding-3.0.0. Original amounts and manual rates are preserved; corrected modeling conventions intentionally change recalculated outcomes. Run `node scripts/validate-history.mjs` for the checked-in synthetic diagnostic report. Historical variability remains a proxy; real iPhone Safari verification is still required.
