# Current model · college-funding-10.0.0

App v0.11.0. Schema 5 and student funding are preserved. The active bundle is `calibration-foundation.json`. [Model 9 methodology](archive/model9.md) and its reports remain historical records.

## Foundation changes

Equity anchors now mean arithmetic annual gross expectations under the actual conditioned contiguous-block sampler. At each block start, each within-block offset is normalized by its weighted source-year gross mean. A persistent regime multiplier is normalized by its discrete expectation. This preserves source choices, monthly shocks, positive gross returns, shared case/student indices and horizon-stable prefixes. It changes realized equity distributions; it is not a new equity forecast.

Market source year y runs September y through August y+1. Its paired college transition is T(y+1)/T(y), with August CPI endpoints for real prices. Cost donors therefore cover 2000–2022, while macro history remains 1954–2023. Historical data are revised and selected with full-window panel membership; no publication-vintage claim is made. Legacy residual corrections fitted under the former timing are disabled pending comparable refitting. Fixed nominal 4% tuition / 3% housing trends remain provisional baseline assumptions.

The old 5% promotion interpretation was infeasible: even zero eligible-case error could improve the all-case score by only 3.31%. Current gates compare matched eligible cases, require three distinct eligible origins at each 0/4/8-year wait and distinguish missing support from failure. Three completed earlier target years are required for nested selection. No threshold is changed after corrected scoring. No cost candidate is promoted on this repair.

`foundation-validation.json` reports analytic contracts and a 36-cell actual-sampler moment matrix (case, block size, conditioning, parameter uncertainty). Its tolerance is five path-cluster standard errors plus 0.1 percentage point. This checks implementation, not economic coverage. UI historical tables explicitly describe archived model-9 outcomes. Corrected-model whole-plan coverage remains unestablished.

## Unchanged contracts

Ownership, grants, income, monthly bill order, fixed reference, scenario sharing and browser-local persistence follow the [model-9 contracts](archive/model9.md). The savings solver still uses the existing conservative numerical reserve until its separate stage is validated. Students retain their funds; a household cap constrains entered deposits without transferring earmarked savings.

Schema-5 models 4–9 receive a metadata-only upgrade. Financial estimates change with the new model; saved amounts and schedules do not.
