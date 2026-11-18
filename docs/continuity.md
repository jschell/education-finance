# Start here: project continuity

Updated **2026-11-17, America/Los_Angeles**. This is a repository-grounded handoff. Update it at meaningful checkpoints; conversations are not the project record.

## Read in this order

1. This file: deployed state, verified work and next action.
2. [Current model](model.md) and [working instructions](../AGENTS.md): financial and implementation contracts.
3. [Active work plan](active-work-plan.md) and [next calibration steps](calibration-next-steps.md).
4. [Decision record](decisions.md), then the frozen protocol/results for the task being resumed.

## Completed checkpoint — bounded price-source trace

[PR #10](https://github.com/jschell/education-finance/pull/10) merged at **`e37db347fa349ded86b636080cbcc43ed6fa994d`**, from head `7e8cb151fad8dec631756adecc9e031cc58cc592`, based on main `aeaeedd994bc4e2c9f55f7a4ac1dca2466421c16`. Execution note `aa14424` and **registry `2367a97` were committed before source retrieval**. The [bounded trace results](calibration-price-trace-results.md) now execute the prior plan; **[final CI 44229411339](https://github.com/jschell/education-finance/actions/runs/44229411339) passed**: 190 Node tests, three Python extraction tests, all prior and new artifact reproductions, prospective integrity and browser regressions. Cached source excerpts separately re-extract byte-for-byte from all 32 official archives. No app/model/schema, economic defaults, raw selected data, forecasts or original report changes.

**Finding:** 21/30 selected sector/component events have a changed retrospective endpoint (16 unique school/component transitions). All 32 official annual price/directory archives match their pinned hashes; all 180 source comparisons are available. 53/120 later comparisons change the amount even though **all changed values and original endpoint flags are Reported**. Nine events remain unchanged across the compared snapshots; their economic causes are not thereby established. Directory sectors are stable in the checked rows. The review is extreme-selected and cannot estimate population revision rates.

Source excerpts and dictionary academic-year mappings are committed with an explicit extractor. Registry/comparison reproduction is offline; full archive/excerpt verification uses an ignored cache and a manual workflow. Three institutional/context PDFs have locally verified byte identities; the Commerce document is web-reader-only after HTTP 404, and its expense section labels a different year from its cover. Miami and Redwoods have partial policy/definition context; no event receives a fully reconciled economic-cause label.

**Revised next action:** execute the committed [revision-aware price-panel plan](revision-aware-price-panel-plan.md): a source-snapshot/academic-year panel and documented collection/as-of availability contract before specifying one economic candidate. The audit is complete; do not repeat it or retrofit the old current-year panel. Never feed a later retrospective revision into an earlier forecast origin. Retrieved revised archives are not original publication vintages. The prior Reported-only sensitivity is preserved; it did not test this cross-snapshot inconsistency. Keep source revision, genuine policy changes and unresolved causes separate.

## Completed checkpoint — app 0.15 decision release

[PR #9](https://github.com/jschell/education-finance/pull/9) merged at **`405443a29990e45d97a45b1af41d3b8690c3de3b`**, from implementation head `78615e2becebda3877f4d5685fb08c40205e4203`. Plans preceded implementation (`8e900f0`) and historical scoring (`e310aa2`). Read the [frozen protocol](decision-release-plan.md) and [results/failure modes](decision-release-results.md). The implementation is merged; do not recreate it from the earlier review proposal.

| Item | Verified state |
| --- | --- |
| Release | App **0.15.0**, additive diagnostic method **funding-decisions-1.0.0**, core **college-funding-12.0.0**, schema5 |
| Financial inputs | Same active foundation and provisional 4%/3% nominal trends; saved student funding, main gauges, independently checked required-deposit solver and original reports preserved |
| Local validation | **187/187 tests**; decision cases/report reproduce byte-for-byte; integrated synthetic two-student worker succeeds, preserves inputs and conserves both policies' monthly budgets |
| Final PR acceptance | [44186800165](https://github.com/jschell/education-finance/actions/runs/44186800165) **passed**: all prior and new report reproductions, prospective integrity, phone/iPad/desktop/project-prefix, keyboard, expanded historical table and JSON export |
| Pages | [44188097228](https://github.com/jschell/education-finance/actions/runs/44188097228) **passed** at merge SHA |
| Live acceptance | [44188238543](https://github.com/jschell/education-finance/actions/runs/44188238543) **passed**: live source/report bytes and synthetic phone/iPad/desktop/keyboard/export checks at merge SHA |
| Main full checks | [44188097500](https://github.com/jschell/education-finance/actions/runs/44188097500): in progress when this handoff was recorded; the identical final PR tree already passed all checks |

This documentation-only handoff follows the verified release SHA; it changes no code or generated evidence. Remote `main` contains the merged release. Local checkout branch names are not deployment evidence.

Shipped: seven matched attendance/support alternatives including baseline; same-budget proportional/dated-priority deposit comparison with cent-conserving caps; no balance transfers or input mutation; source-identified historical boundary evidence with stronger ledger baselines and genuinely binding sibling caps. Every alternative remains a diagnostic, not an applied saved policy or calibrated event probability.

Evidence support: 2,160 individual cases, 1,296 observed and 864 unreached, using only **four school identities** across ten overlapping origins. There are 90 capped households, assessed under both policies; 36 observed pairs. Priority improves two pairs and ties 34 in this small extension, but a synthetic future-gift counterexample demonstrates that it can be worse. Retain that failure case and the original broad-grid evidence. Numerical tests and better Brier scores do not resolve economic calibration.

**Next action at the app 0.15 checkpoint:** execute the [30-event source-price trace](calibration-price-trace-plan.md). This is now completed in the source-investigation checkpoint above. Use its findings before freezing one coherent cost candidate/protocol; do not add a new correction merely to fit these observed scores. Prospective outcomes remain pending; wait-8 household and wait-18 complete-bill support are unavailable. Physical iOS Safari persistence and richer account/attendance schedules remain separate work.

## Completed checkpoint — deep model/scenario review

A research and implementation review of `1b79753ebcd335e339a89c14ae9631114d1f01bd` is now written: [deep findings](model-and-scenario-review.md), [primary research/reuse catalog](model-research-sources.md), and [proposed decision scenarios](scenario-design-plan.md). This is research/proposed priority, not an implemented new model or a change to frozen gates.

Fresh support audit: 9,850/18,000 individual cases have observed outcomes; 5,443 of those forecast exactly zero or one. All 32 observed near-entry capped household cases are nonbinding, with no probabilities in the 5–95% interior. Controlled zero-return examples demonstrate the material effects of one extra attendance year, interrupted deposits and a different permitted deposit schedule. `scripts/review-scenario-design.mjs` reproduces the source-hashed support artifact and its accounting assertions. Existing financial tests remain 176/176 passing.

The review recommends retaining the monthly ledger while distinguishing goal, education path, economic world, household event and policy. Define a small decision-scenario registry and stronger baselines in parallel with the bounded 30-event price trace. Do not treat the existing four-year price laboratory as general household calibration, and do not import a vendor or open-source component's defaults as evidence of calibration. At that review checkpoint, scenario features and policy comparisons were still proposals; app 0.15 subsequently shipped the bounded extension.

## Completed checkpoint — source quality and school persistence

[PR #8](https://github.com/jschell/education-finance/pull/8) merged at `4e83449bb44a389125ea8ddd7b00e9d9872f9b08`. [CI 44124951755](https://github.com/jschell/education-finance/actions/runs/44124951755) passed all checks, including isolated pinned Python dictionary extraction, deterministic audit reproduction and browser checks. The source-quality plan was committed as `5fd5085`, then the gapped-window/large-change amendment as `0514754` before those additional comparisons. Official dictionaries are pinned for all 24 years, with the same-year IC2014 supplemental legend explicit. Both extraction and report generation reproduce identically; **176/176 local tests pass**.

[Results](calibration-quality-persistence-results.md): source-quality exclusions change evaluated coverage by at most 0.50 percentage point. Gapped school growth comparisons remain mostly weak/negative, so cross-school forecast dispersion must not be converted directly into permanent school growth-rate variation. Large-change sensitivities and original results remain separate. No financial defaults, app/model/schema version, forecasts or candidate activation changes.

**Source-investigation next action:** follow the committed [large-price-change trace plan](calibration-price-trace-plan.md), alongside the scenario-design recommendations above. Select the fixed known-school review set, compare official source snapshots with their pinned hashes and year-specific field definitions, and distinguish revisions, plausible policy changes and unresolved causes before specifying a new coherent candidate. The subsequent bounded trace results are recorded above; this paragraph describes the source-quality checkpoint.

## Prior evidence release checkpoint — app 0.14

| Item | Verified state |
| --- | --- |
| Release | **App 0.14.0 / college-funding-12.0.0 / schema 5**; [PR #7](https://github.com/jschell/education-finance/pull/7) merged at `9d978a811cfb78fd11a686f8c8975aeb95425c5f` |
| Active bundle/defaults | `site/data/calibration-foundation.json`; provisional nominal tuition/housing trends 4%/3%; no cost candidate activated |
| PR acceptance | [Check 44110246405](https://github.com/jschell/education-finance/actions/runs/44110246405) passed: financial tests, all report reproductions, prospective record and phone/iPad/desktop/keyboard/project-prefix browser checks |
| Main release checks | [44111217451](https://github.com/jschell/education-finance/actions/runs/44111217451) succeeded at release SHA |
| Pages | [44111217573](https://github.com/jschell/education-finance/actions/runs/44111217573) succeeded at release SHA |
| Live acceptance | [44111402600](https://github.com/jschell/education-finance/actions/runs/44111402600) passed: deployed source/report bytes and live synthetic browser checks at release SHA |
| Fresh local tests | **176/176** pass, including source-quality/persistence fixtures, release artifacts and diagnostic source/support integrity |
| Reproduction | Foundation/planning/hierarchy and full school/funding reports regenerate byte-for-byte; 12/12 numerical savings checks pass; dispersion audit regenerates identically |
| Prospective record | `data/forecast-snapshots/2026-11-17-model12.json`, source `feea5f7f64eb44fd69332958049945f0fffd3a85`; 25 forecasts, **zero observed, 25 pending** |
| Open finding | [Issue #2](https://github.com/jschell/education-finance/issues/2): future forecast calibration remains unresolved |

At the earlier review checkpoint, the documentation/diagnostic follow-up added analysis without a production change. The subsequent app 0.15 decision extension is recorded above. Fetch current main/branches/PRs before editing; these SHAs are checkpoints, not permission to overwrite newer work. `forecast-calibration-evidence` is now merged, not unfinished work to recreate.

## What is shipped

Static, buildless, browser-local HTML/CSS/vanilla JavaScript with one Calculate action. Student funding is separate from education scenarios. Monthly ledgers price dated bills, grants, income, gifts and deposits. Students share economic paths but retain earmarked funds; household success requires every covered bill to be paid.

Overhaul D (PRs #4–6, app 0.13/model12) repaired conditioned equity expectations, market/college timing and infeasible gate interpretation. It added affordable-budget screens, first unpaid bills, fixed-share household proposals/cap conflicts, target-specific numerical savings reserves, matched stresses and a research-only legacy tuition audit. The coherent hierarchy was evaluated and remains inactive.

App 0.14 (PR #7) adds origin-only school cohorts, withheld identities excluded from fitting, school-level comparisons, earlier-error research qualification, current-model individual/capped household funding evaluation and visible support/reliability diagnostics. Full cases live in `data/calibration-cases/`; compact evidence is `site/data/current-calibration.json`. Read [protocol](forecast-calibration-plan.md) and [results](forecast-calibration-results.md) before changing the evaluator.

The missing current-model snapshot/index/pending-report blocker discovered at `feea5f7` is **resolved**. The record reproduces from its source commit; overwrite rejection and pending-score reproduction pass. Ordinary tests now require the artifacts, so unit-test success cannot conceal their absence. The original model-9 record remains unchanged. First current target month: **November 2027**; comparable published baseline and target levels are both required to score.

Local Chromium cannot launch because this environment denies its singleton socket; local browser acceptance was not claimed. GitHub Actions supplies the browser evidence. Physical iOS Safari persistence is still unverified.

## What the evidence says

The full evaluation registers 5,400 school-model cases, 18,000 synthetic individual plans and 240 household plans, but only 22 sampled known and 20 withheld institution identities. These are not independent economic histories.

Baseline school cost coverage is approximately 30–45% for nominal 80% intervals. The residual candidate qualifies for known-school wait 0 only (reserved interval score 0.1553 to 0.1399; coverage 46.3% to 67.8%), fails withheld-school sector protection and lacks supported longer knots. The hierarchy fails supported comparisons. **No candidate is activated.**

The [new descriptive audit](calibration-dispersion-audit.md) finds 58–90% of total log-error MSE within origin/sector cells, suggesting cross-school error variation needs attention. It does not identify that variation as persistent school effects. Housing has particularly large within-cell shares. The audit is source-hashed, reproducible and checked in CI; it changes no forecasts.

Funding reliability must remain profile-specific. Example: known-school wait-4 cash plans in the 80–90% bin average 81.5% predicted versus 54.3% observed across five related origins. Beating the coin-flip Brier reference does not prove calibration. Wait-8 school evidence has only two origins; wait-8 household outcomes and wait-18 full bill validation are unavailable. No probability remapping from these correlated cases is authorized.

## Next concrete work

The bounded decision registry, policy comparison and origin-selected threshold study are now delivered. Read the completed [source-price trace](calibration-price-trace-results.md), then build the revision-aware source panel with explicit origin availability. Only after that data contract is checked should one coherent cost hypothesis/protocol be frozen before new scoring. Require known-process behavior and matched cost/funding evidence, preserve failed comparisons and unsupported horizons, and keep production activation separate.

The existing household required-deposit proposal still uses fixed shares; the added priority diagnostic is not an optimizer or an applied deposit schedule. The future-gift failure illustrates why broader optimization/account work must remain explicit. Physical iOS Safari testing, richer education/account schedules and stronger long-horizon evidence are unfinished.

## Evidence hierarchy and history

Use current code/bundle and SHA-specific workflow results for implementation/delivery; frozen protocols and source-identified generated reports for evaluation. Chat recollections are leads, not proof of completion.

The deep review of v0.10.2 (`d0d536c`) motivated overhaul D. Its gate/anchor/timing implementation findings were addressed in model12; do not repeat them as current defects without checking. Archived model-9 funding results do not validate model12. `docs/roadmap.md`, older critique reports and parts of architecture prose are historical or partly stale; current priorities are here and in the active plan. Preserve historical source/report bytes and failed comparisons.

## Resume prompt

> Review @GitHub jschell/education-finance. Read AGENTS.md, docs/continuity.md, docs/active-work-plan.md, docs/decisions.md, docs/decision-release-results.md and docs/model.md. Fetch current remote heads/PRs before editing. App 0.15 decision release is merged in PR #9 at 405443a29990e45d97a45b1af41d3b8690c3de3b; do not recreate its scenarios, threshold study or merged prior calibration work. Core model12, schema5, the active foundation and original reports remain unchanged. Four-school boundary evidence and a retained priority-policy failure are diagnostics, not economic calibration. The bounded source-price trace is complete: read docs/calibration-price-trace-results.md and its source-identified artifacts. Execute docs/revision-aware-price-panel-plan.md next, preserving source-manifest versions and explicit as-of limitations; use its findings and the prior quality/persistence audit before freezing one coherent candidate/protocol. Require matched cost/funding checks and retain unsupported horizons and failures. Document exact SHAs, checks, deployment facts and next actions as work proceeds.

## Checkpoint discipline

Before ending a session, record branch/head, app/model/schema/bundle, completed versus planned work, commands/outcomes, PR/deployment links, blockers and one concrete next action. Commit substantive plans before extended implementation; freeze evaluation rules before scores. Retain failed findings. Do not commit machine paths, private family exports, tokens or transient logs.
