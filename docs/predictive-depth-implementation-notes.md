# Predictive study implementation notes

The frozen [protocol](predictive-depth-study-protocol.md) is commit `4349ea2cdd03455dd05103926aef5f409a986a58` and remains unchanged.

Before a first scored artifact, the forecast sampler uses the unique symmetric positive semidefinite square root, rather than an eigenvector-oriented factor. This preserves the target Gaussian distribution and avoids arbitrary eigenvector sign/basis changes altering seeded draws across numerical builds. The initial incomplete smoke run was stopped, all cells invalidated by changed source hashes, and the entire fixed grid restarted. No seeds, thresholds, objectives, budgets or comparisons changed.

Numerical reproduction checks parameters/drift at rtol 1e-5, atol 1e-7 and objectives at rtol 1e-8, atol 1e-6, preserving preceding study tolerances. Statuses, classifications, fixed coordinates, metadata, cell identities, forecast availability, outcomes and denominators remain checked. Optimizer iteration traces, raw finite-difference scores/eigenvalues and projected score sizes are retained as diagnostics but not exact cross-build reproduction targets. Predictive values use rtol 1e-5, atol 1e-7; coverage/failure classifications remain exact. Nothing relaxes optimization acceptance.

The production compiler includes a valuation-month contribution when contribution start=end. The cash-only laboratory explicitly sets contribution factors to zero at wait zero, as required by its precommitted no-pre-entry-deposit experiment. The production compiler/solver/defaults are unchanged.

The full diagnostic artifact uses deterministic gzip to avoid retaining a redundant 16 MB indented JSON representation. Packaging changed no experiment: a complete source-invalidated rerun produced exactly equal cells and summaries to the plaintext run before that intermediate copy was removed. The interrupted pre-packaging verification is not counted as a successful check. The final compressed artifact receives its own full refitting verification.
