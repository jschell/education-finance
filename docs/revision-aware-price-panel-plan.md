# Next prerequisite: revision-aware academic-year price panel

Proposed execution plan, 2026-11-17 America/Los_Angeles, following the [completed bounded trace](calibration-price-trace-results.md). This is a data-contract implementation plan, not a frozen economic candidate or an authorization to replace production observations. No new candidate scores have been computed.

## Purpose and scope

The trace found inconsistent same-year values despite Reported flags. Preserve the observation process before fitting another school-cost process. Build a research-only panel from the pinned official annual files and year-specific dictionaries for 2000–2023, retaining every source representation rather than selecting an economically true amount automatically. Do not overwrite `selected.csv.gz`, existing reports, snapshots, gates or the active foundation. No browser scraping, new application dependency, private family data or UI change is needed.

## Record contract

Unique observation key: source archive hash, member, UNITID, charge field and source collection year. Store the dictionary-defined academic year separately; never derive it from an AY suffix. Retain raw amount, parsed amount/status, raw X flag and its same-dictionary label, dictionary title/description identity, directory archive/sector/control/level/campus identity, source URL, member and CSV record ordinal. Explicitly distinguish absent fields, absent school rows, missing/nonpositive amounts, unknown definitions and changed sector/population. A title match is not proof that gross/net reporting practices stayed constant.

Define a separate source-availability record with collection year, known publication date if independently supported, current retrieval date/hash, revision status and evidence for original-vintage identity. Collection year and retrieval date are different concepts from original availability. Archive hash agreement establishes identity with our pinned retrieved files only.

## Views to declare before analysis

1. **Source-coherent transition view:** compare consecutive academic years within the same annual source file, with the same component/residency and an explicit matched definition. This avoids silently stitching a current-year value in one file to a differently revised value in another. Keep current-year-only transitions alongside it; do not discard differences.
2. **Revision view:** for each school/academic-year/component, preserve the original current-year representation and the next two collection-year representations where available. Report lag-specific changes, reversals, flags and definition differences, with missingness. Different endpoints' latest values are not automatically a coherent price path.
3. **Strict as-of view:** use a source at origin only where original availability and vintage are supported. Unknown original publication/vintage status stays unsupported; a later file must never supply a supposedly known earlier observation.
4. **Explicit collection-year proxy for retrospective research:** when strict evidence is unavailable, an optional separately named reconstruction may limit source collection years to strictly before the origin year. This conservative label cutoff still does not recover original publication vintages. Pin the source-manifest version for each reconstruction: a newly retrieved revision creates a new research-panel version, not a silent rewrite of an earlier view. Keep that limitation in every report; do not call this an actual as-of forecast backtest or silently substitute it for strict evidence.

The first release should expose these views and their support audit, not choose among them by model scores. Original and source-coherent observations must remain comparable on matched school/year/definition support. Preserve withheld identities outside any fitting pools and donor/common means. More revised records do not add independent macroeconomic histories or extend unsupported funding horizons.

## Implementation sequence and acceptance

- Commit this plan and the exact source/field/availability policy before producing new panel diagnostics. Download missing files into ignored caches; preserve any newly changed source bytes separately with their own hashes.
- Extend the bounded extractor into a separate snapshot-panel builder with versioned, compressed research outputs and a source/definition manifest. Reuse the tested academic-year parser; retain raw excerpts and status reasons. Do not edit the old extractor/report inputs to make earlier checks pass.
- Add pure selection/view functions and synthetic tests: retrospective value arrives after origin; missing release date; changed bytes; ambiguous academic-year title; changed gross/net basis; missing field/row; sector or identity change; duplicate observation; same-file versus stitched transition. A future revision must not change an earlier strict/proxy view.
- Produce a descriptive support/revision audit on training identities, preserving missingness and overlap. Test exact extraction/reproduction and reconcile selected current-year fields with the original panel. Compare revision distributions by source lag and component without fitting an economic candidate or estimating population prevalence from the 30-event extreme sample.
- Run `npm run check`, Python extraction tests, offline artifact reproduction and optional official archive verification. Update continuity with exact SHA, source support, limitations and the next action.

Exit: every price representation can be traced to source/definition bytes; the declared views reproduce; unsupported availability is visible; and no future source can leak into an earlier reconstruction. If strict original-vintage support is absent, say so. The research proxy may still support limited comparative analysis with the same caveat as existing historical reconstructions.

## Candidate work after the data contract

Only then freeze one coherent candidate and its controls. Separate shared/sector economic changes, temporary school deviations or genuine level shifts, and observation/revision uncertainty. Use known-process tests to check identifiability and prevent persistent growth from absorbing reporting reversals. Retain original-versus-revision-aware input sensitivity and simple cost baselines. Require matched complete-bill scores, withheld-school/sector protections, candidate-specific household funding evidence and supported horizons. Do not automatically activate or remap probabilities when a retrospective score improves.
