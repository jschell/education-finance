# Full calibration review · v0.10.2

The suggested model-specific fitting, asymmetric path corrections, nested chronological selection, common-period source checks, denser funding diagnostics and prospective record have been implemented. The evaluation does not establish future calibration.

## Findings

| Priority | Finding | Evidence and consequence |
| --- | --- | --- |
| High | The production cost-coverage problem remains unresolved | The chronologically selected policy improves total-bill score only about 0.15% (0.28442 to 0.28400), failing the frozen 5% promotion rule. Production is retained. |
| High | Long-wait model selection has little historical support | The evaluated four/eight-year-wait origins occur before three earlier complete bill years exist for selection, forcing benchmark fallback. Two eight-year-wait starts do not establish long-horizon reliability. This is an evidence constraint, not proof that all cost models are equally good. |
| Medium | Direct recalibration gains are modest | The recalibrated fixed trend scores 0.27559 versus production 0.28442 (about 3.1% improvement). The other recalibrated trends remain worse. Choosing that direct result after seeing all outcomes would bypass chronological selection; it was not promoted. |
| Medium | Source differences do not alone explain miss direction | On matching recent periods, both fixed-panel and aggregate cost-only reference models overforecast. Older aggregate newborn-horizon tests underforecast. Era, horizon, source composition and the production macro process remain confounded beyond the matched comparison. |
| Medium | Asymmetric corrections can duplicate raw uncertainty and extrapolate sparsely supported errors | The frozen fitter retains paired empirical tails and shrinks bias, but adds variation to already stochastic raw paths. Beyond the last supported knot it extrapolates an annual rate. No conformal or distribution-free future coverage guarantee is claimed. |
| Medium | Near-target funding bins are not a probability calibration proof | Correlated synthetic plans mostly succeed in several 80–95% bins. Case counts are not independent economic outcomes. No post-hoc probability mapping was fitted to these cases. |
| Medium | Comparable history extension is limited | Matched 2024 prices add one already-inspected endpoint year. No missing CPI/market observations are invented, no comparable pre-2000 fixed-school panel is claimed, and panel membership remains selected using later survival. |
| Low | Prospective evidence has not matured | The first immutable synthetic snapshot captures future targets with null outcomes. It begins an honest record, but cannot validate a prediction today. |
| Low | Physical Safari is not tested | Chromium automation and storage regression tests do not establish physical iOS Safari behavior. |

## Verification

The first full evaluation passes 140 tests, reproduces its reports twice byte-for-byte and preserves the prior release's committed validation reports. Candidate-specific residual provenance, asymmetric pairing, elapsed-time curves, nested cutoffs, fixed-mode identity, market-path identity and actual ledger funding effects have regression tests.

Final committed-report integrity, shared household price-curve tests and the publication browser run are recorded in the release status after checks finish. All inputs are synthetic or public pinned data.

The core financial model and schema remain unchanged because the gate failed. The optional recalibration capability is shipped inactive, with all results and failures published. This review is by the implementing reviewer; it is not an independent statistical audit.

[Protocol](full-calibration-protocol.md) · [Results](full-calibration-results.md) · [Open calibration issue](https://github.com/jschell/education-finance/issues/2)
