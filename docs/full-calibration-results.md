# Full calibration results

Protocol frozen before scoring. All years below were already inspected; results are retrospective. Report hash: `a3b9627539a49377a790449f222046a5d8ca375a552849ab3fd1d988ba85526d`.

## Independently recalibrated production-ledger models

Each model fits its own earlier price errors. Corrections are paired asymmetric cumulative log-price curves, applied before bills are repriced. Bias and spread use the frozen shrinkage rule.

| Model | Bill score | Coverage | Bias | Relative width |
| --- | ---: | ---: | ---: | ---: |
| production | 0.284 | 35.3% | 5.5% | 8.0% |
| fixed | 0.276 | 38.2% | 5.3% | 8.0% |
| recent10 | 0.945 | 16.9% | 20.4% | 41.1% |
| damped5 | 1.061 | 25.3% | 20.7% | 38.4% |
| regime | 0.982 | 24.2% | 20.1% | 39.1% |

## Nested selected policy

| Model | Bill score | Coverage | Bias | Relative width |
| --- | ---: | ---: | ---: | ---: |
| production | 0.284 | 35.3% | 5.5% | 8.0% |
| selected | 0.284 | 36.0% | 5.4% | 8.0% |

Promotion gate: **failed**. Checks: `{"score":false,"waitScores":true,"coverage":true,"bias":true}`.
Live rule chooses **fixed** from completed earlier bills; retained production decision: **production**. These are comparative gates, not a certification of 80% coverage or 90% funding probability.

Selections by origin: 2011: production (0 completed years); 2012: production (0 completed years); 2013: production (0 completed years); 2014: production (0 completed years); 2015: production (1 completed years); 2016: production (2 completed years); 2017: production (3 completed years); 2018: fixed (4 completed years); 2019: fixed (5 completed years); 2020: fixed (6 completed years).
Thin early evidence forces production fallback; the eight-year waits have only two distinct start years. More institutions and funding cases do not fix that limitation.

## Funding reliability near target

Each policy has 1350 synthetic cases across five funding levels and three profiles. Counts share historical shocks.

| Policy | Probability bin | Cases | Distinct origins | Mean forecast | Observed funded |
| --- | --- | ---: | ---: | ---: | ---: |
| production | 0.8–0.85 | 29 | 9 | 0.826 | 1.000 |
| production | 0.85–0.9 | 64 | 10 | 0.873 | 0.969 |
| production | 0.9–0.95 | 86 | 9 | 0.921 | 1.000 |
| production | 0.95–1 | 327 | 10 | 0.993 | 1.000 |
| selected | 0.8–0.85 | 27 | 9 | 0.829 | 1.000 |
| selected | 0.85–0.9 | 63 | 10 | 0.873 | 0.968 |
| selected | 0.9–0.95 | 87 | 10 | 0.921 | 1.000 |
| selected | 0.95–1 | 329 | 10 | 0.993 | 1.000 |

Brier scores, expanding completed-outcome base-rate scores and broader reliability bins are in the JSON. No probability remapping is fitted to these correlated synthetic cases.

## Matched source and period comparison

The same cost-only annual-block algorithm is fitted separately to fixed-panel and aggregate public prices on identical 2011–2020 origins and 0/4/8-year waits. It isolates source/algorithm differences from the old comparison of different horizons and eras.

### fixed

| Model | Bill score | Coverage | Bias | Relative width |
| --- | ---: | ---: | ---: | ---: |
| production | 0.118 | 83.3% | 3.6% | 9.4% |
| fixed | 0.120 | 83.3% | 3.7% | 9.6% |
| recent10 | 1.121 | 28.9% | 15.2% | 11.6% |
| damped5 | 1.098 | 31.7% | 15.5% | 14.5% |
| regime | 1.096 | 27.2% | 14.8% | 11.9% |

### aggregate

| Model | Bill score | Coverage | Bias | Relative width |
| --- | ---: | ---: | ---: | ---: |
| production | 0.152 | 72.2% | 3.3% | 11.0% |
| fixed | 0.438 | 40.6% | 8.7% | 13.2% |
| recent10 | 1.017 | 27.8% | 17.2% | 19.3% |
| damped5 | 0.789 | 35.0% | 15.1% | 22.5% |
| regime | 0.859 | 22.8% | 14.6% | 18.3% |

This common cost-only process uses historical training inflation, not the joint production state process. Differences from production-ledger scores can reflect macro anchoring as well as source composition. Neither source is relabeled as the other. In the ancillary source, long-horizon and 2024 tables, the row named production is an uncorrected fixed-nominal cost-only reference, not the complete joint production model.

## Older aggregate newborn-horizon costs

| Model | Bill score | Coverage | Bias | Relative width |
| --- | ---: | ---: | ---: | ---: |
| production | 1.091 | 0.0% | -17.7% | 15.5% |
| fixed | 1.074 | 14.3% | -17.2% | 19.7% |
| recent10 | 0.677 | 57.1% | 4.7% | 27.9% |
| damped5 | 0.737 | 64.3% | 1.8% | 39.3% |
| regime | 0.793 | 50.0% | 5.5% | 37.1% |

7 overlapping origins, two related public sectors and one nonoverlapping 22-year complete window. This is cost-only evidence, not whole-plan newborn funding calibration.

## Comparable price extension through 2024

Pinned matched-school prices extend the endpoint checks by one target year. Training is recomputed on the same surviving component membership. The 2024 endpoint has no invented CPI deflator and never enters a fabricated full joint outcome.

| Model | Bill score | Coverage | Bias | Relative width |
| --- | ---: | ---: | ---: | ---: |
| production | 0.186 | 80.0% | 3.3% | 10.5% |
| fixed | 0.175 | 85.0% | 2.7% | 10.6% |
| recent10 | 0.275 | 70.0% | 2.3% | 11.6% |
| damped5 | 0.371 | 30.0% | 2.0% | 13.3% |
| regime | 0.409 | 25.0% | 1.9% | 10.9% |

Only one new target-year shock is added, and it was already inspected in earlier work. Source hashes, component membership counts and all 1/2/5/10-year endpoint forecasts are retained in the JSON and `data/comparable-prices-through-2024.json`.

## Remaining findings

The selected policy's gate and every failed comparison remain visible. Sparse long horizons, source vintages, inherited macro choices and survey anchors limit future probability claims. Source and evaluator hashes, every inner fit, outer bill score, chronological choice and funding case are retained. Immutable synthetic prospective snapshots start a separate future record; they do not validate present forecasts immediately.

[Protocol](full-calibration-protocol.md) · [JSON](../site/data/full-calibration.json) · [Current model](model.md)
