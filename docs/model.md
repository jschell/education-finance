# Financial model and Monte Carlo methodology

Implemented model: `college-funding-2.0.0`; schema 2; primary PRNG `mulberry32-calendar-block-1`; dataset `us-joint-monthly-1978-2024-v1`, retrieved 2026-11-15. One Calculate action runs the complete historical assessment. Allocation presets are illustrative, not calibrated recommendations.

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

## Historical simulation and three investment stages

The default model samples observed nominal monthly stock, bond, cash, general-inflation, and college-tuition-inflation observations together. The common complete period is January 1978–December 2024 (564 months); the alternative period is January 2000–December 2024. Sources, exact transformations, upstream commits, raw-file hashes and derived checksum are in [the manifest](../data/manifest.json) and [data notice](../data/NOTICE.md). No runtime third-party data request is needed.

Stocks are Fama/French market excess return plus RF; cash is RF. The legacy FIZ factor snapshot ends in 2024. Bonds are reconstructed nominal US 10-year sovereign total returns from ReturnDataFiles: a proxy based on monthly-averaged yields that can smooth volatility, not actual fund returns. General CPI is a proxy for housing, books, transport and other expenses; tuition uses BLS CPI-U college tuition and fees CUUR0000SEEB01. National indexes do not represent a particular school, residency, aid offer, or housing market.

Default allocation weights (stocks / bonds / cash) are 60/30/10 in early saving, 30/40/30 in the final three saving years, and 10/30/60 during attendance. Alternative illustrative profiles and exact weights appear in [assumptions](assumptions.md) and in the result. Stage changes are abrupt. Monthly portfolio return is the weighted sum of observed asset returns, assuming monthly rebalancing; annual fee f multiplies monthly gross return by (1-f)^(1/12). Default fee is zero and must be changed to represent actual costs. No tax drag, trading costs or account rules are modeled.

The primary simulation is a calendar-aligned joint block bootstrap: default blocks are 36 consecutive months, optionally 12 or 60. Eligible blocks start in the same calendar month as valuation and must fit completely in the chosen history. Sample blocks uniformly with replacement, concatenate, and truncate the final block at the horizon. No history wraps or interpolation. Each row carries all five market/cost observations together, preserving observed relationships and sequences inside blocks; relationships across boundaries are broken. Blocks shorter than the horizon can repeat and do not preserve every long-run regime.

Mulberry32 is seeded per trial by seed XOR imul(trial+1,0x9e3779b9). This generator selects block starts; no Gaussian values or synthetic return limits are injected. The same seed, model, dataset and inputs reproduce results. Alternative scenarios use common sampled sequences with matching calendar layouts. Student assessments are independent; no joint family probability is inferred.

Historical cost mode first translates any past-dated budget to valuation using the fixed reference category growth rate, then compounds sampled tuition CPI for tuition and general CPI for the other categories from valuation onward. There is no sampled inflation before the initial quoted bill. Observations in month i determine that month's investment return and the price change reaching the next month's costs. Grants, coverage, direct income, and withdrawals are recalculated on each repriced path; nominal grants and income are not automatically indexed. General CPI discounts each path once to valuation purchasing power. Fixed expense mode instead retains the entered category growth rates and discount rate; only historical investment returns vary.

The fixed-rate reference uses geometric annual returns derived from the chosen historical monthly portfolios, net of the entered fee, and geometric index growth rates. It is displayed separately in a collapsed reference panel, not presented as the median path. Manual reference rates remain available and existing stored rates are preserved. In manual reference mode these rates affect the reference, historical baseline translation, or fixed expense mode; they do not replace observed investment returns in the bootstrap.

Each calculation also includes every complete matching-calendar historical window that fits the horizon, with no resampling, plus a 1,000-path comparison using the alternative historical period. These use the same cash-flow conventions and portfolio stages. Overlapping actual windows are descriptive comparisons, not independent estimates of future probability. A horizon too long for any actual window is reported as unavailable rather than wrapped. The secondary comparison has more sampling noise than the default 10,000-path main run.

A cancellable Web Worker runs 1,000, 10,000 (default), or 25,000 primary paths. Results include entry savings, tuition, total costs, funding gaps, ending savings, and pointwise balance bands. Each gap comes from paired costs and available funds on that path; subtracting unrelated percentile values would be incorrect. Optional 25% market-loss stress remains an explicit scenario overlay.

Historical sampling includes actual loss and high-inflation episodes but cannot invent events absent from the data. It is not a forward-looking forecast calibrated to current valuations, yields, expected returns, or future education policy. National index changes, bond proxy limitations, allocation choices, block lengths, sampled period, aid assumptions and annual budgets all affect results. More trials reduce sampling noise, not these limitations. Legacy parametric simulation functions remain internally regression-tested for compatibility; they are not a second user-facing calculation path.

## Percentiles and required contributions

Sorted-sample percentile: linear interpolation at (N-1)*p. Unconditional unpaid percentiles include zero gaps; severity among unsuccessful trials is reported separately. P90 unpaid is adverse, while P90 ending funds is favorable. Pointwise balance bands are not one realizable path. Do not sum percentile values to derive family percentiles.

Sampling standard error of success frequency = sqrt(p*(1-p)/N); at 10,000 independent trials the maximum is 0.5 percentage points. This measures random-sampling noise only, not model validity.

The solver calculates the minimum required base monthly contribution on each path, using positive-growth linear cash-flow sensitivity. At each payment, track fixed funds F and cumulative contribution sensitivity S: F = F*g + gift - obligation after income; S = S*g + dated contribution factor. Required contribution is the largest max(0,-F/S) over months; an unpaid bill with S=0 is infeasible. This avoids repeatedly simulating binary-search candidates. Existing balance/gifts/income are fixed; base monthly contributions follow the entered start/end dates and annual step-up.

Select the order statistic needed for the chosen 80/90/95% sample success, round up to dollars, enforce the user's monthly ceiling, refine on max(20,000, 2*N) trials capped at 50,000, then independently check actual capped-balance ledgers on 1,000 paths with a different seed. The calibration sample reuses the first N paths. Report both calibration and independent-check frequencies; a check below the selected threshold is explicitly labeled and is not adjusted away. Report infeasible results instead of inventing a contribution. Contribution targets remain assumption-dependent.

## Reproducibility and migration

Assessment JSON includes the input snapshot, seed/trial settings, model and generator versions, dataset ID/hash, resolved reference assumptions and results. Outcome CSV contains percentile metrics; the reference panel retains the annual cash-flow table. Schema-1 saved plans migrate to schema 2 by adding historical settings while retaining original numbers. The backup wrapper stays `education-finance-1`; its inner schema identifies the migration. No acknowledgement gates are used.
