# Large-price-change source trace — results

2026-11-17 America/Los_Angeles. Executed from main `aeaeedd994bc4e2c9f55f7a4ac1dca2466421c16` under the [previously committed plan](calibration-price-trace-plan.md). Execution checkpoint `aa14424` and the **fixed registry commit `2367a97` preceded source retrieval**. This is a source investigation; app 0.15, core model12, schema5, original data, economic defaults and existing evidence remain unchanged.

## Main finding

**The current-year-only price series contains source-vintage inconsistencies that a Reported-only flag filter cannot detect.** Among the fixed 30 extreme sector/component events, 21 have at least one endpoint represented differently in a later annual file. Those 21 represent 16 unique school/component transitions; the full registry represents 23 school transitions at 16 institutions. Overlapping residency sectors are retained, not counted as independent evidence.

All **32 official price/directory archives** across 2001–2016 match their pinned SHA-256 values. Excerpts contain 77 price-source rows, matched directory records and year-specific dictionary definitions. Every original excerpt matches the selected panel's amount and flag. All 180 endpoint/snapshot comparisons are available, including 120 later comparisons; **53 later values differ** from their original current-year representation. All 60 original endpoint flags and all 53 changed later flags mean **Reported**. No directory-sector change is observed in the checked rows.

Nine selected events are unchanged across all four later comparisons. That does not prove a real economic change. The extreme-selected review set cannot estimate population error prevalence, explain all forecast error, choose a correct price automatically or validate any candidate.

[Fixed registry](../data/calibration-diagnostics/price-trace-registry.json) · [Source excerpts and dictionary mappings](../data/calibration-diagnostics/price-trace-sources.json) · [Full source-identified comparisons](../data/calibration-diagnostics/price-trace-comparison.json) · [Independent primary context](../data/calibration-diagnostics/price-trace-context.json)

## Per-event findings

Each endpoint sequence is **original file → next annual file → second later annual file**, all mapped to the **same academic year** by dictionary text. The two endpoint sequences use different source-file years; these are comparisons, not a proposed corrected price trajectory. “Changed” means at least one retrospective value differs; “stable” means all four later values match. Every event's exact economic cause remains incompletely reconciled.

