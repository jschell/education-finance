# Financial model and historical simulation methodology

Implemented model `college-funding-3.0.0`, saved schema 4, application v0.4.1. Dataset `us-joint-monthly-1978-2024-v1` contains 564 complete monthly observations (January 1978–December 2024), retrieved 2026-11-15. Primary PRNG: `mulberry32-calendar-block-1`. One Calculate action includes the complete assessment. All monetary amounts are nominal USD unless labeled purchasing power.

## Cash flow and timing

Savings and college costs grow separately. The pure engine compiles monthly bills, contributions, gifts, grants and direct income. Savings are opening funds at valuation. Growth occurs monthly, then deposits, then bills. Entry savings are measured before the entry month's growth, deposits and withdrawals, preserving exactly 12 growth periods across a 12-month date difference. A one-time stress, when enabled, reduces investment funds 25% just before entry (or at valuation if already enrolled).

Tuition uses two semester bills at enrollment and five months later, or three quarter bills at enrollment and three/six months later. Academic quarters mean three terms, not four calendar quarters. Living expenses and direct income spread over nine or twelve months each academic year. Twelve months changes timing, not the entered annual budget; summer-inclusive costs must be supplied explicitly. Only remaining bills are modeled for students already enrolled.

Split baseline annual amounts using integer cents: floor the equal share and distribute the remaining cents one per payment, earliest first. Payments cannot be negative, including tiny budgets. Reprice and round individual bills to cents. Tuition's price factor is held constant within each academic year; other categories can change monthly. For a current academic year already in progress, remaining tuition uses the valuation-month price factor. These calendars approximate school invoices.

Grants are nominal, follow tuition dates for the entered award duration, are capped at current bills, and reduce tuition first. They never become savings. Coverage is full net cost, net tuition only, or a specified percentage of net cost. Direct income reduces the covered bill and is capped at that month's obligation; unused income is not saved. Contributions use inclusive dates, optional annual step-ups, and dated gifts. An enrollment edit moves contribution end dates that still match the old default; customized dates are retained.

Withdrawals cannot exceed available funds. Record every missed bill; a later gift or positive ending balance cannot repair an earlier miss. Success requires every covered bill to be paid when due, allowing only a numerical tolerance of $0.0000001, not an unpaid penny per bill. Investment growth can retain sub-cent precision. Track costs, grants, covered obligations, income used, deposits, withdrawals, unpaid bills and ending funds. The annual identity is opening + growth + deposits − withdrawals = ending.

Current-savings-only excludes future deposits/gifts/income while retaining grants. Contributions-and-gifts excludes direct income. Shared savings enter through explicit student allocations only; no allocation may exceed the shared pool. Alternative scenarios reuse a student's allocation, and duplicated students receive zero shared allocation.

## Price basis and university expense uncertainty

Published school budgets and default user estimates are treated as prices before aid. Default **published-price planning** uses the entered tuition trend (initially 4% per year, illustrative and unverified as a forecast) plus historical tuition-index deviations. For each historical month:

`tuition gross factor = exp(log(1 + chosen annual trend)/12 + log(1 + observed tuition change) − historical mean monthly log tuition change)`.

This removes the index's average trend from the published-price calculation. The historical mean is calculated over the selected sample (or training sample in historical testing). Paired deviations retain observed timing and relationships with investment returns. The compounded tuition price factor is sampled at academic-year starts and held across that year's bills. Reference growth keeps the chosen tuition trend even when reference investment returns come from history.

**This is a modeled variability proxy, not a newly obtained published-price dataset.** BLS college tuition CPI includes some financial-aid adjustments, began tracking aid-adjusted prices in 2003, and covers multiple sectors and degree levels. Removing the mean does not remove all aid effects or make its volatility representative of a particular school's sticker prices. See [BLS methodology](https://www.bls.gov/cpi/factsheets/college-tuition.htm). School-specific historical published-price data remains a future data-quality improvement.

