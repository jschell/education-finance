# Economic model fixes · implementation and evaluation plan

2026-11-16. Target application 0.8.0, methodology college-funding-7.0.0. Freeze this protocol before evaluating the new final observations. Keep one Calculate action and preserve schema-5 student funding.

## 1. Bonds and cash: explicit instruments and starting conditions

Replace the fixed Treasury-yield total-return anchor in the economic-case mode with monthly pricing of a hypothetical five-year Treasury exposure: receive coupon accrual and reprice the remaining cash flows at the simulated next yield, then roll back to five years. Use the original investment-basis GS5 monthly yield series. This is a transparent model instrument, not an actual fund/index or an observed total-return validation target. Cash uses the TB3MS 91-day discount-quote conversion to a bill price and a monthly equivalent accrual, with reinvestment at subsequent simulated short rates. Pin raw data, units, latest common observation and exact transformations. Retain historical replay as the old explicitly labeled proxy method.

## 2. Joint economic paths and uncertain expectations

Fit a small state model to aligned annual inflation, five-year yields and bill yields. Sample contiguous one/three/five-year source blocks using weights based on the current inflation/rate state. Preserve each selected source block's equity, cost and interest-rate innovations together. This changes the distribution of histories by state; do not claim new causal relationships or a full structural macro model. A shared path is used for every student, portfolio and case; paths must have stable prefixes regardless of plan horizon.

Estimate persistent long-run expectation deviations from joint rolling-ten-year source windows, centered on the published expectation anchors; draw once per path and hold them, rather than drawing a new forecast mean every year. Empirical window dispersion represents historical regime uncertainty, not confidence bounds from forecaster disagreement. Cases retain explicit separate assumptions and no probability weights. State parameters, bounds and instruments are versioned and disclosed.

## 3. Cost undercoverage: residual calibration without recycling the final period

The v0.7 reserved 2020–2023 years are consumed evidence, never new final validation. Fit a persistent tuition/housing forecast-error correction using only origins/targets ending by 2016, pooling 2/5-year annualized log errors by matching calendar fold across sectors. Preserve paired tuition/housing errors and draw one fold per household path. Use the existing fixed-trend model and training-only CPI expectations for these forecasts. This is a candidate empirical bias/dispersion adjustment, not a certified confidence interval.

Use 2017–2019 as development diagnostics and label all earlier 2020–2023 results retrospective. A separately downloaded 2024–25 collection year (target year 2024), absent from the old panel, is the new final check. Keep the old fixed institution membership; do not select schools after seeing their 2024 growth. Report missing/reclassified schools and do not fill prices. Compare unadjusted versus residual-adjusted intervals at 2/5/10 years. Primary gate: the mean normalized 80% interval score across series/horizons on 2024 must not worsen; otherwise retain the unadjusted live cost process. No parameter retuning after inspection. At most one new independent target-year shock exists; even a pass does not establish 80% coverage or validate family funding probabilities.

## 4. Investment/process validation

Use expanding historical training cutoffs (at least ten source years), fit each fold exclusively on its training data, initialize from that fold's observed state, and forecast the next 1/3/5 years. Reserve outcomes ending after 2019 for final scoring; do not use current SPF expectations in historical folds. Report stock, bill-yield, Treasury-yield, inflation, instrument-return proxy and 60/30/10 portfolio ranges with coverage, point error, interval score and non-overlapping period counts. Repriced Treasury returns are evaluated against the same reconstructed instrument definition, explicitly a process hindcast, not independent traded-fund validation. Report poor performance without post-hoc widening.

## 5. Release, tests and review

Mechanical corrections (coupon/yield repricing, bill quote conversion, joint-state paths and forecast-mean uncertainty) may ship with provisional diagnostic results. The residual cost correction requires the stated gate. Add mathematical and ledger tests, no-future-input tests, household-prefix/cross-case matching, deterministic hashes/seeds and metadata-only plan upgrades. Publish source and validation reports, exact gate outcome and remaining limits in the app and docs. Expose no extra required fields or calculation buttons. Update visible footer, import versions and model version. Run all checks and browser QA for phone, iPad, keyboard and project paths, then deploy through Actions.
