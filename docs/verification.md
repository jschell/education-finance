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
