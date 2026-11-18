# Revision-cost process: mechanism acceptance, not a historical fit

2026-11-18 America/Los_Angeles. Branch `revision-aware-cost-protocol`, based on merged panel main `ef3767066467f8d779e106e638d31c96827c0efa`. The [statistical/evaluation protocol](revision-aware-cost-candidate-protocol.md) was committed at `00488a64ab122d1d55d392f5c643efb6c9fa0ff4` before implementation. Research method `revision-cost-process-1.0.0`; app 0.15/model12/schema5 and production assumptions remain unchanged.

## Delivered and verified

[Pure supplied-innovation process](../scripts/calibration/revision-cost-process.mjs), [seven synthetic tests](../tests/revision-cost-process.test.js) and a [source-hashed mechanism artifact](../data/calibration-diagnostics/revision-cost-process.json). The harness exercises the actual panel transition/revision views with synthetic representations. It does not read historical school amounts or produce a fitted forecast.

- Shared sector shocks affect both synthetic institutions; exact school keys isolate permanent and temporary shocks. Paired tuition/housing movements are retained.
- A permanent jump stays at a new level while subsequent growth returns to the supplied drift. A temporary jump decays by the frozen factor 0.5. Neither becomes a persistent school-growth slope.
- Reporting errors alter source representations and reverse while latent prices stay unchanged. Source-coherent and stitched transitions differ as required by their actual keys; duplicate observations fail.
- The training-input guard rejects reserved UNITIDs even if accidentally placed in the caller's training set. It also rejects future collections, changed source identities, ambiguous academic-year definitions, nonpositive prices and duplicate training keys. Additional revisions do not create additional academic years. This guard expects verified extracted inputs; it is not the complete historical observation-graph adapter.
- An exact enumeration of 2,048 independent sign combinations through the process reproduces the restricted stitched-growth covariance formulas. This is an arithmetic check without Monte Carlo tolerance or fitting to observed prices.

The supplied ideal variances q=0.04, v=0.09, r=0.01 produce growth autocovariances (0.15, -0.0325, -0.01125). Algebraic inversion returns those parameters under the stated stationary, independent-error assumptions. These deliberately synthetic variances are test inputs, not financial defaults or empirical estimates.

## Identification failures retained

Two distinct variance triples (q,v,r)=(0.04,0.08,0.02) and (0.06,0.04,0.03) have the same lag-0 and lag-1 growth moments. A short history cannot uniquely separate all three components using those moments alone. Their lag-2 moments differ under the restricted known process, but real source graphs, finite samples and correlated measurement errors require separate identification analysis.

A genuine permanent paired log-price jump (0.3,0.2) and an unchanged latent price with a systematic reporting bias (0.3,0.2) produce exactly the same observed representation paths. More copies of those biased representations do not resolve the ambiguity. No test passing here establishes that revised values are true economic costs.

## Validation

`npm run check`: **203 Node tests pass** (196 preceding tests plus seven new tests). Six Python price-extraction tests pass. `node scripts/validate-revision-cost-process.mjs --verify` checks byte-identical regeneration. CI adds this offline verification to all existing report, source, prospective and browser checks. No UI behavior changed.

The panel's merged main passed [full checks 44330515641](https://github.com/jschell/education-finance/actions/runs/44330515641), [Pages 44330517327](https://github.com/jschell/education-finance/actions/runs/44330517327), and [live acceptance 44330722200](https://github.com/jschell/education-finance/actions/runs/44330722200) at `ef3767066467f8d779e106e638d31c96827c0efa`. These are panel delivery checks, not acceptance of the subsequent process harness or evidence of economic calibration.

## What remains

No historical fitter, optimizer, observation-graph adapter or production integration is implemented in this stage. There are no new historical cost/funding scores. Strict original-publication-vintage support remains zero; the collection-year proxy must retain its limitation label.

Next implement the pinned matched observation graph and bounded estimator under the frozen protocol, then test finite-sample parameter recovery and misspecified/correlated reporting errors before fitting historical school data. Retain unavailable decompositions and boundary/nonconvergent fits. Only after these pass should the predeclared four-cell economic/input comparison run, followed by candidate-specific complete funding evidence. No automatic production activation follows.
