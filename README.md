# Education Finance

A static, browser-local college funding planner for GitHub Pages. Enter students one at a time and compare education paths using a shared funding plan for each student.

**Working release v0.5.0 · model college-funding-4.0.0 · schema 5.**

Live application: https://jschell.github.io/education-finance/

## Breaking change: student funding

Savings, contributions, gifts, general scholarships, direct income, coverage goals and investment settings now belong to the **student**. Switching education scenarios never replaces these values. Each education scenario contains its own costs, attendance length, school-specific aid, expense growth, billing and source information.

There is deliberately **no migration or balance reconciliation** from older releases. Old browser plans, recovery copies and unfinished drafts are discarded when the editing tab opens this release. Old exported backups are not supported. Enter a new plan; new schema-5 data and format-2 backups save and restore normally. Close an older editing tab before opening the new release elsewhere.

## Use the planner

1. Start with current student savings, enrollment month, annual tuition/fees and annual housing/food. Other inputs are optional. Try an example opens temporary fictional data; Exit example restores the real workspace.
2. Under More details, name the student and education scenario, choose attendance length, living/billing schedules, school-specific aid, extra expenses or a published budget preset. Applying a preset changes education costs/source, never student funding.
3. Student funding holds deposits, gifts, general scholarship amounts/duration, income support and shared-pool allocation. Enter these once for the student. General awards and the selected school's award are combined once and capped at bills.
4. Assumptions separates student investments from the selected education path's expense/sampling settings. Investment profile, fees, dated allocations and investment reference rates apply to every education scenario for that student. Tuition/living growth and the school's aid offer can differ by scenario.
5. One Calculate action produces historical ranges, complete example paths, a contribution estimate, historical comparisons, stress/sensitivity tests, and a collapsed fixed-rate reference. Valid edits also refresh the same assessment. Manage → Compare scenarios uses the same student funding across alternatives.
6. Add another student for independent savings and funding. Duplicating a student copies education settings but resets balances, monthly deposits, gifts, general aid, school-specific aid, income and shared allocation to zero; it cannot duplicate the same money into a second student's plan.
7. For multiple students, select one education scenario per student under Household scenarios & attendance. An optional monthly household savings-deposit limit prorates planned deposits. Economic paths are shared across students; success requires every selected goal to be funded. Money stays earmarked; unallocated shared funds are excluded.
8. Changes save automatically in this browser. Export a current-format plan backup for portability. Assessment JSON records exact inputs, seed, versions and results. Browser storage does not sync devices.

## Historical method and presentation

The bundled snapshot contains 564 complete paired months, January 1978–December 2024. Stocks/cash use Fama/French factors; bonds use a reconstructed US 10-year sovereign proxy. General CPI proxies non-tuition expenses. Published-price tuition planning uses your selected trend (initial 4%, illustrative) plus demeaned historical tuition-index changes as an imperfect variability proxy; raw BLS tuition-index mode is explicitly labeled. Aid remains separate. Tuition prices stay fixed within an academic year.

The calendar-aligned bootstrap uses one/three/five-year joint blocks. Allocation profiles are illustrative developer choices. Ranges are conditional on those assumptions, not calibrated future probabilities. Held-out historical diagnostics have shown weak cost-range coverage; the app flags this and includes explicit stress cases. Physical Safari persistence testing remains unverified.

The gauge prominently shows the range across both historical periods, using matching trial counts. Its arc and marker show the selected period’s frequency, with gray track beyond that point. This is a model-sensitivity range, not a confidence interval. Its filled segment changes smoothly: yellow at 45%, light green at 60%, dark green at the selected target. Target status is independent of color and accounts for Monte Carlo sampling noise. At 0% no colored fill is drawn; a missing college budget shows no percentage.

Actual simulated path examples keep savings, costs and shortfalls paired. Marginal percentiles and pointwise bands rank independently. Household probabilities are calculated jointly, never averaged or multiplied. School-specific published-price volatility, account/tax rules, automatic aid eligibility, dynamic fund transfers and allocation optimization remain outside this model.

## Development and verification

Static semantic HTML/CSS and vanilla JS modules; no framework, runtime service, telemetry or dependencies. Requires Node.js 24 for checks; the app runs in a modern browser.

```sh
npm run check
python3 -m http.server 8000 --directory site
node scripts/validate-history.mjs
```

Only `site/` is deployed through GitHub Actions. Relative URLs support `/education-finance/`. Tests use synthetic data only. The synthetic historical diagnostic report can be reproduced with the last command. The source snapshot can be rebuilt offline with `python3 scripts/prepare_history.py`.

- [Calculation and simulation methodology](docs/model.md)
- [Economic calibration plan](docs/economic-calibration.md)
- [Assumptions](docs/assumptions.md)
- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Verification](docs/verification.md)
- [Roadmap](docs/roadmap.md)
- [GitHub Pages setup](docs/deployment.md)
- [Historical data attribution](data/NOTICE.md)
- [Published school budgets](data/school-costs.md)

No real student information, account values, private workbook contents or exports belong in commits.

## License

[MIT](LICENSE) · Copyright (c) 2026 J. Schell. Application code is MIT; source data retains its own attribution and terms.

Stress cases now compare with an unchanged baseline using the same 1,000 seeds and calendar blocks. An absent-grants stress has exactly zero effect when no grants are entered. The temporary fictional example now includes $60,000 savings and $500/month contributions, showing a more useful planning case without changing the model defaults. Application source is formatted for review; no runtime dependencies were added. Legacy Gaussian helpers remain for a separate cleanup; the live assessment continues to use the historical engine.
