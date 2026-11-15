# Implemented architecture and data contract

Release: v0.1.0; model `college-funding-1.0.0`; schema 1.

## Modules

Buildless HTML/CSS and ES modules, hosted beneath /education-finance/. `domain.js` owns strict input validation and portable schema; `engine.js` is a pure monthly cash-flow engine; `simulation.js` owns seeded paths, percentiles, comparisons and contribution solving; `worker.js` runs simulations away from the UI thread; `storage.js` provides IndexedDB; `render.js` builds text-safe results and SVG; `app.js` coordinates the UI. No runtime dependencies, analytics, CDN, login, or financial-data requests.

Worker messages contain runId and immutable input snapshots. Input edits/switches terminate pending workers and invalidate results. Stale messages are ignored. The UI remains usable during long comparisons. Pointwise balance summaries are retained at the first month, calendar-year ends, and final month; full simulated monthly ledgers are not retained.

## Persisted schema

| Object | Stored fields |
| --- | --- |
| Plan | schemaVersion, modelVersion, currency, valuation, sharedPool, defaults, students |
| Student | id, alias, enrollment, years, sharedAllocation, scenarios |
| Scenario | id/name, path/living labels, baseline, costs, source/sourceDate, costConfirmed, balance, monthly, contributionStart/End, stepUp, gifts, grant/grantYears, income, coverage/share, assumptions, assumptionsDate/Status, stress, acknowledged |
| Costs | tuition, housing, books, transport, other; annual nominal USD |
| Gift | date YYYY-MM and nonnegative amount |
| Assumptions | returnRate/mean/volatility for early saving; lateReturn/lateMean/lateVolatility; attendanceReturn/attendanceMean/attendanceVolatility; transitionYears; tuitionGrowth/livingGrowth/inflation |

IDs are opaque UUIDs. Rates are decimal fractions, amounts finite USD numbers, dates validated month strings. `domain.js` is the executable contract: reject missing/unknown fields, invalid types, unsupported versions, duplicate IDs, excess allocations, invalid dates and excessive horizons/counts. Limit: 30 students, 20 scenarios per student, 100 total, 24 gifts/scenario, 2 MB imports. New schemas need deliberate migration.

Each scenario has one aggregate earmarked balance plus its student's explicitly allocated share of a family pool. Scenario alternatives do not consume extra shares. Accounts and restricted withdrawals are NOT represented as interchangeable individual accounts. The user must ensure eligible funds are used; account rules are future work.

Family defaults are copied snapshots. Editing defaults does not mutate existing scenarios; Apply defaults is explicit and resets simulation acknowledgement. User edits to return assumptions update status/date. Cost confirmation is required before assessment; zero-valued categories are visible and require budget review.

## Persistence and portability

Explicit Save locally writes the full validated plan to IndexedDB database education-finance, store plans, key workspace. Input edits show unsaved status and a navigation warning. Saves wait for transaction completion; storage failures leave inputs available for export. On load, corrupt/unsupported records produce a visible error and are not silently replaced. Reports are not auto-persisted; rerun calculations after reload or export an assessment.

Plan JSON wrapper: format=education-finance-1, exportedAt ISO timestamp, plan. Import parses and validates before any mutation, previews student/scenario counts and aliases, and requires Replace workspace. It replaces only tab memory until Save locally. Export assessments separately as JSON with full plan snapshot, model/PRNG/assumption versions, seed/trial settings, timestamp, and results; annual CSV is spreadsheet-safe; reports can be printed.

Use textContent and value, never user HTML. Validate imports as data; no evaluation. Browser storage is not secure archival storage or cross-device sync. GitHub receives ordinary page/asset requests, but financial inputs are processed locally. Only site/ is deployed; never commit exports or actual student data.
