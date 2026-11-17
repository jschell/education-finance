# Overhaul D: delivery and fresh review

Authorized scope: [staged plan](overhaul-plan.md). App v0.13.0 / model 12 / schema 5. Synthetic/public data only.

| Stage | Delivered | Evidence |
|---|---|---|
| Foundation | Actual conditioned equity recentering, explicit source/date contracts, corrected cost donors, oracle and eligible-horizon gates | PR #4 merged; v0.11.0 Pages and live browser workflow passed; 36 sampler cases and analytic offset checks |
| Practical planner | Affordable budget ranges, first unpaid bill, household deposit policy/cap conflicts, independently verified target-specific binomial ranks | PR #5 merged after CI, phone/iPad/keyboard/project-prefix checks; 150 stage-2 tests; 12/12 numerical consistency checks across three synthetic waits |
| Data and cost candidate | Official 1990–1999 archive/dictionary audit, separately identified tuition bridge, school growth study, coherent paired hierarchy, origin-limited evaluation and visible non-promotion | `legacy-ipeds-audit.json`, `legacy-tuition-panel.csv`, `hierarchy-validation.json`, candidate protocol and meaningful known-process tests |
| Matched stress diagnostics | Housing +20%, grant loss and one 25% pre-entry portfolio loss on shared baseline paths | Pure ledger tests; baseline funding and saved amounts preserved |

## Results and release decision

The former gate could improve at most **3.31%** even with zero eligible-case candidate error, so its **5%** requirement was unattainable. Current eligibility requires three distinct completed earlier target years and at least three eligible origins per requested horizon. Missing 4/8-year support is reported as insufficient evidence, separately from supported failures. No candidate is promoted by reinterpreting missing support as success.

Analytic equity normalization uses actual conditional block weights and within-block offsets. A 36-cell actual-sampler matrix passes the declared tolerance of five path-cluster standard errors plus 0.1 percentage point. The actual shipped factory also passes an independent 20,000-path equity-only check: mean annual return **7.025%** against a **7.0%** anchor (path-cluster standard error 0.0437 percentage point), using four standard errors plus 0.025 percentage point as the predeclared tolerance. Monthly equity shocks, case/student source choices and common prefixes are preserved. This is a process check, not a forecast claim.

At 20,000 fitting paths, requested 80/90/95/99% savings targets use ranks 16,507/18,372/19,266/19,910. For 90%, the fit probability is **91.86%**, replacing **94.33%** under the previous uniform reserve. Separate 5,000-path verification still requires the one-sided 95% Wilson lower bound to meet the requested target. Independent SciPy references and multiple synthetic waits/seeds check numerical behavior. Economic accuracy remains separate.

The corrected cost foundation scores **0.240** against **0.783** for the coherent hierarchy (normalized 80% interval score; lower is better; equal weighting across waits). The hierarchy overforecasts more strongly, and eligible longer-wait support remains missing. Its capability ships **inactive**, with its failed comparison retained. Neither adding persistent school variation nor widening intervals automatically improves a forecast.

The official legacy audit retains **12,814** matched positive tuition records for **1,309** existing panel identities. Only about 58–60% of matched same-year in-state observations exactly agree across the 1997/1998 versus 1999 retrospective population definitions. Published typical full-time undergraduate charges cannot silently become first-time first-year attendance prices. Housing continuity, historical sector changes, publication vintages and survivor selection are not solved by exact UNITID matching. The bridge stays research data; it does not create new whole-plan outcomes.

## Fresh review

- **Resolved:** infeasible gate interpretation, conditioned equity-anchor mismatch, price/market year offset and inconsistent CPI endpoints, uniform excessive numerical reserve, missing affordable-budget/first-bill outputs, absent household proposal feasibility, hidden candidate/data-comparability limitations.
- **Checked:** source hashes, origin cutoffs, archive immutability, positive gross returns, common paths/prefixes, fixed aid and income, cent-rounded proposed student deposits, cap timing, saved schema-5 funding and inactive hierarchy isolation.
- **Limits retained:** forward economic probability coverage is unestablished; corrected whole-plan funding reliability is not inferred from archived model-9 reports. The new cost comparison tests sector indices, not calibrated individual-school distributions. Long waits lack independent outcome support. Household proposals follow fixed base shares and do not optimize allocations or transfer earmarked funds. Budget ranges are screens with at most 512 sampled paths, not independently verified target budgets. Physical iOS Safari persistence remains unverified.
- **Next evidence with value:** genuinely comparable historical school outcomes and prospectively scored snapshots. Any attempt to activate a revised hierarchy needs a newly frozen candidate/protocol, not post-score tuning under the failed comparison.

## Reproduction

`npm run check` covers financial/source/persistence contracts. CI regenerates the current foundation, practical-planning and hierarchy reports and compares committed bytes. Browser checks exercise the project prefix, phone/iPad/desktop widths, keyboard disclosures, the household cap, new outputs and example/reload funding preservation. Pages has an additional live byte and browser workflow. Historical model-9 reports retain their original source archive and can be reproduced by manual workflows pinned to their original revision. The original prospective snapshot is unchanged.

Final local repository check: **158 tests passed**. Final PR #6 passed report-reproduction and phone/iPad/desktop/keyboard browser checks. The added actual-factory anchor evidence must pass the same checks before merge; Pages then receives live byte/browser verification.
