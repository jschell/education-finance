# Current model · college-funding-9.0.0

App v0.10.0. Schema 5 and backup format `education-finance-2` remain unchanged. The worker uses `calibration-reviewed.json`; older datasets and protocols are retained for reproduction. [Previous methodology](archive/model-through-v0.9.0.md).

## Ownership and cash flows

Each student owns one funding record: opening savings, monthly contribution dates and annual step-up, gifts, general aid, income support, coverage goal, asset allocation, fees and investment reference assumptions. Each education scenario owns school costs, school-specific aid, attendance length, living/billing schedules and source information. Resolving a scenario creates an in-memory copy; it never changes saved funding. Shared-pool allocations cannot exceed available shared money. Duplicating a student resets money and awards; copying a school path does not copy funding.

The monthly ledger applies dated deposits and gifts, portfolio growth and bills. Tuition is billed by the selected academic calendar and repriced once per attendance year. Living expenses follow the selected attendance months. General and school aid expire independently, combine once and are capped by bills. Income support pays covered bills without depositing unused income. Coverage can mean tuition, full costs or a chosen share. Balances cannot go negative: an unpaid bill is a shortfall even if a later gift leaves money at the end. All covered bills must be paid for a path to succeed.

The deterministic reference compounds savings and expense categories separately. Variable costs and returns belong to the simulation. Real-dollar results use its simulated deflator exactly once. Manual reference rates do not override the stochastic asset model.

## Economic paths

The default samples joint investment/rate/inflation blocks from 70 complete September–August source years, 1954–2023. Asset profiles shift toward conservative allocations near enrollment; explicit dated allocations override those profiles. Monthly fees compound on the portfolio. Three-year blocks are the default; one/five-year settings are supported. Shared seeds and horizon-stable prefixes keep economic shocks common across cases and students.

Inflation and yields use regularized persistence. Annual inflation shrinks toward phi 0.5 with ten prior observations; monthly yields toward phi 0.95 with 120 prior observations. Persistent expectation deviations come from seven disjoint ten-year windows, which are not seven guaranteed independent economies. Five-year Treasuries use coupon/dirty-price repricing with semiannual coupons and a monthly roll. Three-month bills use discount-price conversion. Numerical yield and inflation bounds remain explicit in the economic bundle.

Forward cautious/central/favorable assumptions use pinned SPF anchors and the published equity cross-check. Ten-year anchors are held constant beyond ten years. The ten-year survey yield remains a proxy for the five-year long-run yield. Cases are conditional alternatives with no probability weights. Their funding-frequency envelope has no confidence level and is not a complete uncertainty distribution. Wilson intervals around simulated frequencies measure sampling noise only. The gauge arc shows the central case; the headline spans named cases. A missing budget shows no percentage.

## College costs and uncertainty

Fixed-institution IPEDS panels cover 2000–2023. Separate public residency series and private nonprofit tuition are available; housing is on-campus room/board, not local rent. Panels are equal-school geometric indices with full-window membership, imputation and survivorship limitations. Starting budgets come from user inputs. Variable costs use the previously selected 4% tuition / 3% on-campus housing nominal trends plus paired historical deviations; other expenses and off-campus housing use CPI. Fixed expense mode keeps entered growth assumptions.

Within overlapping years, costs retain observed macro-year matching. Older macro years borrow inflation-conditioned contiguous cost blocks from the shorter panel. This is an approximation, not observed old joint cost/market history. Common donors preserve paired tuition/housing and household shocks.

Persistent paired cost-error corrections fit only on rolling forecast errors through each origin. With at least three distinct error-target years, corrections shrink toward zero by n/(n+10). The current correction and conditioned sampling passed the v0.9 multi-period score rules. No later errors may enter earlier-origin fits.

The v0.10 uncertainty candidate pools maximum absolute annualized forecast errors by target year. With five earlier target years it uses the finite-sample 80% rank and a symmetric persistent uniform drift. It improved aggregate cost coverage but worsened interval score beyond the frozen 10% tolerance, so it is **disabled**. Its implementation and comparison remain reproducible. There is no claim that cost undercoverage is fixed.

## Estimated savings contribution

The path-specific solver finds a base monthly contribution that pays every covered bill while respecting entered contribution dates and annual step-ups. Infeasible dates yield infinity. Student estimates do not incorporate a household deposit cap; the household assessment applies that cap separately.

Fit at least 20,000 paths (twice primary trials, capped at 50,000). The [reserve rule](savings-reserve-rule.md) adds joint 95% DKW bounds for fitting/verification CDFs plus a worst-case Wilson lower-bound distance to the requested probability. Round the resulting order statistic up to whole dollars and enforce the entered ceiling. This conservative reserve retains the user's requested target. At the maximum sampled quantile, the full reserve may be unavailable; report the cap explicitly.

Verify the candidate without refitting on 5,000 independently seeded ledger paths. Confirmation requires its one-sided 95% Wilson lower sampling bound (z = 1.6448536269514722) to meet the requested target. Failed confirmation remains visible. A missing estimate means the entered dates/ceiling cannot satisfy the fitting rule including its reserve; it does not prove the original requested probability is unattainable. This is an internal numerical consistency check, not external economic calibration. The initial three-standard-error rule confirmed only 9/12 production-model seeds and was replaced before the final seed rerun; its results remain archived.

## Validation and limits

[Fix protocol](critique-fix-plan.md) freezes v0.10 candidate selection and diagnostics before scoring. [Current status](critique-fix-status.md) and [fresh review](critique-review-v0.10.0.md) record outcomes.

Whole-plan tests use production compile, simulation path factory and ledger functions. Synthetic plans start each September in 2011–2020 where complete outcomes exist, with 0/4/8-year waits followed by four attendance years. Five sectors and three funding levels are tested. Macro sources and annual joint observations end before the origin; known cost levels and error targets stop at the origin. Historical return/inflation anchors come from training data; current survey forecasts never enter past tests. Actual ledger paths replay reconstructed asset instruments and published cost levels on the same bill schedule. Outputs include Brier score against a 50% guess, reliability bins, total-cost coverage, source cutoffs and the number of distinct start years.

Policy choices inherited from earlier full-period comparisons are fixed, so this is not a nested policy-selection backtest. Panels use revised data and future-selected membership. Origins overlap; sectors and funding levels share shocks, so case counts do not multiply independent evidence. Simple training anchors do not validate today's forward survey assumptions. There is no complete 18-year-wait test. Multi-student future probability calibration remains unestablished. Neither current component scores nor whole-plan diagnostics certify that a reported future funding frequency is calibrated.

## Persistence and compatibility

Browser recovery, IndexedDB autosave and editor locking preserve valid pending changes. Temporary example workspaces restore the real plan on exit. Model-4 through model-8 schema-5 records receive a metadata-only upgrade to model 9; student funding is preserved. Incompatible schemas 1–4 and old backup formats remain intentionally rejected. Exported assessment metadata records seed, model, dataset hashes and inputs for reproducibility. The app is static and browser-local with no telemetry or cloud storage.
