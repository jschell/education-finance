# Primary source acquisition — results

Method `source-evidence-acquisition-1.0.0`, as of 2026-11-18 America/Los_Angeles.
The [bounded protocol](source-evidence-acquisition-protocol.md) and
[coverage attribution](coverage-failure-attribution.md) were published at
`baaf6626e5c92f607888280d862b9006c3c1a2dd` before implementing the validator
or making final eligibility decisions. Exploratory lookup and an instrument
download preceded publication; these were disclosed development evidence.

**Eight target documents were acquired. No reporting-population bridge or
strict historical eligibility was established.** This improves source provenance
and the specificity of the remaining evidence requirements; it does not improve
or activate the rejected forecasts.

## Captures and independent price contrasts

Six public-domain NCES PDFs are retained with exact bytes, SHA-256 and source URLs:
2005 and 2006 institutional Data Feedback Reports for Alabama A&M (100654) and
UAB (100663), plus the 2006 and 2007 Institutional Characteristics instruments.
They total 2,689,403 bytes. Two official UAB Common Data Set PDFs were retrieved
and hashed; bounded factual extraction records are retained with document hashes
and section/page locators. The copyrighted PDFs themselves remain temporary.
The [registry](../data/research/source-evidence-acquisition.json) records all
captures, review claims, attempts, derived comparisons and failed eligibility.

The instruments independently support three generic 2006/07 concepts: gross
published in-state tuition/fees, out-of-state tuition/fees and on-campus
room/board for the specified full-time first-time cohort. They explicitly permit
prior-year corrections. These concept checks do not establish the 2004→2005
institutional reporting units or resolve the original six population bridges.

The UAB related-definition contrasts are shown below. Numeric agreement is not
proof that cohort, program, residency weighting or housing/meal basis agrees.

| Academic year | UAB CDS field | CDS amount | Pinned current-year IPEDS amount | Numeric relation |
|---|---|---:|---:|---|
| 2005–06 | G1 in-state tuition + required fees | $4,792 | CHG2AY3 $4,792 | equal |
| 2005–06 | G1 out-state tuition + required fees | $10,732 | CHG3AY3 $10,732 | equal |
| 2005–06 | G5 typical resident room/board | $8,924 | CHG5AY3 $8,924 | equal |
| 2006–07 | G1 in-state tuition + required fees | $4,792 | CHG2AY3 $4,792 | equal |
| 2006–07 | G1 out-state tuition + required fees | $10,732 | CHG3AY3 $10,732 | equal |
| 2006–07 | G5 typical resident room/board | $9,080 | CHG5AY3 $12,266 | different |

The later 2007 IPEDS representation CHG5AY2 for 2006–07 is $9,080, numerically
matching CDS. That agreement is a source-comparison lead, not proof that the
original $12,266 was incorrect or that $9,080 is an economically true replacement.
G5 concerns a typical full-time undergraduate resident; the IPEDS dictionary
specifies its own first-time attendance cohort and average on-campus basis.
G1 room and meal prices must not be substituted for G5 or averaged arbitrarily.
All six contrasts retain the definition uncertainty. No price was repaired.

## Publication and population findings

DFRs are dated institutional reports with their own tuition/fee definition and
lowest-residency-category presentation. They provide useful fixed-report source
leads, distinct from today's full annual CSV data. Indexed current NCES policy
says historical DFRs preserve provisional content rather than later final/revised
releases. The official policy page could not be captured because its current
HTTP route entered a redirect loop; this is retained as indexed primary guidance
with a null raw capture, not a pinned historical publication certificate.

Neither the policy nor a printed report date verifies the exact original price
AND directory file bytes available at an origin. No independently reviewed
contemporaneous byte-capture/release record was acquired. None of the reports
explicitly certifies unchanged campus aggregation/reporting population across
2004→2005. The records therefore retain **zero supported institution-population
claims, zero strict eligible pairs, zero applied bridges and zero historical fits**.
The two tested institution pairs remain blocked. The existing graphs, source
registries, models, financial defaults and both rejected scientific outcomes are
unchanged.

The exact next missing evidence is an institution-specific 2004/05 reporting-unit
crosswalk or completed-form aggregation record for each target, plus independent
original price/directory release captures tied to exact bytes. A DFR could support
only its printed fields under a separately scoped report-specific source contract;
it cannot silently stand in for the full historical CSV or establish housing.
No additional optimizer or larger synthetic batch can supply these documents.

## Validation and limitations

The new validator verifies retained byte hashes, independently reconciles all six
numeric contrasts against the pinned institution extracts and panel rows, and
checks exact scope/from-to source provenance before any continuity support.
Original-vintage proof additionally requires a bound external archive/release
record and distinct independent source-identity review; current-policy assertions,
printed dates and unbound local timestamp JSON fail closed.

The validator checks the consistency of pinned evidence and recorded human review.
It does not cryptographically authenticate an archive provider or establish the
truth of a review assertion by itself. Synthetic positive fixtures exercise the
conditional acceptance mechanism; they are not real institution proofs. Every
historical-fit, graph-application and production-activation flag stays false.

Local validation passes 14 meaningful source tests, including eleven independent
adversarial checks. Cases cover tampered captures, scope/year mismatch, semantic-only
or unknown population, missing/late/current-policy timestamps, asymmetric
price/directory proof, exact source mismatch and altered numeric comparisons.
The application check runs the existing 216 Node/financial tests. Dedicated
[CI](../.github/workflows/source-evidence.yml) revalidates all evidence offline;
read its exact-head outcome before claiming CI acceptance.

```sh
python scripts/source_evidence.py
python -m unittest discover -s tests -p 'source_evidence*test.py'
npm run check
```

This bounded acquisition pass is complete. The reproducible source corpus and
fail-closed proof checks are available; production calibration remains blocked
by identifiable missing evidence. Any future report-specific source contract or
different predictor requires its own documented scope and evaluation evidence.
