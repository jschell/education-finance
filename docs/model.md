# Financial model and Monte Carlo specification

Status: proposed implementation contract, not a validated financial engine. Initial model identifier: `college-funding-v0-proposal`.

## Deterministic reference

Use UTC month indices, not browser locale arithmetic. All balances have an as-of month. Project a common starting month through the final scheduled payment. Student age is descriptive only. Dates before the assessment require an explicitly remaining-cost schedule; never regenerate paid bills.

For cost category k with baseline amount C and annual nominal growth g, expense due n months after its baseline is C * (1 + g)^(n/12). A different attendance-year baseline overrides this formula where a transfer or living-arrangement change applies. Tuition/fees default to 50% in August and 50% in January; housing/food and other recurring expenses default to nine equal monthly payments August–April. These are provisional, editable payment conventions, not claims about school billing. Baseline budgets must state nine versus twelve months; summer costs are added explicitly.

Monthly event order:

1. Apply account investment growth to opening balances.
2. Add scheduled contributions and gifts (end-of-month convention).
3. Determine scheduled costs, grants, and directly available income support.
4. Calculate the selected coverage goal; allocate grants to eligible categories before calculating the remaining covered obligation. No grant creates a negative cost or savings deposit.
5. Withdraw from eligible accounts using a recorded priority. Initial prototype uses one earmarked unrestricted modeling balance per student; account restrictions are a later explicit feature before multi-account release.
6. Record unmet obligations immediately, cap balances at zero, and retain future unpaid history. Later deposits do not erase earlier failures.

Income support is used only for due expenses unless an explicit contribution schedule deposits it into savings. Never count the same income twice. Track total attendance cost, covered obligation, student responsibility outside the selected goal, and unpaid covered obligation separately.

Success means every covered obligation was paid when due (tolerance $0.01). Ending surplus alone is not success. Sum unpaid expenses in nominal dollars and also discount each unpaid payment to the valuation month for a comparable present-dollar total. Today's-dollar conversion uses general inflation once; category inflation is not added to general inflation.

## Monte Carlo version 1

Run the same cash-flow engine repeatedly. Start with 10,000 trials; allow lower preview counts and a recorded integer seed. Use a documented seeded PRNG, separate streams keyed by trial/month/risk factor, and stable factor identities. Scenario comparisons reuse underlying shocks; different paths may use different allocations. Save seed, trial count, input snapshot, assumption-set version, PRNG version, and engine version.

Proposed initial distribution: normal monthly log returns, producing lognormal gross returns. Require annual arithmetic expected simple return m > -1 and annual simple-return standard deviation s >= 0. Convert via sigma2 = ln(1 + s^2/(1+m)^2); mu = ln(1+m) - sigma2/2. Monthly log return = mu/12 + sqrt(sigma2/12)*Z. Thus the input mean and volatility describe a one-year simple return under this model; they are not a CAGR. Zero volatility reduces to monthly compounding of (1+m)^(1/12). Net fees/tax drag must be defined explicitly and not deducted twice.

This initial distribution assumes independent increments and misses some extreme events and changing correlations. Do not present its downside as exhaustive. Add separately labeled pre-enrollment market-loss and persistent-high-inflation stress cases. Historical block bootstrap is a later alternative requiring licensed/sourced data and a recorded historical window.

Initial cost mode is fixed category growth, so its cost percentiles coincide. Optional stochastic costs: draw annual log gross growth for a shared education factor and a shared living-cost factor, calibrating annual means/standard deviations with the same transformation; allow negative annual growth but positive costs. Apply cumulative annual factors with fractional-year interpolation. Category-specific premiums and correlation need recorded assumptions. Do not randomly select a growth rate once and call that annual variability. Keep stochastic cost controls disabled until calibration and correlations are implemented and tested.

Across students/accounts in joint mode, generate common calendar-month asset-factor shocks and common annual cost factors, then apply allocations. Never independently simulate the same market for siblings. Version 1 standalone mode uses a single portfolio profile; family mode and multiple asset classes require covariance-aware shocks and valid positive-semidefinite correlation matrices.

Aid, attendance duration, transfer choice, and living arrangement remain explicit scenario choices. Do not invent probability distributions for these. Return glide paths must be explicit, dated schedules and are deferred from the first fixed-profile engine.

## Summary statistics and solver

Define percentiles using sorted samples and linear interpolation at index (N-1)*p. Include zero shortfalls in unconditional gap percentiles, and report unsuccessful-trial severity separately. Pointwise balance bands do not represent one realizable trajectory. Do not add student percentiles to derive family percentiles.

Success frequency = successful trials / N. Show rounded percentages and trial count. At 10,000 independent trials, worst-case binomial standard error is about 0.5 percentage points; that measures simulation sampling noise, not model accuracy. Report sensitivity to assumptions alongside probability.

For monthly contribution required at a selected success threshold, bracket and binary-search contributions over a declared contribution date window using fixed common random draws. Return an explicitly infeasible result when the ceiling fails; round up to dollars and recheck. Near-threshold estimates need a higher-trial verification. Do not reuse the deterministic 5% compound assumption as a Monte Carlo arithmetic mean without conversion or relabeling.

## Sources for later calibration

- [College Board cost trends](https://research.collegeboard.org/trends/college-pricing): broad cost benchmarks, not individual net-price predictions.
- [Federal Student Aid offer comparison](https://studentaid.gov/articles/evaluating-financial-aid-offers/): costs, grants, and financing distinctions.
- [Investor.gov asset allocation](https://www.investor.gov/introduction-investing/getting-started/asset-allocation): horizon and risk.
- [CFA Institute simulation methods](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/simulation-methods): distribution and simulation concepts.

These sources do not validate provisional numerical defaults. Source cost baselines and portfolio calibration separately before presenting a recommended preset.
