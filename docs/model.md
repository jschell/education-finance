# Financial model and Monte Carlo methodology

Implemented model: `college-funding-1.0.0`; schema 1; PRNG `mulberry32-boxmuller-1`; assumption set `user-defined-1`. Values are hypothetical and user-controlled. No investment preset has been calibrated or endorsed.

## Three separate stages

1. **Grow current savings to university entry.** With no contributions and a constant annual compound return r, entry balance = current balance * (1+r)^(months/12), matching an FV calculation. Contributions default to zero. Staged returns multiply growth factors over their respective periods.
2. **Grow college costs independently.** For each category, future cost = baseline annual amount * payment weight * (1+category growth)^(months since baseline/12). Tuition and living expenses have independent growth assumptions; these are unrelated to the market return. Sum actual future payments, rather than multiplying first-year costs by attendance years.
3. **Fund attendance.** Continue growing remaining funds, receive scheduled funding, pay bills, and record unpaid obligations month by month through the final payment.

## Timing and expense schedules

Use integer UTC-style month indices, independent of daylight-saving transitions. Savings represent the opening balance at the start of the valuation month. Growth is applied each remaining month, including the valuation month. Report entry savings BEFORE the entry month's growth, contributions and bills, so exactly 12 growth periods separate dates 12 months apart. Already-enrolled students have no projected entry balance; only payments on/after valuation remain.

Tuition/mandatory fees: half at the enrollment month, half five months later, each attendance year. Other annual costs: nine equal monthly amounts from enrollment through month eight; inflation is applied at each payment date and payments rounded to cents. For an August start these are August/January and August–April. These are simplified billing conventions, not school-specific schedules. Current UI does not edit payment weights or provide a separate summer schedule: include annual summer allowances in annual budgets, distributed over attendance months, or compare costs separately. Custom transfer/year-specific schedules are M4.

Every month:

1. Grow opening funds at the applicable monthly gross return; optional market stress multiplies funds by 0.75 once immediately before entry, or at valuation if already enrolled.
2. Add month-end contributions and scheduled gifts before bills. Annual contribution increases occur after each 12 months from contributionStart. Dates are inclusive. When enrollment is edited, contribution end dates that still equal the original default (month before entry, clamped to valuation) follow the new entry date; explicitly customized schedules are retained. Review the optional contribution schedule before using the solver.
3. Calculate costs and grants. Grants are nominal annual amounts paid half at each tuition date for grantYears from original entry; cap to that month's total cost, apply tuition first, and discard excess. No grant becomes savings. Renewal is an explicit assumption.
4. Determine coverage: full net cost, remaining tuition/fees, or share of full net cost. Apply direct income support up to that obligation in nine equal monthly allowances; unused income is not saved. This can use less than the annual allowance for a tuition-only goal; no borrowing between months is assumed.
5. Withdraw available savings, floor at zero, and record any unpaid obligation. Later funding never erases earlier misses.

Track total cost, grants, covered obligation, income actually used, deposits, withdrawals, ending funds and unpaid bills. Success means every covered payment is paid when due (per-payment tolerance $0.01), not a positive final balance. Unfunded amounts outside a tuition-only/percentage goal remain outside that success definition. General inflation is used once to discount expenses to valuation-month purchasing power, not added to category growth.

Current-savings-only excludes future contributions, gifts, and income while retaining grants. The middle comparison includes contributions/gifts but excludes income. The all-funding view includes income. Shared allocation is part of opening savings, counted once per student across the plan; alternative scenarios reuse that allocation. Joint household optimization is not implemented.

## Return stages and Monte Carlo

Three independently editable profiles: early saving; final N years before entry; and attendance. Each specifies deterministic annual compound growth plus Monte Carlo annual arithmetic expected simple return m and annual simple-return standard deviation s. Starting illustrative profiles are 5%/5%/10%, 3%/3%/5%, and 2%/2%/2% (compound/MC mean/volatility), with a final three-year stage. These are user-editable illustrations, not recommendations or market estimates. Set stages equal to model a constant return. Stage changes are abrupt; no asset trades/rebalancing/tax model is inferred.

Monthly gross returns are lognormal. Convert one-year arithmetic inputs using sigma2 = ln(1+s^2/(1+m)^2), mu = ln(1+m)-sigma2/2. For each month draw log gross = mu/12 + sqrt(sigma2/12)*Z, Z standard normal. Zero volatility equals monthly compounding (1+m)^(1/12). Do not confuse the arithmetic mean with CAGR. Means are net of fees and assumed tax drag; no additional fees/taxes are deducted.

Random generator: Mulberry32 uint32, seeded per trial by seed XOR imul(trial+1,0x9e3779b9); Box–Muller pairs generate normal draws. Months consume draws in calendar order; zero-volatility periods consume no normal draws. Comparisons share streams for the same student/valuation/date layout. Changes to the number of zero-volatility periods can change later draws; do not claim exact common-shock alignment across such changes. The engine is for independent student alternatives, not family correlation analysis.

Run 1,000 preview, 10,000 default, or 25,000 detailed trials in a cancellable Web Worker. Cost growth stays fixed per scenario, so cost percentiles coincide. Aid, housing and attendance duration are deliberate scenario choices. Compare higher tuition/living growth, more years, and the optional 25% loss as separate stress scenarios. Do not label sensitivity cases statistical best/worst bounds.

Limitations: independent monthly log returns, fixed stage parameters, no fat tails/regime shifts/cross-asset model, fixed tuition/living growth, no aid eligibility/tax/account restrictions, no automatic debt. Probabilities are conditional model frequencies, not confidence that real costs will be funded.

## Percentiles and required contributions

Sorted-sample percentile: linear interpolation at (N-1)*p. Unconditional unpaid percentiles include zero gaps; severity among unsuccessful trials is reported separately. P90 unpaid is adverse, while P90 ending funds is favorable. Pointwise balance bands are not one realizable path. Do not sum percentile values to derive family percentiles.

Sampling standard error of success frequency = sqrt(p*(1-p)/N); at 10,000 independent trials the maximum is 0.5 percentage points. This measures random-sampling noise only, not model validity.

The solver calculates the minimum required base monthly contribution on each path, using positive-growth linear cash-flow sensitivity. At each payment, track fixed funds F and cumulative contribution sensitivity S: F = F*g + gift - obligation after income; S = S*g + dated contribution factor. Required contribution is the largest max(0,-F/S) over months; an unpaid bill with S=0 is infeasible. This avoids repeatedly simulating binary-search candidates. Existing balance/gifts/income are fixed; base monthly contributions follow the entered start/end dates and annual step-up.

Select the order statistic needed for the chosen 80/90/95% sample success, round up to dollars, enforce the user's monthly ceiling, refine on max(20,000, 2*N) trials capped at 50,000, and rerun every path in that larger sample to verify actual funding success. The first N paths are reused; this is a larger-sample check, NOT independent out-of-sample validation. Report infeasible results instead of inventing a contribution. Contribution targets remain assumption-dependent.

## References

- [College Board cost trends](https://research.collegeboard.org/trends/college-pricing): source for future benchmarks, not used to populate current fictional examples.
- [Federal Student Aid offer comparison](https://studentaid.gov/articles/evaluating-financial-aid-offers/): costs, grants and financing.
- [Investor.gov asset allocation](https://www.investor.gov/introduction-investing/getting-started/asset-allocation): horizon/risk context.
- [CFA Institute simulation methods](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/simulation-methods): simulation and distributions.

These sources do not validate the numerical placeholders. Users supply school estimates and portfolio assumptions; future calibrated profiles need distinct sources and dates.
