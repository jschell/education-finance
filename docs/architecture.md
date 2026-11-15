# Architecture and data contract

## Decisions

Static semantic HTML/CSS and vanilla ES modules. Host on GitHub Pages under /education-finance/. Use only relative URLs, no server routes or SPA fallback requirement. No runtime CDN dependencies, telemetry, remote financial APIs, or authentication in the initial scope.

Current tree: site/ contains the preparatory static page; scripts/check.mjs validates packaging and local links. Future site/js/ modules: domain (validation and immutable plan inputs), engine (pure cash flows), simulation (seeded paths and aggregation), workers (cancellable runs), storage (IndexedDB and migrations), ui (forms/charts/tables). Do not create empty module files as if implemented.

Simulation worker messages carry a runId, immutable input snapshot and versions. Progress/result/error messages include that ID; ignore stale results after edits. Cancel by terminating the worker. Retain summaries and selected paths rather than every monthly balance from every trial. Do not freeze the UI during contribution solving.

## Proposed persisted shape (schema version 1)

| Entity | Required fields / relationships |
| --- | --- |
| Plan | schemaVersion, id, valuationMonth YYYY-MM, currency, assumptionSets[], students[], accounts[], scenarios[], modelVersion |
| Student | id, alias, optional age/grade, enrollmentMonth, remainingYears |
| Account | id, balance, asOfMonth, type, investmentProfileId; owner/allocation records |
| Allocation | accountId, studentId, amount or explicit fraction; allocations cannot exceed pool |
| CostPath | id, studentId, baselineMonth, source metadata, per-year category amounts and living arrangement |
| Scenario | id, studentId, costPathId, coverageGoal, account allocations, dated contributions, grants, income support, assumptionSetId and overrides |
| AssumptionSet | id, version, values with units/provenance/status/date |
| Run | id, scenario snapshot/hash, seed, PRNG/model/assumption versions, trialCount, timestamp, aggregate outputs |

IDs are stable opaque strings; amounts are finite USD numbers with cent-level payment rounding; rates are decimal fractions; dates are validated month strings. Presentation percentages are not stored as whole numbers. Preserve input precision for compounding and specify final payment rounding in tests. Future unsupported fields/versions must cause a clear import error rather than guessed migration.

First engine supports one allocated portfolio balance per student; the data model preserves account identities for later restrictions. Do not imply 529, custodial, and unrestricted funds are interchangeable. Confirm eligibility before restricted-account withdrawals in a future multi-account engine.

## Persistence and import/export

IndexedDB stores plans and input snapshots locally after explicit save; visible saved/unsaved status. JSON export is the portable backup with schema/model versions and timestamp; JSON import previews plan details and requires explicit replace/duplicate selection. Validate types, bounds, references, dates, allocations, size limits, and unsupported versions before any write. Use textContent for user text, never untrusted HTML. Handle blocked storage, quota, corrupt data, and failed writes with export/retry paths. A user can delete a plan and all local data.

No actual student data in repository fixtures. Public Pages serves public source assets, while entered finances remain local. GitHub receives ordinary page requests; avoid claiming zero network activity. No cross-device sync initially.
