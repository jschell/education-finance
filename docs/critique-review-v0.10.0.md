# Fresh review after deployment · v0.10.0

Reviewed on 2026-11-16 after GitHub Actions Check and Pages deployment succeeded for commit `d4e75fddf56f2ad27ddb91655a2b6da71ab4efb9`. Seven deployed code/report files were compared byte-for-byte with the checked source. The live fictional example completed, loaded the linked reports and displayed the DKW savings reserve and 5,000-path lower-bound confirmation. This is a fresh pass by the implementing reviewer, not an independent external statistical audit.

## Findings that remain

| Priority | Finding | Evidence and consequence |
| --- | --- | --- |
| High | Long-wait college-cost forecasts are biased in these historical checks | Nominal 80% total-cost bands cover 76%/20%/10% for 0/4/8-year waits. Removing duplicates across funding levels leaves 50/30/10 cost paths; all 12/24/9 misses fall **below** the lower band. Thus the observed issue includes overestimated cost growth, not only insufficient band width. The additional symmetric uncertainty candidate worsened interval score 0.156 → 0.236 and was correctly rejected. The retained model has not solved this issue. |
| High | Whole-plan future probability calibration is still unestablished | Brier scores 0.000/0.043/0.104 beat a 50% guess in these synthetic cases, but many plans are trivially underfunded or funded, one reliability bin is empty and several observed bins are 100% funded. These scores do not validate a future 90% funding claim. Current survey anchors are not backtested as historical-vintage forecasts. |
| High | Long-horizon independent evidence is scarce | The 4/8-year waits have six/two distinct start years; four attendance years extend the outcome windows, which overlap. There is no eligible complete 18-year-wait case. Adding schools, funding levels or Monte Carlo paths cannot create independent economic history. |
| Medium | Joint old cost/market relationships are approximate | Pre-2000 macro shocks still borrow inflation-conditioned cost blocks from the 2000–2023 panel. No measured old joint tuition/market observations validate that dependence. Persistence priors, long-run forward anchors and fixed nominal price trends still require structural assumptions. |
| Medium | The three-case range is sensitivity, not a predictive interval | Labels now explicitly state no confidence level; cases retain no probability weights. Scenarios can omit future regimes. Their extrema should not be read as calibrated best/worst probability bounds. |
| Medium | Stable savings estimates now include a conservative cushion | The final rule confirmed 12/12 seeds for one actual-production-model synthetic plan ($716–$729/month). The original three-SE trial confirmed 9/12 ($645–$659) and is archived. The larger estimate is intentional sampling protection. At high targets the fitting quantile can cap at 100%, losing the full reserve; the UI reports that and still requires independent confirmation. Twelve seeds for one plan do not cover all possible plans. |
| Low | Physical iOS Safari persistence remains unverified | Automated persistence/recovery/locking tests and Chromium phone/iPad viewport checks pass. Those do not establish physical Safari storage behavior. |

## Original critique disposition

| Critique | Disposition |
| --- | --- |
| One historical period determines a precise gauge percentage | Addressed in presentation and broader-history fitting. Headline spans named assumptions; selected arc remains central-case frequency. Full structural uncertainty remains open. |
| Uncalibrated investment/tuition relationship | Partially addressed by forward anchors, separate price panels and explicit instruments; fixed nominal trends and price bias remain. |
| Overconfident backtest with flawed cost warning | Earlier proxy checks are archived and clearly labeled. New production-ledger diagnostics record cutoffs, actual published cost levels and failures. External calibration remains open. |
| Stress differences were simulation noise | Existing historical stress comparisons retain matched 1,000-path baselines and the no-aid identity regression test. The main economic cases share source paths. No new stress buttons were added. |
| Savings target frequently fails its own independent check | Improved with the derived DKW/Wilson reserve and stricter 5,000-path confirmation. Final synthetic production-model check: 12/12 seeds confirmed. Failed and capped checks remain explicit rather than hidden. |
| Example opens at 0% with a large warning | Deployed fictional example produced nonzero central funding frequency (44% in this session), retained its temporary-workspace banner and produced complete results. It does not promise that arbitrary inputs will be funded. |
| Hand-minified code and stale imports | Changed modules/scripts/tests use consistent formatting; all live module query tags are v0.10.0. |
| Unused old simulation exported/tested | Removed the production lognormal engine and its rate helper. Shared PRNG/quantiles now live in `random.js`; finance tests exercise the live historical aggregator or explicitly controlled ledger paths. PRNG metadata no longer names Box–Muller. |
| README mostly a contradictory changelog | Current README, model and architecture rewritten. Release history and previous methodology are archived; historical planning and source documents link to current behavior. |

## Verification

- 123 repository tests passed locally and in GitHub Actions, covering financial ledger behavior, origin cutoffs, source/report identities, shared household paths, reserve bounds, multi-seed behavior, funding preservation and persistence.
- Current cost/whole-plan reports rebuilt identically. The reviewed bundle and savings stability report share the same hash. Candidate failure results and the unsuccessful first reserve trial are retained.
- Phone and iPad landscape had no page overflow; wide data tables scroll in their own containers. Keyboard Space operated the new disclosure. Project-prefix worker imports and report hashes loaded successfully.
- Live v0.10.0 fictional example showed a 90% requested target, 94.3% fitting probability and an independent one-sided lower bound above 90%. Exact sampling figures vary by session seed.

## Next model work, without tuning to this review

1. Freeze a new whole-plan protocol before changing cost trends. Compare training-only nominal, real and damped-trend alternatives using proper total-bill scores and cost-miss direction, with clustered start-year reporting. Do not reuse a newly inspected period as an untouched holdout.
2. Extend published-price history or acquire vintage datasets before claiming newborn-horizon or survey-anchor calibration. Record panel survivorship and data-release availability; more simulation trials are not a substitute.
3. Test a predeclared, denser set of funding levels around the target and multiple asset profiles, attendance schedules and household cases. Report score skill against an appropriate base-rate benchmark as well as the 50% reference. Do not select cases after seeing which makes the model look good.

The code-maintenance, numerical-stability and validation-infrastructure fixes are deployed. The main remaining statistical finding is biased/poorly covered college-cost forecasting at longer waits, with insufficient independent evidence to certify funding probabilities.
