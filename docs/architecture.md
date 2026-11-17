# Current architecture · v0.10.0

Buildless HTML/CSS/vanilla ES modules hosted under `/education-finance/`. No runtime dependencies, backend, telemetry or external financial-data calls. Only bundled own-site data is loaded by the worker.

| Module | Responsibility |
| --- | --- |
| `domain.js` | Strict schema 5, student-owned funding, school scenarios, metadata-only model upgrades and portable backups |
| `engine.js` | Pure monthly compiler, bill repricing, ledger and path-specific contribution solver |
| `calibration.js`, `economy.js` | Forward-anchored paths, regularized joint macro history, Treasury repricing and college-cost coupling |
| `cost-trends.js`, `cost-correction.js`, `cost-uncertainty.js` | Shared live/offline price methods and the disabled uncertainty candidate |
| `history.js`, `history-config.js` | Optional historical replay, current Monte Carlo aggregation and contribution estimation |
| `random.js`, `savings-target.js`, `probability.js` | Deterministic sampling, sampling reserve and Wilson checks; no unused parametric engine |
| `household.js` | Common-path student ledgers, deposit caps and family success |
| `worker.js` | Immutable calculation snapshots, progress messages, dataset/report hash checks |
| `storage.js`, `recovery.js`, `draft.js` | Browser persistence, synchronous valid-plan recovery, editor locking and pending text |
| `app.js`, `render.js` | Single Calculate workflow, DOM-safe results, SVG charts and contextual validation |

The entry module, worker and internal imports share the app version query. Financial logic is independent of DOM and storage. Workers receive run IDs and immutable input snapshots; obsolete workers are terminated on edits. Valid edits refresh the same assessment after a short pause. No additional simulation action is introduced.

The worker loads `calibration-reviewed.json`, current whole-plan and uncertainty reports and archived component reports. Canonical SHA-256 identities link each report to its bundle and protocol. The current release retains older datasets/protocols for offline reproduction.

Real-plan edits checkpoint valid recovery state before asynchronous database saves. Serialized writes cannot mark newer edits saved. Pending raw text remains separate from validated data. Example mode keeps a temporary workspace and restores the original plan; it never persists fictional data over it. Exclusive editing prevents two tabs from resetting or writing one workspace simultaneously. Browser storage has no device sync; export/import handles portability.

Offline `review-calibration.mjs` evaluates the frozen candidate rule and full-plan diagnostics. `validation-inputs.mjs` rejects future error targets and truncates macro observations before each September origin. Historical known price levels stop at the origin. `build_reviewed_release.mjs` pins the selected policy and report hashes. Live rendering displays poor coverage and untested horizons alongside favorable scores.

[Current model](model.md) · [Archived architecture](archive/architecture-through-v0.9.0.md)

## App 0.15 decision extension

Current behavior is authoritative in [model](model.md); earlier architecture sections describe older releases. `decision-scenarios.js` compiles ephemeral alternatives, constructs matched economic paths, summarizes gaps, and selects origin-side opening reserves. `deposit-policy.js` is a pure cent-conserving monthly allocation comparison with no DOM or persistence. `worker.js` attaches these bounded diagnostics after the existing assessment and verifies the separately hashed decision evidence. `render.js` presents collapsed accessible tables; `app.js` exports the entire immutable assessment. No new storage schema, external requests beyond pinned static assets or controls are introduced.

`scripts/validate-decision-boundaries.mjs` uses the existing origin cohort/ledger/statistics helpers, writes full cases under `data/decision-cases/` and a source/dependency-identified compact report under `site/data/decision-validation.json`. CI reproduces that report and its cases without replacing old reports. Financial and evidence tests cover timing, cap conservation, ownership, policy information boundaries, policy improvement/failure, threshold ties and source identities.