Optional **tuition-index planning** uses the unmodified BLS tuition-index growth factors and, for a historical reference, its geometric trend. The interface identifies its mixed aid-adjusted basis. It does not infer aid eligibility or any grant amount; a user entering a net tuition quote must avoid subtracting the same aid again.

Historical expense mode applies general CPI as a proxy for housing, books, transport and other expenses. These categories therefore share the same modeled inflation path; their separate real-world risks are not estimated. Older baseline budgets are first translated to valuation using reference category growth, then repriced from valuation with sampled changes, once. General CPI discounts each path once to valuation purchasing power. Fixed expense mode retains entered expense growth/discount rates while investment returns still vary historically.

## Investment paths and historical sampling

Stocks: Fama/French excess market plus RF. Cash: RF. Bonds: reconstructed nominal US 10-year sovereign total return, derived from monthly-average yields; this is a smoothed proxy, not an investable fund series. Source hashes, transformations and credits remain in [manifest](../data/manifest.json) and [notice](../data/NOTICE.md).

Illustrative profiles use early saving, final saving years, and attendance stock/bond/cash allocations. Default 60/30/10, 30/40/30 and 10/30/60; default transition is three years before enrollment. These are developer examples, not calibrated recommendations. Portfolio return is the monthly weighted sum, assuming monthly rebalancing. Annual fee f applies monthly factor `(1-f)^(1/12)`; initial fee zero requires review. No tax drag, trading costs, account rules or investment restrictions are estimated. Dated allocation overrides remain active until replaced, including during attendance. Historical-reference rates for each portfolio are geometric returns from the selected sample. Manual-reference rates are preserved separately.

The joint block bootstrap samples all assets, general CPI and tuition CPI from the same observed months. Calendar-aligned starts match valuation's calendar month. Blocks are 12, 36 (default) or 60 consecutive months, sampled uniformly with replacement; only complete blocks qualify. Concatenate and truncate to horizon, with no wrapping or interpolation. Relationships inside blocks are retained; longer regimes and dependence across joins are not. Events absent from history are absent from this distribution. Historical sampling is not conditioned on current yields, valuations, tuition policy or future regimes.

Mulberry32 selects block starts using seed XOR imul(trial+1,0x9e3779b9). Identical inputs, seed, dataset and model reproduce results. Tab-session seeds are generated cryptographically, persist through reload, and remain editable. A duplicated browser tab can inherit session state. Exact seeds and settings appear in assessment exports.

## Results and contribution estimate

The gauge displays a whole percentage: the frequency of paying all covered bills in the chosen historical model. The colored arc extends from zero to the calculated percentage, stopping at its marker; the remaining semicircle stays gray. The filled portion changes to one shade based on the current percentage, from brown/red to yellow at 45%, light green at 60% and dark green at the selected target; it is not a static multicolor scale. Its target tick and status reflect the chosen preference; lowering the target changes the status, not the funding. A Wilson 95% sampling interval describes Monte Carlo noise only. If that interval crosses the target, status reads Near target. Structural model uncertainty is not included in that interval. With no entered budget, no percentage is shown.

Actual simulated gaps, entry savings and costs determine histogram counts. Fully funded paths are a separate category. Marginal P10/P50/P90 rows and pointwise balance bands are independently ranked and cannot be combined into a single path.

The main result also shows three **actual complete simulated paths**, selected near P10/P50/P90 of ending funds minus unpaid bills. Higher is more favorable. Ties resolve by trial index. Every example's savings, costs, gap, annual ledger and remaining funds come from that same path. They are not the marginal percentile values and are not minimum/maximum outcomes. The fixed-rate reference is collapsed separately.

The required-contribution solver propagates gross-return sensitivity to find the base monthly contribution covering all bills on each path. It uses the entered dates and step-ups, including when current contributions are zero. Fit the selected success order statistic over max(20,000, 2 × primary trials), capped at 50,000; round up to whole dollars and enforce the ceiling. A separate seeded 1,000-path ledger check evaluates the candidate without fitting to that check. A below-target check labels the estimate **provisional**. All headlines say estimated savings/target; no target attainment is promised. This check measures internal sampling consistency, not external forecast validity. Student-level estimates do not apply the household deposit cap.

