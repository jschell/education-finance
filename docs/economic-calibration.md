# Economic calibration plan

Proposed work, as of 2026-11-15. This document does not claim that the current historical model is economically calibrated.

## What calibration means here

Choose defensible, dated expectations and uncertainty assumptions for the investment and college-cost processes, then test forecasts against corresponding observed outcomes that were not used to fit or choose the model. More Monte Carlo paths reduce sampling noise; they cannot correct inappropriate economic assumptions, proxy data or validation targets.

The current student-funding refactor is a data-ownership correction. The two-history gauge range and matched stress baselines improve presentation/comparison, not economic forecasting accuracy. Two historical periods are alternative models, not a confidence interval or a complete estimate of model uncertainty.

## 1. Specify the forecasting target

Keep opening savings, deposit schedules, award assumptions and coverage goals explicit. Define whether the model predicts published tuition/mandatory fees, total published attendance allowances, actual family spending, or net prices after aid. These are different quantities. For this planner, a defensible initial target is published undergraduate tuition and attendance allowances, before separately entered grants, by school sector/residency and living arrangement. School-specific offers remain user inputs; eligibility is not inferred.

Evaluate distinct horizons such as 2, 5, 10 and 18 years, rather than treating near-entry and newborn forecasts as equally validated. Investment benchmarks must match the modeled stock/bond/cash allocations and duration. State fees, rebalancing and any omitted account/tax effects.

Deliverable: forecast-target and asset-mapping specification, with units, horizons and supported use cases.

## 2. Build matched observed datasets

- Annual published tuition/fee and attendance-allowance histories: IPEDS Institutional Characteristics/student-charges files, with institution IDs, sector, residency, academic year and living arrangement. Room/board and other allowances are estimates, not necessarily actual spending. Keep school changes, missing observations, mergers and sample composition explicit. Use national/sector summaries as cross-checks rather than silently replacing school observations.
- General inflation and appropriate living-cost proxies, clearly distinguished from school budget allowances.
- Total-return asset series matching the actual portfolio definition. Improve or quantify the limitations of the yield-reconstructed bond proxy before treating it as an investable fund return.
- Dated public inflation expectations and yield curves for forward-looking anchors. Archive both source values and release vintages; do not use revised/future information in earlier-date tests.

BLS college tuition CPI includes some financial-aid-adjusted observations and multiple degree levels/sectors. Demeaning its changes removes its sample mean, not aid effects or the difference between that index and a school's gross published price. It cannot serve as the observed gross-price target for validating published-price forecasts.

Deliverable: reproducible preprocessing, data dictionary, quality/missingness report, pinned source/checksum manifest and redistribution review. No personal student data are needed.

## 3. Make the economic assumptions consistent

Either retain an explicitly historical-replay model, or specify forward-looking anchors for all relevant processes together: stocks, bonds, cash, inflation, tuition and other costs. Avoid fixing tuition at an arbitrary trend while automatically treating a particularly favorable historical investment premium as the forward expectation.

Real-dollar modeling can make assumptions easier to understand. Convert consistently: real gross return = nominal gross return / inflation gross factor. However, changing the unit of account alone does not improve calibration or erase dependence on the selected period. Expected real returns and expected tuition growth above inflation still need defensible assumptions.

For a practical first model, use a documented baseline and lower/higher return-and-cost cases. Possible inputs include public yield curves and inflation expectations, with cautiously specified equity return assumptions checked against multiple sources. An investment firm's 10-year outlook is a useful external comparison, not a replacement for a cash-flow model or a forecast for every horizon. Do not fabricate probabilities for expert-selected cases.

Deliverable: dated assumption register with parameter ranges, provenance, rationale, horizon and sensitivity to each input.

## 4. Represent both economic variability and assumption uncertainty

Retain paired market/inflation/cost sequences or residual blocks to preserve observed relationships. If recentering, define the transformation for every process and ensure it does not distort the intended dependence or generate implausible prices/returns. Test persistence and adverse combinations, not just marginal average returns.

Consider an outer layer of economic assumptions for each complete simulated lifetime and an inner layer of year-to-year fluctuations. This prevents repeated short blocks from implying that every household receives the same long-run historical average. Parameter distributions require evidence; until then, report named cases and their outcome envelope rather than an apparently precise averaged probability. Costs and investments must remain paired within each path.

Deliverable: pure simulation model, invariance/accounting tests and documented economic scenarios, including prolonged weak returns with rising education costs.

## 5. Repair and expand validation

The current walk-forward diagnostic transplants a synthetic plan onto held-out proxy observations, including transformed tuition changes. It is a conditional proxy replay, not a validation against actual published school bills. Repair the target/data match before using its cost coverage as evidence of real-world calibration.

Use frozen training cutoffs, archived input vintages, unchanged hold-out periods and separate model-selection data. Test component forecasts before the final funding outcome. For costs, evaluate bias and 50%/80% prediction-interval coverage against observed comparable costs. For funding probabilities, examine reliability/Brier scores across documented historical planning cases and compare with simple relevant baselines. A fixed 50% guess is not always the appropriate base-rate forecast.

Avoid treating overlapping years, many schools exposed to the same economy, or thousands of synthetic funding variations as thousands of independent economic histories. Account for clustering/effective sample size and report uncertainty around validation metrics. Long horizons may have too few independent cohorts to substantiate a precisely calibrated success percentage; say so.

Predefine acceptance tolerances based on sample size, economic usefulness and benchmark performance. An 80% interval need not cover exactly 80% in a small sample. Do not widen intervals or fit parameters to a hold-out set and then claim that same set independently validates the revision.

Deliverable: independent validation report by horizon/sector, scored baselines, documented failures and a decision on which probability claims are supported.

## 6. Release and maintain the calibrated model separately

Version assumptions independently of the engine and raw datasets. Record which assumption version produced each assessment; keep historical replay available for comparison. Refresh economic inputs on a stated schedule and when the evidence warrants it, retaining vintage snapshots and rerunning validation. Keep the browser app static: data preparation/calibration can run offline and publish a reviewed JSON bundle.

Do not tune the model to make one family look funded, to reproduce a competitor's gauge, or to make the example look reassuring. Example inputs can be illustrative without changing the model assumptions.

Deliverable: reviewed calibration bundle and user-facing explanation of supported horizons, remaining limitations, and how much results change across defensible cases.

## Primary starting sources

- [BLS college tuition CPI methodology](https://www.bls.gov/cpi/factsheets/college-tuition.htm): published and aid-adjusted quotes; academic-year pricing.
- [NCES IPEDS Institutional Characteristics](https://nces.ed.gov/ipeds/survey-components/4) and [survey handbook](https://nces.ed.gov/statprog/handbook/ipeds.asp): tuition/fees, attendance charges and financial-aid components.
- [Federal Reserve yield-curve models and data](https://www.federalreserve.gov/data/yield-curve-models.htm): nominal/TIPS yield information.
- [Philadelphia Fed inflation forecasts](https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/inflation-forecasts) and [Survey of Professional Forecasters](https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/survey-of-professional-forecasters): inflation expectations and historical forecasts.
- [Vanguard Capital Markets Model methodology](https://corporate.vanguard.com/content/corporatesite/us/en/corp/vemo/vemo-return-forecasts.html): external example of distributions, correlations, economic conditions and horizon-specific forecasts; not a model we can claim to reproduce.
- [Federal Reserve model-risk guidance](https://www.federalreserve.gov/frrs/guidance/supervisory-guidance-on-model-risk-management.htm): conceptual soundness, data relevance, out-of-time testing and outcome analysis. This is a methodological reference, not a regulatory requirement for this app.
