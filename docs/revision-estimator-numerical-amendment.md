# Numerical review amendment before the registered recovery suite

2026-11-18 America/Los_Angeles. The first development run of the supplied seed-2026111801 world exposed a numerical failure: L-BFGS-B can stop at an unchanged iterate after probing singular covariance corners, despite a large score gradient. Its success message and two unchanged iterates are not convergence evidence. No historical parameters or forecast scores have been computed.

Keep the frozen model, six recovery seeds, truth, bounds, gate and 1e-8 objective/parameter criteria. For singular trial points only, use a finite 1e10 search barrier with an inward scale gradient; this is a search device, not a fitted likelihood or diagonal jitter. Re-evaluate the exact likelihood before any returned solution. Record the rejected zero starts and optimizer messages.

After L-BFGS-B, verify a feasible Newton correction from central finite differences of the analytic gradient (steps max(1e-5, abs(parameter)*1e-3)). Up to eight bounded, damped corrections of the same exact objective may polish the numerical solution within the original 2,000-iteration budget. Require a final feasible correction <1e-8 and relative objective change <1e-8. A nonpositive free-parameter curvature, exhausted budget, unresolved stationarity or singular exact likelihood remains unavailable. Damping may tolerate at most 1e-12 relative objective increase for floating-point roundoff; this does not relax the convergence thresholds or change a model score.

Report these verification steps, failures and directional profiles. No empirical recovery gate is weakened to accommodate the development failure. The full six-seed ideal and six-seed misspecified suites run only after this amendment is committed.
