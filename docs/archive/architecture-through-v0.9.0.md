# Implemented architecture and data contract

Release: v0.3.0; model `college-funding-2.1.0`; schema 3.

## Modules

Buildless HTML/CSS and ES modules, hosted beneath /education-finance/. `domain.js` owns strict input validation and portable schema; `engine.js` is a pure monthly cash-flow engine; `history.js` owns joint historical block sampling, repricing, comparisons and contribution solving; `history-config.js` owns dataset and allocation settings; `simulation.js` retains shared PRNG/percentile helpers and legacy parametric regression support; `worker.js` runs simulations away from the UI thread; `storage.js` provides IndexedDB; `render.js` builds text-safe results and SVG; `app.js` coordinates the UI. No runtime dependencies, analytics, CDN, login, or third-party financial-data requests. The worker loads the bundled own-site historical JSON and checks its structure and SHA-256 before use.

Worker messages contain runId and immutable input snapshots. Input edits/switches terminate pending workers. A 650 ms pause after valid edits refreshes the full historical assessment when financial figures are present. Calculate performs the same assessment immediately. Until then, the previous result stays visible, marked as previous, with export controls disabled. Invalid inputs leave that previous result visible with an error beside Calculate. Pending refreshes are cancelled before explicit calculation. Stale messages are ignored. The UI remains usable during long comparisons. Pointwise balance summaries are retained at the first month, calendar-year ends, and final month; full simulated monthly ledgers are not retained.

## Persisted schema

| Object | Stored fields |
| --- | --- |
| Plan | schemaVersion, modelVersion, currency, valuation, sharedPool, defaults, students |
| Student | id, alias, enrollment, years, sharedAllocation, scenarios |
| Scenario | id/name, path/living labels, baseline, costs, source/sourceDate, costConfirmed, balance, monthly, contributionStart/End, stepUp, gifts, grant/grantYears, income, coverage/share, assumptions, assumptionsDate/Status, stress, acknowledged, history, billing, costSource |
| History | profile, period, blockYears, costMode, reference, fee, dated allocations; validated enumerations / decimal annual fee |
| Costs | tuition, housing, books, transport, other; annual nominal USD |
| Gift | date YYYY-MM and nonnegative amount |
| Assumptions | returnRate/mean/volatility for early saving; lateReturn/lateMean/lateVolatility; attendanceReturn/attendanceMean/attendanceVolatility; transitionYears; tuitionGrowth/livingGrowth/inflation |

IDs are opaque UUIDs. Rates are decimal fractions, amounts finite USD numbers, dates validated month strings. `domain.js` is the executable contract: reject missing/unknown fields, invalid types, unsupported versions, duplicate IDs, excess allocations, invalid dates and excessive horizons/counts. Limit: 30 students, 20 scenarios per student, 100 total, 24 gifts/scenario, 2 MB imports. Schema-1/model-1 saved records and imports explicitly migrate by adding historical defaults and retaining original inputs. Unknown schemas remain rejected.

Each scenario has one aggregate earmarked balance plus its student's explicitly allocated share of a family pool. Scenario alternatives do not consume extra shares. Accounts and restricted withdrawals are NOT represented as interchangeable individual accounts. The user must ensure eligible funds are used; account rules are future work.

Family defaults are copied snapshots. Editing defaults does not mutate existing scenarios; Apply defaults explicitly copies the saved values. User edits to return assumptions update status/date. No acknowledgement or budget-confirmation gate is used. The version-1 costConfirmed and acknowledged boolean fields are retained solely for existing saved-plan and backup compatibility and are ignored by calculation and simulation.

## Persistence and portability

Every valid real-plan edit automatically writes a synchronous localStorage recovery snapshot and queues the full validated plan to IndexedDB database education-finance, store plans, key workspace. Save now requests the same write explicitly. The header reports Saving automatically, completion, invalid fields or storage failure. Saves wait for transaction completion; storage failures leave inputs available for export. On load, corrupt/unsupported records produce a visible error and are not silently replaced. Reports are not auto-persisted; rerun calculations after reload or export an assessment.

Plan JSON wrapper: format=education-finance-1, exportedAt ISO timestamp, plan. Import parses and validates before any mutation, previews student/scenario counts and aliases, and requires Replace workspace. Confirmed replacement is saved automatically. Export assessments separately as JSON with full plan snapshot, model/PRNG/assumption versions, seed/trial settings, timestamp, and results; outcome-range CSV is spreadsheet-safe; reports can be printed.

Use textContent and value, never user HTML. Validate imports as data; no evaluation. Browser storage is not secure archival storage or cross-device sync. GitHub receives ordinary page/asset requests, but financial inputs are processed locally. Only site/ is deployed; never commit exports or actual student data.

## Simple starting form

The main form shows current savings, enrollment month, annual tuition, and annual housing/food. Other fields are collapsed. Only enrollment is HTML-required; it is prefilled. Blank costs and optional funding amounts resolve to zero, while blank names, dates, durations and return settings retain their existing/default values. Resolved values are put back into controls when a plan is committed, so the displayed inputs agree with the calculation. Dates and nonblank values remain validated. Student and scenario names are generated automatically. All names, detailed costs, contribution schedules, shared allocations, and return stages remain editable. No acknowledgement is required after changing assumptions, applying defaults, loading old plans, or comparing scenarios.

If no college budget is entered, results describe savings growth without showing a funding-success percentage or contribution target. Source metadata defaults to User estimate and the valuation month; it is optional to edit.

## Result lifecycle

