# Education Finance

A browser-local college funding planner, entered one student at a time, designed for GitHub Pages.

**Status: working v0.1.1 calculator (M1–M3).** Deterministic monthly projections, staged-return Monte Carlo, contribution solving, multiple students/scenarios, explicit local saves, and portable backup are implemented. No school-price lookup, tax/aid eligibility calculation, or joint family simulation is included.

Live application: https://jschell.github.io/education-finance/

## Use the planner

1. Start with four inputs: current savings, university start month, annual tuition/fees, and annual housing/food (or try the example).
2. Names, attendance length (four years by default), extra costs, and source notes are under More details. Future contributions, gifts, scholarships, and income payments are optional.
3. Review separate cost growth and three investment stages: early saving, final saving years, and attendance. Starting rates are illustrative, not calibrated investment recommendations.
4. Calculate a projection or run Monte Carlo directly. The solver uses your contribution dates even when the current contribution is zero.
5. Duplicate a scenario to change education costs, funding, or return assumptions; compare alternatives for the same student.
6. Save locally, export a plan backup, and optionally export the calculated assessment (exact inputs, model, seed, trial count, and results) or yearly CSV. New students can be assessed independently.

A shared pool supports explicit allocations only. Restrict each student's earmarked balance to their own funds; do not also include shared money there. Scenario alternatives reuse that student's allocation. Browser storage is not a backup and does not synchronize devices.

## Verification

`npm run check` runs packaging/module checks and financial/input tests. The release checks are recorded in [verification](docs/verification.md). No claim of measured physical iPad performance is made.

## Planned experience

1. Add a student and expected enrollment date.
2. Compare education paths and living arrangements.
3. Enter earmarked savings, planned contributions, and college-year income support.
4. Review dated assumptions and run deterministic and Monte Carlo assessments.
5. Compare funding gaps, payment timing, and additional savings requirements.
6. Save locally and export a portable backup; add another student independently.

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
