# Complete evaluation recovery and delivery

Updated 2026-11-18 America/Los_Angeles after a subagent context-only review. Reviewed evidence head: [`794ae6811ecb6408182c3c3b8484b544b1b109ba`](https://github.com/jschell/education-finance/commit/794ae6811ecb6408182c3c3b8484b544b1b109ba), on `complete-cost-evaluation`; remote main: `a6b89e4dd47141181012ba8923ad3c6f92a3b990`. See [continuity](continuity.md) for the active checkpoint.

## Already recovered and published

The incomplete session is identified by frozen protocol `d5073c7`, remote implementation `736be2a` and recovered local completion commit `7c940a6`. The recovered local commit was not a descendant of the remote implementation. Recovery commit `794ae6811ecb6408182c3c3b8484b544b1b109ba` replayed its final changes onto the existing remote branch without rewriting published history.

The completed experiment, decision, search accounting, readable results and delivery guards are now committed. Lossless gzip packaging is recorded in the [method](complete-cost-evaluation-method.md) and `data/calibration-diagnostics/evaluation-archive.json`. The recorded delivered gzip is 11,034,309 bytes; the unchanged decompressed JSON is 53,687,719 bytes with SHA-256 `eb8c3b9d8ea273c38975f511afb3089aa39c979f2f6a33d6b12bfaf280247640`. These are repository-recorded identities, not a new byte verification during this review.

The existing [results](complete-cost-evaluation-results.md) remain current: all 320 cells complete; candidate mixtures 32/64, 45/64, 52/64 versus old 0/64, 1/64, 10/64 at 3/7/12 transitions. Promotion is rejected: 21 passing, 13 failing and three unsupported gates. Historical evaluation remains unsupported; defaults and production are unchanged.

## Current delivery checkpoint

The original delivery now has [draft PR #17](https://github.com/jschell/education-finance/pull/17), at `c725ca9f5ce7176e7f22c36b655f82013ea6a0e9`, and [Check run 44548923191](https://github.com/jschell/education-finance/actions/runs/44548923191) successful across all thirteen jobs. Pinned local application, mathematics, financial/decision, archive, readable-result, metadata, all fifteen support-group and projection/minimum checks pass against the original source tree. No independent 320-cell local refit was repeated; the eight CI partitions independently reproduced that complete grid. All thirteen jobs pass at that exact head, establishing engineering delivery acceptance with the rejected scientific outcome intact. See [continuity](continuity.md) for precise test counts, prior cancelled run and unresolved status.

A separately frozen smaller-model screen is on `separable-cost-study`; it preserves this candidate's rejected decision. The checklist below describes delivery requirements, some now completed locally. No merge, deployment or scientific promotion is authorized by a passing engineering check.

## Delivery requirements and verification sequence

The earlier context-only review observed no PR or workflow run and executed no checks. The later authorized continuation completed local verification and opened the draft PR above. Independent CI acceptance now passes at the exact head above; preserve the chronology rather than treating the earlier review as the current delivery state.

1. Use the exact Python/Node versions and numerical environment in the [method's reproduction section](complete-cost-evaluation-method.md#reproduce). Run its complete application, mathematics, financial/decision, retained-case and source/projection verification list. Also verify archive bytes and generated readable results using the two commands below.
2. Inspect the resulting diff and retain every frozen protocol, generating source, case, failed gate and scientific decision. Record exact verified commit SHAs and any failures. Do not rerun the experiment to seek better scientific outcomes or change tolerances.
3. Keep the existing draft PR open and require all thirteen [Check workflow](../.github/workflows/check.yml) jobs: `check`, `reml-study`, `predictive-study`, `covariance-audit`, `complete-evaluation-0` through `complete-evaluation-7`, and `evaluation-support`. All eight partitions together independently refit the 320-cell grid; support includes all 185 retained fits. A later manual dispatch can use `force_full=true` to bypass completion caches. The draft PR above now exists; no manual full dispatch has been claimed.
4. Update continuity with exact publication/CI links, head SHA and acceptance or unresolved failures. Reproducing a scientifically rejected result can pass engineering checks; it does not promote the candidate.

Local verification commands, already passing in the authorized continuation after applying the pinned environment from the method:

```sh
python scripts/package_complete_evaluation.py --verify
npm run check
python -m unittest discover -s tests -p evaluation_optimizer_test.py
python -m unittest discover -s tests -p complete_evaluation_test.py
python -m unittest discover -s tests -p evaluation_delivery_test.py
python scripts/run_complete_evaluation.py --validate
python scripts/finalize_cost_evaluation.py --verify
python scripts/summarize_complete_evaluation.py --verify
```

Then continue with the method's full independent numerical/source verification commands. The workflow triggers on main pushes, pull requests or manual dispatch; documentation pushes to this branch alone do not start CI.

## Scientific stopping point

This candidate's evaluation concludes with rejection. Do not restart older completed audits or tune this candidate under the frozen protocol. A different candidate or an independently evidenced reporting-population/original-vintage acquisition program needs a separate scope/protocol. Historical fitting and production deployment are outside this delivery.
