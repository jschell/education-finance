# Unified assessment browser regression

Use synthetic data only.

1. Load a nonzero saved plan. The full historical assessment regenerates without clicking; saved reports are not misrepresented as fresh.
2. Confirm exactly one main Calculate action and no separate projection/Monte Carlo buttons. Four basic inputs remain visible.
3. Calculate. Verify savings, tuition, total expense and paired-gap percentiles; historical comparisons; collapsed reference; dataset provenance; independent solver check.
4. Edit savings. Previous results remain visible while marked stale; the full assessment replaces them after the debounce. With zero contributions, entry savings scale proportionally on identical historical paths.
5. Enter negative savings. Keep the prior result visible, show an error beside Calculate and disable exports. Correct and recover.
6. Edit, then immediately Calculate. Cancel the pending refresh and disregard stale worker messages.
7. Change historical period/profile/block length/fees or fixed expense mode. Verify the result metadata matches selected settings and fixed expenses have identical cost percentiles.
8. Save/reload, import an old-schema backup and export a new one. Keep balances, manual rates, dates, students and scenarios. Recalculate after migration.
9. Compare scenarios under Manage; retain a complete primary assessment and comparison table. No additional primary run button.
10. Phone 390×844 and iPad landscape 1024×768: no page-wide overflow, readable results, contained table scroll, View results reaches the result panel. Check keyboard focus and action activation.

Automated financial checks are separate from browser event/storage/worker checks. Physical iOS/Safari performance is not established by iframe layout checks.

11. Try an example with valid unsaved changes. Confirm the example banner, disabled local save/import/delete, and one Calculate action. Edit fictional inputs, then Exit example by keyboard; restore original values, student/scenario selection and dirty status. Repeat starting from an empty plan. No delete operation is needed.
12. Gauge target/status and probability-band counts must agree with the same assessment; switch displayed outcome without starting a new worker. No budget shows a neutral gauge and no funded-percentage distribution.

13. Add students and scenarios, change names/costs/balances, then reload without Save now. Confirm count, selection and values persist. Repeat before the simulation completes. The header must report actual save completion, not calculation completion.
14. Invalid input shows Not saved and retains last valid data. Correct it and confirm autosave recovers. Example edits must never overwrite real saves; reloading from the example restores the real plan.
15. Exercise a blocked-storage save: display failure or recovery-only status, preserve inputs for export and allow Save now to retry. Clear-local must remove both database and recovery copy after pending writes finish.

16. New independent tab: random seed populated; reload: same seed. Edit to zero, reload, and verify it persists. Recalculate unchanged inputs and verify matching summaries. Clearing the input reuses the current session seed.
17. Gauge states below, at and above the chosen target: inspect red/orange/yellow shades and green at/above the target, dark marker outline, target tick, accessible meter value, and neutral no-budget state. Verify phone/iPad layouts and keyboard Calculate.

18. Existing schema-1/2 plans load as schema 3/model 2.1 without changing amounts, dates, IDs or manual rates. Defaults remain semester and nine living months. New settings persist through autosave/reload and JSON backups.
19. Preview a published budget without applying: inputs/results/save status remain unchanged. Apply explicitly: all five categories and structured source fields match the preview; total is not added again. Funding and tuition calendar remain, living months become nine, and editing costs marks the estimate adapted.
20. Choose quarter tuition and twelve living months, calculate once, and inspect the visible annual reference and detailed budget table. Optional dated allocation changes must affect historical paths and the history-derived reference, persist after reload, and reject duplicate dates/weights above 100%.
21. Expand family attendance and new controls at phone/iPad widths. Tables scroll locally, no page overflow, and no family funding-success probability is inferred.
