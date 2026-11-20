# Revised-data walk-forward comparison — frozen protocol

Method `retrospective-walkforward-1.0.0`. Base PR21 head
`a8bf1801ab72d403df065771bf82462c72a8cf78`. Publish before any model fit,
forecast outcome or benchmark score. Earlier reviews and all inspected years,
including 2024, are development context. Preserve every previous protocol,
artifact and rejection. This is a new retrospective predictive estimand, not a
real-time vintage backtest or production qualification.

## Target, fixed data and runtime scope

Predict an individual institution's nominal as-reported tuition/required fees
and on-campus housing, conditional on its entered origin-year price anchor.
Known institutions may use their training histories; an unknown future
institution uses no withheld-school history in fitting or forecast features.
Its ID is only an independent simulation identity. This is not a forecast of a
sector-average index. No model, preset or financial default is activated.

Pin `data/raw/ipeds/selected.csv.gz`, `data/raw/cpi.csv`, the foundation bundle
and all generating sources. Use September origins 2003 through 2020 inclusive,
five existing sector/residency categories, six known and six withheld schools
per origin/category, existing identity hash split and original established
positive-price/stable-sector cohort rule. Cap each model's training pool at the
first 200 training identities. Outcomes/missing cases remain in denominators.
No future completeness condition may select a cohort. Sectors/residencies and
schools share economic years; they are not independent macro histories.

Primary view: revised retrieved annual AY3 prices through the origin, with the
current evaluator's explicitly assumed-known origin-year budget convention.
CPI August endpoints through that training cutoff are likewise assumed known.
Sensitivity: train through origin minus one, holding the supplied origin anchor,
cohort and outcome cases fixed. This is a lagged-training sensitivity, not proof
of actual publication dates or a source-coherent/original-vintage view. No
source acquisition or 2024 outcome enters this run.

Forecast all waits 0/4/8. Attendance-year starts are origin+wait through
origin+wait+3. Forecast horizon zero equals the supplied price anchor. Actual
prices/CPI after cutoff exist only in the outcome scorer. Cases beyond 2023 are
explicit unreached; missing intermediate school prices retain their reason.
Use 512 paths, seed 2026112701 and deterministic role/identity substreams.
This gives at most 1,080 target identities and 3,240 wait-cases per view; two
views remain bounded. Primary comparisons are waits zero/four; wait eight is
exploratory. A small fixture may check arithmetic, but no pilot scores may tune
this protocol. If runtime exceeds 20 minutes, retain completed checkpoints and
report incomplete work; do not reduce trials, samples or origins after scores.

## Fixed B2/C1/no-real-growth models

Let each training annual vector be paired real tuition/housing log growth and
August log CPI growth. At each calendar year compute sector mean c_y; let mu be
its training-year mean. School residuals are paired real growth minus that
year's real sector mean. B2 has real mean mu. C1 adds two fixed, generating-blind
conditional mean terms at future step h=1,2,...:

- Sector term `0.5^h * (mean(last three real sector means) - mu_real)`.
- Known-school term `n/(n+20) * rho^h * last paired school residual`.
  Unknown-school term is exactly zero. Component rho is the contiguous-residual
  AR estimate with denominator `sum(previous^2)+20*residual_variance`, clipped
  to [-0.5,0.5]. The signed term permits conditional reversal; it is not a
  permanent random growth slope. Missing known state uses zero explicitly.

Both methods use identical empirical shared-year vectors, paired school
residual draws and parameter uncertainty, with matched RNG streams. Shared
calendar-year vectors are resampled in circular blocks of length two within
contiguous segments; wrap is a declared bootstrap assumption. School residuals
use paired two-year blocks and separate persistent simulation identities.
Year-mean parameter uncertainty uses an IID resample of n_year full three-vectors
minus mu, shared within a trial. This avoids the degenerate three-year/block-three
mean bootstrap at the shortest origins. All stochastic laws have finite empirical
support; no exponentiated Student-t mean, jitter or success-only resampling.
Nonfinite output fails closed with its full denominator retained.

Hyperparameters are FIXED above before outcomes. This bounded first comparison
uses no inner hyperparameter grid or multi-year bill labels for fitting/tuning;
it is an explicit simplification of the review's proposed nested-selection
program. Later tuning would require only earlier completed labels
`trainingOrigin + wait + 3 < outerOrigin` and separate frozen folds. No such
supervised tuning is silently performed here.

