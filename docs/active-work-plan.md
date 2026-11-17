# Active work plan

Checkpoint: 2026-11-17 America/Los_Angeles. Read [continuity](continuity.md) first. Overhaul D and the app 0.14 calibration evidence release are complete; this plan now continues source-quality diagnosis and the next model-evidence program. Financial defaults remain unchanged and future outcomes are not available.

## Decision release — implemented, acceptance in progress

[Committed protocol](decision-release-plan.md) and [results](decision-release-results.md) now implement the small attendance/support registry, same-budget household policy comparison and origin-selected threshold study with fixed-reference/zero-growth baselines. Local checks pass 187/187. The historical extension is retained alongside the broad grid; it is not a new cost candidate or calibrated probability mapping. Complete branch CI, project-prefix/browser acceptance, merge and deployed byte/browser checks; then update continuity with exact SHAs/results. Next research action is the separately committed bounded source-price trace, followed by one newly frozen candidate if its hypothesis is supported.

## 1. Evidence release — completed

[PR #7](https://github.com/jschell/education-finance/pull/7) merged app 0.14/model12 at `9d978a811cfb78fd11a686f8c8975aeb95425c5f`. Financial defaults remain the corrected foundation; no candidate is active. See [continuity](continuity.md) for exact CI/Pages/live acceptance links.

- All school/funding case files and compact reports regenerate byte-for-byte, as do foundation/planning/hierarchy reports.
- The current-model snapshot, index and zero-observed/25-pending report are committed. Source-pinned reproduction and overwrite rejection pass; the ordinary test suite requires the artifacts.
- PR CI passed financial, report, prospective and phone/iPad/desktop/keyboard/project-prefix browser checks. Local Chromium is environment-blocked, so local browser success is not claimed.
- The first [dispersion audit](calibration-dispersion-audit.md) is implemented, source-identified and deterministic. CI checks reproduction; tests reconcile sources and sample support.

Useful commands from the repository root:

```sh
npm run check
node scripts/build_foundation.mjs
node scripts/validate-foundation.mjs
node scripts/validate-planning.mjs
node scripts/validate-hierarchy.mjs
node scripts/validate-current-calibration.mjs
node scripts/verify-current-snapshot.mjs
node scripts/audit-calibration-dispersion.mjs
git diff --exit-code -- site/data/calibration-foundation.json site/data/foundation-validation.json site/data/planning-validation.json site/data/hierarchy-validation.json site/data/current-calibration.json data/calibration-cases/ data/calibration-diagnostics/dispersion.json
```

Use a clean checkout and retain every exit status. Full school/funding regeneration is a release check, not necessary for every prose edit. New forecasts use unique files and explicit as-of dates; never overwrite an existing record. Future source-backed outcomes remain unavailable until actually published.

## Research priority update — decision extension implemented

The [deep model/scenario review](model-and-scenario-review.md) finds the current controlled laboratory too narrow for broad household-resilience claims. The [scenario-design proposal](scenario-design-plan.md) adds goal/path/world/event/policy contracts, attendance/support alternatives, actually binding cap cases and origin-selected decision-boundary plans. Define this small registry and stronger price/funding baselines in parallel with the bounded source trace. Existing promotion thresholds and archived evaluation protocols do not change. The review itself changed no behavior; the subsequent decision release implements the bounded diagnostics and historical extension linked above. Richer persistent path/account controls remain separate work.

## 2. Obtain evidence that can change calibration conclusions

Continue [the concrete post-results follow-up](calibration-next-steps.md). The first descriptive error decomposition is complete. Source-quality/flag interpretation and temporal/persistence diagnosis are merged in PR #8 with passing CI; see [the detailed findings](calibration-quality-persistence-results.md). Continue [the committed large-change trace plan](calibration-price-trace-plan.md) before specifying the next candidate. Treat this as a data/evaluation program, not another automatic correction layer.

| Workstream | Planned approach | Exit criterion |
| --- | --- | --- |
| Comparable longer school history | Audit field semantics, residency, fees, population, housing, IDs/sector changes, publication dates and attrition. Keep tuition-only research separate when housing does not bridge. | Dated source/dictionary crosswalk and honest origin cohorts; demonstrably more supported long-wait outcomes, or a documented specific discontinuity |
| Current source refresh | Audit latest complete macro/CPI/school releases and vintages. Validate full-series FIZ/CIZ construction before any market refresh. | Pinned raw bytes/hashes, availability contract, boundary/continuity checks and rebuilt current evidence |
| Revised school uncertainty candidate | Use the current branch's missing-dispersion/withheld-school findings to propose one small coherent model; distinguish shared shocks, persistent school effects and parameter uncertainty. | Newly frozen protocol before scoring, known-process tests, held-out school and sector checks, proper complete-bill scores, supported horizons, retained failures |
| Funding evidence for a qualifying candidate | Reprice complete individual/household ledgers on shared paths and dated policies; evaluate reliability, bias, Brier skill, missingness and temporal support. | Candidate-specific funding evidence; a cost-only qualification cannot activate a forward funding-probability claim |
| Prospective monitoring | Append separate reviewed source-backed outcomes when comparable baseline and target data are actually published. | Immutable original forecast; scored observed targets, explicit pending/unavailable reasons and publication/definition checks |

No recurring job is currently enabled or required. More schools or simulated plans do not create more independent macroeconomic decades. Previously inspected reserved periods remain retrospective evidence. Never lower a threshold after scores, remap probabilities from correlated synthetic cases, splice ambiguous legacy series, or claim a stronger horizon than the data support.

## 3. Product backlog after evidence infrastructure

Physical iOS Safari export/import, persistence, example restoration and recovery need device verification. Household allocation optimization, transfer/year-specific education schedules, restricted account modeling and reusable template management are separate product scope; the existing fixed-share proposal is not an optimizer. Update partly stale architecture/roadmap prose against current code before using it as an implementation specification. Prioritize this work explicitly rather than allowing old milestone lists to displace the active calibration release.
