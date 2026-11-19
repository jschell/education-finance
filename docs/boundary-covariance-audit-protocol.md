# Retained-refit covariance and metadata audit — frozen protocol

Committed before the audit implementation and evaluation. Base: PR #15 merged at `d9bd263e76c4c7decad91bb1670e58db20c4c56e`. Preserve all previous studies, failures, source bytes, thresholds, production defaults and the programmatic block on historical fitting.

## Exact cases and controls

Use the separately recorded AVX2/Haswell arm under its original Python/NumPy/SciPy, CPU-dispatch and single-thread settings. Replay **every failed attempted bootstrap refit** in the 3/7/12-transition, eight-school cells; retain exact outer seed, transition depth, bootstrap index, outer fit and deterministic refit seed. Do not add unattempted refits as successes. As a basic comparison, select the first two converged refits in seed/index order at each depth, if present. Report the full denominator and exclusions, original start reasons, numerical outcomes and actual objective values. No retries are omitted.

## Alternative coordinate audit

Evaluate the same synthetic Gaussian REML objective in covariance coordinates: for each family optimize `[variance_tuition, variance_housing, covariance]` scaled by 0.01, with variances in [0, 0.25] and covariance constrained by `covariance² <= 0.95² variance_tuition variance_housing`. This preserves the original standard-deviation and correlation bounds, including zero variance and its undefined correlation. Use an independently implemented objective/gradient and verify it against the existing likelihood and finite differences before any case evaluation. No jitter, changed model, historical inputs or promotion.

Run SLSQP with `maxiter=2000`, `ftol=1e-12`, analytic objective/constraint gradients and exactly three deterministic initial points: diagonal standard deviations .02 and .10, and the original outer REML fit's covariance. Record every optimizer exit and candidate, including objective, drift, covariance, constraint violation, selected-start identity and wall-independent iteration/evaluation counts. Select the lowest objective among finite feasible candidates, but do not call a candidate verified solely because the optimizer declares success.

Independently calculate first-order KKT residuals by nonnegative least-squares multipliers for active conic and box constraints. A candidate may be called first-order verified only when feasibility violation <= 1e-8, absolute residual <= 1e-4, relative residual <= 1e-6, drift is inside the original bounds, and every active conic constraint has nonzero gradient and satisfies a numerical constraint-qualification check. Record zero-gradient or ill-conditioned active cones as unresolved. Finite-step and feasible directional checks are separate diagnostics; first-order KKT is a necessary condition, not proof of a minimum or global optimum. A candidate that cannot be checked remains unavailable. This new diagnostic is not a modification or replacement of the prior strict optimizer acceptance.

For any previously converged control, compare objectives at their original accepted parameters under both independent likelihood implementations. Explicitly flag any lower alternative objective beyond 1e-6; do not infer that a previous verified local optimum was globally optimal. At zero variance, retain the covariance matrix but identify correlation as undefined. Include the known cross-runtime 2026112003 three-transition/eight-school shared-diagonal case as a separately labeled explanatory control; the refit audit uses full REML only.

## Metadata review

Using only pinned panel and dictionary source records, classify the highest-support case/spacing-only name leads and stable-concept definition leads by exact years, fields, titles, basis, residency, living category, flag vocabulary and source hashes. Show deterministic examples and identify the evidence needed to resolve gross/net and institution identity. Quantify potential *occurrences*, not independent institutions or inferred new history years. Exact text normalization, matching UNITIDs or dictionaries alone are not independent evidence of economic or institutional equivalence. Preserve the empty reviewed registry and perform zero bridges and zero real-price fits. Any independently documented equivalence must be source-specific and independently reviewable before a separate alternative graph is built.

## Delivery and interpretation

Report all failed and control cases and their statuses, not only improvements; no bootstrap is recomputed from a selected successful subset. Freeze exact source identities and toolchain, provide repeatable audit commands, update continuity, run `npm run check`, numerical gradient/KKT tests and metadata audit reproduction. Numerical reproducibility must not be confused with economic calibration. Strict original-publication-vintage support remains unavailable; no historical fitting or model activation follows from this diagnostic.
