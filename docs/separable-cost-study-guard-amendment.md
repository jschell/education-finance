# Separable study delivery guard amendment

2026-11-18 America/Los_Angeles. The first fixed 960-cell run completed in 23.9s
under protocol published at `c725ca9f5ce7176e7f22c36b655f82013ea6a0e9`.
Initial implementation/outcomes are retained at `63ed743`; archived scientific
JSON is `data/calibration-diagnostics/separable-initial-run/study.json.gz`,
and the exact runner is retained alongside it. The initial full log is retained
alongside those files. No alternative scientific outcomes will replace them.

Independent review arrived while the first run was already in flight. Before
starting that run, the implementation had already corrected prediction-failure
status and exact-grid validation bugs; those guards were included in first-run
source. The remaining review findings require explicit delivery corrections:

1. Student-t log changes have no finite exponential expectation. The frozen
   numeric `bias` statistic remains exactly the sample mean of the prespecified
   2048 simulated bills minus truth, divided by the origin budget. It is a
   **finite-draw mean error**, not a posterior expected-bill bias, and is not a
   screening gate. Its numerical definition is unchanged. Quantiles and proper
   interval scores remain meaningful; very heavy tails still limit usefulness.
2. Add finite-draw/truth checks and fail-closed exponential-overflow handling so
   a future extreme cell cannot accidentally receive available numeric scores.
   No jitter, clipping, sample removal or replacement draw is allowed.

This amendment is committed before the corrective recomputation, after seeing
only the first run's summary tail (availability pass, matched screen fail). The
candidate, prior, seed batch, number of draws, comparisons and every acceptance
criterion remain frozen. The recomputation must retain all 960 cells and compare
all scientific records/summary fields exactly with the archived first run. Any
change must be disclosed; guards may only newly reject nonfinite predictions.
A separate metadata label and source hashes necessarily change. The first
matched-screen failure must not be tuned away.
