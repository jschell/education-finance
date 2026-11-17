# Current-model forecast calibration: delivery record

App 0.14.0 / model 12 / schema 5. This is an evaluation and prospective-record release. Production cost and economic defaults remain the corrected foundation; reporting changes do not alter saved student funding.

## Delivered workflow

The [frozen protocol](forecast-calibration-plan.md) was committed before financial scoring. Raw selected IPEDS rows now supply origin-only, stable-sector, positive-price cohorts. Approximately one fifth of institution identities are withheld from all sector and hierarchy fitting. Samples are chosen by identity hash, never by later price availability. Missing later prices and sector changes remain explicit unscored cases. The report retains cohort counts and exact training/test IDs so these choices can be audited.

School-level evaluation compares the current baseline, the unchanged coherent hierarchy and a single prespecified correction fitted from earlier baseline school endpoint errors. Known-school and withheld-history tests are separate. Withheld schools never enter correction fitting, including through older errors; only training-school residuals may be transferred to their evaluation. Costs include four attendance years; nominal/real bill totals, tuition, housing, interval width, signed bias, miss direction and PIT ranks are retained. Interval scores use the known four-year origin budget as denominator so scoring weights do not depend on outcomes. Development, transitional and reserved completed periods are reported separately. A reserved-period comparison is not a new untouched economic experiment: prior sessions examined these economic years.

Current-model individual funding tests replay dated synthetic deposits, grants, income, gifts, observed school prices and reconstructed asset returns through the production bill ledger. Two-student cases include same-school/different-school outcomes, staggered enrollment and a cap that actually binds. Every covered bill must be paid; positive ending balances do not erase earlier shortfalls. Case counts share economic histories. Reliability bins show distinct start years and thin support; origin-cluster intervals are descriptive because outcome windows overlap.

`site/data/current-calibration.json` contains the compact report and source/case SHA-256 identities. Full cases and earlier endpoint errors are preserved under `data/calibration-cases/`. Run:

```sh
node scripts/validate-current-calibration.mjs
```

The generated report is the authoritative numerical result. Research qualification is separate for each school-history type, candidate and wait. Extrapolated corrections cannot qualify outside their supported horizon. No candidate is activated automatically; a cost qualification alone does not establish funding calibration or validate today's forward survey anchors.

## Numerical findings

The run registers **5,400** school-cost model cases, **18,000** synthetic individual-funding plans and **240** household plans, including unavailable/unreached windows. These reuse **22** sampled known institution identities and **20** withheld identities across residency sectors and start years; they are not thousands of independent schools or economies.

| School history | Wait | Baseline 80% cost-band coverage | Distinct observed origins |
|---|---:|---:|---:|
| Known | 0 | 44.1% | 10 |
| Known | 4 | 40.8% | 6 |
| Known | 8 | 31.7% | 2 |
| Withheld | 0 | 45.3% | 10 |
| Withheld | 4 | 39.6% | 6 |
| Withheld | 8 | 30.3% | 2 |

Average signed median bias is small (approximately −0.15% to +2.29% across these groups), while individual-school interval coverage is poor. That diagnoses missing dispersion and heterogeneous errors; it does not justify a blanket trend shift or blind band widening.

The prespecified training-school error correction passes research qualification for known schools at wait 0: reserved-period origin-normalized interval score **0.1553 → 0.1399**, about **9.9% lower**. Reserved-period cost coverage improves from **46.3% to 67.8%**, still below the intended 80%. It fails the sector-protection check for withheld schools despite an aggregate score improvement. Longer correction horizons lack adequate supported residual knots. The unchanged hierarchy fails supported 0/4-year comparisons; wait 8 remains insufficient evidence. A known-school cost qualification alone is not an adequate release gate for forward funding probabilities, so **no candidate is activated**.

Current-model funding Brier scores beat the 0.25 coin-flip reference in these synthetic policies, but that does not establish calibration, especially in target-probability bins with little temporal support. Two-student wait-8 outcomes are unavailable under the specified staggered enrollment. The compact report retains every reliability bin, missing-case count and horizon-specific qualification; favorable aggregate scores never replace those diagnostics.

## Prospective infrastructure

The current record is now committed as `data/forecast-snapshots/2026-11-17-model12.json`, generated as of 2026-11-17 from source `feea5f7f64eb44fd69332958049945f0fffd3a85`. Its canonical SHA-256 is `440dc5171a09f3b744b74c1d6dacf5ac9d511b9f13f2b15e08da6eab7cd9215e`. The index and published status identify 25 forecasts, **zero observed outcomes and 25 pending targets**. The verifier reproduces the source-pinned bytes and pending score and confirms overwrite rejection. This completes the artifact gap identified by the continuity review; it does not provide new economic outcomes.

The worker and generator share `ACTIVE_CALIBRATION_FILE` in `site/js/release.js`. The default snapshot uses the active foundation bundle, verifies its checksum, records model/bundle identities and requires every source file to match the claimed Git commit. Nonproduction bundles require an explicit flag and label. Exclusive creation prevents overwrite. The model-9 snapshot remains unchanged.

The current-model synthetic record covers five cost sectors at 1/2/5/10/18-year horizons. Definitions identify fixed school/component membership, residency and first-year on-campus prices. Future scoring requires comparable positive baseline AND target price indices, source bytes/digest/URL, publication date and explicit definition review. Missing or unreached observations remain unscored. Source checks prove file identity and metadata consistency; a human still reviews whether extracted values and population definitions faithfully match the official source. No future outcome is fabricated.

Create a snapshot only from committed source bytes:

```sh
node scripts/create-forecast-snapshot.mjs --as-of YYYY-MM-DD --output data/forecast-snapshots/NEW_UNIQUE_FILE.json
```

Create a separate source-backed observation record and score it:

```sh
node scripts/record-forecast-outcome.mjs --snapshot SNAPSHOT.json --observation OBSERVATION.json --as-of YYYY-MM-DD --output NEW_RECORD.json
node scripts/score-forecast-snapshot.mjs --snapshot SNAPSHOT.json --observations NEW_RECORD.json --as-of YYYY-MM-DD --output NEW_SCORE.json
```

Observation fields: `sector`, `academicYear`, `tuitionIndex`, `housingIndex`, `definitionId`, `bundleHash`, `publishedAt`, `sourceUrl`, `sourceFile`, `sourceSha256`, `definitionVerified: true`. Source files live under `data/forecast-outcomes/sources/`; use exact positive indices from the reviewed same-definition series. Each record is immutable. No recurring job or private-family collection is enabled.

## Fresh review and limits

- Origin-only selection removes future-selected school membership from this new evaluator; it does not reconstruct original publication vintages or remove the established/on-campus-school eligibility restriction.
- Withheld school histories cannot affect fits. Known-school effects use only earlier levels. Residual support counts target years once, then samples a school within a year to preserve paired variation.
- The historical calibration uses origin-selected panels and training-mean return anchors. Today's production bundle uses its existing pinned panel and survey anchors. Evidence about the model process is not a direct validation of current forward probabilities.
- Funding plans and household choices are synthetic fixed policies, not observed family behavior. Aid, income and contribution decisions remain uncertain in real use.
- More simulated paths improve numerical precision but cannot add independent economic outcome periods. An unsupported 8/18-year claim cannot be manufactured by multiplying school or plan counts.
- The new prospective record can accumulate evidence as official comparable outcomes become available. Price-only snapshots do not establish school-specific or household funding-success calibration.
