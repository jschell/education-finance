# Completion review · v0.10.1

This session reconstructed the later uncommitted work from GitHub sources. It did not recover the original source, so earlier session claims of 110 audited bills or 2/14 newborn-band coverage are not used as verification. The new frozen protocol, source hashes, deterministic report and CI are the authoritative evidence for this reconstruction.

## Delivered implementation

- Independent invoice allocations compared with the production repricing ledger: 90 complete cost cases and 3,240 attended monthly invoices. Maximum differences $0.02 per invoice and $0.10 over a complete four-year window reflect rounding previously allocated baseline cents.
- Realized CPI uses preceding-month observations, rebased to the August before each September origin. Future CPI cannot enter fitting inputs.
- Complete four-year billed costs evaluated through the production path factory and ledger. Three existing trend alternatives scored worse than the retained benchmark; no financial default changed.
- Chronological selection excludes outcomes whose final bills occur at or after the forecast origin and requires three distinct completed target years. Thin early evidence defaults to benchmark.
- Five opening-balance levels and three asset profiles give 1,350 synthetic funding cases. Reliability bins, distinct origins, Brier scores, and an expanding completed-outcome base-rate benchmark are published.
- Separate newborn-horizon aggregate cost checks have 14 sector/origin outcomes, seven distinct overlapping origins and one nonoverlapping complete window. They do not simulate investment or family funding probabilities.
- The app exposes the different cost-miss directions in an accessible disclosure. Schema 5 and financial model 9 remain unchanged.

## Fresh findings

| Priority | Finding | Evidence and consequence |
| --- | --- | --- |
| High | Forecast cost bands remain poorly covered | Fixed-school middle-80% bands cover 76%/20%/10% at waits 0/4/8, with actual misses below forecast. Aggregate 18-year-wait benchmark bills all exceed the upper band. Source definitions, date coverage and regimes differ, so a blanket correction is unsupported. |
| High | Future funding probability calibration remains unestablished | Denser synthetic plans improve discrimination evidence but do not create new independent economic histories or validate current survey anchors. No eligible fixed-panel whole-plan 18-year-wait backtest exists. |
| Medium | Alternative-model comparison isolates trend changes rather than independently refitting every model | Alternatives share the origin-limited benchmark residual correction, donors and market paths. Their worse scores reject these controlled substitutions; this is not evidence against every possible recalibrated cost model. |
| Medium | Chronological selection still has inherited policy and dataset limitations | Residual/shrinkage and market policy were selected in earlier full-period work. Revised, full-window-survivor panels are not vintage data. This is chronological diagnostic selection, not fully nested prospective validation. |
| Medium | Aggregate long-horizon evidence is sparse | Seven starts overlap for a 22-year combined wait/attendance window; two public sectors share history. Fourteen cases are not fourteen independent economic periods. |
| Low | Physical Safari storage remains unverified | Automated storage tests and Chromium responsive/worker checks cannot certify physical iOS Safari behavior. |

## Verification state

The initial reconstructed implementation passed 131 tests and regenerated reports twice identically in GitHub Actions. The final report-integrity test and browser checks are pending on this revision. Deployment will be recorded after final checks pass.

[Protocol](cost-followup-protocol.md) · [Results](cost-followup-results.md) · [Prior deployed review](critique-review-v0.10.0.md)
