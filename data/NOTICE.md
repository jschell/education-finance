# Historical data attribution

Application code is MIT licensed. The historical observations have separate sources and attribution; the MIT license does not relicense upstream data.

- **Equities and cash:** Fama/French monthly research factors, legacy FIZ snapshot through December 2024. Copyright Eugene F. Fama and Kenneth R. French. Source: https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html . Pinned decimal CSV snapshot: https://github.com/travlake/retirement_viz/blob/71dc93acd53b521af01b587867027a5c5ff58f1f/mktrf.csv . No simulator code was copied from that project.
- **US bond-return proxy and general CPI:** Birju Patel, ReturnDataFiles, commit 7ca64f271c2022f4a022424c9d5173dbe6b68ce2. Repository declares CC0-1.0: https://github.com/birjusuketupatel/ReturnDataFiles . Bond returns are yield-reconstructed nominal US 10-year sovereign returns, not returns of an actual fund. US-only rows are retained; the upstream full-file hash is recorded.
- **College tuition and fees:** U.S. Bureau of Labor Statistics, CPI-U college tuition and fees, CUUR0000SEEB01, not seasonally adjusted. https://data.bls.gov/timeseries/CUUR0000SEEB01 . Retrieved via https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SEEB01 with startyear/endyear query parameters. See raw response files and manifest hashes.

`python3 scripts/prepare_history.py` reproducibly builds `site/data/history.json` from the committed inputs without network access. The common complete period is January 1978–December 2024. Dataset ID, raw hashes, derived-observation hash and transformations are in `manifest.json` and the bundled data file.

School-budget preset data also has separate attribution and source terms. See [published budget snapshots](school-costs.md). Application MIT licensing does not relicense College Board or university source content.

Runtime model 3.0.0 additionally offers published-price planning using a user-specified annual tuition trend with demeaned BLS tuition-index log changes as an imperfect variability proxy. The source snapshot/checksum is unchanged. The mean adjustment does not convert the source into pure gross tuition history or remove aid effects from volatility. Raw index mode remains explicitly selectable. See [BLS pricing methodology](https://www.bls.gov/cpi/factsheets/college-tuition.htm).

## Economic calibration snapshot (2026-11-16)

MIT applies to application code, not upstream source content. Pinned raw NCES federal statistical table and Philadelphia Fed SPF data workbooks are retained for reproducibility with original attribution; see their source terms. No Vanguard article or proprietary simulation code is copied; the cross-check records two published numerical range endpoints and source/date/hash.

- NCES Digest 2024 Table 330.10: https://nces.ed.gov/programs/digest/d24/tables/dt24_330.10.asp (prepared November 2024, levels through 2023–24). Public tuition is in-district; room/board covers institutions reporting on-campus charges.
- Philadelphia Fed SPF: https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/survey-of-professional-forecasters . STOCK10/BILL10 are annual-average return forecasts; BOND10 is expected Treasury yield. Common forecast/dispersion vintage 2026Q1, despite later CPI releases being present. Original workbook URLs and raw hashes are in the calibration manifest.
- Vanguard public equity outlook: https://corporate.vanguard.com/content/corporatesite/us/en/corp/vemo/vemo-return-forecasts.html . September 30, 2026 US equity ten-year 4.8–6.8% forecast range around its median, not a predictive confidence interval. Used only as an alternative expectation anchor; no affiliation or replication of Vanguard's model is claimed.

## Fixed-institution IPEDS panel (v0.7.0)

NCES federal statistical data: https://nces.ed.gov/ipeds/use-the-data . Annual IC academic-year charges and directory SECTOR classifications, 2000–2023, matched by UNITID. The compact `raw/ipeds/selected.csv.gz` retains needed original fields, normalized names/whitespace and source X flags. `raw/ipeds/sources.json` records original archive/member names, URLs and SHA-256; the full archives can be recovered by the explicit fetch script. The IC2023_AY dictionary is pinned separately for field definitions. Missing and zero prices are not imputed by this application. Source flags are reported and counted. Full-period complete-record/unchanged-sector selection excludes closures, sector changes and incomplete records, creating survivorship selection. No school names or family data are introduced. Application MIT does not relicense source content.
