# Revision-aware cost candidate: frozen structural and evaluation protocol

2026-11-18 America/Los_Angeles. Base main `ef3767066467f8d779e106e638d31c96827c0efa` after PR #11; accepted panel head `a9c80d97579f94cf28afac6d31f7fe7e87e0d6aa`, [CI 44242599332](https://github.com/jschell/education-finance/actions/runs/44242599332) passed. Commit this protocol before implementing its structural tests. Research method `revision-cost-process-1.0.0`; no production change, historical fit or candidate score in this stage.

## One candidate and its assumptions

For each sector, model paired real log tuition/housing levels. Let shared sector level M(t)=M(t-1)+beta+G(t), permanent school level L(i,t)=L(i,t-1)+U(i,t), and temporary deviation D(i,t)=0.5 D(i,t-1)+V(i,t). Latent level X(i,t)=M(t)+L(i,t)+D(i,t). A source representation Y(i,t,c)=X(i,t)+E(i,t,c) has its own collection/academic-year/identity key. G, U, V and E are centered paired innovations, independent between these four families and across distinct family keys; each family's 2x2 covariance retains tuition/housing dependence. G is shared across institutions and students in the same sector/year. U and V are shared for an exact school/year key. E is shared only for an exact source-observation key. Cross-sector economic dependence must retain the existing matched macro donor-year coupling in any later production adapter, not draw independent sector worlds.

The fixed 0.5 decay is a prespecified structural restriction, not an empirical estimate or a production default. There is no permanent school-specific growth slope. Permanent level innovations can accommodate a genuine lasting jump without extrapolating that jump as annual growth. A realized innovation can be large, but this Gaussian working model does not classify its economic cause or promise adequate tail coverage. No residual correction, old hierarchy, spread layer or probability remapping may be stacked on it.

The independent, equal-variance source-error assumption is restrictive. Real revisions may share biases, reporting policies or correlated errors. Neither later values nor a majority of representations is declared true. A source-coherent transition uses both observations from the same collection; it is not a pair from a fabricated latest-value price path. Its covariance must be derived from its actual observation keys. Duplicated representations never add independent latent annual shocks.

## Fitting contract for the later implementation

Use a joint Gaussian state-space working likelihood on the retained observation graph, not revisions as independent economic growth observations. Conditional origin budgets are anchors; no withheld school history enters estimation, common means, donors, variance estimates or optimizer starts. Fit beta and four positive-semidefinite paired innovation covariances on training records only. D starts stationary, covariance Qv/(1-0.5^2); M and school L initial offsets are nuisance levels, profiled/diffuse rather than interpreted as trend. Fix source-error mean at zero; unidentified nonzero systematic reporting bias remains a sensitivity limitation.

For a bounded deterministic implementation, optimize the same training likelihood from fixed starts with standard deviations 0, 0.02 and 0.10 real log units, beta 0 and 0.03, and paired correlations 0; constrain beta to [-0.10,0.20], innovation standard deviations to [0,0.50], correlations to [-0.95,0.95]. Boundary fits must be reported. All starts use training data only; select the lowest finite training negative log likelihood, deterministic lexical ties. Stop when both relative objective improvement and maximum parameter step are below 1e-8, or 2,000 iterations; no convergence means unavailable, never a substituted winning fit. Record objective, starts, iterations, constraints, effective years and parameter covariance profile diagnostics. Numerical method and observation-graph adapter must be committed and tested before any historical fit; changes to this statistical contract require a dated amendment before scores.

Do not infer identifiability from optimizer convergence. Compare the analytic covariance design and numerical likelihood profile; a scaled design condition number above 1e8, fewer than three distinct supported transitions, flat variance tradeoffs, or missing required representation support marks decomposition unsupported. Do not silently clamp an unidentified component and call it estimated. A conditional simulation with supplied parameters can still be tested even when historical fitting is unavailable. This stage implements that conditional process and its moment/identification checks, not an estimator.

## Input policies and availability

Pin `data/research/ipeds-price-snapshots/manifest.json` by its canonical hash and every shard hash. Strict availability remains zero unless independently reviewed original price AND directory vintages support an origin. Every retrospective comparison must say **collection-year proxy, not an actual vintage backtest**. Permit only collections strictly before the September origin year; publication dates must not be inferred from collection labels.

Use the original evaluator's deterministic UNITID split (`identityHash % 5 === 0` withheld), origin years 2011–2020, five sectors, six test schools/type and at most 200 training identities/sector. Select identities using eligible records from sources before origin only, stable directory population, paired positive amounts and dictionary-matched definitions; never use future complete histories to admit schools. Log excluded/missing/definition/population statuses. The same matched schools, academic years and forecast origins enter both input policies. Donors, moments and common means exclude withheld identities, including any pre-origin endpoints. Origin's entered bill budget is supplied to both models and is not a training observation or evidence of publication availability.

