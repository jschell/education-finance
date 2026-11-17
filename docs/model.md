# Current model · college-funding-12.0.0

App v0.13.0. Schema 5 and student funding are preserved. The active bundle is `calibration-foundation.json`. [Model 9 methodology](archive/model9.md) and its reports remain historical records.

## Foundation changes

Equity anchors now mean arithmetic annual gross expectations under the actual conditioned contiguous-block sampler. At each block start, each within-block offset is normalized by its weighted source-year gross mean. A persistent regime multiplier is normalized by its discrete expectation. This preserves source choices, monthly shocks, positive gross returns, shared case/student indices and horizon-stable prefixes. It changes realized equity distributions; it is not a new equity forecast.

Market source year y runs September y through August y+1. Its paired college transition is T(y+1)/T(y), with August CPI endpoints for real prices. Cost donors therefore cover 2000–2022, while macro history remains 1954–2023. Historical data are revised and selected with full-window panel membership; no publication-vintage claim is made. Legacy residual corrections fitted under the former timing are disabled pending comparable refitting. Fixed nominal 4% tuition / 3% housing trends remain provisional baseline assumptions.

The old 5% promotion interpretation was infeasible: even zero eligible-case error could improve the all-case score by only 3.31%. Current gates compare matched eligible cases, require three distinct eligible origins at each 0/4/8-year wait and distinguish missing support from failure. Three completed earlier target years are required for nested selection. No threshold is changed after corrected scoring. No cost candidate is promoted on this repair.

`foundation-validation.json` reports analytic contracts and a 36-cell actual-sampler moment matrix (case, block size, conditioning, parameter uncertainty). Its tolerance is five path-cluster standard errors plus 0.1 percentage point. This checks implementation, not economic coverage. UI historical tables explicitly describe archived model-9 outcomes. Corrected-model whole-plan coverage remains unestablished.

## Unchanged contracts

Ownership, grants, income, monthly bill order, fixed reference, scenario sharing and browser-local persistence follow the [model-9 contracts](archive/model9.md). The savings solver uses the independently checked target-specific numerical reserve below. Students retain their funds; a household cap constrains entered deposits without transferring earmarked savings.

Schema-5 models 4–11 receive a metadata-only upgrade. Financial estimates change with the new model; saved amounts and schedules do not.

## Practical planning outputs

A capacity screen scales all entered cost categories proportionally at their baseline date, preserving bill schedules, current deposits, fixed grants and income allowances. A monotone ledger search finds each path’s maximum affordable scale; P10/50/90 are marginal capacity ranges. They are not independently verified probability targets. Complete representative paths identify the first unpaid covered bill, amount, and savings payment.

Household proposals keep entered base-deposit proportions (equal shares if all are zero), dates and step-ups. Each shared path requires every student’s earmarked bills to be paid. The joint requirement is the maximum of individual requirements divided by their fixed shares. A zero share with unmet need is infeasible. A target-specific tolerance rank selects the total base deposit. Each student’s base amount is rounded up to cents; the rounded schedule is checked against the cap and independently verified without refitting. The dated proposal reports peak deposits and first household-cap conflict. The gauge still assesses current capped deposits; proposals do not change saved amounts. This is a specified allocation policy, not an optimal funding transfer or reallocation search.

The target-specific numerical reserve replaces DKW: find the minimum verification pass count whose one-sided 95% Wilson lower bound meets the requested target. Solve the binomial upper-tail equation for 97.5% verification power. Select the fitting order statistic whose population CDF exceeds that probability with 97.5% fitting confidence. Fit and verification failure budgets are each 2.5%, conditional on independent identically generated draws and model assumptions. Ties and upward dollar rounding are conservative; infinity remains infeasible. An unavailable rank is not silently certified. Independent SciPy references cover 50/80/90/95/99% targets at 20k/50k fit paths. This controls Monte Carlo noise, not economic calibration.

## Coherent cost candidate and older tuition audit

The [frozen candidate protocol](hierarchical-cost-protocol.md) defines real sector growth, a paired annual common shock, a persistent school effect, paired school-year innovations and sector-mean uncertainty. Fitting stops at each origin. Known exact school keys share latent effects; unknown identities require explicit persistent keys. The candidate hook cannot stack the preceding residual/spread layers. User budgets remain level anchors. It is **inactive**: corrected-foundation interval score 0.240 versus candidate 0.783 in the equal-wait retrospective comparison, with insufficient eligible 4/8-year support. Aggregate improvement is not claimed. School-specific future coverage is unestablished, and testing a sector index is not a school-distribution calibration test.

Official 1990–1999 archives/dictionaries yield 12,814 positive tuition records matched to 1,309 existing joint-complete school identities. `legacy-ipeds-audit.json` retains URLs, raw ZIP hashes, field excerpts, flags, missingness and boundary comparisons. Earlier full-time undergraduate published charges and later first-time first-year attendance prices differ for many same-year records. The tuition bridge is separately identified research data. Comparable housing, historical sector/status continuity and original publication vintages are not manufactured. The bridge does not extend production or whole-plan validation.

Matched-path stress checks now show housing/food +20%, removal of remaining general/school grants, and one 25% portfolio loss before entry. They preserve economic shocks and dates; existing crash stress is not applied twice. Stress alternatives have no assigned probabilities. The model version also records these diagnostic changes; main financial defaults remain the corrected foundation plus the target-specific savings solver.
