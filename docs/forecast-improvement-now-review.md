# Improve forecasting now: revised-data predictive program

Review base: `f046bbf3a284d8e160e12599029e1bd40a2b882c`. This review combines independent data, implementation, statistical-design and established-method audits. No new predictor was fitted, no full numerical experiment ran, and no financial behavior changed. The support census below only reads existing data.

## Decision

**We can improve and compare forecasts now. November 2027 is the first target for one prospective snapshot, not a prerequisite for all useful forecasting work.**

The immediate program should predict observable, as-reported school charges using pinned revised histories, earlier rolling origins and stronger probabilistic baselines. It should not require successful recovery of four latent economic/reporting covariance families first. Preserve the failed 320-cell and 960-cell studies and their original gates: they are evidence about those particular models and protocols, not a universal ban on a different predictive experiment.

Earlier summaries framed original-vintage evidence and prospective waiting too broadly. The repository already permits separately labeled collection-year-proxy research in the [panel results](revision-aware-price-panel-results.md) and [candidate input contract](revision-aware-cost-candidate-protocol.md). Its current school evaluator already uses revised historical data. The correction is to define a new claim and evaluation contract, not silently declare an old gate passed.

## Four different claims

| Claim | Can proceed now? | Necessary limits |
| --- | --- | --- |
| Comparative hindcast skill conditional on pinned revised AY3 reported prices | Yes | Origin-limited features; explicit revised target/cohort; all reused periods labeled retrospective/development; source-definition sensitivities |
| Collection-year-proxy hindcast | Yes, where the chosen view has support | Collections strictly before origin; separate from the current evaluator's assumed-known origin-year price convention; no original-publication claim |
| Real-time “we could have made this forecast then” | Not established by this corpus | Contemporaneous price AND directory availability tied to exact bytes, plus relevant definition/population support |
| Current forward funding-probability calibration | Not established by hindcast scores alone | Candidate-specific cost and ledger evidence, applicability checks and eventually genuinely prospective outcomes |

Do not call the stitched AY3 panel the “latest representation” panel: it stitches each retrieved annual file's current-year fields. Those files were revised when retrieved. The separate research shards retain multiple representations. Neither policy automatically identifies an economically true price.

## Existing data: useful history is already present

| Material | Verified scope | What it can support |
| --- | --- | --- |
| `data/raw/ipeds/selected.csv.gz` | 109,089 school-year rows; 8,537 UNITIDs; 2000–2023; sector, in-/out-of-state tuition plus fees, housing and flags | Origin-reconstructed revised-data school cohorts and observed outcomes |
| `data/research/ipeds-price-snapshots/manifest.json` and 24 annual shards | 1,900,467 representations, academic years 1998–2023; 13,646 directory IDs; 6,033 IDs with a positive observed value | Matched source-policy/revision sensitivity, not 1.9 million independent economic observations |
| `data/ipeds-institutions.json.gz` / `site/data/ipeds-panel.json` | 1,309 complete paired 2000–2023 institutions: 417 public four-year, 127 public two-year, 765 private nonprofit four-year | Survivor-panel comparison, explicitly not an unbiased origin population |
| `site/data/calibration-foundation.json` | 70 macro years, 1954–2023; five cost series with 24 levels, 2000–2023; 23 correctly paired cost donors | Separate macro and cost retrospective experiments |
| `data/comparable-prices-through-2024.json` | Already-pinned 2024 endpoint prices | Additional endpoint diagnostics; already inspected, not a new untouched holdout; no complete pinned 2024 joint/CPI outcome |
| `site/data/calibration.json` and `data/legacy-tuition-panel.csv` | Longer sector averages and 1990s tuition research | Different-estimand sensitivity only; composition/cohort breaks and absent paired housing prohibit a silent splice |

Positive cells in `selected.csv.gz` are 94,585 in-state tuition, 94,581 out-of-state tuition and 47,681 housing observations; these are not necessarily the same institution-years. Missingness, residency duplicates, reporting changes and survivor selection matter. The strict matched-graph 3/7/12-transition limits arise from its paired-semantic/directory/longest-run rules. They are not the entire available retrospective history.

### Immediate earlier-origin opportunity

