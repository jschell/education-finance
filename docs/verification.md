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
