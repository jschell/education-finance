# Immutable source-backed forecast outcomes

No current-model future outcome is available at the initial record date. Missing outcomes stay missing.

Store original public source bytes in `sources/`, retain their URL and SHA-256, and review population/price/component membership before extracting indices. Do not commit private family data. Create an exclusive new observation record with `scripts/record-forecast-outcome.mjs`; never edit a forecast to match an outcome. A matching source-file digest proves byte identity, not that manually extracted values or definitions are correct.

Use academic-year price indices with the same definition ID and bundle identity as the selected snapshot. Both observed baseline and target are required for normalized synthetic-price scoring. Future publication dates, unreached target years, mismatched definitions, nonpositive indices and duplicate sector/year records are rejected. See `docs/forecast-calibration-results.md` for the field contract and commands.
