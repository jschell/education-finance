# Broader-history model results · v0.9.0

Model college-funding-8.0.0. [Frozen plan](robust-history-plan.md).

## Fixes implemented

- Live macro source coverage increased from 23 to 70 complete years (1954–2023). College costs retain their own 2000–2023 panel; missing older college data no longer truncates investment fitting.
- Expectation variation uses seven disjoint decades. Autoregressive persistence is shrunk toward declared priors; no prior or weighting parameter was tuned after scoring.
- Every cost-validation correction uses targets through that origin only. The preceding 2014 forecast/2016 residual leak is removed. Corrections use sample-size shrinkage n/(n+10) based on unique target years, with a three-year minimum.
- Multiple periods determine release policies; a single target year cannot promote the correction. All cases and students retain shared macro paths and cost donors.

## Investment sampling

| Target period | Uniform score | Conditioned score | Selected coverage |
|---|---:|---:|---:|
| 1974–1989 | 0.468 | 0.463 | 70.0% |
| 1990–2009 | 0.453 | 0.441 | 78.0% |
| 2010–2019 | 0.352 | 0.338 | 76.7% |
| 2020–2023 | 0.315 | 0.326 | 71.7% |

Overall normalized interval score: 0.397 → 0.392. Selected `conditioned`. Primary score equally weights outcome, horizon and era cells. Lower is better.

## Cost correction

| Target period | Unadjusted score | Origin-fitted shrunk score | Selected coverage |
|---|---:|---:|---:|
| 2012–2016 | 0.061 | 0.061 | 97.1% |
| 2017–2019 | 0.098 | 0.095 | 70.0% |
| 2020–2023 | 0.279 | 0.258 | 45.0% |
| 2024 | 0.221 | 0.211 | 73.3% |

Overall normalized interval score: 0.165 → 0.156. Selected `origin-fitted shrunk correction`. Both gates require overall improvement and no era more than 10% worse; both passed.

## Interpretation and reproducibility

The comparisons are retrospective robustness checks. Previously examined 2020–2024 observations are not new holdouts. Period coverage is reported alongside scores, including failures. Disjoint decade blocks and origin-year clusters still share macro history; neither school counts nor repeated Monte Carlo paths expand the number of economic observations.

For earlier macro years, cost donors are sampled conditionally on source inflation from the shorter price history. This preserves component pairing and observed-year matching where available; it does not supply measured pre-2000 school costs. Treasury and cash comparisons retain the explicitly reconstructed instruments. More observations and regularization reduce the specific sample restriction and leakage; future funding frequencies remain conditional on model assumptions.

Rebuild: `python3 scripts/prepare_broad_history.py`, `node scripts/validate_robust_history.mjs`, `node scripts/build_robust_release.mjs`. Original raw source hashes, protocol hash and exact report hash are linked in the live bundle. Older models remain archived for reproduction.
