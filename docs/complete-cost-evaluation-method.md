# Complete evaluation method and reproduction

The [frozen protocol](complete-cost-evaluation-protocol.md) was committed at `d5073c7205e0f71fdb1a1dc3cc8e44a7458916ed`, before implementing this candidate or inspecting its fresh outcomes. The base is main `a6b89e4dd47141181012ba8923ad3c6f92a3b990`. This is a bounded evaluation, ending in a recorded pass, rejection or unsupported decision. It does not change app 0.15.0/core model12/schema5 or provisional financial defaults.

## Numerical candidate

`scripts/evaluation_optimizer.py` optimizes the same frozen Gaussian REML likelihood and covariance bounds. Eleven fixed SLSQP starting identities, two projected-gradient polishing routes, projected first-order mapping, exact-cone round trip, multistart agreement and 80 feasible directional probes determine availability. Neither solver success nor a necessary boundary condition alone qualifies a fit. These finite checks provide empirical search adequacy, not a global-optimum certificate.

The likelihood implementation caches constant Kronecker derivative matrices. A mathematical test compares objective, gradient and drift exactly with the frozen direct-covariance implementation; finite differences independently check the coordinate chain rule. Projection is checked against independent constrained minimization. An implementation improvement avoids computing an unused projected mapping before the two other stopping criteria can pass. Three pilot fits reproduced their previous objective, parameters, status and stopping iteration exactly. No start, bound, seed, threshold or iteration cap changed.

All 185 retained cases are reconstructed under the pinned AVX2 runtime. Their exact graph bytes are stored and reused for the local default-backend comparison; backend input-generation differences cannot explain a resulting discrepancy. A separate frozen two-minimum fixed-shared-correlation example is reevaluated unchanged. The new free-correlation candidate does not replace that control or erase the original portability failure.

`scripts/evaluation_search_summary.py` derives each recorded start's raw/projected feasibility and projection distance, and every probe's projected step, from the stored coordinates. It is descriptive accounting and changes no qualification or gate.

## Fresh forecasts and financial consequences

The main experiment has 64 fresh outer worlds at each of 3/7/12 transitions, eight schools. School-count, long-history and five stress controls bring the total to 320 cells. Both the frozen optimizer and new candidate retain their own independent plug-in and full-refitting bootstrap results. Each of 192 main cells retains 16 bootstrap slots per method, including explicit unattempted slots after an unavailable outer fit. One unavailable refit makes the entire mixture unavailable; no partial mixture or successful-only sampling is scored.

The existing joint generator, original-history conditional forecast routine and production cash ledger supply complete attendance-year bills, deposit requirements and binding two-student funding outcomes. Individual and household Brier scores, 80% interval scores, Wilson coverage intervals and common-world paired differences are reported. Normal paired intervals describe Monte Carlo uncertainty and are not a historical calibration claim. Infinite required-deposit bounds cannot count as feasible recommendation coverage.

This is a cost-isolation laboratory: investment returns and CPI are held at zero, with the frozen $18,000/$21,000 annual student budgets, 0.9/1.0/1.1 initial savings factors, waits 0/4/8, two-year student offset and $146.25 binding monthly household cap. The experiment evaluates cost forecasts through the production financial policy; it does not calibrate investment returns, future CPI, aid or the full joint household economic model.

The final decision joins the complete experiment, both numerical backends, reviewed source support and known multiple-minimum control. Any failed gate rejects promotion. Missing support stays unsupported. Source review cannot turn a successful synthetic result into an actual historical-availability backtest.

## Bounded source review

The registry independently compares complete pinned 2006/2007 dictionary descriptions, including the economic concept, specified first-time cohort and flag vocabularies. Six field pairs match after removing the identified academic-year and portal-publication text differences. The official 2007 NCES instrument supplies corroborating price-concept evidence; its raw PDF is not pinned and its current availability does not establish an original publication vintage.

Nine exact 2004→2005 institution case/spacing leads are traced to pinned directory rows and source/shard hashes. Neither normalized names nor equal sector/control/level proves stable campus aggregation. All nine population decisions remain unresolved. All six definition concepts are supported but their institution-population bridges remain unresolved. **Zero graph bridges are authorized.** The alternative view therefore reproduces the original graph in all fifteen origin/sector groups, preserving withholding, discarded segments, fit caps and original history depths. Strict original-vintage eligibility remains unsupported.

## Reproduce

Use Python 3.12.14, NumPy 2.3.5, SciPy 1.17.0, Node 24 and openpyxl 3.1.5. Set `OPENBLAS_NUM_THREADS=1`, `OMP_NUM_THREADS=1`, `OPENBLAS_CORETYPE=Haswell`, and `NPY_DISABLE_CPU_FEATURES=AVX512F,AVX512CD,AVX512_KNL,AVX512_KNM,AVX512_SKX,AVX512_CLX,AVX512_CNL,AVX512_ICL,AVX512_SPR`.

Run:

```sh
npm run check
python -m unittest discover -s tests -p evaluation_optimizer_test.py
python -m unittest discover -s tests -p complete_evaluation_test.py
python -m unittest discover -s tests -p evaluation_delivery_test.py
python scripts/run_complete_evaluation.py --validate
python scripts/run_complete_evaluation.py --verify --workers 8
python scripts/evaluate_retained_optimizer.py --verify --workers 8
python scripts/review_evaluation_metadata.py --verify
node --max-old-space-size=4096 scripts/audit-evaluation-support.mjs --verify
python scripts/audit-cross-runtime-minimum.py --verify
python scripts/evaluation_search_summary.py --verify
python scripts/finalize_cost_evaluation.py --verify
```

CI performs the same complete independent 320-cell refitting across eight disjoint partitions, plus retained-case/source checks. Every case belongs to exactly one partition. Exact-input/toolchain completion markers are written only after actual reproduction succeeds. Mandatory mathematical, slot-accounting, source/decision and historical-block checks run on every CI invocation. Changed inputs invalidate caches; `workflow_dispatch.force_full` bypasses all completion caches. Checkpointed local cells are source/toolchain keyed and digest checked; `--verify` never substitutes them for independent numerical work.

The local default-backend arm was recorded with the dispatch overrides unset and identical AVX2-generated graph bytes. CI independently reproduces the supported AVX2 arm and recomputes the comparison from both retained files; it does not claim that the CI machine is a second copy of the local default hardware.
