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

## State model sources and new cost check (v0.8.0)

Federal Reserve Board H.15 via FRED GS5 and TB3MS monthly tables, retrieved 2026-11-16: https://fred.stlouisfed.org/data/GS5 and https://fred.stlouisfed.org/data/TB3MS . Original HTML tables are gzip-pinned; rows after the first 1,000 are extracted from FRED's extra-rows text, not omitted. GS5 is an annual investment-basis quote; TB3MS is an annual bank-discount quote. Values are divided by 100 exactly once. Initial yields are from October 2026, the latest common observation. Federal government statistics are attributed; application MIT does not relicense source page content. No FRED UI or analytics code is copied.

NCES COST1_2024 and its dictionary use the newer /ipeds/complete-data-files/ download path, while HD2024 was downloaded from the earlier /ipeds/datacenter/data/ endpoint. New dictionary confirms CHG2AY3/CHG3AY3/CHG5AY3 refer to 2024–25 published charges. Original archives and exact SHA-256 are pinned in data/raw/economy and data/cost-holdout-2024.json. Remaining complete original panel IDs are used on both sides of the new price comparison, avoiding a composition jump. No additional institutions are selected based on observed growth.

## Broad macro history (v0.9.0)

The already pinned Fama/French monthly factors (1926 onward), BLS general CPI (1913 onward), and FRED GS5/TB3MS source tables support seventy complete September–August macro years, 1954–2023. No new data vendor or reconstructed pre-2000 school charges are introduced. `economy-broad.json` links original raw hashes, keeps the college history separate, and records the disjoint-window/regularization policy. Explicit older-year cost donors are model samples from the existing school-price panel, never represented as measured historical school prices.
