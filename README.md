# Education Finance

A browser-local college funding planner, entered one student at a time, designed for GitHub Pages.

**Status: preparation scaffold.** The starter page explains the planned experience. No financial calculation, simulation, profile storage, or school-price lookup is implemented yet. No school or spending target has been selected.

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

The deployment workflow is manual initially. Enable **Settings → Pages → Source → GitHub Actions**, then run **Deploy GitHub Pages** in Actions. See the deployment guide for verification and troubleshooting. A live URL is not claimed until deployment succeeds.

Never commit real student information, balances, account numbers, or exported plans. Browser-local processing does not make publicly committed data private.
