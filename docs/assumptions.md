# Assumption register

As of 2026-11-15; model `college-funding-2.0.0`. Historical observations are verified against a pinned snapshot, not verified forecasts. Portfolio weights and planning conventions are provisional developer choices and user-editable.

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