Declare policies before results: original-current-year stitched representations versus source-coherent consecutive transitions from the next collection, each permitted by the same origin cutoff. Preserve the observation graph for each policy; no independently chosen latest endpoints. Intersect eligible transition support before comparing fits; retain all unmatched support counts. Repeated school/year/source keys are errors. Do not weight records as extra macroeconomic years. The synthetic input guard checks cutoff, training identity and key uniqueness; the full historical adapter remains to implement under this contract.

## Known-process acceptance before fitting

Implement a pure, supplied-innovation process and exact expected growth moments. Tests must exercise the actual process, panel view and input guard, not just classify fixture labels.

| Fixture | Required behavior |
| --- | --- |
| No shocks | Drift only; exact zero-shock reproducibility and positive exponentiated prices |
| Shared shock | Two schools receive the same shared change; an individual shock affects only its school |
| Permanent jump | Level remains shifted; subsequent annual growth returns to the supplied drift |
| Temporary deviation | Successive deviations decay by 0.5 without an invented permanent slope |
| Reporting reversal | Latent prices stay unchanged; representations change and reverse; original/same-source transitions differ as prescribed by their keys |
| Future or withheld data | Rejected from training, including donor/common pools; extending future inputs cannot alter an earlier selected training set |
| Exact replay | Supplied shocks reproduce; matching school/source keys share innovations; conflicting duplicates are rejected |
| Distinct covariance components | Closed-form growth autocovariances match exact sign-enumeration of independent stationary temporary/permanent/measurement innovations |
| Identification failure | With lag-0/1 moments alone, two different variance decompositions can be observationally equivalent; a common reporting bias can exactly mimic a genuine level shift |
| Revision replication | Repeated records do not increase independent economic years; absent/changed definitions stay unavailable |

For scalar component variance q=Var(U), v=Var(D) and r=Var(E), after subtracting the shared sector process, current-year stitched growth has gamma0=q+2v(1-phi)+2r, gamma1=-v(1-phi)^2-r and gamma2=-v(1-phi)^2 phi with phi=0.5. These expressions require independent original-current-year measurement errors. They are **not** a covariance formula for arbitrary source-coherent graphs. Lag-2 and independent replicated measurements can help identify this restricted model in an ideal known process; neither exists merely because an optimizer returned values. Test assumptions and failures explicitly. Supplied-parameter tests establish mechanism and arithmetic, not empirical parameter recovery or economic calibration.

## Later matched evaluation, frozen now

Four cells separate input policy from economics: foundation/stitched, foundation/coherent, candidate/stitched, candidate/coherent. Keep zero nominal growth and fixed 4% tuition/3% housing deterministic ledger baselines. Use 400 matched paths, seed 850213, September origins 2011–2020, waits 0/4/8 and four attendance years. Use the identical macro paths and paired school draws within each eligible comparison. Outcome representations are separately reported as original-current-year and source-coherent sensitivity; neither is truth-selected by the resulting score. Only complete matched bill outcomes are scored; no component-only success substitution.

Retain the original [forecast-calibration protocol](forecast-calibration-plan.md) score normalization and support: 80% interval score/width divided by the known four-year origin budget, coverage, signed bias, miss direction and PIT. Average schools, then sectors, then origins equally; show known/withheld types separately. Report distinct economic years and nonoverlapping outcome windows, including overlap between housing residency sectors. Previously inspected reserved periods remain retrospective evidence.

Research qualification remains horizon/type specific: at least three distinct completed origins, 5% interval-score improvement versus the matched foundation under the same input policy, coverage no farther from 80%, absolute signed bias at most foundation +0.02, and no sector score degradation above 10%. Missing decomposition/fit/support is insufficient evidence, not a passing comparison. No input policy is selected by held-out scores. Keep all four cells, failures and unsupported horizons; no pooled aggregate may conceal a sector/type failure.

Any qualifying candidate additionally needs its own complete individual and capped-household ledger evidence under the existing synthetic funding schedules, Brier references and reliability bins. Cost qualification alone cannot activate it. Wait-8 household and wait-18 complete-bill outcomes remain unsupported. Preserve the active foundation, production probabilities, historical reports and prospective snapshots. A separate reviewed decision is required for production activation.

## Deliverables and next action

This stage: committed protocol, pure structural harness, synthetic tests, reproducible mechanism/limitations report, updated continuity and passing `npm run check`. No economic fitting/scoring and no new UI. Next stage: implement the version-pinned matched observation-graph adapter and bounded estimator with parameter-recovery and misspecification experiments before running the frozen historical comparison. If identification fails, publish that result rather than adding another correction layer.