## Sensitivity and historical diagnostics

One calculation includes:

- Alternate full-history versus recent-history comparison, 1,000 paths.
- Other one/three/five-year block lengths, 1,000 paths each.
- Every complete consecutive matching-calendar actual historical window. Windows overlap and their pass rate is not an independent probability estimate.
- Explicit planning stresses: 25% loss near entry plus fixed tuition/living growth two percentage points above reference; no remaining grants; housing/food budget 20% higher; one extra attendance year. Stress amounts are illustrative developer choices as of 2026-11-15, not fitted frequencies. They are reported separately and never weighted into the main probability. Extra attendance does not automatically extend contributions or awards.
- Expanding-window walk-forward diagnostic, beginning with at least 180 months of training. Eligible held-out starts match valuation's calendar month and are spaced at least five years apart. Each training sample ends before all held-out observations. Reference rates, tuition centering and bootstraps use training data only. Compare a 200-path funding frequency against actual held-out success (Brier score), and P10–P90 total-cost coverage. Held-out windows may overlap. Few folds, short samples, proxy assets and historical plan transplantation prevent a claim of established future calibration. For a long horizon with no complete test, report insufficient history explicitly.

Reproduce synthetic diagnostic reports with `node scripts/validate-history.mjs`; see [report](validation-report.json). These tests expose limitations; more trials cannot remove model risk.

## Joint household assessment

For multiple students, the same Calculate action evaluates one explicitly selected scenario per student (default first scenario). These choices and an optional household monthly savings-deposit limit are saved in schema 4. The selected student's assessment determines a common historical period and block length for the household, shown in results. Every student sees the **same sampled monthly economic observations** across their shared calendar while retaining their own asset allocations, fees, tuition basis, budget, coverage and enrollment dates.

If combined planned monthly savings deposits exceed the optional limit, reduce each student's deposit proportionally for that month. Zero is a real zero limit; blank means unlimited. The limit does not cap gifts or direct college payments from income. No student funds are borrowed/transferred between accounts. Opening shared-pool allocations are included once, and unallocated pool money is excluded and disclosed. The engine does not optimize these allocations.

Joint success requires every selected student's covered bills to be paid on the same path, never an average or product of marginal success rates. Any missing student budget suppresses the household percentage; reported dollars then reflect entered budgets only. Annual household cost and need ranges sum students **within each path before ranking**. They remain marginal annual ranges, not a single scenario trajectory. An attendance-overlap calendar is displayed separately. This is a feasible-budget assessment, not a household allocation optimizer or full income/expense budget.

## Persistence and migration

Browser-only storage has no account or cross-device sync. A browser Web Lock permits one editing tab per origin; other tabs are read-only and cannot write plans, recovery copies, drafts or deletes. Close the editor and reload a reader to edit there. Unsupported safe tab coordination disables editing rather than risking silent overwrites. Same-tab writes are serialized, and completion updates only the matching revision. The browser releases ownership when its editing document closes/crashes.

Valid plans persist in IndexedDB with a synchronous localStorage recovery copy covering interrupted writes. **Unfinished raw form entries are saved separately** with the last valid plan, selected IDs and dynamic row counts. Reload restores the draft without feeding invalid values to the engine; calculations stay stale until corrected. Draft/recovery/storage failures are visible. Browser eviction/private-mode limitations still apply; exported JSON remains the portable backup.

Example mode snapshots the real workspace, disables real saves/import/delete, and restores the real plan on exit/reload. Example edits remain temporary. A pending unfinished real entry must be completed before switching into example mode.

Schemas 1, 2 and 3 migrate to schema 4/model 3.0.0 without changing stored costs, savings, dates, IDs, grants or manual rates. Existing tuition assumptions are retained as the published-price trend; this and the academic-year pricing/small-payment corrections intentionally change newly calculated outcomes. New household settings default to no savings cap and each student's first scenario. Previously calculated assessment exports retain their original version for interpretation.
