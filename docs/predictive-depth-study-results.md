# Realistic-depth predictive study results

The work is implemented and the complete precommitted grid has run. **Estimation/uncertainty availability is inadequate at the actual short histories; no historical candidate is qualified or activated.** The original failed recovery gate and all older evidence remain unchanged.

Protocol `4349ea2cdd03455dd05103926aef5f409a986a58` preceded implementation. [Implementation notes](predictive-depth-implementation-notes.md) explain seeded symmetric-root sampling, numerical portability and the wait-zero laboratory rule. There are 200 cells, 24 fresh independent main-world seeds, 600 point fits and 704 actually attempted bootstrap refits. Missing outer fits account for the remaining planned inner fits; none is substituted. The final generation took 220.8 seconds with six workers and single-threaded BLAS locally; runtime is descriptive, not a benchmark.

## Actual-depth support

Each entry has 24 predeclared outer worlds. Availability means the existing strict optimizer accepted a fit and its drift was supported. Bill coverage below is **conditional on those available REML worlds**, for an 80% complete-four-year-bill interval and a four-year wait; it cannot describe missing worlds.

| Transitions | Schools | ML available | REML available | Shared-diagonal REML available | REML bill coverage |
| --- | --- | --- | --- | --- | --- |
| 3 | 8 | 3/24 | 7/24 | 9/24 | 42.9% |
| 3 | 32 | 7/24 | 11/24 | 11/24 | 54.5% |
| 7 | 8 | 15/24 | 18/24 | 21/24 | 72.2% |
| 7 | 32 | 23/24 | 24/24 | 24/24 | 50.0% |
| 12 | 8 | 17/24 | 19/24 | 22/24 | 94.7% |
| 12 | 32 | 24/24 | 24/24 | 24/24 | 91.7% |

At seven transitions/32 schools, every REML fit is available but complete-bill coverage is only 12/24 = 50% (95% Wilson interval 31.4–68.6%). Its cash funding-failure Brier score at the base savings amount is 0.338. This is direct evidence that successful convergence and improved shared-variance estimates do not establish predictive calibration. At twelve transitions/32 schools the same coverage is 91.7%; these cells reuse histories and are not independent replications of a universal improvement.

The 24/48-transition controls have eight worlds and complete point-fit availability. Larger school counts improve numerical availability in some cells without adding independent shared innovations. Full parameter-family variance recovery, correlations and drift errors are in the compact artifact. The shared-diagonal alternative is not selected: at three transitions/32 schools its median shared housing variance is zero, and predictive comparisons do not establish a universal winner.

## Parameter uncertainty and cash decisions

The bootstrap simulates a joint training panel, refits it, and conditions the original history under each refitted drift/covariance vector. Its 256 draws preserve joint school/component/year dependence. A mixture requires all 16 refits; failures are retained.

| Transitions, eight schools | Outer fits available | Inner fits attempted | Inner fits failed | Complete mixtures |
| --- | --- | --- | --- | --- |
| 3 | 7/24 | 112 | 56 | 0/24 |
| 7 | 18/24 | 288 | 74 | 0/24 |
| 12 | 19/24 | 304 | 46 | 5/24 |

Only five twelve-year worlds permit a matched bootstrap comparison. At wait four, bootstrap minus plug-in REML changes bill coverage by 0 points, interval width and interval score by +0.00562 of the $72,000 origin four-year budget, individual Brier by −0.00966 and household Brier by −0.03784. These selected five worlds are insufficient for a general improvement claim; wider intervals alone are not a benefit. All other waits, budgets and matched comparisons are retained.

Production `compile`, `repriceRow`, `runPath`, `requiredContribution` and `allocateDeposits` perform the financial calculations. This zero-return/zero-CPI laboratory includes 0/4/8-year waits, three savings levels, complete bills, unpaid bills, explicit impossible required deposits, and a cent-conserving two-student cap that binds for 48/96 months at waits four/eight. The synthetic monthly cap is $146.25 against $195 of overlapping requested deposits. Student balances stay separate. At wait zero an infinite deposit bound is explicitly impossible; extended-real coverage is not a feasible savings recommendation.

The true-parameter conditional control and deterministic no-growth/4%-3% controls are included. Correlated source errors, common reporting shifts, heavy-tailed innovations, permanent school jumps and persistence .8 each have eight separately retained worlds. For these misspecified cases, the true-parameter Gaussian control is explicitly **not** called an oracle. No model is selected from stress results.

## Focused metadata audit

The real pinned panel audit covers 326,605 observed edge/component/sector occurrences. These overlap, especially housing and residency sectors; they are not independent institutions or counts of newly recoverable graph transitions.

| Review lead | Occurrences |
| --- | ---: |
| Name-only mismatches with matched definition/population | 18,405 |
| Of those, case/spacing-only name candidates | 13,583 |
| Definition-text mismatches | 75,229 |
| Of those, stable normalized title/component/residency/living/basis candidates | 69,877 |
| Definition mismatches also changing flag vocabulary | 41,413 |

For example, UNITID 100654 changes `ALABAMA A & M UNIVERSITY` to `Alabama A & M University` in 2004. The artifact preserves exact definitions and deterministic name examples, source identities and year/component denominators. These are promising normalization/review targets, not independently established economic equivalences. The reviewed registry remains empty; zero edges are bridged and zero historical prices are fitted. Strict original-publication-vintage support remains unavailable.

## Artifacts and reproduction

The [JSON key amendment](predictive-reproduction-amendment.md) repairs a false comparison rejection for integer fixed-coordinate keys using a separate strict JSON-normalizing verifier. Every evidence-generating source and artifact remains unchanged.

- Full cells, all fits/refits and financial diagnostics: `data/calibration-diagnostics/predictive-depth-study.json.gz` (deterministic gzip; decode with Python gzip/json).
- Small summaries, all-family recovery, paired method comparisons and uncertainty/support: `data/calibration-diagnostics/predictive-depth-summary.json`.
- Metadata audit: `data/calibration-diagnostics/metadata-continuity.json` and `data/research/reviewed-metadata-equivalences.json`.

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python3 scripts/verify_predictive_reproduction.py --workers 4
OPENBLAS_NUM_THREADS=1 python3 scripts/summarize_predictive_depth.py --verify
node --max-old-space-size=4096 scripts/audit-metadata-continuity.mjs --verify
npm run check
```

NumPy 2.3.5/SciPy 1.17.0 remain pinned. The exact balanced likelihood/gradient/solve is checked against the frozen generic implementation. Conditional forecasts are checked against a dense Schur complement and an independently built raw-level kernel; a 512-world true-parameter coverage check passes. Production-ledger tests cover bill totals, wait-zero impossibility, exact deposit timing, solver sufficiency/minimality, ownership and binding caps. CI always runs mathematics/artifact checks. An expensive numerical reproduction can be cached only with an exact recursive source/data/toolchain key and a validated completion marker; `workflow_dispatch` with `force_full=true` forces all runs. Marker tests reject missing, partial, source-changed and toolchain-changed records. Reproducing a failed scientific gate does not turn it into a passed gate.

## Next action

Freeze a numerical-boundary audit of the **retained failed refits** before another economic fit: distinguish undefined correlations at zero variance, unsupported drift, weak critical curvature and failure to verify a small feasible step. Compare an identifiable PSD covariance parameterization to the unchanged optimizer on those same cases, with independently checked objectives/KKT conditions; do not relax the old gate or delete failures. Establish bootstrap availability before paying for larger tail batches. Separately review exact case-only name and flag-dictionary concept equivalences in a versioned alternative graph without modifying the frozen original view. Neither step authorizes historical fitting or establishes publication vintages.