No-real-growth has zero real component growth and uses the same simulated CPI
path. Also report deterministic nominal 4%/3% as a reference. Both are weaker
references, not the only competition. Reproduce the current production B0
process at supported primary-view origins, with its original minimum history
and origin-limited reconstruction unchanged. B0 is unavailable earlier; never
substitute a forecast to make it qualify. Rank B0 comparisons only on common
cases. If B0 adapter cannot be independently verified, record it unsupported
and finish the primary B2/C1 comparison rather than fabricate values.

## Isolation and independent verification

Build a cutoff-only payload containing admitted training rows, cutoff CPI,
allowed identity keys and supplied anchors. Canonically sort before fitting;
withheld IDs are excluded from every training mean/donor/residual pool.
Models receive no outcome table, future directories or full-series statistics.
Record cutoff input hashes, fitted identities/years and model fingerprints.

Independent future-poisoning checks must replace/append post-cutoff prices,
CPI and metadata, then prove identical cohort/input/fit/forecast bytes with the
same seed. For lagged training, poison after its own earlier training cutoff
while preserving the explicitly supplied origin anchor. Add tests of unit/same
school dependence, unknown history exclusion, signed reversal, paired draws,
anchor identity, hand-checkable bills, proper origin normalization and incomplete
or unmatched denominators. Publish the source/code review and meaningful tests.

## Scores, inference and decision

For each complete observed case score sum of tuition/housing over the four
attendance years. Use equal-tail 80% coverage, signed median bias, lower/upper
misses, width and interval score normalized by `4*(origin tuition+housing)`.
Quantile/interval values come from the fixed 512 draws. Keep unavailable cases
explicit; available-case scores state their exact denominators.

Average schools within origin/sector/type/wait, then sectors/types equally,
then origins, then the two primary waits equally. Match B2 and C1 on the same
cases. Report paired differences and descriptive 95% calendar-block intervals
(block length four, 1,000 resamples, seed 2026112702), plus the actual number of
origins/nonoverlapping windows. Do not bootstrap individual plan rows as if
independent. Report all sector/type/wait strata and lag sensitivity.

A descriptive C1 research win requires >=5% primary interval-score improvement
over B2, no primary sector/type/wait score regression above 10%, aggregate
coverage no farther from .8, and no lower availability. If the paired block
interval includes zero, report promising/inconclusive rather than a separated
improvement. If these criteria fail, reject this first C1 comparison and stop;
no new layer, seed, hyperparameter or threshold is tried to obtain a win.
Report B2 versus B0 and all references separately on their common support.
Historical vintage qualification, forward funding calibration and production
activation remain unestablished regardless of this result.

## Deliverables and bounded follow-up

Commit pure research models, isolated data/runner, independent guards, compact
case records/source identities, reproducible summary/results and a fast CI
workflow. Run actual fixed forecasts and relevant checks, including npm run
check. This first stage evaluates complete nominal bills; investment-path and
candidate-specific individual/household funding replay are a subsequent bounded
stage only if cost evidence is useful. The cost experiment must not claim those
financial outcomes were evaluated. No merge, deployment or model activation.

### Reproduction precision declared before the first scored run

Use Python 3.12.14, NumPy 2.3.5, Node 24, one BLAS thread, Haswell BLAS and
AVX512 NumPy dispatch disabled as in earlier accepted numerical workflows.
Independent full reproduction compares numeric leaves with absolute tolerance
1e-8 plus relative tolerance 1e-10. Source/input identities, status/support
counts, missingness and decision outcomes must match exactly. This tolerance
handles floating arithmetic only; it never changes a scientific criterion.
Within-process future-poisoning tests require exact payload and forecast bytes.

### Current-process reference footprint clarification before aggregate outcomes

The 200-identity training cap applies to the new B2/C1 models. B0 deliberately
reproduces the existing process: its sector index uses all eligible nonwithheld
origin-cohort institutions, as `originBundle` already does. This data-footprint
difference is reported; B0 comparisons are common-case, not identical-training-
set comparisons. Its original eleven-price-level minimum permits origin 2010
and later. This clarification resolves the earlier general cap wording without
altering either reference implementation or the primary B2/C1 comparison.
