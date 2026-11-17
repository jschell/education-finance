# Start here: project continuity

Updated **2026-11-17, America/Los_Angeles**. This is a repository-grounded handoff. Update it at meaningful checkpoints; conversations are not the project record.

## Read in this order

1. This file: deployed state, verified work and next action.
2. [Current model](model.md) and [working instructions](../AGENTS.md): financial and implementation contracts.
3. [Active work plan](active-work-plan.md) and [next calibration steps](calibration-next-steps.md).
4. [Decision record](decisions.md), then the frozen protocol/results for the task being resumed.

## In-progress checkpoint — source quality and school persistence

Branch `calibration-quality-persistence` starts at `ddde81d`; audit plan committed as `5fd5085`, gapped-window/large-change amendment committed as `0514754` before those extra comparisons. Official dictionaries are pinned for all 24 years. The source-quality sensitivity and origin-2010 growth diagnostics are implemented; both dictionary extraction and report generation reproduce identically. [Results and next action](calibration-quality-persistence-results.md).

Source-quality exclusions change evaluated coverage by at most 0.50 percentage point. Gapped growth comparisons remain mostly weak/negative, so cross-school dispersion must not be converted directly into permanent school growth-rate variation. The same-year IC2014 supplemental legend is explicit. No model/default/version changes or new candidate scoring. Fresh `npm run check` passes 176/176 tests and edited documentation links resolve. CI/merge acceptance for this branch remains pending; production state below stays valid.

Next: finish repository/CI checks, merge the diagnostic artifacts and progress notes, then audit large source changes/reversals before specifying a new coherent candidate. Preserve all original comparisons.

## Current checkpoint

| Item | Verified state |
| --- | --- |
| Release | **App 0.14.0 / college-funding-12.0.0 / schema 5**; [PR #7](https://github.com/jschell/education-finance/pull/7) merged at `9d978a811cfb78fd11a686f8c8975aeb95425c5f` |
| Active bundle/defaults | `site/data/calibration-foundation.json`; provisional nominal tuition/housing trends 4%/3%; no cost candidate activated |
| PR acceptance | [Check 44110246405](https://github.com/jschell/education-finance/actions/runs/44110246405) passed: financial tests, all report reproductions, prospective record and phone/iPad/desktop/keyboard/project-prefix browser checks |
| Main release checks | [44111217451](https://github.com/jschell/education-finance/actions/runs/44111217451) succeeded at release SHA |
| Pages | [44111217573](https://github.com/jschell/education-finance/actions/runs/44111217573) succeeded at release SHA |
| Live acceptance | [44111402600](https://github.com/jschell/education-finance/actions/runs/44111402600) passed: deployed source/report bytes and live synthetic browser checks at release SHA |
| Fresh local tests | **168/168** pass, including current release-artifact presence and diagnostic source/support integrity |
| Reproduction | Foundation/planning/hierarchy and full school/funding reports regenerate byte-for-byte; 12/12 numerical savings checks pass; dispersion audit regenerates identically |
| Prospective record | `data/forecast-snapshots/2026-11-17-model12.json`, source `feea5f7f64eb44fd69332958049945f0fffd3a85`; 25 forecasts, **zero observed, 25 pending** |
| Open finding | [Issue #2](https://github.com/jschell/education-finance/issues/2): future forecast calibration remains unresolved |

The current documentation/diagnostic follow-up adds reproducible analysis and verification, with no production model change. Fetch current main/branches/PRs before editing; these SHAs are checkpoints, not permission to overwrite newer work. `forecast-calibration-evidence` is now merged, not unfinished work to recreate.

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

The evidence release and first dispersion decomposition are complete. Continue [the post-results plan](calibration-next-steps.md), beginning with **source-quality and temporal/persistence diagnosis**: interpret the raw IPEDS flags using year-specific dictionaries, audit missing/changed-sector cases, and distinguish persistent school errors from annual/common shocks. Then commit one new coherent candidate/protocol before scoring it, verify known processes, and evaluate both cost and individual/household funding outcomes with the existing held-out/sector/horizon protections. More paths or related schools cannot replace longer comparable outcome history.

Physical iOS Safari testing, optimal household allocation and richer education/account schedules are separate product work. Current household proposals use fixed shares; affordable-budget screens are not independently verified probability targets.

## Evidence hierarchy and history

Use current code/bundle and SHA-specific workflow results for implementation/delivery; frozen protocols and source-identified generated reports for evaluation. Chat recollections are leads, not proof of completion.

The deep review of v0.10.2 (`d0d536c`) motivated overhaul D. Its gate/anchor/timing implementation findings were addressed in model12; do not repeat them as current defects without checking. Archived model-9 funding results do not validate model12. `docs/roadmap.md`, older critique reports and parts of architecture prose are historical or partly stale; current priorities are here and in the active plan. Preserve historical source/report bytes and failed comparisons.

## Resume prompt

> Review @GitHub jschell/education-finance. Read AGENTS.md, docs/continuity.md, docs/active-work-plan.md, docs/decisions.md, docs/calibration-next-steps.md and docs/model.md. Inspect current remote heads/PRs and the latest checkpoint before editing. App 0.14/model12 evidence work and its current-model snapshot were completed; do not recreate the merged branch or repeat its failed candidates. Continue source-quality and temporal/school-error diagnosis from the reproducible dispersion audit, then freeze a single revised candidate/protocol before new scoring. Require cost and funding evidence, preserve unsupported horizons and keep production activation separate. Document exact SHAs, checks, findings and the next action as work proceeds.

## Checkpoint discipline

Before ending a session, record branch/head, app/model/schema/bundle, completed versus planned work, commands/outcomes, PR/deployment links, blockers and one concrete next action. Commit substantive plans before extended implementation; freeze evaluation rules before scores. Retain failed findings. Do not commit machine paths, private family exports, tokens or transient logs.
