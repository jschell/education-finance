# Start here: project continuity

Updated **2026-11-18, America/Los_Angeles**. This is a repository-grounded handoff. Update it at meaningful checkpoints; conversations are not the project record.

## Read in this order

1. This file: deployed state, verified work and next action.
2. [Current model](model.md) and [working instructions](../AGENTS.md): financial and implementation contracts.
3. [Active work plan](active-work-plan.md) and [next calibration steps](calibration-next-steps.md).
4. [Decision record](decisions.md), then the frozen protocol/results for the task being resumed.

## Active checkpoint — realistic-depth prediction and uncertainty implemented

Branch `predictive-depth-validation`, base main `c54d4901e61170ba4d5a32b224a9b5179c67ddda` (merged PR #14). Protocol `4349ea2cdd03455dd05103926aef5f409a986a58` preceded implementation and experiments. Published implementation `003d6577eb84776a19a973af7deba8e53125b7f6`; this handoff is its documentation child. [Results](predictive-depth-study-results.md) and [implementation notes](predictive-depth-implementation-notes.md) describe the complete fixed grid, source identities and limitations.

Implemented all suggested workstreams: prefix-stable fresh worlds at actual 3/7/12-year depths with 24/48-year controls and independently varied school counts; exact balanced likelihood checked against the frozen generic engine; ML/REML/shared-diagonal comparator; joint-history bootstrap/refitting conditioned on original observations; full four-year bill/unpaid/required-deposit/household diagnostics through production ledger functions; five misspecification controls; conservative real-panel metadata review leads; validated exact-input reproduction caching with forced-full dispatch. No financial defaults, UI or earlier evidence-generating files changed.

The 200 cells retain 600 point fits (447 converged, 153 nonconverged). Bootstrap attempted 704 refits with 176 failures: complete mixtures 0/24 at three years, 0/24 at seven, 5/24 at twelve. Seven-year/32-school REML 80% bill coverage is only 12/24 at wait four (95% Wilson 31.4–68.6%). The simpler covariance comparator is not selected. The focused metadata audit finds 13,583 case/spacing-only name leads and 69,877 stable-concept definition-text leads; zero edges are bridged. These overlapping counts are not independent school counts. **Historical fitting remains blocked and production activation is false.**

Local checks: `npm run check` passes 215 Node tests; six new predictive mathematics tests, three rejection/support tests and two cache-marker tests pass, alongside the preceding four estimator and nine REML tests. Metadata audit and compact summary reproduce exactly; full artifacts validate identities, support and denominators. A complete source-invalidated packaging rerun produced identical cells/summaries. Local longer reproduction attempts were interrupted before completion and are **not** counted as passing; require all three PR CI jobs (`check`, `reml-study`, `predictive-study`) and full new/old numerical reproductions before acceptance. New CI caches have no earlier success marker and must perform real runs. Read the exact PR-head checks for delivery acceptance.

**Next action:** complete CI acceptance, then precommit a numerical-boundary/PSD-coordinate audit of the retained failed refits. Do not loosen optimization/gates, discard failed seeds, repeat completed steps or infer calibration from convergence. Independently review case-only name and flag-dictionary concept equivalences in an alternative versioned graph before bridging. Strict publication-vintage support and economic calibration remain unresolved. App 0.15/core model12/schema5 and prospective records stay unchanged.

## Completed checkpoint — attribution, REML and boundary repairs implemented

Branch `revision-cost-reml-study`, base main `3bf588bdc61a7a390eae9d88a3900e37729ce751`. [Protocol](reml-boundary-study-protocol.md) committed at `c019c77833fe7ffecd5f6f87455c6426d8f4d32f` before implementation/experiments. [Results](reml-boundary-study-results.md) document repair steps 1–3: an exactly replaying shock-trace generator, separate ML/oracle/REML objectives, boundary-aware feasible geometry and actual nuisance-reoptimized profiles. Every v1 estimator/generator/test/report byte and its original failed gate remains unchanged.

Original-world realized shared tuition variance's median ratio to generating variance is 0.785. ML's fitted ratio is 0.429, REML's is 0.50117; the three fresh worlds give REML 1.107. REML narrowly meets the old broad component-recovery comparison band on original worlds, with no claim of robust qualification. Original ML's earlier full-Hessian warnings are now diagnosed as constraint-limited optima, not automatically structurally unidentified models. The correlation profiles remain shallow. The known-drift oracle is an explanatory control, not an available historical estimator.

Local acceptance: 212 Node tests and 19 Python tests (six extraction, four preceding numerical, five new mathematical/replay, one actual-profile check, three trace-portability checks) pass. The full nine-world/method and four-profile numerical rerun reproduced with pinned versions and declared tolerances; Published tested implementation: `7afafd180c3f8b98bcc5bf432988df3bab0e5c6a` on `revision-cost-reml-study`; this delivery update follows it. [PR #14](https://github.com/jschell/education-finance/pull/14) is now merged at `c54d4901e61170ba4d5a32b224a9b5179c67ddda`, accepted head `12daa0c310e7627b3b0f114b98933d86e7c0c45b`; both `check` and `reml-study` passed in [CI 44349888334](https://github.com/jschell/education-finance/actions/runs/44349888334). [CI 44347846481](https://github.com/jschell/education-finance/actions/runs/44347846481) exposed an exact floating-trace dictionary comparison across Python builds after all fits completed. The [portability amendment](reml-reproduction-amendment.md) adds a separate strict-tolerance wrapper and rejection tests, preserving all evidence-generating files/artifacts and fit/gate tolerances. Read the updated PR head checks for acceptance. **Historical fitting remains blocked** despite improved diagnostic comparisons: no real price likelihood, economic forecast score, default change or activation. App 0.15/core model12/schema5 and prospective records are unchanged.

**Superseded next action, now completed above:** commit repair steps 4–5 as an actual-information-depth and forecast-uncertainty protocol before new experiments. Test 3/7/12 transition years with longer controls, vary school count separately, add a larger fresh batch, and assess cumulative-bill uncertainty including parameter uncertainty and shared reporting-bias sensitivity. Do not repeat steps 1–3 or treat the 0.50117 result as a robust calibration pass.

## Completed checkpoint — matched graph/estimator and retained v1 failure

[PR #13](https://github.com/jschell/education-finance/pull/13) merged at `3bf588bdc61a7a390eae9d88a3900e37729ce751`, accepted head `732fb58cc91acda29abbf11ed95c82e8cf4a9e51`. [PR CI 44340113714](https://github.com/jschell/education-finance/actions/runs/44340113714), [main CI 44343901547](https://github.com/jschell/education-finance/actions/runs/44343901547), [Pages 44343901725](https://github.com/jschell/education-finance/actions/runs/44343901725) and [live acceptance 44344069742](https://github.com/jschell/education-finance/actions/runs/44344069742) passed. [Results](revision-estimator-results.md) preserve 210 Node/ten Python checks, 15 real-panel graph-support audits, paired likelihood/gradient checks and the twelve-world suite. Execution contract `f7af707` and numerical amendment `06ac5fc` preceded the full experiments.

The original recovery gate remains failed: all six ideal worlds numerically converge, two have its conservative boundary/curvature flags, and shared tuition variance median recovery is 0.429. Matched actual-panel example origins have only 3/7/12 distinct transition years. The original failed result is retained verbatim; the separate study above explains and improves parts of it without rewriting that gate or enabling historical fits.

## Completed checkpoint — frozen cost protocol and conditional mechanism harness

[PR #12](https://github.com/jschell/education-finance/pull/12) merged at `30ad4b391fddebebc952071104b0debbb91c8932`, accepted head `af3a62abb2d29fe81b91465b209830ece8897bb8`. [PR CI 44332201997](https://github.com/jschell/education-finance/actions/runs/44332201997), [main CI 44335777958](https://github.com/jschell/education-finance/actions/runs/44335777958), [Pages 44335777934](https://github.com/jschell/education-finance/actions/runs/44335777934) and [live acceptance 44335948779](https://github.com/jschell/education-finance/actions/runs/44335948779) passed. Protocol `00488a64ab122d1d55d392f5c643efb6c9fa0ff4` preceded its supplied-parameter tests. Those 203 Node/six Python checks established mechanism arithmetic and explicit identification counterexamples, not fitted parameter recovery. The next stage above implements the estimator and retains its failed recovery gate.

## Completed checkpoint — revision-aware price panel

Branch `revision-aware-price-panel`, based on main `798d6d4e8e1f40ea24c83f7ba4ffcf8d7a7bbb75`. Execution contract `651b198` was committed before panel diagnostics. [Implementation/findings](revision-aware-price-panel-results.md): 24 compressed source collections, **1,900,467 observations**, all 48 pinned archive identities, normalized source/dictionary/field/academic-year provenance, and pure source-coherent/revision/availability views. Original reconciliation matches **327,267 current-year values/flags and 109,089 directory-sector rows**.

Strict original-vintage as-of support is **zero**: independent publication/vintage evidence is unavailable. The collection-year proxy is separately labeled and version-pinned; later collections or new source/availability metadata cannot silently alter an earlier reconstruction. Same-file transitions have fewer large nominal changes on matched training support; that is input sensitivity, not proof of a correct series, economic calibration or a reason to reduce every forecast's uncertainty.

[PR #11](https://github.com/jschell/education-finance/pull/11) merged at **`ef3767066467f8d779e106e638d31c96827c0efa`**, accepted head `a9c80d97579f94cf28afac6d31f7fe7e87e0d6aa`. [PR CI 44242599332](https://github.com/jschell/education-finance/actions/runs/44242599332) and [main CI 44330515641](https://github.com/jschell/education-finance/actions/runs/44330515641) passed all offline evidence and browser checks. [Pages 44330517327](https://github.com/jschell/education-finance/actions/runs/44330517327) and [live acceptance 44330722200](https://github.com/jschell/education-finance/actions/runs/44330722200) passed at the merge SHA. Final local panel checks: 196 Node tests, six Python tests, byte-identical audit regeneration. Full official-source re-extraction at the preceding implementation checkpoint is documented evidence, not rerun in this fresh checkout. The panel is delivered; do not rebuild it or describe its final CI as pending. App/model/schema and financial defaults remain unchanged. The next protocol/harness stage is recorded above.

## Completed checkpoint — bounded price-source trace

[PR #10](https://github.com/jschell/education-finance/pull/10) merged at **`e37db347fa349ded86b636080cbcc43ed6fa994d`**, from head `7e8cb151fad8dec631756adecc9e031cc58cc592`, based on main `aeaeedd994bc4e2c9f55f7a4ac1dca2466421c16`. Execution note `aa14424` and **registry `2367a97` were committed before source retrieval**. The [bounded trace results](calibration-price-trace-results.md) now execute the prior plan; **[final CI 44229411339](https://github.com/jschell/education-finance/actions/runs/44229411339) passed**: 190 Node tests, three Python extraction tests, all prior and new artifact reproductions, prospective integrity and browser regressions. Cached source excerpts separately re-extract byte-for-byte from all 32 official archives. No app/model/schema, economic defaults, raw selected data, forecasts or original report changes.

**Finding:** 21/30 selected sector/component events have a changed retrospective endpoint (16 unique school/component transitions). All 32 official annual price/directory archives match their pinned hashes; all 180 source comparisons are available. 53/120 later comparisons change the amount even though **all changed values and original endpoint flags are Reported**. Nine events remain unchanged across the compared snapshots; their economic causes are not thereby established. Directory sectors are stable in the checked rows. The review is extreme-selected and cannot estimate population revision rates.

Source excerpts and dictionary academic-year mappings are committed with an explicit extractor. Registry/comparison reproduction is offline; full archive/excerpt verification uses an ignored cache and a manual workflow. Three institutional/context PDFs have locally verified byte identities; the Commerce document is web-reader-only after HTTP 404, and its expense section labels a different year from its cover. Miami and Redwoods have partial policy/definition context; no event receives a fully reconciled economic-cause label.

**Next action at the trace checkpoint (subsequently implemented above):** execute the [revision-aware price-panel plan](revision-aware-price-panel-plan.md): a source-snapshot/academic-year panel and documented collection/as-of availability contract before specifying one economic candidate. The audit is complete; do not repeat it or retrofit the old current-year panel. Never feed a later retrospective revision into an earlier forecast origin. Retrieved revised archives are not original publication vintages. The prior Reported-only sensitivity is preserved; it did not test this cross-snapshot inconsistency. Keep source revision, genuine policy changes and unresolved causes separate.

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

Steps 1–3 of the estimator repair are implemented: realized-shock attribution, REML and constrained diagnostics/profiles. Read [the results](reml-boundary-study-results.md). Freeze steps 4–5 before more experiments: actual temporal-depth support, a larger fresh batch and forecast-relevant cumulative-bill uncertainty. Keep the old failure and new comparisons separate. No historical price fit follows automatically.

The existing deposit proposal still uses fixed shares; priority diagnostics are not an optimizer. Physical iOS Safari persistence and richer education/account schedules remain separate product work.

## Evidence hierarchy and history

Use current code/bundle and SHA-specific workflow results for implementation/delivery; frozen protocols and source-identified generated reports for evaluation. Chat recollections are leads, not proof of completion.

The deep review of v0.10.2 (`d0d536c`) motivated overhaul D. Its gate/anchor/timing implementation findings were addressed in model12; do not repeat them as current defects without checking. Archived model-9 funding results do not validate model12. `docs/roadmap.md`, older critique reports and parts of architecture prose are historical or partly stale; current priorities are here and in the active plan. Preserve historical source/report bytes and failed comparisons.

## Resume prompt

> Review @GitHub jschell/education-finance. Read AGENTS.md, docs/continuity.md, docs/active-work-plan.md, docs/decisions.md and docs/reml-boundary-study-results.md. Inspect current remote heads/PRs. PR #13 merged at 3bf588bdc61a7a390eae9d88a3900e37729ce751; final checks, Pages and live acceptance passed. The revision-cost-reml-study branch implements precommitted repair steps 1–3 under protocol c019c77833fe7ffecd5f6f87455c6426d8f4d32f. Original-world shared tuition variance recovery improves from ML 0.429 to REML 0.50117, narrowly above the comparison floor; fresh three-world REML median is 1.107. Original full-Hessian warnings are constraint-limited under feasible geometry, but profiles remain shallow. Original v1 source/report/test bytes and its failed gate stay unchanged. Historical fitting is still blocked. Next freeze steps 4–5: actual 3/7/12-year transition support, separate school-count/temporal-depth tests, larger fresh batches and cumulative-bill/parameter uncertainty with reporting-bias sensitivity. Do not repeat completed source/graph/mechanism/REML work or claim calibration/activation from numerical convergence. Keep model12/schema5/defaults and prospective records unchanged.

## Checkpoint discipline

Before ending a session, record branch/head, app/model/schema/bundle, completed versus planned work, commands/outcomes, PR/deployment links, blockers and one concrete next action. Commit substantive plans before extended implementation; freeze evaluation rules before scores. Retain failed findings. Do not commit machine paths, private family exports, tokens or transient logs.
