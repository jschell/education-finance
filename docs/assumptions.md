> Historical requirements/planning record. For current shipped behavior, see [the current model](model.md) and [release status](critique-fix-status.md).

# Assumption register

As of 2026-11-15; current model `college-funding-4.0.0`. Historical observations are verified against a pinned snapshot, not verified forecasts. Portfolio weights and planning conventions are provisional developer choices and user-editable.

| Input / units | Default | Provenance / status |
| --- | --- | --- |
| Currency | Nominal USD | US planning scope |
| Annual school budget | $0 until entered | User estimate; no school price inferred |
| Attendance | Four years | Provisional convention |
| Future contributions / annual increase | $0/month / 0% | User capacity not inferred |
| Aid, gifts, income | $0 | Explicit user entries only |
| Historical period | 1978–2024 | 564 complete aligned monthly observations; data manifest |
| Block length | Three years | Provisional sampling choice; one/five years optional |
| Cost growth | Historical tuition CPI and general CPI | BLS indexes; school-specific costs may differ |
| Reference rates | Geometric rates from chosen history | Empirical summary, not a forward forecast |
| Annual investment fee | 0% | Placeholder; enter actual fee; no tax drag |
| Final saving stage | Three years before entry | Provisional allocation convention |
| Main trials | 10,000 | Sampling/performance choice; 1,000/25,000 optional |
| Target funding frequency | 90% | User-adjustable 80/90/95%, no guarantee |
| Contribution ceiling | $10,000/month | Solver bound, not assumed capacity |
| Secondary comparison / independent check | 1,000 paths each | Sampling choice; reported separately |

Portfolio percentages below are stocks / bonds / cash. They are illustrative allocations, not recommended glide paths. Monthly rebalancing and abrupt stage changes are assumed.

| Profile | Early saving | Final saving stage | Attendance |
| --- | --- | --- | --- |
| Balanced to conservative (default) | 60 / 30 / 10 | 30 / 40 / 30 | 10 / 30 / 60 |
| Stock-heavy to conservative | 80 / 15 / 5 | 50 / 35 / 15 | 20 / 30 / 50 |
| Conservative | 30 / 40 / 30 | 15 / 35 / 50 | 0 / 20 / 80 |
| Cash only | 0 / 0 / 100 | 0 / 0 / 100 | 0 / 0 / 100 |

Manual reference defaults retained for old plans are annual compound returns of 5% early, 3% final and 2% attendance; tuition growth 4%, living growth 3%, and general inflation 2.5%. These are illustrative legacy placeholders, used only when manual reference/fixed expense assumptions are selected. Stored legacy arithmetic means and volatilities are not used by the historical assessment.

The fictional example uses $25,000 savings and annual costs of $14,000 tuition, $16,000 housing/food, $1,200 books, $2,000 transport/personal and $1,500 other. These are synthetic demonstration numbers, not national or school estimates. No family target has been agreed.

The source snapshot, retrieval date, transformations and hashes are in [the manifest](../data/manifest.json); licensing and attribution are in [the notice](../data/NOTICE.md). No source confirms future returns, inflation or a specific university's net cost. Tuition CPI is a national index; general CPI is a broad proxy for all non-tuition categories. Bond returns are yield-reconstructed and can be smoother than investable fund returns.

School intake should record academic year, residency, included categories, annual versus term pricing, sticker versus net price, source date and URL. Metadata is optional in the starting form. Blank costs mean zero; omitted categories are not estimated. Never apply a national aid discount or infer account eligibility. Tax/aid/account rules require current official sources if implemented.

As of 2026-11-15, v0.2.3 uses a random unsigned 32-bit seed for each independent tab session rather than UI default 12345. Source: browser crypto.getRandomValues; computational setting, not a financial forecast. The seed is editable and retained through reload using sessionStorage. Identical explicit seed, inputs, model and dataset retain reproducibility.

## v0.3.0 billing and published-budget defaults

As of 2026-11-15; model college-funding-2.1.0. Semester tuition/grants at offsets 0/5 months remain the provisional default. Quarter billing at 0/3/6 months is optional. Nine living months remain default; twelve is optional and does not enlarge annual costs. Cent remainders go to each category's final annual payment. Dated allocation overrides default to none and reflect user choices rather than recommended weights.

Published budget presets are opt-in verified source snapshots, not future school forecasts or net aid offers. See [budget provenance](../data/school-costs.md). They are not copied from the private workbook. Their baseline is September 2026 and source-check date is November 15, 2026. Grants/income/contributions remain user entries. General CPI remains a broad non-tuition proxy.

## v0.4.0 corrections (2026-11-15)

Published tuition uses the entered nominal annual trend (initial 4%, developer illustration, unverified forecast) and demeaned historical tuition-index log changes as a variability proxy. The raw BLS mean includes some financial-aid adjustments and is no longer silently used as a published-price trend. Optional raw index mode is explicitly labeled. Demeaning cannot eliminate aid effects from variability or create school-specific published-price history. Tuition prices are held within the academic year.

Additional stress choices—two percentage points higher fixed cost growth, 20% higher housing/food, no future grants, an extra year, and the existing 25% loss—are uncalibrated alternatives, not assigned likelihoods. Walk-forward and sensitivity results accompany the main model frequency; these do not certify future forecasting accuracy. Gauge colors reflect a selected target, and Monte Carlo sampling intervals exclude model error. Household savings-deposit limits are user-entered USD/month; blank means no limit and zero means no deposits. Funds remain earmarked.

## v0.5.0 ownership

Financial rates and source data are unchanged. Funding and investment assumptions are entered once per student; expense growth is per education path. General grants and school-specific aid are separate nominal USD/year amounts, with independently entered award durations. Defaults remain zero awards and four-year durations as editable planning conventions. Schema 5 intentionally resets older stored plans without migration. Current integer-cent portions distribute remainders across payments and never make a negative payment.