| Sector / component | Institution (UNITID) | Transition | Earlier endpoint snapshots ($) | Later endpoint snapshots ($) | Source result |
| --- | --- | --- | --- | --- | --- |
| public4 / tuition | Fort Lewis College (127185) | 2004–2005 | 2,270 → 3,060 → 3,060 | 5,692 → 5,692 → 5,692 | Changed |
| public4 / tuition | Miami University-Oxford (204024) | 2003–2004 | 8,353 → 8,353 → 8,353 | 19,642 → 19,642 → 19,642 | Stable |
| public4 / tuition | Miami University-Oxford (204024) | 2006–2007 | 22,997 → 22,997 → 22,997 | 10,554 → 11,443 → 11,875 | Changed |
| public4 / housing | Rogers State University (207661) | 2001–2002 | 1,534 → 1,534 → 1,534 | 5,360 → 5,360 → 5,360 | Stable |
| public4 / housing | Texas A & M University-Commerce (224554) | 2012–2013 | 9,420 → 7,150 → 7,150 | 3,150 → 7,150 → 7,150 | Changed |
| public4 / housing | Texas A & M University-Commerce (224554) | 2013–2014 | 3,150 → 7,150 → 7,150 | 7,580 → 7,580 → 7,580 | Changed |
| public4out / tuition | The University Of West Florida (138354) | 2006–2007 | 13,702 → 2,860 → 13,702 | 2,860 → 13,702 → 14,069 | Changed |
| public4out / tuition | The University Of West Florida (138354) | 2007–2008 | 2,860 → 13,702 → 14,069 | 14,170 → 14,332 → 14,332 | Changed |
| public4out / tuition | Western State College Of Colorado (128391) | 2004–2005 | 2,763 → 2,763 → 2,763 | 11,754 → 11,754 → 11,754 | Stable |
| public4out / housing | Rogers State University (207661) | 2001–2002 | 1,534 → 1,534 → 1,534 | 5,360 → 5,360 → 5,360 | Stable |
| public4out / housing | Texas A & M University-Commerce (224554) | 2012–2013 | 9,420 → 7,150 → 7,150 | 3,150 → 7,150 → 7,150 | Changed |
| public4out / housing | Texas A & M University-Commerce (224554) | 2013–2014 | 3,150 → 7,150 → 7,150 | 7,580 → 7,580 → 7,580 | Changed |
| public2 / tuition | Ilisagvik College (434584) | 2005–2006 | 720 → 2,980 → 2,980 | 2,980 → 2,980 → 2,980 | Changed |
| public2 / tuition | Ilisagvik College (434584) | 2003–2004 | 1,730 → 650 → 650 | 650 → 650 → 2,500 | Changed |
| public2 / tuition | College Of The Redwoods (121707) | 2002–2003 | 288 → 288 → 288 | 641 → 641 → 641 | Stable |
| public2 / housing | Bevill State Community College (102429) | 2007–2008 | 5,535 → 2,250 → 2,250 | 2,250 → 2,250 → 2,250 | Changed |
| public2 / housing | Dawson Community College (180151) | 2008–2009 | 2,100 → 4,800 → 4,800 | 4,800 → 4,800 → 4,800 | Changed |
| public2 / housing | University Of New Mexico-Los Alamos Campus (187976) | 2001–2002 | 2,250 → 2,250 → 2,250 | 5,300 → 5,300 → 5,300 | Stable |
| public2out / tuition | College Of The Redwoods (121707) | 2013–2014 | 1,140 → 1,140 → 6,804 | 6,846 → 6,846 → 6,846 | Changed |
| public2out / tuition | College Of The Redwoods (121707) | 2012–2013 | 5,628 → 1,140 → 1,140 | 1,140 → 1,140 → 6,804 | Changed |
| public2out / tuition | Ilisagvik College (434584) | 2005–2006 | 720 → 2,980 → 2,980 | 2,980 → 2,980 → 2,980 | Changed |
| public2out / housing | Bevill State Community College (102429) | 2007–2008 | 5,535 → 2,250 → 2,250 | 2,250 → 2,250 → 2,250 | Changed |
| public2out / housing | Dawson Community College (180151) | 2008–2009 | 2,100 → 4,800 → 4,800 | 4,800 → 4,800 → 4,800 | Changed |
| public2out / housing | University Of New Mexico-Los Alamos Campus (187976) | 2001–2002 | 2,250 → 2,250 → 2,250 | 5,300 → 5,300 → 5,300 | Stable |
| private4 / tuition | College Of The Ozarks (178697) | 2002–2003 | 200 → 200 → 200 | 11,150 → 11,150 → 11,150 | Stable |
| private4 / tuition | Saint Louis Christian College (179256) | 2005–2006 | 501 → 8,400 → 8,400 | 8,790 → 8,790 → 8,790 | Changed |
| private4 / tuition | Saint Louis Christian College (179256) | 2004–2005 | 7,200 → 7,200 → 7,620 | 501 → 8,400 → 8,400 | Changed |
| private4 / housing | Baker College Of Flint (168847) | 2006–2007 | 850 → 2,550 → 2,550 | 2,565 → 2,565 → 2,565 | Changed |
| private4 / housing | Southern Baptist Theological Seminary (157748) | 2002–2003 | 6,372 → 6,372 → 6,372 | 2,400 → 2,400 → 2,400 | Stable |
| private4 / housing | Shasta Bible College And Graduate School (123280) | 2012–2013 | 6,100 → 6,000 → 6,000 | 2,400 → 2,799 → 2,799 | Changed |

## Independent institutional context and rejected explanations

