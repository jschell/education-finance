# Roadmap and acceptance criteria

v0.2.0 provides a working single-student historical assessment on GitHub Pages.

## M1 — Implemented: Deterministic student assessment

- Validated student/enrollment, expense categories, one allocated balance, dated contributions, explicit aid and income support.
- Tuition-only/full-cost coverage alternatives; monthly engine through last payment; yearly accessible table.
- Compare current savings only versus contributions versus income support.
- Accept: hand-calculated zero-return examples agree within cents; costs inflate during college; funds never negative; unmet bills remain failures; a later gift cannot repair a missed bill; no double-counted income; current students exclude paid bills.

## M2 — Implemented: Monte Carlo

- Seeded PRNG and documented user-defined, illustrative return mean/volatility profiles; lognormal gross-return generator; worker, cancellation, stale-result handling; 10,000-trial target.
- Success frequency, unconditional/conditional shortfalls, percentile tables and balance bands; market-loss stress case.
- Accept: seed/version reproducibility, zero-volatility equivalence to deterministic engine, known percentile fixtures, positive gross returns, empirical mean/volatility sanity check with statistical tolerance, stable estimates across seeds, and measured mobile performance. Clearly distinguish Monte Carlo noise from assumption uncertainty.
- Add contribution solver after the above passes. Verify threshold attainment with fixed paths and a larger confirmation run; expose infeasible ceiling and contribution start/stop dates.

## M3 — Implemented: Saved profiles and comparisons

- Multiple students, reusable assumptions and overrides, scenario duplication/comparison, local saves and JSON backups.
- Accept: reload preserves inputs; export/import round trip; invalid import never overwrites valid data; storage failure is visible; unsafe aliases render as literal text; shared allocation cannot exceed available funds.

## M4 — Richer education and account modeling

- Transfer paths, changing housing, dated school sources, restricted account rules, detailed asset glide paths, school-specific cost uncertainty beyond national CPI proxies.
- Accept: no missing expenses silently set to zero; transfer/year transitions match schedules; eligibility and source dates visible; category uncertainty/correlations tested.

## M5 — Joint family analysis

- Correlated calendar-aligned paths, shared pool priorities, overlapping attendance and annual household limits.
- Accept: shared pool consumed once; same market factor shared across students; family success computed jointly; independent student probabilities are never averaged; combined annual and lifetime gaps reconcile to ledger.

## Release checks

- Financial engine tests run on PRs and before deployment; static scaffold check is not a substitute.
- Relative-path smoke at /education-finance/; no missing modules/assets.
- Keyboard and screen-reader labels; results available without reading a chart.
- Phone portrait and standard iPad portrait/landscape: visible actions, no page-wide horizontal overflow, readable tables and hints.
- Worker remains cancellable; exports include exact assumptions and model version.
- Validate current assumptions and source dates before describing numerical presets as calibrated.

M1–M3 are implemented in v0.1.0. The user's staged-return refinement is also included. Portfolio calibration remains a future enhancement; no profile is represented as recommended. See verification.md for measured checks and limitations. Next: M4 richer account/education schedules, then M5 joint family funding.

## v0.2 — Historical range assessment implemented

One Calculate action replaces separate projection and Monte Carlo buttons. Joint calendar blocks use pinned stock/bond/cash and tuition/general-inflation observations from 1978–2024. Each run includes cost and savings ranges, paired gaps, actual complete historical windows, alternative-period sensitivity, contribution solving with an independent seeded check, and a collapsed fixed-rate reference. Source attribution, reproducible data preparation and schema-1 migration are included. These are historical empirical scenarios, not forward-looking calibrated recommendations. Remaining M4/M5 work is unchanged in scope; national CPI does not replace a school-price database.

## v0.3 — Workbook-inspired improvements completed

Semester/quarter tuition and grant timing; optional twelve-month living schedule; exact cent allocation; visible reconciled annual fixed-reference cash flow; source-attributed school-budget presets and structured metadata; dated asset-allocation overrides; and family attendance overlap. Financial model 2.1/schema 3 migrations preserve older saved plans. Remaining M4 work includes transfer/year-specific cost changes and restricted accounts. Joint family cash-flow simulation, correlated success and shared-pool priorities remain M5.

## v0.4.0 delivered

Implemented draft recovery, single-editor protection, cent-safe splitting, annual tuition pricing, explicit tuition basis, coherent example paths, uncertainty-aware target presentation, block/stress/walk-forward diagnostics and joint household assessment with a monthly savings-deposit limit. Next data-quality work: school/sector published-price histories and richer cost proxies. Household allocation optimization and real iOS verification remain open.
