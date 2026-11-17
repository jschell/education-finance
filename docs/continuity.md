# Start here: project continuity

Updated **2026-11-17, America/Los_Angeles**. This is a repository-grounded handoff, not a claim that every prior conversation was recovered. Update this file at each meaningful checkpoint; a conversation is not the project record.

## Read in this order

1. This file: deployed state, unmerged work, next action.
2. [Current model](model.md) and [working instructions](../AGENTS.md): financial and implementation contracts.
3. [Active work plan](active-work-plan.md): ordered remaining work and acceptance checks.
4. [Decision record](decisions.md): settled choices and approaches that must not be repeated blindly.
5. The named protocol/results for the task being resumed. Read historical release reports only when reproducing that release.

## Current checkpoint — calibration release completion

Production remains app 0.13/model12/schema5 at `dec93de55b8f26e53a836eb6f7a893c90fc5d85f`. Its Check, Pages and live verification runs all passed ([44025951423](https://github.com/jschell/education-finance/actions/runs/44025951423), [44025951474](https://github.com/jschell/education-finance/actions/runs/44025951474), [44026032069](https://github.com/jschell/education-finance/actions/runs/44026032069)).

Continuing `forecast-calibration-evidence` from `feea5f7f64eb44fd69332958049945f0fffd3a85`, with main's handoff integrated. The missing current-model forecast/index/pending-status artifacts are now added. `node scripts/verify-current-snapshot.mjs` passes: 25 forecasts, zero observed, 25 pending; source-pinned reproduction and overwrite rejection pass. Source revision remains `feea5f7`; source bytes match that commit. A release integration test now catches missing artifacts during `npm run check`.

Fresh `npm run check` passes **167/167** tests. Foundation, practical-planning and hierarchy reports regenerate byte-for-byte; 12/12 savings verification checks pass. Full current school/funding report reproduction and release checks are in progress. Local Chromium cannot launch because the execution environment denies its singleton socket. Browser acceptance will use the existing GitHub Actions phone/iPad/keyboard/project-prefix workflow; this is a local environment failure, not a browser pass. No candidate has been activated, no outcome fabricated and no claim of calibrated future probabilities made.

Next: inspect full report diffs and final tests, open the release PR, require CI/browser success, merge and verify Pages/live bytes/browser. Update this section with exact release SHA and workflow URLs when observed. See [active plan](active-work-plan.md).

## Previous checkpoint — before continuation

| Item | Observed state |
| --- | --- |
| Production/default branch | `main`, `58dbed827ccba10c248721080475e8314e40012a` before this documentation update |
| Shipped version | App **0.13.0**, financial model **college-funding-12.0.0**, schema **5** |
| Production calibration | `site/data/calibration-foundation.json`; provisional nominal tuition/housing trends 4%/3%; coherent hierarchy inactive |
| Delivery | PRs [#4](https://github.com/jschell/education-finance/pull/4), [#5](https://github.com/jschell/education-finance/pull/5), [#6](https://github.com/jschell/education-finance/pull/6) merged: staged overhaul D is delivered |
| Deployment evidence | Check [44015746714](https://github.com/jschell/education-finance/actions/runs/44015746714), Pages [44015746679](https://github.com/jschell/education-finance/actions/runs/44015746679), deployed byte/browser verification [44015842478](https://github.com/jschell/education-finance/actions/runs/44015842478): all successful at that SHA |
| Fresh local check | `npm run check`: 158/158 tests pass at production SHA; software checks do not establish economic calibration |
| Open tracking issue | [#2: forecast coverage](https://github.com/jschell/education-finance/issues/2), still open; its body describes v0.10.2 and is stale relative to the overhaul |
| Unmerged work | `forecast-calibration-evidence`, `feea5f7f64eb44fd69332958049945f0fffd3a85`, five commits ahead of reviewed main; no open PR or branch workflow run found at review |
| Branch version | App **0.14.0**, model **12**, schema **5**; evidence/prospective tooling changes, financial defaults retained; **not deployed** |

These SHAs are checkpoints, not instructions to overwrite newer work. Fetch branches, inspect diffs and recheck PR/workflow state before resuming. This handoff lands on main without merging the unfinished branch.

## What the shipped app does

Static, buildless, browser-local HTML/CSS/vanilla JavaScript, one Calculate action. Student funding is separate from education scenarios; changing a school path does not change savings. Monthly ledgers price dated bills, grants, income, gifts and deposits. Students share economic paths but retain earmarked funds; household success requires every covered bill to be paid.

Overhaul D corrected actual conditioned equity expectations, market/college transition timing and oracle-infeasible evaluation. It added affordable budget screens, first unpaid bills, fixed-share household deposit proposals with cap conflicts, target-specific numerical savings reserves and matched housing/aid/portfolio stresses. The 1990s tuition audit and coherent hierarchy were implemented and evaluated. The bridge remains research-only and the hierarchy remains inactive. See [delivery and fresh review](overhaul-status.md).

Limits remain material: future funding-probability calibration is unestablished; long-wait outcomes have weak independent support; budget screens use at most 512 paths and are not verified probability targets; household allocation is a fixed policy rather than an optimizer; physical iOS Safari persistence is unverified.

## Latest work is already on a branch

Do **not** start the calibration project again. Inspect the existing [branch protocol](https://github.com/jschell/education-finance/blob/feea5f7f64eb44fd69332958049945f0fffd3a85/docs/forecast-calibration-plan.md) and [branch results](https://github.com/jschell/education-finance/blob/feea5f7f64eb44fd69332958049945f0fffd3a85/docs/forecast-calibration-results.md). They implement the later “what is needed for future forecast calibration / plan and execute” work beyond overhaul D.

Delivered there: origin-selected school cohorts, withheld school identities excluded from fitting, known/unknown school bill comparisons, earlier-error correction, current-model individual and capped household ledger evaluation, reliability/support reports, app disclosures, active-bundle snapshot generation and separate source-backed outcome ingestion/scoring. Full case files are in `data/calibration-cases/`; compact evidence is `site/data/current-calibration.json`.

Committed branch findings (not independently rerun here): 5,400 school-model cases, 18,000 synthetic individual plans, 240 household plans; only 22 sampled known and 20 withheld institution identities. Baseline school cost coverage is roughly 30–45% for nominal 80% bands. The error correction qualifies for known-school wait 0 only (reserved score 0.1553 to 0.1399; coverage 46.3% to 67.8%), fails withheld-school sector protection, and lacks longer supported knots. No candidate is activated. Counts are not independent economic histories.

### Historical blocker at the previous checkpoint (resolved above)

Fresh branch `npm run check` passed **166/166** tests. However, `node scripts/verify-current-snapshot.mjs` **fails** with `ENOENT: data/forecast-snapshots/current-index.json`. The branch also lacks the expected `site/data/prospective-validation.json` and a new current-model snapshot. Passing unit tests therefore does not mean release completion. Its results document describes prospective capability; it must not be read as proof that the current record was committed or deployed.

Next: complete the immutable current-model record/index/pending-score artifacts from committed matching sources, verify them, reproduce reports, run browser/CI checks, then review/merge/deploy the existing branch. Details and exact commands are in [the active plan](active-work-plan.md). Do not generate future observations or replace the original model-9 forecast.

## Evidence hierarchy and stale context

Current code/bundle and SHA-specific workflow results establish implementation and delivery. Frozen protocols plus source-identified generated reports establish what was evaluated. Chat recollections are leads, not proof of completion.

The session deep review of `d0d536c`/v0.10.2 found the infeasible gate, equity mismatch and timing concerns. Those findings motivated overhaul D; do not present them as unresolved implementation defects without checking model 12. Archived model-9 funding results do not validate model 12. `docs/roadmap.md`, older critique plans/results and some architecture prose are historical or partly stale. Use this handoff and `docs/model.md` for present priorities; archive source/report bytes remain unchanged.

## Resume prompt

> Review @GitHub jschell/education-finance. Read AGENTS.md, docs/continuity.md, docs/active-work-plan.md, docs/decisions.md and docs/model.md. Fetch current heads/PRs and inspect the latest checkpoint before editing. Continue the existing calibration release rather than recreating it. The missing current-model snapshot artifacts were completed on 2026-11-17; finish any outstanding report/CI/browser/release checks, then work through the documented calibration evidence program. Record exact SHAs and verified outcomes. Keep research qualification separate from production activation and future economic calibration.

## Checkpoint discipline

Before ending a session, record branch/head, app/model/schema/bundle, completed versus planned work, commands and outcomes, PR/deployment links, blockers and one concrete next action. Commit substantive plans **before** long implementation work and freeze evaluation rules before scores. Preserve failed findings. Put a short session entry in this file rather than relying on the next conversation to reconstruct history. Do not commit machine paths, private family exports, tokens or transient logs.
