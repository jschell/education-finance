# Complete cost evaluation — results

Protocol frozen at `d5073c7205e0f71fdb1a1dc3cc8e44a7458916ed`, based on main `a6b89e4dd47141181012ba8923ad3c6f92a3b990`. As of 2026-11-18 America/Los_Angeles. See the [method](complete-cost-evaluation-method.md) and [protocol](complete-cost-evaluation-protocol.md).

**Synthetic decision: reject. Historical evaluation: unsupported. Production activation: false.**

The experiment is complete: 320 fresh cells, both optimizers, all declared bootstrap slots, joint financial forecasts, retained-case portability and all fifteen source-support comparisons. Failed and unavailable results remain in their original denominators. No revised criterion, replacement seed or selected-success mixture was used.

## Availability at actual history depths

| Transitions | Method | Qualified outer worlds | Complete mixtures | Attempted refits / all slots | Qualified refits |
|---:|---|---:|---:|---:|---:|
| 3 | old | 23/64 | 0/64 | 368/1024 | 216 |
| 3 | candidate | 62/64 | 32/64 | 992/1024 | 944 |
| 7 | old | 43/64 | 1/64 | 688/1024 | 542 |
| 7 | candidate | 64/64 | 45/64 | 1024/1024 | 998 |
| 12 | old | 53/64 | 10/64 | 848/1024 | 737 |
| 12 | candidate | 64/64 | 52/64 | 1024/1024 | 1012 |

Both outer and complete-mixture availability must reach 90% at every depth. Better numerical availability alone does not establish forecast calibration. All 6,144 slots (192 worlds × two methods × 16) are retained, including explicit not-attempted slots.

## Financial performance

The table shows the prespecified four-year wait as one readable view. The machine-readable decision includes **every** wait (0/4/8), method, school-count/history control and stress scenario; this display does not select the decision. Coverage and score means are conditional on available forecasts.

| Transitions | Method | Available worlds | 80% bill coverage | Mean interval score / base budget | Individual Brier | Household Brier | Finite R90 deposit coverage |
|---:|---|---:|---:|---:|---:|---:|---:|
| 3 | candidate-bootstrap | 32/64 | 0.812 | 0.512 | 0.315 | 0.151 | 0.875 |
| 3 | candidate-plugin | 62/64 | 0.629 | 0.568 | 0.304 | 0.211 | 0.855 |
| 3 | fixed-4-3 | 64/64 | 0.000 | 1.329 | 0.328 | 0.188 | 0.891 |
| 3 | no-growth | 64/64 | 0.000 | 1.184 | 0.672 | 0.812 | 0.141 |
| 3 | old-bootstrap | 0/64 | unavailable | unavailable | unavailable | unavailable | unavailable |
| 3 | old-plugin | 23/64 | 0.826 | 0.458 | 0.294 | 0.121 | 0.913 |
| 3 | oracle | 64/64 | 0.844 | 0.386 | 0.217 | 0.151 | 0.922 |
| 7 | candidate-bootstrap | 45/64 | 0.778 | 0.405 | 0.303 | 0.164 | 0.889 |
| 7 | candidate-plugin | 64/64 | 0.672 | 0.492 | 0.313 | 0.172 | 0.844 |
| 7 | fixed-4-3 | 64/64 | 0.000 | 1.289 | 0.406 | 0.141 | 0.906 |
| 7 | no-growth | 64/64 | 0.000 | 1.040 | 0.594 | 0.859 | 0.172 |
| 7 | old-bootstrap | 1/64 | 1.000 | 0.333 | 0.528 | 0.023 | 1.000 |
| 7 | old-plugin | 43/64 | 0.698 | 0.442 | 0.303 | 0.189 | 0.814 |
| 7 | oracle | 64/64 | 0.859 | 0.313 | 0.213 | 0.120 | 0.938 |
| 12 | candidate-bootstrap | 52/64 | 0.808 | 0.327 | 0.224 | 0.167 | 0.923 |
| 12 | candidate-plugin | 64/64 | 0.734 | 0.361 | 0.246 | 0.179 | 0.859 |
| 12 | fixed-4-3 | 64/64 | 0.000 | 1.217 | 0.328 | 0.188 | 0.859 |
| 12 | no-growth | 64/64 | 0.000 | 1.127 | 0.672 | 0.812 | 0.141 |
| 12 | old-bootstrap | 10/64 | 1.000 | 0.276 | 0.172 | 0.075 | 1.000 |
| 12 | old-plugin | 53/64 | 0.698 | 0.383 | 0.259 | 0.160 | 0.830 |
| 12 | oracle | 64/64 | 0.844 | 0.318 | 0.210 | 0.154 | 0.891 |

At base savings, finite required-deposit coverage counts a recommendation only when its bound is finite and the realized feasible requirement is covered. Impossible bounds cannot pass through infinity comparisons. Impossible truths and the applicable finite denominators are retained separately in the decision JSON, alongside all three savings levels and binding household-cap diagnostics.

