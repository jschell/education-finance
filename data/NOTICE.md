# Historical data attribution

Application code is MIT licensed. The historical observations have separate sources and attribution; the MIT license does not relicense upstream data.

- **Equities and cash:** Fama/French monthly research factors, legacy FIZ snapshot through December 2024. Copyright Eugene F. Fama and Kenneth R. French. Source: https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html . Pinned decimal CSV snapshot: https://github.com/travlake/retirement_viz/blob/71dc93acd53b521af01b587867027a5c5ff58f1f/mktrf.csv . No simulator code was copied from that project.
- **US bond-return proxy and general CPI:** Birju Patel, ReturnDataFiles, commit 7ca64f271c2022f4a022424c9d5173dbe6b68ce2. Repository declares CC0-1.0: https://github.com/birjusuketupatel/ReturnDataFiles . Bond returns are yield-reconstructed nominal US 10-year sovereign returns, not returns of an actual fund. US-only rows are retained; the upstream full-file hash is recorded.
- **College tuition and fees:** U.S. Bureau of Labor Statistics, CPI-U college tuition and fees, CUUR0000SEEB01, not seasonally adjusted. https://data.bls.gov/timeseries/CUUR0000SEEB01 . Retrieved via https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SEEB01 with startyear/endyear query parameters. See raw response files and manifest hashes.

`python3 scripts/prepare_history.py` reproducibly builds `site/data/history.json` from the committed inputs without network access. The common complete period is January 1978–December 2024. Dataset ID, raw hashes, derived-observation hash and transformations are in `manifest.json` and the bundled data file.
