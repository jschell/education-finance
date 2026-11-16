# Education Finance

A browser-local college funding planner, entered one student at a time, designed for GitHub Pages.

**Status: working v0.2.2 calculator.** One Calculate action produces historical investment, expense, and funding-gap ranges, a savings target, actual historical-period comparisons, and a fixed-rate reference. Multiple students/scenarios, automatic local saves, and portable backup are implemented. No school-price lookup, tax/aid eligibility calculation, or joint family simulation is included.

Live application: https://jschell.github.io/education-finance/

## Use the planner

1. Start with four inputs: current savings, university start month, annual tuition/fees, and annual housing/food (or try the example).
2. Names, attendance length (four years by default), extra costs, and source notes are under More details. Future contributions, gifts, scholarships, and income payments are optional.
3. Optional assumptions select an allocation profile, historical period, block length, fees, or fixed expense growth. The default uses jointly sampled monthly stock/bond/cash returns, general CPI, and tuition CPI from 1978–2024. Allocation presets are illustrative developer choices.
4. Click Calculate for the full assessment. Valid edits also refresh the same assessment after a short pause. The fixed-rate reference is collapsed within results; no separate Monte Carlo button is needed. The solver uses your contribution dates even when the current contribution is zero.
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

Family-wide allocation and joint simulation follow the validated single-student engine.

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

Rebuild the bundled data offline with `python3 scripts/prepare_history.py`. Only `site/` is deployed. Application code is MIT; source data retains its separate attribution and terms. Saved schema-1 plans and backups migrate to schema 2 without changing balances, dates, or original manual rates.

The funding outlook includes a semicircular likelihood-of-success gauge. Its percentage is the existing simulated frequency of paying every covered bill when due. The target tick and On course / Below target label use the selected success threshold; a missing college budget shows no percentage. No separate control or new probability calculation is introduced.

Outcome distributions display actual simulation frequencies across dollar bands for funding gaps, entry savings and total college costs. Fully funded paths are counted separately. The selector changes only the displayed summary and does not rerun the calculation. Percentile columns rank rows independently and do not describe a single combined scenario.

Try an example opens a temporary fictional workspace. Exit example restores the previous student/scenario selection and all valid unsaved edits. Example mode disables local save, import and local-data deletion so a demonstration cannot overwrite the stored plan. It does not add a separate calculation action. Unsaved real work retains the normal navigation warning; example edits can be discarded by exiting.

## Automatic saves and reload recovery (v0.2.2)

Valid real-plan changes—including adding students/scenarios—automatically save. Save now forces an immediate save. A synchronous local recovery copy protects the latest valid plan while the browser database transaction is pending; reload restores the selected student/scenario and retries interrupted saves. Header status reports completion or storage/validation failures. Invalid/incomplete inputs retain the last valid saved plan. Example-mode changes are deliberately temporary and never replace the real plan; exit before entering real students. Changes that existed only in memory in earlier releases cannot be reconstructed after the tab is gone. Exported backups remain portable; browser saves do not sync devices.