The existing school evaluator starts in 2011 and samples six known plus six withheld institutions per five sector/residency categories. It has 42 sampled identities, despite 5,400 model rows, 18,000 synthetic individual plans and 240 households. Schools, policies and residency categories share calendar shocks.

A read-only census reused the unchanged `cohortAt` and `outcomeLevels` rules and merely moved the earliest origin. These are **potential evaluation cases for a new short-training annual-path predictor**, not successful forecasts or supervised long-horizon training labels.

| Earliest origin / training transitions | Wait | Observed / selected cases | Calendar origins | Greedy nonoverlapping origin-to-last-bill windows |
| --- | ---: | ---: | ---: | ---: |
| Current 2011 / ten-plus | 0 | 568 / 600 | 10 | 3 |
| Current 2011 / ten-plus | 4 | 321 / 600 | 6 | 1 |
| Current 2011 / ten-plus | 8 | 96 / 600 | 2 | 1 |
| New 2003 / three | 0 | 1,023 / 1,080 | 18 | 5 |
| New 2003 / three | 4 | 742 / 840 | 14 | 2 |
| New 2003 / three | 8 | 489 / 600 | 10 | 1 |
| New 2005 / five | 0 | 904 / 960 | 16 | 4 |
| New 2005 / five | 4 | 636 / 720 | 12 | 2 |
| New 2005 / five | 8 | 393 / 480 | 8 | 1 |

The current fixed grid includes selected cases whose bills extend beyond 2023, so its denominator remains 600 per wait; the earlier-origin census stops when a full outcome is observable. Compare methods on an explicitly common evaluation grid, retaining future-missing cases separately. The nonoverlap column is a conservative calendar-support diagnostic, not an estimated statistical effective sample size.

Reproduce without fitting anything:

```sh
node scripts/audit-retrospective-support.mjs
```

## What the review challenges

1. **Latent recovery is not universally necessary for prediction.** Separating true economic changes, reporting error and four covariance families is difficult with short source-coherent segments. That does not prevent learning the predictive distribution of observable reported future charges. Changing the target narrows the claim; it does not establish those latent causes or erase source problems.
2. **Some support limits are implementation choices.** `costFit` requires eleven price levels; the hierarchy requires ten transitions. Simpler annual predictors can declare three-/five-year training contracts. The macro ten-year requirement is not binding because macro history already begins in 1954.
3. **The current residual horizon is structurally incomplete.** Knots `[2,5,10]` cannot cover wait eight's final bill at horizon eleven. The retained ten-year endpoint corpus also has only one target year. Preserve that method's unsupported result; use horizon-aligned targets in a new design instead of waiting for a calendar date.
4. **The synthetic acceptance design is not a general proof of usefulness.** With 64 worlds, one nominal 80% binomial coverage check accepting counts 45–57 passes about 95.96% under an ideal independent Bernoulli null. Nine independent such checks all pass only about 69.01%; actual horizons/arms are dependent, so this is an illustration, not a recalculated verdict. Future studies need precision/multiplicity planning and primary versus diagnostic endpoints. Do not relax old gates or reuse their outcomes to rescue the old models.
5. **Exact posterior mathematics is not fixed-parameter calibration.** The equal-covariance comparator remains restrictive, and exponentiating its Student-t log prediction gives no finite first moment. Finite quantiles can still be evaluated against finite observed outcomes; expected-bill and full-distribution scoring require suitable moment conditions. Use finite-moment forecast distributions in the next application-oriented candidate.
6. **More simulations do not create more calendar evidence.** Equal-origin/sector weighting, time blocks and school folds are essential. Sparse wait-eight support cannot become a precise calibration claim by adding related school plans.
7. **Scoring needs one consistent contract.** Current `scripts/calibration/report.mjs` already normalizes interval scores by known origin budgets correctly. A legacy `cost-followup` helper instead divides by the realized outcome, which changes loss weighting. Preserve old reports, label this legacy limitation, and reuse the current proper normalization in every new runner. This is not a claim that current qualification or earlier model rankings automatically reverse.

## Recommended first implementation contract

### Target and data

Create a separate research module and protocol; leave production and all archived studies unchanged. Primary target: nominal tuition/housing charges as reported in the pinned revised AY3 corpus. Reproduce the current assumed-known origin-year budget convention for matched comparison; add a separately labeled one-collection-year-lag/source-coherent sensitivity. Do not mix those information conventions invisibly.

