# Retained-refit covariance and metadata review results

The precommitted [protocol](boundary-covariance-audit-protocol.md) was published at `b053a71aeb9f3fdb4156662ba40337f0afbaad10` before implementation. The audit preserves the failed v1 recovery, the primary cross-runtime failure, the bootstrap failures and all original evidence. Historical fitting and model activation remain blocked.

## Refit audit

All **179 failed attempted** AVX2 bootstrap refits were reconstructed with their original outer fits and seeds. Six previously converged controls were selected as preregistered: the first two per depth. No unattempted refits were treated as successes.

| Transitions | Previously failed | Prior stationarity screen | Supplemental KKT screen | Unresolved after supplement | Controls with lower alternative |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3 | 54 | 27 | 27 | 27 | 1/2 |
| 7 | 73 | 35 | 34 | 39 | 0/2 |
| 12 | 52 | 25 | 25 | 27 | 0/2 |
| **Total** | **179** | **87** | **86** | **93** | **1/6** |

The alternative optimizes the *same bounded covariance family* directly in variance/covariance coordinates, with three deterministic starts and an independent objective/analytic gradient. The original screen checks feasibility, original drift bounds, active-constraint qualification, stationarity residuals and feasible coordinate directions. A [precommitted supplement](covariance-complementarity-protocol.md) then independently checks multiplier–slack complementarity. Its 1e-6 threshold is in objective units; it reduces the 87 stationarity-screened failed cases to 86 passing all specified necessary KKT checks. A first-order check is necessary but **does not prove local or global optimality**, uncertainty coverage, or successful convergence under the original strict optimizer. The best feasible objective is selected before verification, so unverified lower candidates are not hidden. No selected-success bootstrap or financial score was recomputed.

The old failures have clear numerical patterns: 113 cases include both nonpositive-free-curvature and singular-curvature failures among their distinct starts, 54 include only nonpositive-free-curvature, and 12 only singular-curvature. These categories describe optimizer verification, not economic causes. Zero-variance cones and dependent active constraints remain explicitly unresolved where constraint qualification cannot be established. Across all cases, 26 selected points passed the original stationarity screen despite SLSQP reporting failure; the objective, residuals and solver exits are retained to allow independent review rather than silently reclassifying them as converged fits.

One previously accepted three-transition control (outer seed 2026112004, bootstrap index 2) has an alternative objective **0.015824 lower** than the original accepted objective. The independent and frozen objectives agree at the original parameters to approximately 3e-14. The alternative satisfies the stated first-order checks; this demonstrates that the earlier acceptance of a local solution did not establish a global optimum. It does not establish that the alternative is global either. The other five controls do not show a lower candidate beyond the precommitted 1e-6 comparison threshold.

The separately reviewed cross-runtime case (seed 2026112003, three transitions/eight schools, fixed shared correlation) evaluates both recorded solutions on the same graph. The original lower solution remains approximately **0.004997** lower than the AVX2-selected solution; independent and frozen likelihood values agree within 2e-13. This is multiple-solution/optimizer sensitivity, not a discrepancy between the two likelihood calculations. It preserves the primary cross-runtime failure.

## Metadata review

The review preserves **23 case/spacing lead groups**, 30 deterministic name examples, and **110 source-specific definition groups** with fields, academic years, original titles/descriptions, flag-code changes and hashed dictionary source records. Counts are overlapping edge/component/sector occurrences, not distinct institutions or recovered transition years.

The largest name lead is private nonprofit tuition in 2004: **2,414 occurrences**, including transition and revision comparisons. A separate public-four-year example is UNITID 100654 changing `ALABAMA A & M UNIVERSITY` to `Alabama A & M University`. In the largest definition group, 1,275 private nonprofit tuition revision comparisons connect 2006 `CHG2AY3` to 2007 `CHG2AY2`; normalized titles and concept fields match, the listed flag vocabulary is unchanged, and the source text changes its published-site wording from IPEDS COOL to College Navigator. The full definitions and source hashes are retained in the review artifact.

These facts identify promising review targets; they do **not** independently establish institutional continuity, unchanged gross/net price concepts, or publication-vintage availability. Other groups also change flag vocabularies. The reviewed-equivalence registry remains empty: **zero edges bridged and zero historical fits**. Independent institutional/source evidence and an explicitly versioned alternative graph are needed before any bridge is authorized.

## Reproduction and next action

- Full cases and original/alternative optimizer traces: `data/calibration-diagnostics/covariance-refit-audit.json.gz`.
- Metadata groups and original dictionary provenance: `data/calibration-diagnostics/metadata-lead-review.json`.
- Two recorded minima independently evaluated: `data/calibration-diagnostics/cross-runtime-minimum.json`.
- Multiplier–slack products for all cases: `data/calibration-diagnostics/covariance-complementarity.json`.

Use the environment in `scripts/verify_predictive_runtime.py` (Python 3.12.14, pinned NumPy/SciPy, Haswell/AVX2 and one thread), then run:

```sh
python3 -m unittest discover -s tests -p covariance_coordinate_test.py
python3 -m unittest discover -s tests -p covariance_complementarity_test.py
python3 scripts/audit_covariance_refits.py --verify --workers 4
python3 scripts/audit-cross-runtime-minimum.py --verify
python3 scripts/audit_covariance_complementarity.py --verify
node --max-old-space-size=4096 scripts/review-metadata-leads.mjs --verify
npm run check
```

The 185-case full numerical rerun, independent objective/gradient, stationarity and complementarity tests, metadata reproduction and Node checks pass locally. One seven-transition case (outer seed 2026112002, refit 1) has a maximum complementarity product of 8.15e-6 and fails the supplement despite passing the earlier stationarity screen; its signed constraint slacks and multipliers are retained. CI independently reruns them. The next step is a separately frozen global-optimization/constraint-qualification study on retained cases, including boundary-aware feasible directions and robust multistart adequacy. Do not replace the original optimizer gate with first-order KKT, select successful bootstrap replicates, or infer forecast improvement from this audit. Independently resolve a small set of high-support dictionary and institution identity leads before an alternative graph is evaluated; strict original-vintage availability still needs evidence.
