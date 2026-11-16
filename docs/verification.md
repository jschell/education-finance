# v0.1 verification record

Date: 2026-11-15. Only synthetic students and expenses used.

## Automated checks

`npm run check`: static asset/document link checks; JavaScript module syntax/import targets; 23 financial/domain tests. Coverage includes hand-calculated zero-return cash flows, exactly 12 FV periods to entry, separate expense inflation, attendance inflation, staged returns, account depletion, later gifts not repairing failure, grant expiration/caps, no duplicated income, already-enrolled students, zero-volatility deterministic equivalence, seeded reproducibility, empirical mean/volatility, percentiles, solver feasibility/ceiling, market stress, JSON round trip/rejection, duplicate student allocations, and shared-pool limits.

Representative Node.js run: eight-year-to-entry fictional example, 10,000 outcome trials plus 20,000-path contribution refinement/verification completed in approximately 0.9 seconds in this environment. This is not a physical iPad benchmark. Browser simulation was also observed to complete without blocking the interface.

## Browser checks

Chromium preview: fictional deterministic assessment; 10,000-trial worker simulation; two-scenario comparison; duplicate student; explicit save; reload preserving profiles/scenarios; export and re-import with confirmation preview. Backup import preview and replacement completed successfully; a two-student/four-scenario export was imported and saved again.

Responsive viewport harness uses same-origin iframes at phone 390×844, iPad landscape 1024×768, and iPad portrait 768×1024. No page-wide horizontal overflow remained at all three tested widths after the fix. These verify CSS layout, not physical iOS hardware or Safari performance. A table min-content overflow found at phone width was corrected by allowing grid children to shrink. Wide financial tables scroll within their own containers rather than widening the page.

## Limits

No physical-device or Safari test performed. Starting return values are illustrative and have not been professionally calibrated. No live school cost database, restricted-account eligibility, stochastic college inflation, family joint simulation, or cross-device sync. Data saves are explicit and local; exports are the backup mechanism. More trials do not eliminate assumption uncertainty.

## v0.1.1 simplification

MIT license added to LICENSE/package metadata and linked from the page. Updated regression test confirms false legacy acknowledgement flags permit projections and scenario comparisons, and backups round-trip unchanged. Browser check: add a new student, fill only current savings and the two annual cost inputs, then run a 10,000-trial simulation without opening any optional section or checking any acknowledgement. The form has four visible core inputs and one prefilled required field (enrollment month). Existing local profiles load successfully. Clearing optional names, attendance duration and source metadata restores existing defaults and still calculates successfully. Phone (390×844) and iPad landscape (1024×768) viewport checks show no page-wide overflow.

## v0.1.2 result visibility fix

Reproduced on the live v0.1.1 page: changing savings hid results while the status still read Assessment complete. Corrected input lifecycle and automatic load/switch projections. Preview checks: $25,000 → $50,000 doubles entry savings with zero contributions; negative savings keeps the last result visibly stale and disables report actions; correcting to $60,000 recovers; an immediate Run Monte Carlo after editing retains both sections after completion; save/reload regenerates the projection automatically. No financial formulas changed. See [browser regression procedure](../tests/browser-results.md).

Phone (390×844) and iPad landscape (1024×768) checks passed without page overflow. View results brought the mobile result panel to 20 px below the viewport top. Changing entry from 2034-08 to 2030-08, then changing savings, retained the correct default contribution end of 2030-07. Existing manual Calculate and Monte Carlo controls remain available; only deterministic projections auto-refresh.

## v0.2.0 unified historical assessment

`npm run check` passes 38 tests, including 15 historical-data/model tests in addition to the original financial suite. Checks cover the 564-month continuity, raw and derived hashes, observed market-loss episodes, paired/calendar-aligned block sampling, deterministic seed prefixes, fees, repriced grants/coverage/income, sampled versus fixed costs, initial bill timing, geometric reference calculations, solver ledgers, full assessment outputs, schema-1 migration and input rejection. The offline preparation script rebuilt the same observation checksum. All module imports and worker URLs are versioned for the model/schema transition.

A representative eight-year-to-entry synthetic run with 10,000 main paths, 20,000 contribution calibration paths, an independent 1,000-path ledger check, actual historical windows and a 1,000-path alternate-period comparison completed in about 1.9 seconds in Node in this environment. Browser worker assessment completed with results visible and the UI usable. This is not a measured iPad performance claim.

Chromium preview checks: one Calculate button produces the full primary range table and historical comparisons; keyboard Enter activates Calculate; invalid negative savings retain stale results with disabled exports and recover after correction; saved legacy profiles load and migrate, save/reload regenerates the full assessment; allocation/block defaults display correctly; fixed cost mode yields identical cost percentiles while entry investment values vary. A temporary /education-finance/ deployment-path copy completed the historical worker calculation successfully. Temporary QA files were removed before publication.