- **Miami, 2003→2004 and 2006→2007:** [Board ordinance O2008-2, February 8, 2008](https://miamioh.edu/_files/documents/about-miami/president/bot/minutes-archive/Minutes_02-08-08.pdf) documents a single gross tuition introduced in 2003, resident scholarships, and resident net reporting. For 2007–08 it gives gross $23,874 and resident net maximum $11,443. That supports a reporting-basis mechanism, and $11,443 matches the first later representation of the selected 2007 endpoint. It does not reconcile every amount, including $10,554 and $11,875. Keep the unresolved differences; do not automatically replace one with another.
- **Redwoods, 2002→2003:** the [district's 2003–04 audit, printed page 10](https://www.redwoods.edu/services/bo/reports/audited_financial_statement/2003-04_RedwoodsCCD_AuditFS.pdf) documents a state enrollment-fee increase from $11 to $18 per semester unit. A real policy change occurred. Credit loads and other fees still need reconciliation before attributing the full $288→$641 annual change to that policy.
- **Commerce, housing:** the [CDS file with a 2013–2014 cover](https://inside.tamuc.edu/aboutus/ier/IR/documents/common-data-set/CDS_2013-2014.pdf) lists $7,150, but expense section G1 explicitly requests **2014–2015** costs. Reject a same-year match inferred from its filename or matching dollar amount. This does not resolve the 2012/2013 housing revisions. Its binary download returned 404; the section was reviewed through the web PDF reader, and no local PDF hash or binary verification is claimed.
- **Remaining events:** source agreement/revision is established, but independent economic causes remain unresolved in this bounded review. Modern College of the Ozarks aid descriptions cannot establish its 2002/2003 definition; an Albuquerque campus budget cannot explain UNM–Los Alamos; Colorado COF context and tuition-only tables do not reconcile tuition-plus-fee endpoints automatically. No explanation was fabricated from a reversal, flag, coincidental dollar match or modern policy page. Additional institutional retrieval was not pursued for every revised record after its source inconsistency was established.

The [contemporary 2006 NCES form, instructions page 7](https://nces.ed.gov/ipeds/use-the-data/download-survey-material/2006/institutional%20characteristics/icay_2yr_form.pdf) explicitly permits prior-year price corrections in the current collection. The same definition/academic year can therefore have different annual-file representations. Raw archive hashes and exact field/year/record identities are essential; flag filtering alone is insufficient.

Three independent context PDFs were downloaded and short excerpts verified against their pinned bytes; the Commerce PDF is explicitly web-reader-only. The manifest records URL, document date, exact excerpt, PDF page where verified, binary status and limitations. Full archives/PDFs stay in ignored caches; small research excerpts are committed. No current-year raw data or selected panel was replaced.

## Reproduce and checks

```sh
node scripts/select-price-traces.mjs
node scripts/compare-price-traces.mjs
python -m unittest discover -s tests -p price_trace_extract_test.py
npm run check
# Official archive check, with pinned isolated readers; network only if cache absent:
uv run scripts/extract_price_trace_sources.py --fetch --verify-excerpts
```

The registry, comparison and source excerpts reproduce byte-for-byte locally; institutional context remains a separately reviewed source record. Offline CI regenerates the registry/comparison and checks source identities plus synthetic extraction/comparison cases. The manual `Verify official price-trace source excerpts` workflow independently refetches price/directory archives and checks the extracts; ordinary CI does not require NCES availability. Archive-byte verification was completed locally against all 32 sources. Institutional context is manually reviewed, not an automated cause classifier.

Final [CI 44229411339](https://github.com/jschell/education-finance/actions/runs/44229411339) passed **190 Node tests and three Python extraction tests**, all old/new artifact reproductions and browser regressions. [PR #10](https://github.com/jschell/education-finance/pull/10) merged at `e37db347fa349ded86b636080cbcc43ed6fa994d`. No application files were changed.

## Model implications and next action

The previous Reported-only sensitivity changed coverage very little. That remains valid for its frozen question; it did **not** test consistency across annual-file representations of the same price. The new source evidence must not be misrepresented as reversing the old result or showing that every large price change is an error.

Follow the committed [revision-aware panel plan](revision-aware-price-panel-plan.md). Next implement a **source-snapshot and academic-year price panel**, preserving original values, flags, semantic definitions and revisions side by side. Define an as-of availability contract before fitting: an origin must never use a later annual file's retrospective value merely because it is now known. Current historical downloads are revised files, so even annual-file labels cannot establish original publication-vintage availability. Any collection-year reconstruction must remain explicitly weaker evidence unless release vintages can be recovered.

Use this panel to separate three hypotheses: genuine common/sector cost changes; school-level price or gross/net definition changes; and measurement/revision noise. Preserve temporary deviations and unresolved persistent level shifts in known-process checks. Do not turn extreme log changes directly into permanent school growth-rate dispersion or widen every forecast indiscriminately.

Only then commit one coherent candidate/protocol, including original-versus-revision-aware input sensitivity, simple cost baselines, withheld-school/sector protections, complete-bill scores, household funding evidence and unsupported horizons. No revised candidate is fitted, scored or activated by this audit. Future prospective outcomes remain pending.
