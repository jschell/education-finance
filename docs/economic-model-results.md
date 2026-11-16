# Economic-model fix results

2026-11-16 · application 0.8.0 · methodology college-funding-7.0.0

The [frozen plan](economic-model-fix-plan.md) is implemented. Student funding and the single Calculate action are preserved. These changes improve instrument mechanics, joint economic paths and measured price coverage; they do not establish calibrated family funding probabilities.

## Implemented changes

- Five-year Treasury income and dirty-price repricing replace treating a Treasury yield as a total return. Three-month bill accrual uses the discount-price convention and reinvests at simulated short rates. Latest common initial observation: October 2026, GS5 4.93% and TB3MS 4.05% bank-discount quote.
- Joint source blocks are weighted by a central inflation/rate conditioning state, while asset returns and prices retain their paired source innovations. Source sequences and random numbers are matched across cases/students; plan length cannot change a path prefix.
- Each path also draws persistent joint long-run expectation deviations from centered historical ten-year windows. Overlapping windows are historical regime variation, not independent observations or certified confidence limits.
- A paired tuition/housing error correction is trained using targets through 2016, with 2017–2019 diagnostics and a new 2024–25 final score gate. The old 2020–2023 cost evaluation remains consumed evidence.

## New price check

| Variant | Normalized interval score | P10–P90 checks contained |
|---|---:|---:|
| Without correction | 0.221 | 10/15 |
| With correction | 0.167 | 13/15 |

Gate passed; correction enabled. Lower interval score is better. **There is only one new independent target year**, despite fifteen sector/horizon checks. No parameters were retuned after final scoring.

| Series | Horizon | Unadjusted score | Adjusted score | Covered before / after |
|---|---:|---:|---:|---|
| public4 | 2 | 0.073 | 0.099 | True / True |
| public4 | 5 | 0.171 | 0.187 | True / True |
| public4 | 10 | 0.169 | 0.303 | True / True |
| public4out | 2 | 0.083 | 0.095 | True / True |
| public4out | 5 | 0.173 | 0.177 | True / True |
| public4out | 10 | 0.836 | 0.299 | False / False |
| public2 | 2 | 0.066 | 0.078 | False / True |
| public2 | 5 | 0.118 | 0.163 | True / True |
| public2 | 10 | 0.135 | 0.350 | True / True |
| public2out | 2 | 0.054 | 0.061 | True / True |
| public2out | 5 | 0.219 | 0.105 | False / True |
| public2out | 10 | 0.698 | 0.235 | False / False |
| private4 | 2 | 0.058 | 0.066 | True / True |
| private4 | 5 | 0.115 | 0.119 | True / True |
| private4 | 10 | 0.354 | 0.163 | False / True |

Existing cohort membership is fixed. Missing/reclassified 2024 institutions are excluded from both training and target component indices, never filled or replaced by new schools. The new source dictionary confirms the 2024–25 academic year. Annualized residual corrections from 2/5-year forecasts are held for the full plan, an unvalidated extrapolation at long horizons.

## Economic process hindcast

Each expanding fold fits at least ten earlier source years and initializes from the last training state. Current SPF forecasts and October 2026 yields never enter historical folds. Final targets are 2020–2023. These process hindcasts use 500 paths per fold, seed 623917; they do not change the user-selected main simulation trial count.

| Horizon | Outcome | Final folds | Non-overlapping periods | P10–P90 coverage |
|---|---|---:|---:|---:|
| 1 | stocks | 4 | 4 | 50.0% |
| 1 | treasury | 4 | 4 | 75.0% |
| 1 | cash | 4 | 4 | 75.0% |
| 1 | inflation | 4 | 4 | 25.0% |
| 1 | portfolio | 4 | 4 | 50.0% |
| 1 | longYield | 4 | 4 | 75.0% |
| 1 | billQuote | 4 | 4 | 50.0% |
| 3 | stocks | 4 | 2 | 100.0% |
| 3 | treasury | 4 | 2 | 50.0% |
| 3 | cash | 4 | 2 | 75.0% |
| 3 | inflation | 4 | 2 | 50.0% |
| 3 | portfolio | 4 | 2 | 100.0% |
| 3 | longYield | 4 | 2 | 50.0% |
| 3 | billQuote | 4 | 2 | 25.0% |
| 5 | stocks | 4 | 1 | 100.0% |
| 5 | treasury | 4 | 1 | 50.0% |
| 5 | cash | 4 | 1 | 100.0% |
| 5 | inflation | 4 | 1 | 50.0% |
| 5 | portfolio | 4 | 1 | 100.0% |
| 5 | longYield | 4 | 1 | 100.0% |
| 5 | billQuote | 4 | 1 | 100.0% |

**Coverage remains uneven**, especially inflation and some rate/return horizons. No post-hoc widening was applied to make these rows pass. Treasury and cash held-out returns are reconstructed from held-out observed yields using the same defined instruments, not independently observed fund/index returns. The 60/30/10 portfolio uses monthly rebalancing before fees. Overlapping fold counts must not be treated as independent histories.

## Reproducibility and remaining limits

Run `python3 scripts/prepare_economy.py`, `python3 scripts/prepare_cost_holdout.py`, `node scripts/validate_cost_correction.mjs`, `node scripts/validate_economy.mjs`, then `node scripts/build_economic_release.mjs`. Raw source hashes, the frozen protocol hash, source panel identity and validation report hashes are linked in the live bundle. Older input bundles and reports remain intact.

The initial inflation state is the central case assumption, not a current CPI observation. The ten-year SPF yield is used as a provisional five-year long-run yield proxy; monthly-average quotes smooth traded price movements. Rates are numerically bounded at 0–25% and annual inflation gross factors at 0.8–1.3. Those limits do not define probabilistic bounds. No equity valuation model, credit spread/default model, security-specific fund tracking, tax model or account recommendation is provided.

Next validation needs new independent years and real release vintages, independently measured bond/fund total returns, better inflation-tail evidence and long-horizon checks. Neither 108 passing code tests nor additional Monte Carlo paths can certify economic forecast coverage.

Treasury pricing applies the next simulated five-year yield to all remaining cash flows: a flat-curve approximation, with no bid/ask or roll-down-curve modeling. Displayed return/yield anchors are centering inputs; conditional sampling, state bounds and persistent expectation draws mean simulated sample averages need not equal them.