Responsive same-origin iframe checks at 390×844 phone, 1024×768 iPad landscape and 768×1024 iPad portrait showed completed assessments and no page-wide horizontal overflow (scroll width equals viewport client width). These validate responsive Chromium layout, not physical Safari/iOS. Old v0.1 sections above are release history; their statements about fixed Monte Carlo costs and separate controls no longer describe v0.2.

Remaining limitations: historical proxies rather than forward-looking calibrated market forecasts; national CPI rather than school-specific cost uncertainty; reconstructed bond returns rather than investable fund returns; no account eligibility, automatic aid prediction, joint family probability or cross-device sync. See the methodology and source notice for details.

## v0.2.1 outcome visuals and temporary example mode

42 automated checks pass. New checks reconcile actual probability-band counts with all simulated paths and the success gauge frequency, including skewed distributions, constant outcomes, endpoints and unavailable enrollment balances. No financial growth or cash-flow formulas changed. The model remains college-funding-2.0.0.

Chromium preview: gauge states 0%, 65%, 95%, 100% and no-budget were inspected; the target tick and text agree with the selected threshold. Screen-reader meter values accompany the graphic. Funding gap, entry savings and cost distribution selectors update the summary without rerunning the simulation. The phone distribution table fits its container and both phone 390×844 and iPad landscape 1024×768 show no page-wide overflow. Project-path /education-finance/ completes the worker and loads the new module.

Example regression: an unsaved synthetic balance of $54,321 and a workspace with three students/two scenarios was preserved while entering the fictional example. Editing the example to $999 and activating Exit example by keyboard restored $54,321, the original students/scenarios and Unsaved changes status. Save/import are disabled in example mode; Exit example re-enables them. The saved original is never replaced by trying the example. Temporary QA pages/copies are removed before publication. These are Chromium layout checks, not physical-device Safari measurements.

## v0.2.2 automatic save correction

The earlier UI required pressing Save locally; adding students/calculating did not persist changes. v0.2.2 saves valid real-plan edits automatically and keeps a synchronous recovery copy while the database write is pending. Forty-five automated checks pass, including recovery with multiple students and selected IDs, immutable snapshots, pending/completed status, stale save completions, corrupt data, unavailable storage and invalid IDs.

Chromium preview: created a fourth synthetic student, entered $45,678, and reloaded without Save now. All four students, the selected student and balance returned. A subsequent rapid edit/reload retained $56,789. Entering example mode, changing its balance to $999 and reloading restored the real $56,789 plan and four students; example edits did not replace either real store. No actual family data used. Remaining browser checks are recorded in tests/browser-results.md. No growth/cash-flow formulas changed.

The browser-database-unavailable QA fixture showed Recovery copy saved; retry Save now after a synthetic edit to $67,890. Reload recovered $67,890; reopening the normal app retried and completed the database save. Negative input displayed Not saved; correction to $78,901 saved and survived reload. Phone 390×844 and iPad landscape 1024×768 layouts had equal viewport/scroll widths, and /education-finance/ loaded the selected student and completed the worker. Save now keyboard activation was checked. Temporary fixtures are excluded from publication.

## v0.2.3 session seeds and target-relative gauge

48 automated checks pass. New checks cover generate-once/reload behavior, independent session stores, manual zero and maximum uint32 values, invalid stored seeds, restricted storage, relative gauge colors and complete arc boundaries at 80/90/95% targets. Financial model and PRNG versions are unchanged.

Chromium preview: the initial seed was retained after reload; an independent tab received a different seed. A manual seed of zero survived reload, and repeated calculations produced identical percentile summaries. The existing Calculate control was activated by keyboard. Synthetic gauge states 0%, 65%, 89%, 90%, 100% and missing budget were inspected; shaded transitions are smooth, the dark marker outline is visible on yellow, green begins at the selected target, and the no-budget state is gray. Phone 390×844 and iPad landscape 1024×768 example assessments showed the color key with no page-wide overflow. /education-finance/ loaded the new modules and completed calculation. These are Chromium checks, not physical Safari measurements. Temporary QA files/copies are removed before publication.

## v0.3.0 school-planning improvements

59 automated checks pass. New cases cover exact three-term tuition/grant totals, calendar-specific bill dates, invariant annual compounding, twelve-month living/income support, already-enrolled term omission, contribution solving, annual roll-forward reconciliation, category totals and non-destructive preset application, schema-2 migration, dated historical portfolio weights and resolved reference returns, monthly attendance overlap, invalid schedules/weights/source links, and applying sampled inflation once at each quarter bill. Previous schema-1, historical-data checksum, seed/session, autosave/recovery and financial regressions also pass.

