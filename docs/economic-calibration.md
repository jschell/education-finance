# Economic calibration · first implementation

Application 0.6.0; model college-funding-5.0.0; assumptions us-sector-calibration-2026-11-16-v1. Implemented 2026-11-16. This is a provisional economic-assumption release, not a validated funding-probability model.

## In scope

- One Calculate evaluates cautious, central and favorable macro/cost cases with identical trial counts and matched random draws. The gauge shows their envelope; the arc, detailed paths, distributions and monthly contribution solver use the central case. Cases are not confidence intervals and have no assigned probability weights.
- Published NCES sector tuition/required fees and on-campus room/board levels, separately for public four-year, public two-year and private nonprofit four-year. User budgets remain starting values. Academic CPI is inferred from current/constant-dollar column ratios. At-home/off-campus housing and books/transport/other expenses use general CPI.
- Forward nominal anchors from the Philadelphia Fed SPF's latest common vintage, 2026Q1: central stocks 7%, Treasury yield proxy 4%, bills 3%, CPI 2.3%, annual units. The stock forecast is S&P 500, used as a broad-equity proxy. The bond forecast is a yield, not a total-return forecast; using it as a carry anchor is provisional. Cautious/favorable anchors use forecaster quartiles, with cautious equities lowered to 4.8% using Vanguard's published September 2026 outlook cross-check. These quartiles describe disagreement, not future return bounds. Anchors are held constant beyond ten years; no long-horizon calibration is claimed.
- Real college growth = nominal sector gross growth / academic CPI gross growth. Its center uses the last ten annual changes. Persistent between-path drift draws use centered rolling-ten-year real-growth averages; cautious/favorable cost centers shift by plus/minus half their IQR. This is empirical regime sensitivity, not an estimated parameter confidence interval.
- Every source year carries its paired tuition, housing and CPI changes plus twelve September–August market months. One-, three- or five-year consecutive blocks start at model-year boundaries. The same block and persistent-drift indices are shared across students/cases. Poor markets can coincide with higher expenses; the source's observed dependence is retained, not replaced by perfect correlation.
- Asset monthly gross factors are scaled so each asset's source-year arithmetic mean annual gross return equals its case anchor. This retains source log-return deviations while avoiding interpreting an arithmetic forecast as a geometric compound return. Monthly fees and portfolio rebalancing retain the existing ledger convention. Annual CPI factors are similarly recentered; monthly CPI is interpolated, not observed. Nominal tuition/housing = adjusted real growth × the same CPI, so inflation is applied once. Academic tuition and on-campus housing prices are held within each attendance year; other costs follow monthly interpolated CPI.
- Current schema-5 student funding is preserved, with model metadata upgraded. Historical replay remains an optional calculation mode. No extra button, required field, account linkage or live API is added.

## Observed-price validation and limits

`node scripts/validate_calibration.mjs` produces the committed `site/data/calibration-validation.json`. Each expanding training sample contains at least eleven annual levels. At each origin, the model fits only past prices/CPI and forecasts actual tuition plus on-campus room/board at 2, 5, 10 and 18 years. Training inflation replaces today's SPF forecasts so current expectations cannot leak into past forecasts. P10–P90 coverage, average signed median-relative error, median-forecast MAPE and fixed 4% tuition/3% housing MAPE are reported. Tests use 1,000 paths per fold and fixed seed 972461.

**The component check fails to establish adequate coverage.** Public-four-year coverage is about 58%, 30%, 33% and 40% by the four horizons; private-four-year coverage is about 31%, 10%, 0%, and unavailable. The fixed-rate baseline often has smaller point errors. No fitting to these held-out results or post-hoc widening was performed to manufacture a pass.

Non-overlapping evaluation counts are explicit (public sectors: 13/5/2/1; private: 7/2/1/0). Wilson intervals for the non-overlapping coverage are included in the report, but common economic exposures and overlapping training data still limit independence. These are retrospective year-cutoff tests using revised aggregate prices, not historical release vintages. They do not validate investments, aid, household funding frequencies or individual school costs. Long horizons cannot be certified with these data.

## Sources, proxies and reproducibility

See `data/calibration-manifest.json` and `data/NOTICE.md`. Rebuild with standard-library Python: `python3 scripts/prepare_calibration.py`, then the validation command above. Raw source hashes, matched historical-data hash and canonical derived-bundle SHA-256 are verified. Assessment exports retain method, versions, seed, case anchors and validation results. Browser work is entirely local.

NCES 2024 Table 330.10 is a pinned vintage, not asserted to be the latest table. The data cover through 2023–24. Private nonprofit levels begin in 1999; common paired annual changes span 2000–2023. Public prices use in-district charges; out-of-state and custom public paths use this sector growth proxy. On-campus room/board is not a local-rent model. Sector composition changes and the post-1995 institutional-definition break remain in the source. Bond returns retain the reconstructed Treasury proxy from the existing historical bundle.

Refresh annually through a reviewed data/model change; retain raw vintages and rerun coverage checks. Never silently fetch new defaults into an existing assessment.

## Outside this release

School-specific growth calibration, current school scraping, net-price/aid eligibility forecasting, taxes and account restrictions, loans, foreign markets/currencies, optimization, validated allocation recommendations and empirically certified individual-family success percentages. Historical replay stresses remain available in replay mode; economic cases currently replace that diagnostic panel.

Next work is genuine model improvement against untouched price histories or release vintages, stronger long-horizon regime treatment and independent investment validation. More Monte Carlo trials cannot fix the observed coverage failure.
