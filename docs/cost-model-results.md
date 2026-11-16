# College-cost model comparison results

2026-11-16 · protocol SHA-256 `2305feafbf7aedb5d6a163102e6e95c7aa55ff9d3a005f1ca16a71db3e7470d6` · 1,000 paths/fold · seed 972461

Development targets end in 2019; reserved targets are 2020–2023. Scores equally average the five series and 2/5-year horizons, not institutions. Lower interval scores and MAPE are better. These are retrospective revised-source tests with full-window panel selection, not prospective validation.

| Model | Development interval score | Reserved interval score | Reserved index coverage | Reserved median MAPE |
|---|---:|---:|---:|---:|
| fixed | 0.081 | 0.185 | 50.0% | 4.8% |
| recent10 | 0.436 | 0.263 | 37.5% | 5.7% |
| damped5 | 0.411 | 0.193 | 55.0% | 5.1% |
| regime | 0.434 | 0.210 | 47.5% | 5.1% |

Selected `fixed`; release gate passed. The selected benchmark improves the predeclared score relative to recent10, but its P10–P90 coverage is only 50%, not the nominal 80%. No probability-calibration claim is justified.

| Series | Horizon | Reserved origin clusters | Index coverage | School-level coverage | Non-overlapping periods |
|---|---:|---:|---:|---:|---:|
| public4 | 2 | 4 | 100.0% | 60.2% | 2 |
| public4 | 5 | 4 | 100.0% | 51.6% | 1 |
| public4 | 10 | 4 | 25.0% | 36.3% | 1 |
| public4 | 18 | 0 | Unavailable | Unavailable | 0 |
| public4out | 2 | 4 | 50.0% | 52.3% | 2 |
| public4out | 5 | 4 | 0.0% | 39.2% | 1 |
| public4out | 10 | 4 | 0.0% | 29.5% | 1 |
| public4out | 18 | 0 | Unavailable | Unavailable | 0 |
| public2 | 2 | 4 | 100.0% | 41.5% | 2 |
| public2 | 5 | 4 | 50.0% | 48.6% | 1 |
| public2 | 10 | 4 | 75.0% | 43.7% | 1 |
| public2 | 18 | 0 | Unavailable | Unavailable | 0 |
| public2out | 2 | 4 | 25.0% | 25.6% | 2 |
| public2out | 5 | 4 | 0.0% | 25.2% | 1 |
| public2out | 10 | 4 | 0.0% | 20.3% | 1 |
| public2out | 18 | 0 | Unavailable | Unavailable | 0 |
| private4 | 2 | 4 | 75.0% | 60.4% | 2 |
| private4 | 5 | 4 | 0.0% | 52.0% | 1 |
| private4 | 10 | 4 | 0.0% | 26.9% | 1 |
| private4 | 18 | 0 | Unavailable | Unavailable | 0 |

Each horizon has at most four reserved target years. Schools/residency series share macro history; these rows must not be pooled as independent histories. No 18-year fold exists. The complete JSON includes every candidate/fold, origin/target dates, interval score, signed median error, MAPE and component counts. The final period is now consumed evidence.

Rebuild: `python3 scripts/prepare_ipeds.py` then `node scripts/compare_cost_models.mjs`. See [protocol](cost-model-protocol.md) and [methodology](economic-calibration.md).
