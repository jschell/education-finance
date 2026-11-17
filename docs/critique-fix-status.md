# Critique fix status · v0.10.0

**Deployed and reviewed.** GitHub Actions Check and Pages deployment succeeded for v0.10.0 (`d4e75fddf56f2ad27ddb91655a2b6da71ab4efb9`). Live app/code/report verification passed. A fresh post-deployment review is complete; findings are recorded separately.

- Whole-plan checks implemented using production compile, path factory and ledger; origin-limited inputs, published cost levels, reliability bins and unavailable long horizons are recorded.
- Cost uncertainty candidate evaluated and rejected by the frozen gate: score 0.156 → 0.236, coverage 71.6% → 80.3%. The prior cost process is retained; undercoverage remains unresolved.
- Savings contribution solver replaces the initial three-standard-error heuristic with the [DKW reserve rule](savings-reserve-rule.md) and an independent 5,000-path one-sided Wilson check.
- Unused production lognormal simulation engine removed; shared random utilities and current live-engine tests retained.
- Current README/model/architecture consolidated; historical documentation archived. Schema-5 student funding preserved.

## Results before deployment

- DKW-based savings reserve: 12/12 independent production-model seed checks confirmed the 90% target; monthly estimates $716–$729 for the synthetic eight-year plan. The first three-standard-error rule confirmed 9/12 ($645–$659) and remains recorded. The reserve is intentionally conservative and controls sampling error only.
- Whole-plan tests: 150/90/30 synthetic cases for 0/4/8-year waits, but only 10/6/2 distinct start years. Brier scores 0.000/0.043/0.104 versus 0.250 for a 50% guess. Nominal 80% cost bands covered 76%/20%/10%. Overlapping starts and related sectors prevent treating cases as independent observations. These results were not used to retune the model.
- Candidate price uncertainty: score 0.156 → 0.236, coverage 71.6% → 80.3%; rejected by the predeclared rule. Cost undercoverage remains an open high-priority finding.
- Candidate/whole-plan outputs rebuilt identically; current bundle hashes match. Phone/iPad/desktop and project-path checks passed. An updated live savings card will be checked after deployment.

[Original frozen plan](critique-fix-plan.md) · [Savings reserve amendment](savings-reserve-rule.md) · [Fresh review](critique-review-v0.10.0.md)

## Post-deployment conclusion

The [fresh review](critique-review-v0.10.0.md) confirms the deployed engineering and savings-stability fixes. Statistical findings remain open: all longer-wait cost misses were below the forecast lower bound in these historical tests, and short/overlapping histories do not establish future funding calibration. The failed uncertainty candidate was not promoted. No additional calculation control or required input was added.


## v0.10.1 follow-up reconstructed in a new session

The uncommitted later-session source could not be recovered. Its work was reconstructed from a separately frozen [protocol](cost-followup-protocol.md), with [new reproducible results](cost-followup-results.md) and a [fresh completion review](completion-review.md). The original session's specific unpublished numerical claims are not used as verification.

The evaluation is complete: 132 tests pass, reports reproduce exactly twice and match committed evidence, and project-prefix phone/iPad/desktop, keyboard, worker and saved-funding checks pass in Chromium. The benchmark is retained because all three trend substitutions lose the complete-bill comparison. The financial model, calibration bundle, savings reserve and schema remain unchanged.

Cost coverage and independent evidence remain unresolved: fixed-panel longer-wait tests overforecast costs, while the new aggregate 18-year-wait benchmark underforecasts all 14 bills across seven overlapping origins. These findings do not justify a blanket correction or certify future funding probabilities.

**v0.10.1 is deployed.** [PR #1](https://github.com/jschell/education-finance/pull/1) merged as `a1846b6a5df546a0d06c447a159597087023f6c9`; [main checks](https://github.com/jschell/education-finance/actions/runs/43975728871) and [Pages deployment](https://github.com/jschell/education-finance/actions/runs/43975728963) succeeded. [The live verification run](https://github.com/jschell/education-finance/actions/runs/43975844011) compares deployed page/worker/report bytes and repeats the synthetic browser checks against the public URL.

The unresolved statistical finding is tracked in [issue #2](https://github.com/jschell/education-finance/issues/2). Completing this release does not close that finding.


## v0.10.2 full-model calibration

Implemented each cost model's own earlier residual fitting, asymmetric paired cost-path curves, nested chronological selection, matched source/period checks, 2024 matched-school endpoint data, near-target funding reliability and an immutable synthetic prospective snapshot.

The first full evaluation and its publication rebuild each passed 140 tests and regenerated reports twice identically. Direct recalibrated fixed-trend score improved about 3.1%, but the nested selected policy improved only about 0.15%, failing the frozen 5% promotion rule. Existing financial model 9, calibration bundle, savings reserve and schema 5 are retained; the new path hook is inactive in the shipped bundle.

[Full protocol](full-calibration-protocol.md) · [Results](full-calibration-results.md) · [Fresh review](full-calibration-review.md) · [Prospective record](../data/forecast-snapshots/README.md)

**v0.10.2 is deployed.** [PR #3](https://github.com/jschell/education-finance/pull/3) merged as `8003de5c5ecae7bf6bb547e4473bc8e70615f07d`; [main checks](https://github.com/jschell/education-finance/actions/runs/43991080199) and [Pages deployment](https://github.com/jschell/education-finance/actions/runs/43991080222) succeeded.

The final implementation passes **143 tests**. [Full calibration CI](https://github.com/jschell/education-finance/actions/runs/43990761782) confirms deterministic regeneration and byte equality with committed new evidence, including source/protocol/report hashes and snapshot missingness. [Prior-report/browser CI](https://github.com/jschell/education-finance/actions/runs/43990761707) confirms the older evidence remains unchanged and project-prefix phone/iPad/desktop, keyboard, worker, example-restoration and reload checks pass. The shared-student-price regression passes. Screenshots are retained as CI artifacts and were not manually visually reviewed.

The post-Pages live verification workflow compares deployed page, worker, calibration and both cost reports byte-for-byte and repeats the synthetic browser checks. Physical Safari and future outcome calibration remain unverified. The unresolved forecasting evidence remains tracked in [issue #2](https://github.com/jschell/education-finance/issues/2).