Applicability must match the planning object. Production presets include national-average budgets and a named example; the research runner injects actual UNITIDs. An individual school's entered budget and a sector-average index are different predictive targets. Evaluate C1 as an individual as-reported school trajectory anchored to the supplied budget; keep a separate sector-index comparison. Do not automatically apply cross-school dispersion to a goal intended to track a national average. School identity/input mapping and forward-budget applicability belong in adoption review.

Use annual component targets plus complete four-year bills at waits zero/four as primary outputs. Wait eight is exploratory until its small calendar support is explicit. Include nominal and real diagnostic scores; preserve tuition/housing dependence. Begin with the unchanged established-school origin cohorts and fixed withheld-identity rule, then broaden school folds under a prespecified compute cap. Report a separate minimum-history cohort sensitivity rather than silently replacing the population.

### Strong baselines and one primary candidate

- **B0:** current production process on origins it supports, preserving its eleven-level minimum. It is unavailable earlier, not patched to qualify.
- **B1:** fixed 4%/3% and no-growth references; useful illustrations but insufficient probabilistic competition alone.
- **B2:** origin-estimated sector paired-growth mean plus jointly resampled empirical calendar-year residual vectors. Use the same finite-moment path machinery and current origin-budget scoring as the candidate.
- **C1, primary:** observable paired annual growth with a sector center, damped recent sector trend and strongly shrunk, decaying recent school deviation. This changes conditional mean dynamics and predictive dependence; it is not another unconditional widening layer or permanent school-growth hierarchy.

A concrete initial specification is a three-year recent window and school-deviation shrinkage `n/(n+kappa)`, with the trend/deviation decaying by `phi^h`. Restrict inner choices to `kappa in {5,20}` and `phi in {0,0.5}`; choose within origin-only inner folds. Where mature inner labels do not exist, use a fixed most-regularized default declared before fitting, and count the resulting forecasts. Keep all alternative settings as development comparisons rather than selecting on outer outcomes.

Resample shared calendar-year sector vectors jointly, and paired school residual blocks separately, preserving the same-school identity for siblings and observed reversals. Use a fixed two-year block as primary and one-/three-year blocks as sensitivity where training support permits; declare cold-start fallback rules. Recompute closed-form centers/shrinkage within parameter-uncertainty resamples. Empirical finite-support or finite Gaussian-mixture innovations avoid exponentiated-Student-t infinite means. Do not require a twelve-coordinate optimizer or relabel successful-only bootstrap mixtures.

**C2, secondary sidecar:** regularized direct P10/P50/P90 complete-bill prediction can test the decision target directly, but only where prior completed labels exist. Enforce noncrossing quantiles. It does not supply annual/household paths by itself and is not the first full-application replacement.

### Label maturity, splits and decision rules

For any supervised example, require `trainingOrigin + wait + 3 < outerOrigin` before its completed bill label enters fitting or tuning. With three-year features beginning in 2003, first possible mature-label outer origins are 2007/2011/2015 for waits 0/4/8. The last observable wait-eight outer origin is 2012: **there is no honest same-horizon wait-eight direct-quantile training/evaluation path here.** An annual growth-path model can still train on earlier annual transitions and hindcast those ten long-wait origins under its declared assumptions.

Use expanding outer origins and nested inner temporal selection, with fixed institution holdouts excluded from all fitting. Purge overlapping four-year bill target intervals across tuning/evaluation blocks; for fixed waits that means at least four-year target-window separation, while completed-label availability can be stricter. Do not pool school rows randomly across time. All 2020–2024 periods already inspected in this project are consumed retrospective evidence, not a fresh holdout. New school folds add cross-school tests, not untouched economic decades.

Primary scores: 80% complete-bill interval score and quantile losses normalized by the known origin budget, paired on the same cases and aggregated equally by origin/sector. Report bias, sharpness, tail direction, availability, known/withheld identity and all failed/missing cases. Use calendar-block uncertainty intervals and show nonoverlapping-window sensitivity; do not treat each plan as an independent trial. Coverage is a diagnostic alongside proper scores, not a target to force by widening intervals.