Chromium preview migrated the existing synthetic schema-2 workspace without losing students or balances. Selected quarter billing, applied the public in-state published budget, verified the five category amounts/source metadata and retained quarter calendar, chose twelve living months, and calculated the full assessment. A dated cash-only allocation override was saved and retained after reload together with quarter/12-month billing and source details. Family attendance showed future months and simultaneous overlap for all stored synthetic students. Merely previewing Harvard's budget kept entered tuition and completed results unchanged. Keyboard Calculate completed the new model. The visible annual schedule reconciles to the underlying ledger; displayed whole dollars are rounded.

Phone 390×844 and iPad landscape 1024×768 checks expanded budget previews and family tables without page-wide overflow; wide tables scroll within their containers. The /education-finance/ project-path copy loaded new modules and completed a calculation. These verify Chromium layout, not physical iOS/Safari performance. Only synthetic students and public benchmark data were used. Temporary QA files/copies are removed before publication.

## v0.4.0 / model 3.0.0 (2026-11-15)

72 automated checks pass, including new cases for every cent allocation from $0.00–$1.99 across 2/3/9/12 payments, zero-grant/nonnegative tiny bills and genuine missed-penny failure, academic-year tuition holding, separate published-price trend, paired adverse tuition/market observations, complete-path annual reconciliation, sampling intervals/near-target status (outward-rounded bounds also avoid 0%–0% or 100%–100% intervals), unfinished drafts, exclusive editing lock/release, proportional household savings caps, identical-student joint probabilities (not products), shared-money accounting, scenario selection/missing budgets, walk-forward cutoffs/no future-data leakage, and schema-3 migration. Applying a published preset switches to published-price planning. Static imports/relative project paths also pass.

Chromium preview verified:

- A negative synthetic savings entry was saved as an unfinished draft and restored unchanged by reload, with calculation blocked until corrected. Correction resumed normal IndexedDB saving.
- A simultaneous second tab displayed read-only state and disabled editing, save, import and deletion. Closing it and reloading the remaining tab restored editing ownership.
- Existing synthetic schema-3 students/balances and selected IDs survived migration. A zero household savings-deposit limit persisted across immediate reload.
- One Calculate produced whole-percentage gauge, representative complete path ledgers, provisional contribution status, joint household outcomes, historical/block/stress comparisons and historical-testing tables. No additional run button was introduced. Keyboard Enter on Calculate worked.
- Phone 390×844 and iPad landscape 1024×768 embedded viewports loaded the /education-finance/ copy, completed assessments, and expanded household settings without page-wide overflow (document client/scroll widths matched: 375/375 and 1009/1009, accounting for browser scrollbars). This is Chromium layout evidence, not a physical-device test.

Reproducible synthetic diagnostic report: `node scripts/validate-history.mjs`. Three-, eight- and eighteen-year saving horizons produced 5, 4 and 2 expanding-window tests respectively. Cost P10–P90 coverage was 20%, 0% and 0%. This is **weak historical range coverage**, not successful forecast calibration; results now show a prominent warning when held-out cost coverage is below 50%. Funding Brier scores in these examples were 0, 0.42238125 and 0; the zero scores occur with very few/easily classified historical cases and do not establish forecasting skill. The report intentionally retains these unfavorable diagnostics. Tests overlap, use historical proxy data and only 200 simulations per fold.

Physical iPhone/iPad Safari persistence and private-browsing behavior remain unverified in this environment. School-specific published-price volatility remains a data limitation; centering CPI removes its mean, not all aid-related variability. Exports are still necessary for portable backups. No actual family data or private workbook values are included in this release.

The full semicircle now uses the color corresponding to the current percentage, including both endpoints. The previous static multi-color segments were removed; marker and target tick remain. No-budget state remains gray.

Full-arc color anchors are now yellow at 45% (`#edc84b`), light green at 60% (`#a8cf8c`), and dark green at the selected goal (`#195e50`), with smooth interpolation. Gauge status remains independently based on the chosen target and sampling interval.

Final color browser check: with fictional savings of $100,000, the example produced 74% and one uniformly green-tinted arc (`#669b70`), while the independent badge correctly remained Below target (90%). The 45%/60%/target legend matched the revised anchors. [Screenshot with synthetic values](../tests/evidence/v0.4.0-whole-arc.jpg).

## v0.4.1 gauge progress

Presentation-only correction: color fills from zero to the calculated percentage; the remaining semicircle stays gray. At 0% no colored fill path is drawn; at 100% the full track is filled. The entire filled segment retains the percentage-based color, with yellow at 45%, light green at 60% and dark green at the chosen target. Marker, target tick, probability and model remain unchanged. The previous v0.4.0 screenshot records the older full-track behavior.

Chromium preview: a 72.61% model frequency produced normalized fill length 72.61 of the 100-unit semicircle, ending at its marker with gray track beyond. Keyboard Calculate completed. Phone 390×844 and iPad landscape 1024×768 /education-finance/ views retained matching document client/scroll widths (375/375, 1009/1009). [Synthetic progress screenshot](../tests/evidence/v0.4.1-progress.jpg). Financial model/version and the existing 72 passing checks are unchanged.
