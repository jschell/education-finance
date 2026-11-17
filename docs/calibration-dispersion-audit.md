# School forecast-error dispersion audit

2026-11-17. Descriptive follow-up to the current school/funding evaluation; it does not fit or activate another model. Source-identified output: [dispersion.json](../data/calibration-diagnostics/dispersion.json). Reproduce with:

```sh
node scripts/audit-calibration-dispersion.mjs
```

The script verifies all source/case hashes in the current evaluation before calculating. It uses only baseline cases with observed complete bills. For total bills, tuition and housing separately, let the error be log(actual / forecast median). Within each origin/sector cell, mean squared error decomposes exactly into squared cell mean plus variance across the sampled school errors. Average sector cells within origins, then origins equally. The script asserts the exact decomposition; the output pins its source hashes.

| School history | Wait before college | Share of total log-error MSE within origin/sector cells | Share for tuition | Share for housing |
| --- | ---: | ---: | ---: | ---: |
| Known | 0 years | 72.8% | 69.0% | 81.0% |
| Known | 4 years | 62.1% | 64.6% | 84.3% |
| Known | 8 years | 58.3% | 60.7% | 81.5% |
| Withheld | 0 years | 73.3% | 70.5% | 81.9% |
| Withheld | 4 years | 87.3% | 79.4% | 85.2% |
| Withheld | 8 years | 90.4% | 77.0% | 84.8% |

Much of the sampled error therefore varies across schools even when sector and start year are fixed. This supports investigating school-level uncertainty rather than correcting only the average sector trend. It does **not** identify that variation as persistent school effects: annual noise, shocks, source definitions and other misspecification can also contribute. Housing shows particularly large within-cell shares. Known/withheld samples differ, and long waits have only two observed start years; the differences between rows are not independent causal comparisons.

The audit also counts the raw supplied price-flag codes across every observed case/year/component, including the intervening wait years. Most entries are `R`, with a small number of `C` entries. No code is interpreted as imputed/reported here: original year-specific dictionaries must establish meanings before exclusions or sensitivity claims. Repeated case/year and in-state/out-of-state entries are dependent counts.

No confidence interval, forecast correction, promotion claim or calibrated probability follows from this decomposition. The older hierarchy's poor results still stand. Next work is [the diagnostic/model evidence plan](calibration-next-steps.md): finish source-quality and temporal/persistence diagnosis, then freeze one coherent candidate and its cost/funding tests before running new comparisons.
