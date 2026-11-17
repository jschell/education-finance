# Active work plan

Checkpoint: 2026-11-17 America/Los_Angeles. Read [continuity](continuity.md) first. Overhaul D is complete; this plan continues the existing unmerged calibration branch. Continuation is authorized to finish verification, merge and deploy the evidence release. Financial defaults remain unchanged and future outcomes are not available.

## 1. Finish the current evidence release

Work from `forecast-calibration-evidence` after inspecting its latest remote SHA and integrating this documentation safely. Starting reviewed head: `feea5f7f64eb44fd69332958049945f0fffd3a85`. Preserve its frozen protocol and pre-score amendments; do not tune to the observed final scores.

| Work | Current status | Completion evidence |
| --- | --- | --- |
| School and full funding evaluator | Implemented; full deterministic regeneration in progress; release-artifact regression added | Rerun evaluator and compare all compact/full case bytes; inspect qualification and missing-support states |
| Prospective tooling | Implemented; source/definition/overwrite checks present | Matching committed-source snapshot regenerates identically; invalid inputs/overwrite rejected |
| Current-model forecast record | Completed in continuation; source-pinned verifier passes (25 pending, zero observed) | New unique snapshot, `data/forecast-snapshots/current-index.json`, `site/data/prospective-validation.json`; verifier succeeds |
| Browser and CI | Local browser blocked by environment socket restriction; CI acceptance pending | Project-prefix, phone/iPad/desktop/keyboard, disclosures, worker/persistence checks; current reports reproduced in CI |
| Release | **Unmerged and undeployed** | Reviewed PR, successful main checks, Pages success and deployed bytes/browser check at exact release SHA |
| Issue/status refresh | Issue #2 still describes model 9 | Keep unresolved calibration issue open; refresh status with current release/report evidence and limits |

### Snapshot completion approach

1. Read `scripts/create-forecast-snapshot.mjs`, `scripts/calibration/prospective.mjs` and `scripts/verify-current-snapshot.mjs` on the branch. Source bytes and protocol must be committed before the record claims that source commit. Use the active foundation bundle; no financial default changes.
2. Create an exclusive synthetic snapshot with an explicit actual as-of date and unique path. Record exact source commit, source/bundle hashes, model, sector/price definitions and target years. Never overwrite `2026-11-16-model9.json`.
3. Create the index expected by the verifier and an explicit pending/unobserved score report through the scorer. Inspect the verifier's field contract; do not invent a schema or populate observations simply to pass checks. Keep both baseline and target unavailable until comparable source-backed prices exist.
4. Commit the record/index/report separately from the source revision it identifies. Verify historical source availability from a full git checkout; CI already requests full history on this branch.

Commands available **on that branch**, from the repository root:

```sh
npm run check
node scripts/build_foundation.mjs
node scripts/validate-foundation.mjs
node scripts/validate-planning.mjs
node scripts/validate-hierarchy.mjs
node scripts/validate-current-calibration.mjs
node scripts/create-forecast-snapshot.mjs --as-of YYYY-MM-DD --output data/forecast-snapshots/NEW_UNIQUE_FILE.json
node scripts/score-forecast-snapshot.mjs --snapshot SNAPSHOT.json --as-of YYYY-MM-DD --output NEW_SCORE.json
node scripts/verify-current-snapshot.mjs
git diff --exit-code -- site/data/calibration-foundation.json site/data/foundation-validation.json site/data/planning-validation.json site/data/hierarchy-validation.json site/data/current-calibration.json data/calibration-cases/
```

Replace placeholders with actual dates/paths. Run generation in a clean checkout and inspect expected new artifacts separately from reproduction diffs. Do not let a shell's final successful command mask an earlier failed command. Large school/funding evaluations are release checks, not something to rerun for every prose change. Follow `.github/workflows/check.yml` for isolated Playwright setup and browser commands.

Release acceptance: source-identified reports reproduce; prospective verifier succeeds; no candidate silently activated; schema-5 saved amounts preserved; archived reports explicitly labeled; current reliability support visible; no future outcome fabrication; UI checks and CI pass. Record merge and deployment outcomes rather than assuming push means live. Update continuity, README/model status and issue #2 once evidence exists.

## 2. Obtain evidence that can change calibration conclusions

After release, treat this as a data/evaluation program, not another automatic correction layer.

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
