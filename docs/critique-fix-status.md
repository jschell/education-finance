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
