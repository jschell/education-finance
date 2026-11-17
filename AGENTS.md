# Repository working instructions

- At session start, read docs/continuity.md, docs/active-work-plan.md and docs/decisions.md. Inspect current remote heads/PRs before assuming the handoff is still current. Before ending substantive work, update the handoff with exact branch/SHA, verified results, unfinished steps and the next action; commit plans before extended implementation. Do not infer deployment or calibration from conversation claims.

- Read README.md and docs/model.md before changing financial behavior.
- Keep the application static and buildless: semantic HTML, CSS, vanilla JavaScript modules. Use relative asset URLs compatible with /education-finance/.
- Preserve one-student-at-a-time entry. Shared funds must never be counted twice.
- Keep the financial engine pure and separate from DOM, persistence, charts, and workers.
- No real family data in commits, fixtures, screenshots, logs, or issues. Use clearly synthetic examples.
- Every financial default needs units, provenance, as-of date, and provisional/verified status. Do not describe simulation probabilities as guarantees.
- No unimplemented controls or fabricated calculation results. Clearly label preparatory UI.
- Any model change must update the methodology/model version and meaningful financial tests. Identical inputs, seed, and version must reproduce results.
- Run npm run check. Once financial tests exist, run them as well. Verify phone, iPad landscape, keyboard operation, and /education-finance/ paths when UI behavior changes.
- Do not add live school scraping, tax/aid eligibility formulas, cloud storage, telemetry, or dependencies without a concrete requirement.
