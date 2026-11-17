# Prospective synthetic cost record

The first snapshot, [2026-11-16-model9.json](2026-11-16-model9.json), was created before future outcomes in [CI run 43989512630](https://github.com/jschell/education-finance/actions/runs/43989512630), from source commit `9424995d4683b863e0a80fe461cd32b5b86be159`. It is preserved byte-for-byte, with its original canonical SHA-256, source hashes, model/bundle identities, training cutoffs and null future outcomes. The source revision is available in GitHub for reproduction.

Budgets are fictional: $10,000 tuition plus $10,000 housing at the stated baseline month. The snapshot records annual tuition/housing cost forecasts 1/2/5/10/18 years ahead using the production path factory. It is not a forecast for a particular school or family, and it does not establish calibrated coverage.

Create a later record explicitly:

```sh
node scripts/create-forecast-snapshot.mjs --as-of YYYY-MM-DD --output data/forecast-snapshots/NEW_UNIQUE_FILE.json
```

The command rejects invalid dates and uses exclusive file creation; it cannot overwrite an existing record. Later generator versions also embed the source commit when GitHub Actions supplies it. Changed source hashes in an older record are historical provenance, not a reason to rewrite that record.

Future outcomes must be linked to their actual source, publication date, price definition and the corresponding forecast target. Missing/unreached outcomes remain null and must never count as successes. Observations belong in separate source-backed records; do not edit the original forecast to match them. No recurring automation or private family data is involved.


## Future scoring definition

For this public-four-year normalized-budget record, use the fixed institution/component membership and tuition/housing definitions identified by its bundle/source hashes. The baseline academic-year index is the as-of calendar year (2026); the target is 2026 plus the stated horizon. Once comparable observations exist, normalize the observed annual tuition/housing bill as:

```text
observed = 10000 * tuition_index_target / tuition_index_2026
         + 10000 * housing_index_target / housing_index_2026
```

These are annual academic-year prices, not a school-specific November invoice. Record when both baseline and target data were actually published. If attrition, reclassification or changed definitions prevent comparable scoring, mark the outcome unavailable with the reason; do not silently change membership, substitute the 2023 baseline, or count missing outcomes as funded. Leave the original snapshot intact.