At wait zero there are no pre-entry deposit months. Even the true-parameter oracle supplies zero finite R90 recommendations in all three main depths. This frozen gate therefore exposes a policy-feasibility hurdle in the specified base-savings design; it is not independent evidence that the covariance model is wrong. Its failed outcome is retained without changing the protocol. Other availability, paired-skill and portability failures independently reject promotion.

## Gate-by-gate outcome

| Gate | State |
|---|---|
| retained-case-portability | fail |
| 3:outer-availability | pass |
| 3:complete-bootstrap | fail |
| 3:parameter-recovery | pass |
| 3:0:bill-coverage | fail |
| 3:0:finite-deposit-coverage | fail |
| 3:0:paired-improvement | unsupported |
| 3:4:bill-coverage | pass |
| 3:4:finite-deposit-coverage | pass |
| 3:4:paired-improvement | unsupported |
| 3:8:bill-coverage | pass |
| 3:8:finite-deposit-coverage | pass |
| 3:8:paired-improvement | unsupported |
| 7:outer-availability | pass |
| 7:complete-bootstrap | fail |
| 7:parameter-recovery | pass |
| 7:0:bill-coverage | pass |
| 7:0:finite-deposit-coverage | fail |
| 7:0:paired-improvement | fail |
| 7:4:bill-coverage | pass |
| 7:4:finite-deposit-coverage | pass |
| 7:4:paired-improvement | fail |
| 7:8:bill-coverage | pass |
| 7:8:finite-deposit-coverage | pass |
| 7:8:paired-improvement | pass |
| 12:outer-availability | pass |
| 12:complete-bootstrap | fail |
| 12:parameter-recovery | pass |
| 12:0:bill-coverage | pass |
| 12:0:finite-deposit-coverage | fail |
| 12:0:paired-improvement | fail |
| 12:4:bill-coverage | pass |
| 12:4:finite-deposit-coverage | pass |
| 12:4:paired-improvement | fail |
| 12:8:bill-coverage | pass |
| 12:8:finite-deposit-coverage | pass |
| 12:8:paired-improvement | fail |

Each gate retains its numerical detail in the [decision](../data/calibration-diagnostics/complete-evaluation-decision.json): variance ratios and drift bias, coverage Wilson intervals, matched sample sizes, interval-score effects and paired Brier differences with normal 95% Monte Carlo intervals. Negative paired score/Brier differences mean improvement. A failure rejects promotion; missing support remains unsupported.

## Numerical and source controls

The new optimizer qualifies 176/185 retained cases under AVX2 and 178/185 under the local default backend. The identical-graph comparison covers 185 cases across AVX2 and local default backends: **fail**. It records 2 differing cases and 0 uncomparable cases under the frozen tolerances. The separately retained fixed-correlation two-minimum control still has an objective gap of 0.00499665379047; its original failed portability gate remains intact.

Full 2006/2007 dictionary definitions support six price-concept equivalences. Nine exact 2004→2005 case/spacing institution leads remain unresolved for reporting-population continuity. None authorizes an economic/population bridge. The alternative graph therefore equals the original in all fifteen origin/sector groups: usable transitions remain 3/7/12. Original-vintage support remains unavailable. No historical likelihood or fabricated historical score was produced.

## Stopping decision

This is a completed evaluation decision. Reject/unsupported does not authorize another correction or a historical fit.

App 0.15.0/core model12/schema5, nominal tuition 4%/housing 3% provisional defaults, production sources and every earlier failed gate/artifact remain unchanged. This stage completes evaluation; it does not qualify or activate a new cost model. A different candidate or evidence-acquisition program needs its own separately reviewed protocol.

## Evidence and verification

- [Complete raw experiment](../data/calibration-diagnostics/complete-cost-evaluation.json.gz)
- [Final machine-readable decision](../data/calibration-diagnostics/complete-evaluation-decision.json)
- [AVX2 retained fits](../data/calibration-diagnostics/evaluation-retained-avx2.json.gz) and [local default retained fits](../data/calibration-diagnostics/evaluation-retained-default.json.gz)
- [Portability comparison](../data/calibration-diagnostics/evaluation-portability.json)
- [Search/projection accounting](../data/calibration-diagnostics/evaluation-search-summary.json.gz)
- [Source review registry](../data/research/evaluation-metadata-review.json) and [support comparison](../data/calibration-diagnostics/evaluation-source-support.json)

Independent numerical reproduction and mandatory financial/mathematical/source checks are specified in the method. Exact delivery commit and CI acceptance belong in [continuity](continuity.md).

Decision bytes SHA-256: `06d37bea38a8dafe154fe4640c01e9aae653370f3b0c9df6837643a94ca407a5`.
