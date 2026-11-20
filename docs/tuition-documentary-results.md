# Dated tuition documentary evidence — results

Method `tuition-documentary-1.0.0`, as of 2026-11-18 America/Los_Angeles.
The [contract](tuition-documentary-protocol.md) was published at
`1217d471311c197d9cd7e821b599e9d73f75a87a` before implementation and systematic
transcription. Previously explored UAB labels and preservation-policy context
were explicitly disclosed. This is documentary source work, not a new model trial.

**The fixed corpus has eleven readable facts and one unreadable slot.**
All four dated reports were reused from the accepted source corpus; no new
acquisition or predictor was introduced. A second reviewer independently read
all twelve institution-series slots and checked the date and measure pages.

## Fixed twelve-slot corpus

Amounts are annual published tuition plus required fees for the reports'
full-time first-time degree/certificate-seeking undergraduate cohort, using the
lowest reported residency category. They must not be relabeled as in-state
costs, net prices or housing. Years below are academic-year starting years.

| Institution | Report | Printed issue date | Academic years and institution-series amounts |
|---|---:|---|---|
| Alabama A&M, 100654 | 2005 | September 1, 2005 | 2002: $3,040; 2003: $3,352; 2004: $4,420 |
| Alabama A&M, 100654 | 2006 | September 7, 2006 | 2003: $3,352; 2004: $4,420; 2005: $4,420 |
| UAB, 100663 | 2005 | September 1, 2005 | 2002: $3,880; 2003: $4,274; 2004: $4,662 |
| UAB, 100663 | 2006 | September 7, 2006 | 2003: unreadable; 2004: $4,662; 2005: $4,792 |

The 2006 UAB 2003–04 institution and comparison-group labels overlap. Its numeric
value remains null; no value was inferred from the other report, panel or plot
position. All points remain in the twelve-slot denominator. The legible labels
belong to the institution's solid line, not the comparison-group median.

Each printed date is independently bound to physical PDF page 2. Figure 3 is on
page 3; the methodology on page 8 binds the full-time first-time cohort and
lowest tuition rate when residency rates differ. The 2005 figure lacks the later
figure's explicit lowest-residency note, so page 8 is essential evidence.

## Repeated-year comparisons

| Institution | Academic year | 2005 report | 2006 report | Result |
|---|---|---:|---:|---|
| Alabama A&M | 2003–04 | $3,352 | $3,352 | equal |
| Alabama A&M | 2004–05 | $4,420 | $4,420 | equal |
| UAB | 2003–04 | $4,274 | unavailable | unavailable |
| UAB | 2004–05 | $4,662 | $4,662 | equal |

Three of four prespecified overlap comparisons are readable and equal; one is
unavailable. There are zero observed differences among the three readable pairs.
This is a small same-label documentary cross-check, not evidence of unchanged
campus aggregation, a population-wide revision rate or a preferred price series.
The original research panel and both rejected models remain unchanged.

## Proof level and practical use

The [registry](../data/research/tuition-documentary.json) qualifies the eleven
readable slots only as **date-claimed documentary facts**. A printed issue date
does not certify that today's PDF bytes were downloadable then. The preceding
indexed NCES preservation-policy lead is retained with its null raw HTML capture
and redirect-loop failure. It is not promoted into original-byte-vintage proof.

The corpus is useful for a separate tuition-only source audit with exact report,
page, year, measure and legibility provenance. It supplies no housing, complete
paired history, reporting-population bridge, original price-plus-directory
eligibility, historical fit or production qualification. All those stronger
flags remain false or zero. No forecast improvement is claimed by this pass.

## Verification and stopping point

The validator checks the exact four-document/twelve-slot grid, pinned PDF hashes,
printed date text on the actual letter page, the methodology page, independent
review, correct institution series, legibility and proof restrictions. It derives
all four comparisons and the summary from the retained slots. It rejects missing
or duplicate slots, changed sources, unsupported years, comparison-series
substitution, values assigned to unreadable labels, missing reviewers, unbound
dates, nested stronger proof claims and altered comparisons. The validator checks
consistency of pinned evidence and review; it does not authenticate an external
publisher or manufacture original publication proof.

Local verification passes eight independent documentary test methods, the
fourteen source-evidence tests and the existing 216 Node/financial checks. PDF
page extraction uses Poppler's `pdftotext`; this concrete dependency permits CI to
verify date/measure text directly from the pinned PDFs rather than trusting
unbound metadata. The [dedicated workflow](../.github/workflows/tuition-documentary.yml)
rechecks these facts offline. Its exact-head outcome must be observed before
claiming CI acceptance.

```sh
python scripts/tuition_documentary.py
python -m unittest discover -s tests -p 'tuition_documentary*test.py'
python -m unittest discover -s tests -p 'source_evidence*test.py'
npm run check
```

This four-report pass is complete. The remaining blockers for full historical
calibration still require institution-specific reporting-unit evidence and
original price/directory availability tied to exact bytes. Do not expand this
corpus or tune rejected forecasts merely to obtain a more favorable result.
