# Revision-aware price panel — implementation and findings

2026-11-17 America/Los_Angeles. Implements the [committed plan](revision-aware-price-panel-plan.md) and [pre-diagnostic execution contract](revision-aware-panel-execution.md), committed at `651b198`. Base main `798d6d4e8e1f40ea24c83f7ba4ffcf8d7a7bbb75`. This is research data infrastructure and descriptive evidence; app 0.15/core model12/schema5 and the active foundation remain unchanged.

## Delivered

- **24 compressed annual research shards**, source collections 2000–2023, with **1,900,467 observation records** in approximately **11.7 MB**. All 48 official price/directory archive hashes match their previously pinned identities. Raw price strings/flags, parsed values/statuses, source/dictionary field/academic-year identities and directory records remain available. Shared metadata is normalized into the manifest, not duplicated in every record.
- Missing component rows, blank amounts, dot markers, nonpositive/source codes, absent fields, undefined academic years and changed populations remain explicit. A missing source row can simply mean an institution does not report this academic-year component; it is not automatically a reporting error.
- Pure same-source transition, revision, strict as-of and separately labeled collection-year-proxy functions. Source and availability metadata must match the pinned manifest version. Later revisions, new source hashes or post-hoc availability edits cannot silently enter an earlier reconstruction.
- Full original-panel reconciliation: **327,267 current-year values/flags** and **109,089 directory sectors** match exactly. Original datasets, snapshots and prior evidence remain intact.

[Panel manifest](../data/research/ipeds-price-snapshots/manifest.json) · [Descriptive audit](../data/calibration-diagnostics/revision-price-panel.json) · [Pure views](../scripts/price-panel/views.mjs) · [Builder](../scripts/build_revision_price_panel.py)

## Availability findings

**No source has independently verified original publication/vintage evidence. Strict historical as-of support is therefore zero**, rather than inferred from annual filenames or our retrieval date. At example origins 2011/2015/2020/2026 the collection-year proxy permits 11/15/20/24 collections respectively, but those are explicitly retrospective research proxies. They do not become original-vintage backtests.

Both price and directory availability are required for strict eligibility. The proxy requires collection year strictly before the origin year and pins the source-manifest version. Future collection rows or changed-byte sources cannot alter an earlier version-pinned view. A newly reviewed availability record or source revision requires a new panel version.

## Matched-support diagnostic results

The audit uses only the previously fixed origin-2010 **known/training identities**. Withheld identities are not used for these common/input diagnostics. Matched transitions cover 2000→2001 through 2022→2023 when definitions, amounts and directory population are comparable. Definition-text changes are marked incomparable; they are not automatically asserted to be actual population changes.

Threshold counts below use **absolute nominal annual log change >0.25**, without CPI adjustment, on identical matched rows. This is a descriptive threshold, not a new promotion gate. The earlier 30-event trace used real changes and an earlier end year; its counts are a different question and remain unchanged. Revisions compare the same academic year to the next one/two annual collections on matched definition/population support.

| Sector | Component | Matched transitions | Stitched extremes | Same-file extremes | Lag-1 changed / comparable | Lag-2 changed / comparable |
| --- | --- | --- | --- | --- | --- | --- |
| public4 | tuition | 6,295 | 53 | 38 | 310 / 6,295 | 392 / 5,582 |
| public4 | housing | 5,948 | 63 | 45 | 233 / 5,948 | 267 / 5,242 |
| public4out | tuition | 6,295 | 112 | 74 | 395 / 6,295 | 502 / 5,582 |
| public4out | housing | 5,948 | 63 | 45 | 233 / 5,948 | 267 / 5,242 |
| public2 | tuition | 2,201 | 58 | 47 | 182 / 2,201 | 215 / 1,937 |
| public2 | housing | 2,066 | 59 | 56 | 131 / 2,066 | 136 / 1,800 |
| public2out | tuition | 2,201 | 91 | 65 | 203 / 2,201 | 257 / 1,937 |
| public2out | housing | 2,066 | 59 | 56 | 131 / 2,066 | 136 / 1,800 |
| private4 | tuition | 11,425 | 85 | 76 | 576 / 11,425 | 692 / 10,111 |
| private4 | housing | 10,805 | 91 | 87 | 390 / 10,805 | 400 / 9,491 |

On this support, same-file transitions have fewer extreme changes in every sector/component. That identifies an input-construction sensitivity, not an economically true replacement series or evidence that reducing forecast uncertainty is correct. Genuine large changes remain. Housing observations overlap across residency sectors, schools share macro years, and this complete-history training cohort is not a representative population. The full report retains statuses, quantiles, flags and missing comparisons; denominators are not silently equalized after selection.

A title/description signature can detect text differences but cannot prove that gross/net reporting stayed constant when the words did not change. All resulting observed levels keep a gross/net-continuity-unreviewed label. Nothing is automatically repaired, spliced into production or promoted to a new economic forecast.

## Validation and reproduction

Synthetic tests cover later revisions, changed source bytes, missing publication evidence, price-versus-directory availability, ambiguous years, gross/net basis differences, population changes, missing fields/rows, duplicate keys and source-coherent versus stitched transitions. Extraction tests cover UTF-8 BOM and CP1252 names, raw dot/negative/zero statuses and deterministic compression. The builder's manifest identity uses the existing ten-decimal canonical convention and is checked independently in JavaScript.

```sh
npm run check
python -m unittest discover -s tests -p 'price*extract_test.py'
node scripts/audit_revision_price_panel.mjs
# Full source rebuild, isolated pinned readers; downloads absent archives only:
uv run scripts/build_revision_price_panel.py --fetch --verify
```

Ordinary CI verifies all shard/manifest/source identities and regenerates the descriptive audit offline. The manual official-source workflow can re-extract the full panel from pinned archives. Full source verification and artifact/regeneration outcomes are recorded in continuity; no physical-device or new economic-calibration claim follows from these checks.

## Next concrete step

The source-panel prerequisite is implemented. **Freeze one matched-input cost-candidate protocol and its known-process tests before fitting or scoring.** Compare original stitched and source-coherent inputs under the same explicit collection-year proxy, preserve strict-as-of unavailability, and keep the existing economic baseline. Separate input-policy sensitivity from changes to the economic process; do not select the input view by whichever gives the best held-out score.

The candidate must distinguish genuine shared/sector cost changes, school-level temporary deviations or level shifts, and observation/revision uncertainty. Test synthetic reporting reversals and genuine price jumps as different known processes; do not turn either automatically into permanent school-growth dispersion. Source revisions do not uniquely identify an economically true latent price, so retain matched alternative-representation sensitivity rather than assuming the newest file is ground truth.

Require simple cost baselines, withheld-school/sector protections, complete-bill scores and candidate-specific household funding evidence. Retain failed comparisons and unsupported horizons, including unavailable long-wait household outcomes. Production activation and future probability calibration remain separate decisions supported by their own evidence. No candidate was fitted or scored in this data-panel release.
