# Economic calibration · current v0.8.0

Application 0.8.0; model college-funding-7.0.0; live bundle us-state-economic-calibration-2026-11-16-v3. Implemented on 2026-11-16. Read the [fix plan](economic-model-fix-plan.md) and [results](economic-model-results.md) for current behavior. The following v0.7 and earlier sections document retained source data and preceding experiments, not the current stochastic investment process.

- Bonds: five-year hypothetical Treasury, semiannual coupon schedule, monthly roll and dirty-price repricing; starting GS5 4.93% for October 2026. SPF's ten-year yield is a provisional long-run five-year yield-level proxy, never a direct total-return forecast.
- Cash: October 2026 TB3MS 4.05% bank-discount quote converted using a 91-day bill price; annual survey return targets are converted back to consistent discount quotes. Accrual uses the beginning quote, with next-month reinvestment.
- Economy: fitted monthly yield and annual inflation persistence, contiguous source blocks weighted by a central-case conditioning state. That conditioning path is shared by cases; each case's actual state evolves around its own targets. Persistent joint expectation shifts come from centered overlapping ten-year regimes. This is conditional resampling with state dynamics, not a structural macroeconomic forecast or validated parameter confidence distribution.
- Costs: previous fixed-panel growth process plus a persistent paired tuition/housing error correction trained through 2016. The new 2024–25 score gate passed; coverage improved on that one year without re-tuning to its outcomes. Earlier 2020–2023 scores remain separate. More independent final years and release vintages are required.

Monthly Treasury-average yields smooth tradable mark-to-market changes. There is no credit spread, default, equity valuation model, security-specific tax/account modeling or fund recommendation. Inflation hindcasts are weak; observed Treasury/cash validation uses reconstructed instruments rather than independent fund returns. The initial inflation state is the central case's CPI assumption, not a claim about today's observed CPI. Long-horizon funding probabilities remain provisional.

## Preceding v0.7.0 experiment

### Fixed-institution model comparison

Application 0.7.0; methodology college-funding-6.0.0; live assumptions us-panel-calibration-2026-11-16-v2. Provisional, as of 2026-11-16.

## Implemented scope

Priorities 1–2 from the review are complete: comparable-college histories, separate public residency prices, changing-trend candidates, stronger development/reserved-period evaluation and app integration. Existing forward investment/CPI anchors, asset proxies, student funding, the single Calculate action and historical replay remain. Bond/cash modeling and dynamic macro drivers were not part of this release.

Annual NCES IPEDS files are matched by UNITID for 2000–2023. Field definitions are checked against the pinned IC2023_AY dictionary: CHG2AY3 is in-state tuition/required fees; CHG3AY3 is out-of-state tuition/required fees; CHG5AY3 is on-campus food/housing. Private nonprofit uses CHG2AY3. No double addition of tuition and fees occurs. Missing/nonpositive prices are excluded, never forward-filled. Current-year fields are used from each collection, rather than combining repeated historical columns across later files. Normalized original fields and source imputation flags are pinned; URLs, archive member names and full ZIP SHA-256 are retained. Definitions and final/revised source values may differ across vintages.

Each component uses a fixed complete-record panel with stable sector classification across all 24 years. Annual levels are geometric means of that component's institution prices; changes therefore equally weight log growth of the same institutions. Tuition and housing panels differ. This is an index of comparable schools, not an enrollment-weighted national bill, and includes eligible IPEDS reporters without a separate geography filter. Survivorship/complete-record selection uses full-period membership; retrospective training does not remove that selection bias. It is disclosed, not hidden as real-time forecasting.

## Candidate models and selection

The [protocol](cost-model-protocol.md) was written before final-period scores were inspected. The shared pure module `site/js/cost-trends.js` supplies both testing and live annual growth. Candidates: fixed nominal 4%/3% trends with centered empirical deviations; last-ten-year real trend with persistent ten-year drift; damped-five-year real trend converging to the training mean at persistence 0.8; and a five-year trend converging to a sampled five-year historical regime at persistence 0.8. Three-year blocks preserve paired tuition/housing/inflation deviations. Rates are annual; real growth is nominal gross growth divided by the same inflation gross factor. No post-hoc interval widening was performed.

Targets through 2019 select using equal-series/equal-horizon normalized 80% interval score on 2/5-year tests. Final targets 2020–2023 are reserved from candidate selection, with 2/5/10/18-year reporting. Current SPF forecasts never enter retrospective training. The simple fixed-trend benchmark won development and passed the final score gate against recent10. It is now live; the other models remain implemented and their scores are visible. Those nominal trends are tested planning benchmarks, not data-estimated long-run expectations. Case shifts add plus/minus half the IQR of five-year real-growth means; the central case has no shift. Variable cost mode still samples historical annual cost deviations even when its selected trend model is called fixed. User-selected fixed expense mode retains its separate deterministic expense rates.

See [actual results](cost-model-results.md). Interval coverage remains materially below the nominal 80% level. School-level forecasts reuse sector growth paths and origin-specific school prices; their coverage/error is reported separately. School counts and residency series do not increase independent macro histories. No 18-year test is feasible with this 24-level panel and eleven-level minimum training requirement. More simulations do not address this history limit.

The 2020–2023 split is reserved within this new comparison, not genuinely unknown prospective data: previous aggregate diagnostics already examined this economic era. Holdout results are now consumed evidence and must not be reused for tuning without stating that change. Future work needs new final observations, historical release vintages, or a new explicitly retrospective protocol. These tests validate neither current macro expectations nor individual-family funding probabilities.

## Rebuild and presentation

Run `python3 scripts/prepare_ipeds.py` and `node scripts/compare_cost_models.mjs` offline. The latter writes development selection before it evaluates reserved outcomes, records the protocol hash, publishes all candidates, applies the release gate and emits a separately checksummed live bundle. Source refresh is explicit through `python3 scripts/fetch_ipeds.py`; archives are cached in .cache/ipeds and only needed original fields are committed. Input changes require a new reviewed vintage. The app verifies the live bundle checksum, paired market-data hash and comparison panel identity. Reports carry seed, model, assumptions version and source hashes. Schema-5 funding from models 4 and 5 survives metadata-only upgrade.

The older aggregate-price bundle and validation remain available as separate files and as a collapsed older-dataset diagnostic in the app. They are not represented as tests of the new panel model.

## Preceding release: retained macro assumptions and aggregate diagnostic

### v0.6 aggregate-price methodology

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
