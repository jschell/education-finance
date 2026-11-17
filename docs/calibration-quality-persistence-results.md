# Source-quality and school-persistence findings

2026-11-17. Implementation of the [committed audit plan](calibration-quality-persistence-plan.md), including its explicitly post-results gapped-window amendment. This is descriptive diagnosis; production remains app 0.14/model12 with the foundation active. No forecast, financial default, candidate qualification or original snapshot changes.

## Source audit

All 24 official NCES academic-year dictionaries for 2000–2023 are pinned under `data/raw/ipeds/dictionaries/`. [Extracted field/year metadata](../data/ipeds-price-dictionaries.json) retains original URLs, members, hashes, price-field titles and code labels. The original selected price rows are unchanged.

Each year defines `R` as Reported and `C` as Analyst corrected reported value. These labels are distinct: a corrected report is not an independently observed quote, and neither label proves an error-free price. The 2014 academic-year workbook omits its code legend. Its linkage to each X flag comes from that workbook; its code meanings are explicitly sourced to the **same-year IC2014 dictionary, Sheet1**, whose generic Xvarname table is recorded as a supplemental source. [NCES's Handbook](https://nces.ed.gov/statprog/handbook/ipeds_surveydesign.asp) documents that IPEDS components share the imputation-flag system. No legend from another year is silently substituted.

In the observed baseline bill cases, all positive source values carry `R` or `C`; none are unclassified or carry another documented code. The complete origin-to-final-bill interval is checked, including intervening wait years. Restricting those fixed forecasts to entirely `R` records produces:

| School history | Wait | All observed cases | Reported-only cases | All-case 80% coverage | Reported-only coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Known | 0 | 277 | 274 | 44.13% | 44.43% |
| Known | 4 | 155 | 152 | 40.78% | 40.61% |
| Known | 8 | 42 | 40 | 31.67% | 32.17% |
| Withheld | 0 | 291 | 289 | 45.27% | 45.53% |
| Withheld | 4 | 166 | 166 | 39.56% | 39.56% |
| Withheld | 8 | 54 | 54 | 30.33% | 30.33% |

Coverage changes by at most **0.50 percentage point**. The few analyst-corrected records do not explain the large undercoverage in this evaluated sample. This is a subset/composition sensitivity, not a causal estimate of imputation quality, and it does not establish source quality for the entire IPEDS universe. Missing rows, changed sectors and unreached windows remain registered and unavailable; their counts are retained in [the report](../data/calibration-diagnostics/quality-persistence.json).

## Growth persistence

Use schools eligible at origin **2010**, based only on stable sector and positive prices through that origin. Later attrition remains explicit. Annual real log growth is centered on the mean of origin-known training identities in that sector/year. Withheld schools never enter that common mean. Statistics describe broader origin cohorts rather than just the earlier 42 sampled identities.

The original adjacent transition comparisons are retained. Because adjacent growth windows share a boundary price, independent level measurement errors can create negative growth correlation without true economic reversal. A known-process test demonstrates this effect. The separately committed amendment therefore adds gapped windows with no shared price observation and a fixed large-change sensitivity.

For **reported-only, known-school** comparisons of transition years **2000–2008 versus 2011–2019** (price levels 2000–2009 versus 2011–2020):

| Sector | Origin cohort | Complete pairs | Tuition correlation | Housing correlation | Pairs after large-change screen | Screened tuition / housing correlation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Public four-year in-state | 353 | 341 | −0.176 | −0.199 | 228 | −0.133 / −0.097 |
| Public four-year out-of-state | 353 | 341 | −0.118 | −0.199 | 220 | +0.020 / −0.044 |
| Public two-year in-state | 132 | 110 | +0.020 | −0.427 | 62 | +0.017 / −0.264 |
| Public two-year out-of-state | 132 | 110 | +0.080 | −0.427 | 48 | +0.058 / −0.205 |
| Private nonprofit four-year | 657 | 606 | −0.048 | −0.206 | 508 | −0.004 / −0.125 |

The screen excludes a paired school if either window contains an absolute annual real log change above 0.25 in tuition or housing. It is a diagnostic cutoff, not an estimated outlier boundary or permission to alter published prices. Exclusions are substantial in some groups; original results and support counts remain available. Out-of-state and in-state results reuse institutions and housing, so rows are not independent evidence.

The previously observed cross-school forecast dispersion is **not accompanied by strong positive growth persistence in these comparisons**. The data do not justify treating all of that dispersion as a permanent school-specific growth rate. This does not prove true persistence is zero or establish mean reversion: policy changes, nonlinear trends, revisions, price definitions, changing respondents and selection can affect these descriptive statistics. No confidence claim is assigned to correlated schools/economic years.

## Implication and next action

Retain non-promotion of the old persistent-growth hierarchy. Before specifying another permanent-growth model, audit the large changes and reversals in the known training schools: distinguish an actual tuition-policy change from a housing definition/reporting change or a revised endpoint. Then specify and commit one coherent alternative with separate common trends, temporary school deviations and observation/definition uncertainty where supported. Do not infer latent model parameters directly from these correlations. Any candidate still needs meaningful known-process tests, held-out/sector/horizon safeguards and its own complete funding evaluation before activation.

## Reproduction and checks

```sh
uv run scripts/prepare_ipeds_dictionaries.py
node scripts/audit-calibration-quality-persistence.mjs
npm run check
git diff --exit-code -- data/ipeds-price-dictionaries.json data/calibration-diagnostics/quality-persistence.json
```

`--fetch` on the Python script downloads absent official archives only; ordinary reproduction is offline. Its two pinned Python libraries are isolated development/QA dependencies, not application runtime dependencies. CI rebuilds extracted dictionaries and the audit, then compares committed bytes.

Fresh `npm run check` passes **176/176** tests; dictionary extraction and the audit regenerate byte-for-byte.

Tests cover year/field-specific unknown-code handling, corrected-value exclusions, retained missing outcomes, no zero fill, deterministic shared growth, persistent school effects in disjoint windows, shared-boundary measurement-error reversal, future attrition, withheld-school isolation, separate large-change screening and source/support integrity. Full original reports remain untouched; these findings do not calibrate future funding probabilities.