Before fitting, freeze a new research go/no-go rule. A practical proposal is at least 5% primary interval-score improvement over B2 across the declared wait-zero/four aggregate, no material withheld-school/sector regression, and uncertainty intervals shown alongside the effect. If few origins cannot distinguish improvement from zero, call it promising/inconclusive rather than qualified. Specify the exact protection tolerances and primary/secondary family before execution; this review has not run or selected a winner. Production activation still needs separate applicability and ledger validation.

Run source-policy, imputation/missingness, sector-change, residency-duplication and survivor-versus-origin-cohort sensitivities. Related tuition-only facts and 2024 endpoints remain separate audits, not invented housing or original-vintage support. Only after useful cost evidence, replay the same annual paths through cash and capped-household ledgers. For investment-funded tests, explicitly align cost residual calendar blocks with return/CPI donor years or declare and test the changed dependence assumption; a good cost-only model does not validate the whole economic joint process. Separate no-pre-entry-deposit feasibility from forecast skill; the old wait-zero oracle impossibility must not reject a new cost forecast for the wrong reason.

## Ordered work and stop conditions

| Package | Concrete deliverable | Rough active engineering effort |
| --- | --- | --- |
| 1. Freeze target/splits/scoring | New revised-data protocol, mature-label/purge manifest, matched-case census and score-normalization audit | 0.5–1 day |
| 2. Build B2 and C1 | Pure research path forecasters, fixed small inner grid, finite-moment/dependence/identity tests and explicit fallbacks | 2–4 days |
| 3. Retrospective comparison | Earlier rolling origins, held-out schools, primary wait-zero/four scores, source/cohort sensitivities and paired uncertainty | 2–4 days |
| 4. Funding replay, only if useful | Candidate-specific cash/household reliability, Brier scores, deposit-dollar consequences and feasibility separation | 1–3 days |
| 5. Review/delivery decision | Publish gains, failures and unsupported horizons; promotion remains separate | 0.5–1 day |

These are planning estimates, not elapsed-runtime or improvement guarantees. A first defensible comparative result is a days-to-weeks task with existing data, not a year-long wait. Stop if the primary candidate does not beat strong baselines; do not add layers until a favorable result appears. Keep original-release acquisition and prospective observation as parallel evidence tracks, not prerequisites for this narrower study.

## Audit pointers and primary references

Repository: `scripts/validate-current-calibration.mjs:16–57` (origins/splits/support), `scripts/calibration/schools.mjs:28–65` (cohorts/outcomes), `scripts/calibration/report.mjs:8–22` (correct scores), `scripts/calibration/residuals.mjs:4–17` (knots/support), `site/js/calibration.js:78–80` and `site/js/cost-hierarchy.js:16–23` (training minima), `scripts/evaluation_decision.py:57–58` (old protocol gate), and the pinned case/report files.

- [Stark and Croushore, real-time versus latest-available forecasting data](https://www.philadelphiafed.org/the-economy/macroeconomics/forecasting-with-a-real-time-data-set-for-macroeconomists): revised-data performance can differ materially from real-time performance. This motivates honest claim labels, not a prohibition on revised-data research.
- [Hyndman and Athanasopoulos, rolling-origin and multi-step evaluation](https://otexts.com/fpp3/tscv.html): evaluate with temporal training cutoffs and the forecast horizon actually needed.
- [Gneiting and Raftery, proper scoring rules](https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf): assess calibration and sharpness through appropriate predictive scores.
- [Stan User's Guide, prediction and forecasting](https://mc-stan.org/docs/stan-users-guide/prediction-forecasting-and-backcasting.html): predictive uncertainty and future outcomes are distinct from fitted latent parameters.
- [QuantileRegressor official documentation](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.QuantileRegressor.html): pinball-loss regression with regularization; a possible research sidecar, not a proposed application dependency.
- [Chernozhukov, Wuthrich and Zhu, conformal inference with dependent data](https://arxiv.org/abs/1802.06300): dependence-aware constructions require assumptions; generic conformal labels do not supply an automatic guarantee here. Existing residual calibration is already rank-based.

These references support methods and limitations. None guarantees that C1, C2 or any particular candidate will improve this project's forecasts.
