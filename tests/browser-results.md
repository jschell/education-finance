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
