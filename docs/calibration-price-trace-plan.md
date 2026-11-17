# Next audit: trace large price changes and reversals

Planned 2026-11-17 after the source-quality/persistence findings; no price-trace outcomes have been examined under this plan. This is source investigation, not a frozen economic promotion experiment. Production forecasts and original observations remain unchanged.

## Selection before retrieval

Use the source-quality audit's origin-2010 **known/training** identities. For each of five residency sectors and each component (tuition, on-campus housing), rank observed consecutive real log changes in transition years 2000–2019 by absolute magnitude, descending; break ties by UNITID then year. Retain the largest **three** per sector/component and explicitly retain overlapping identities/years across sectors. Do not select withheld-school events to tune a model. Record both neighboring transitions, when available, and whether an opposite-sign movement follows. Keep original source flags and source-quality classes.

The review set is at most 30 sector/component events. A large movement is an investigation trigger, not evidence that the record is wrong. Preserve all values, including plausible policy changes.

## Source checks

1. Write a deterministic trace registry with event identity, original annual levels, August CPI, flags, transition interval, ranking rule and source hashes. Retain missing neighbors explicitly.
2. Fetch the corresponding official original IC academic-year archives into an ignored cache. Compare their SHA-256 with `data/raw/ipeds/sources.json`. If the URL now serves different bytes, record that as a separate newer revision; never silently treat it as the pinned original or overwrite selected.csv.gz.
3. Extract original current-year and retrospective charge fields from the event-year and next two available annual files. Use each workbook's field title/description to map the academic year: do not assume AY1/AY2/AY3 meanings without the year-specific dictionary. Verify the directory/sector basis for those records and retain exact source archive/member/field identities.
4. Compare the same academic-year price across the source snapshots. Distinguish changed retrospective values, unchanged values and unavailable field/source definitions. Reproduce a source-backed subset without committing entire large archives; keep source URLs/hashes, original excerpt fields and an explicit extractor.
5. Where public official institution budget/policy records can explain a material event, retain source/date/definition and the explanation separately. Otherwise mark the cause unresolved. A reported flag or unchanged later revision cannot establish that a real policy change occurred.

## Outputs and stopping rule

Publish the fixed registry, source/version comparisons and a concise findings table. Do not correct prices, remove events, remap probabilities or refit the current model during this audit. Keep source anomalies and plausible economic changes distinct from unresolved causes.

Use these findings to specify one coherent next candidate with identifiable assumptions about common growth, temporary school deviations and observation/definition uncertainty. If causes remain unresolved, known-process tests and robustness comparisons must represent that ambiguity. Commit the candidate protocol before any new cost/funding scores; retain existing sector/withheld/horizon protections and require candidate-specific funding evidence. No school-count increase can manufacture long-horizon macro evidence.