Render the initial form and projection before waiting for storage. A saved plan regenerates its historical assessment on load; selecting/importing a student or scenario also regenerates it. Do not overwrite edits made while an asynchronous saved-plan load is pending. Automatic projection commits preserve the typing cursor and avoid writing back the active input. Explicit actions normalize optional defaults. Dependent default contribution dates are synchronized when enrollment changes. CSV/report data comes from the assessment snapshot. Entry script and stylesheet URLs are versioned to avoid retaining the older results-clearing code after deployment.

## Data packaging

Raw inputs, source hashes, transformations and attribution are committed in `data/`; `scripts/prepare_history.py` rebuilds `site/data/history.json` offline. Only site/ is published. Dataset ID and observation SHA-256 accompany assessment exports. All module import URLs and the worker entry are versioned to avoid mixing the new schema with older cached modules. No user data is sent for calculations. Family joint simulation remains future work.

## Temporary example workspace (v0.2.1)

Try an example validates and snapshots the current in-memory plan, selected student/scenario and dirty/save status, then switches to a separate fictional plan. Exit example restores that snapshot and recalculates; it does not commit example edits. Save now, import, repeated example entry and local-data deletion are disabled during example mode. Real pending edits are checkpointed before entering the example. The original selection and status remain in tab memory; the real plan persists through reload via autosave/recovery. Disposable example edits never enter either save store. Export remains available.

`distribution.js` derives actual dollar-band counts from the existing simulation samples. `history.js` includes those summaries in assessments, and `render.js` supplies the gauge and an outcome selector without a second computation control. Schema and financial formulas are unchanged.

## Save ordering and recovery

Changes schedule a microtask checkpoint after structural UI updates, avoiding copying the previous student form into a newly added student. Validation is independent of simulation/worker completion. Recovery records use education-finance-recovery-1 with the validated plan, selected IDs and pending flag. On reload, a valid recovery copy takes priority and pending saves are retried; missing/corrupt recovery falls back to the browser database with a visible read error. Invalid IDs fall back to the first valid student/scenario.

Database writes are serialized. An older completion can neither mark a newer recovery record saved nor clear a newer dirty revision. Initial database reads cannot replace edits made since startup. Clear-local waits for prior writes and removes both stores, preventing a queued save from resurrecting deleted data. Page hide, hidden visibility and beforeunload checkpoint pending valid edits; reload safety does not depend on a mobile unload prompt. When recovery storage fails, database saves are still attempted; when database saves fail but the recovery copy succeeded, the header says so and Save now can retry. No cloud requests or new persistence dependency are introduced.

## Calculation-session settings (v0.2.3)

`session-seed.js` generates the initial seed with crypto.getRandomValues, validates stored unsigned integers, and stores the selected seed in sessionStorage under education-finance-session-seed-v1. It is separate from real-plan autosave/recovery, so a new session can produce a new sample without modifying student data. A valid manual edit updates session state immediately, including zero; blank reuses the current value. Restricted session storage falls back to page memory. Reports already include the actual seed; plan backups do not pin it. The PRNG, financial model, data, and calculation/compare controls remain unchanged.

`gauge-colors.js` derives the gauge palette relative to the selected threshold. SVG arc segments shade by angular probability, with a boundary exactly at the target; overlapping segments prevent antialiasing seams. Green is reserved for meeting the goal. The marker and target tick use the same probability coordinates, with a dark marker outline and readable text. No third-party chart dependency is required.

## School planning extensions (v0.3.0)

`planning.js` owns tuition term offsets, dated allocation lookup and the monthly attendance-overlap summary. `cost-presets.js` owns attributed, dated published budget snapshots and a pure apply helper. There is no runtime school-data request. New scenario fields are billing {calendar, livingMonths} and costSource {school, academicYear, residency, url, presetId, modified}. Historical settings add allocations [{date, stocks, bonds, cash, referenceRate}]; input records keep referenceRate null, while assessment reference clones derive it from the selected data. Reference preparation clears derived values before resolving them, so input assumptions remain independent of output.

Schema 1/model 1 and schema 2/model 2.0 migrate explicitly to schema 3/model 2.1. Existing numbers, IDs, dates, sources, flags and manual return assumptions remain. New defaults are semester, nine months, empty structured metadata and no allocation overrides. IndexedDB and synchronous recovery both use the migration. Unknown versions still fail.

Budget preview selection does not commit inputs or rerun an assessment. Use selected budget explicitly applies the preview. Four basic inputs and one Calculate action remain. Year-by-year funding is a visible fixed-reference result; underlying ledger and JSON export preserve the payment schedule and cent precision. Annual table summaries do not create a new stochastic path. The optional family overview reads the plan's enrollment/duration only and makes no funding-probability claim.

## v0.4.0

Saved schema 4 adds `family: {monthlyLimit: number|null, scenarios: {studentId:scenarioId}}` and per-scenario `history.tuitionBasis`. `household.js` sums paired-path student obligations and applies a proportional monthly deposit cap before running the pure ledgers. `probability.js` supplies sampling intervals and target status. `storage.js` owns the exclusive browser Web Lock and separate raw draft persistence. No dependencies, backend, telemetry or third-party runtime requests were added.

## v0.5.0 ownership and breaking contract

Schema 5/model 4.0.0 removes all funding fields from persistent education scenarios. `student.funding` holds monetary inputs, contribution schedules, goals and investment settings. Education scenarios hold costs, attendance length, school aid and expense/sampling settings. The pure domain resolver creates a cloned flat calculation view consumed by the existing monthly engine, historical assessment and renderer. This view is rejected by saved-plan validation. No legacy migration is retained; format-2 backups and schema-5 browser stores are the only supported input contracts. Legacy store cleanup runs under the exclusive editor lock and never erases an already-current record solely because another store contains legacy data.
