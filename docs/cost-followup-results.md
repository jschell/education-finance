# Reconstructed cost follow-up results

2026-11-16. Report `cost-followup-v1`, hash `050a24eac1bb138a942e55ce3750cfa09d75a56a3f890f2168be9ae84c4b2f74`.
Protocol hash `bdc367232608905d94ab28838c7e6e250289b6299504154057fb305f6b43f86a`. This is a reconstruction; the previous session's uncommitted implementation was not recovered.

## Independent invoice and CPI audit

90 cost cases, 3240 attended monthly invoices. Maximum per-invoice difference: $0.02; maximum absolute four-year difference: $0.10. Independent invoice allocation can differ by cents from repricing already allocated baseline cents. CPI uses preceding-month observations rebased to the August before each September origin; no future CPI enters fitting.

## Complete four-year bill comparison

Lower normalized 80% interval scores are better. Equal weight is given to waits, then origins, then sectors.

| Candidate | Score | Coverage | Signed median error |
| --- | ---: | ---: | ---: |
| fixed | 0.284 | 35.3% | 5.5% |
| recent10 | 1.042 | 5.1% | 21.6% |
| damped5 | 1.143 | 5.3% | 21.8% |
| regime | 1.072 | 4.7% | 21.2% |

Predeclared release recommendation: **fixed**. The production financial model is retained. Chronologically selected score: 0.284. Selection excludes all outcomes whose final bill year is at or after the forecast origin; early origins default to the benchmark.

| Enrollment wait | Distinct origins | Benchmark coverage | Actual below band | Actual above band |
| --- | ---: | ---: | ---: | ---: |
| 0 | 10 | 76.0% | 24.0% | 0.0% |
| 4 | 6 | 20.0% | 80.0% | 0.0% |
| 8 | 2 | 10.0% | 90.0% | 0.0% |

## Funding discrimination

Five predeclared opening-balance levels and cash/conservative/balanced profiles are evaluated using the retained production factory and bill ledger. Base-rate forecasts use only earlier origins whose final bills were completed before the forecast origin. Counts are synthetic cases, not independent histories.

| Wait | Profile | Cases | Origins | Brier | Expanding-base Brier | Skill |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 0 | cash | 250 | 10 | 0.018 | 0.247 | 0.926 |
| 0 | cautious | 250 | 10 | 0.016 | 0.245 | 0.934 |
| 0 | balanced | 250 | 10 | 0.004 | 0.244 | 0.983 |
| 4 | cash | 150 | 6 | 0.030 | 0.250 | 0.878 |
| 4 | cautious | 150 | 6 | 0.052 | 0.250 | 0.791 |
| 4 | balanced | 150 | 6 | 0.047 | 0.250 | 0.812 |
| 8 | cash | 50 | 2 | 0.102 | 0.250 | 0.590 |
| 8 | cautious | 50 | 2 | 0.065 | 0.250 | 0.739 |
| 8 | balanced | 50 | 2 | 0.081 | 0.250 | 0.674 |

Empty reliability bins and distinct-origin counts remain in the JSON; these scores do not certify a future 90% funding probability.

## Newborn-horizon cost evidence

18-year wait plus four attendance years; pinned NCES public four-year/two-year aggregates. 14 sector/origin outcomes, 7 distinct origins, 1 nonoverlapping complete outcome window(s). Shared sectors and overlapping origins are not independent samples.

| Candidate | Bill score | Coverage | Actual below band | Actual above band |
| --- | ---: | ---: | ---: | ---: |
| fixed | 1.091 | 0.0% | 0.0% | 100.0% |
| recent10 | 0.556 | 50.0% | 42.9% | 7.1% |
| damped5 | 0.533 | 71.4% | 21.4% | 7.1% |
| regime | 0.611 | 57.1% | 42.9% | 0.0% |

These are composition-sensitive aggregate cost tests on a shifted synthetic bill calendar, without investments or panel residual correction. They are not fixed-school or whole-plan newborn backtests. A blanket cost adjustment is not supported by evidence with different miss directions and source definitions.

## Remaining findings

Cost-band coverage and independent long-horizon evidence remain unresolved. The code and reports make the weaknesses measurable; completing this evaluation does not establish forecast calibration. The full JSON retains source/protocol hashes, every bill-score fold, chronological eligibility, audit details, funding cases and reliability bins. Rebuild with `node scripts/validate-cost-followup.mjs`.

[Protocol](cost-followup-protocol.md) · [JSON report](../site/data/cost-followup.json) · [Current model](model.md)
