# Cost-model comparison protocol · frozen before evaluation

2026-11-16. Target release 0.7.0, methodology college-funding-6.0.0.

Scope: priorities 1–2 from the economic-model review: consistent institution histories, in-state versus out-of-state prices, changing cost trends, and stronger validation. Bond/cash models and dynamic macro returns remain unchanged.

## Data and estimand

Use annual NCES IPEDS academic-year student charges plus directory control/level fields, 2000–2023, matched by UNITID. Retain separate public two-year/four-year in-state and out-of-state tuition plus required fees, and private nonprofit four-year tuition. Housing is on-campus published room/board. Exclude missing/nonpositive charges and changes of sector; count exclusions explicitly. Preserve zeros as missing for the positive-price growth estimand, never replace them with previous values. Use a fixed institution panel per series to remove changes in membership; disclose survivorship/complete-record selection. Equal-school log changes describe a comparable-school growth index, not a national enrollment-weighted dollar average. Tuition and housing panels may differ and must be identified separately. No school-specific forecast or new required user input.

## Locked comparison

Candidate definitions before reading final-period scores:

1. `fixed`: 4% nominal tuition / 3% nominal housing, existing planning benchmark. Empirical paired annual deviations supply intervals; their mean is removed.
2. `recent10`: existing last-ten-year real-growth center with persistent centered rolling-ten-year drift and paired annual deviations.
3. `damped5`: last-five-year real growth gradually converges toward the training-period real growth mean with annual persistence 0.8. Persistent drift uses training rolling-five-year growth means, centered on their mean.
4. `regime`: start at last-five-year real growth, then converge toward a sampled historical rolling-five-year real-growth regime with annual persistence 0.8. Draw the same regime index for tuition and housing and keep it for each path. Paired annual deviations retain tuition/housing/inflation relationships. No forecast is clipped to a preselected price envelope.

All candidates use only levels available through the origin, at least 11 consecutive levels, and three-year residual blocks. Inflation in retrospective tests uses training last-ten-year CPI growth; live forecasts retain the existing dated macro-case anchors. Forecasts apply annual gross tuition/housing growth relative to the same CPI process, once. All candidates share seed and draw sequences. Use 1,000 paths per fold.

Select using development folds whose targets are no later than 2019. Primary score: equal-series/equal-horizon average normalized 80% interval score (interval width plus factor-10 misses divided by observed price). Report median-forecast MAPE, bias, and P10–P90 coverage too. Development horizons: 2 and 5 years; minimum one development fold per available series. Lower primary score wins, deterministic listed-order tie break. Do not tune persistence, windows, interval width, or candidate definitions after seeing final scores.

Final holdout: targets 2020–2023, never used in selecting the winner. Report each horizon 2/5/10/18 separately, calendar-origin clusters and non-overlapping test counts; many schools are not independent economic histories. Missing horizons remain unavailable. Compare the locked winner against every candidate and the fixed benchmark, including bad results. Keep old aggregate-price validation separate; do not relabel its folds as institution-panel tests.

Release gate: the selected model may replace the current variable-cost process only if its mean held-out normalized interval score is no worse than recent10 on comparable 2/5-year folds. If the gate fails, retain recent10 and publish the comparison. No individual-family probability-calibration claim follows from either outcome. Final holdout becomes consumed evidence for this version; future tuning needs new final data or a new explicitly retrospective protocol.

Raw files, exact source hashes, retained institution IDs, field mappings, development selection and final scores must be reproducible offline. Use the same forecast-growth implementation for testing and live paths, avoiding a validation-only model.
