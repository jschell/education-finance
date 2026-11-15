# Implemented architecture and data contract

Release: v0.2.0; model `college-funding-2.0.0`; schema 2.

## Modules

Buildless HTML/CSS and ES modules, hosted beneath /education-finance/. `domain.js` owns strict input validation and portable schema; `engine.js` is a pure monthly cash-flow engine; `history.js` owns joint historical block sampling, repricing, comparisons and contribution solving; `history-config.js` owns dataset and allocation settings; `simulation.js` retains shared PRNG/percentile helpers and legacy parametric regression support; `worker.js` runs simulations away from the UI thread; `storage.js` provides IndexedDB; `render.js` builds text-safe results and SVG; `app.js` coordinates the UI. No runtime dependencies, analytics, CDN, login, or third-party financial-data requests. The worker loads the bundled own-site historical JSON and checks its structure and SHA-256 before use.

Worker messages contain runId and immutable input snapshots. Input edits/switches terminate pending workers. A 650 ms pause after valid edits refreshes the full historical assessment when financial figures are present. Calculate performs the same assessment immediately. Until then, the previous result stays visible, marked as previous, with export controls disabled. Invalid inputs leave that previous result visible with an error beside Calculate. Pending refreshes are cancelled before explicit calculation. Stale messages are ignored. The UI remains usable during long comparisons. Pointwise balance summaries are retained at the first month, calendar-year ends, and final month; full simulated monthly ledgers are not retained.

## Persisted schema

| Object | Stored fields |
| --- | --- |
| Plan | schemaVersion, modelVersion, currency, valuation, sharedPool, defaults, students |
| Student | id, alias, enrollment, years, sharedAllocation, scenarios |
| Scenario | id/name, path/living labels, baseline, costs, source/sourceDate, costConfirmed, balance, monthly, contributionStart/End, stepUp, gifts, grant/grantYears, income, coverage/share, assumptions, assumptionsDate/Status, stress, acknowledged, history |
| History | profile, period, blockYears, costMode, reference, fee; validated enumerations / decimal annual fee |
| Costs | tuition, housing, books, transport, other; annual nominal USD |
| Gift | date YYYY-MM and nonnegative amount |
| Assumptions | returnRate/mean/volatility for early saving; lateReturn/lateMean/lateVolatility; attendanceReturn/attendanceMean/attendanceVolatility; transitionYears; tuitionGrowth/livingGrowth/inflation |

IDs are opaque UUIDs. Rates are decimal fractions, amounts finite USD numbers, dates validated month strings. `domain.js` is the executable contract: reject missing/unknown fields, invalid types, unsupported versions, duplicate IDs, excess allocations, invalid dates and excessive horizons/counts. Limit: 30 students, 20 scenarios per student, 100 total, 24 gifts/scenario, 2 MB imports. Schema-1/model-1 saved records and imports explicitly migrate by adding historical defaults and retaining original inputs. Unknown schemas remain rejected.

Each scenario has one aggregate earmarked balance plus its student's explicitly allocated share of a family pool. Scenario alternatives do not consume extra shares. Accounts and restricted withdrawals are NOT represented as interchangeable individual accounts. The user must ensure eligible funds are used; account rules are future work.

Family defaults are copied snapshots. Editing defaults does not mutate existing scenarios; Apply defaults explicitly copies the saved values. User edits to return assumptions update status/date. No acknowledgement or budget-confirmation gate is used. The version-1 costConfirmed and acknowledged boolean fields are retained solely for existing saved-plan and backup compatibility and are ignored by calculation and simulation.

## Persistence and portability

Explicit Save locally writes the full validated plan to IndexedDB database education-finance, store plans, key workspace. Input edits show unsaved status and a navigation warning. Saves wait for transaction completion; storage failures leave inputs available for export. On load, corrupt/unsupported records produce a visible error and are not silently replaced. Reports are not auto-persisted; rerun calculations after reload or export an assessment.

Plan JSON wrapper: format=education-finance-1, exportedAt ISO timestamp, plan. Import parses and validates before any mutation, previews student/scenario counts and aliases, and requires Replace workspace. It replaces only tab memory until Save locally. Export assessments separately as JSON with full plan snapshot, model/PRNG/assumption versions, seed/trial settings, timestamp, and results; outcome-range CSV is spreadsheet-safe; reports can be printed.

Use textContent and value, never user HTML. Validate imports as data; no evaluation. Browser storage is not secure archival storage or cross-device sync. GitHub receives ordinary page/asset requests, but financial inputs are processed locally. Only site/ is deployed; never commit exports or actual student data.

## Simple starting form

The main form shows current savings, enrollment month, annual tuition, and annual housing/food. Other fields are collapsed. Only enrollment is HTML-required; it is prefilled. Blank costs and optional funding amounts resolve to zero, while blank names, dates, durations and return settings retain their existing/default values. Resolved values are put back into controls when a plan is committed, so the displayed inputs agree with the calculation. Dates and nonblank values remain validated. Student and scenario names are generated automatically. All names, detailed costs, contribution schedules, shared allocations, and return stages remain editable. No acknowledgement is required after changing assumptions, applying defaults, loading old plans, or comparing scenarios.

If no college budget is entered, results describe savings growth without showing a funding-success percentage or contribution target. Source metadata defaults to User estimate and the valuation month; it is optional to edit.

## Result lifecycle

Render the initial form and projection before waiting for storage. A saved plan regenerates its historical assessment on load; selecting/importing a student or scenario also regenerates it. Do not overwrite edits made while an asynchronous saved-plan load is pending. Automatic projection commits preserve the typing cursor and avoid writing back the active input. Explicit actions normalize optional defaults. Dependent default contribution dates are synchronized when enrollment changes. CSV/report data comes from the assessment snapshot. Entry script and stylesheet URLs are versioned to avoid retaining the older results-clearing code after deployment.

## Data packaging

Raw inputs, source hashes, transformations and attribution are committed in `data/`; `scripts/prepare_history.py` rebuilds `site/data/history.json` offline. Only site/ is published. Dataset ID and observation SHA-256 accompany assessment exports. All module import URLs and the worker entry are versioned to avoid mixing the new schema with older cached modules. No user data is sent for calculations. Family joint simulation remains future work.
