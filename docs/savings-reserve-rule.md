# Savings reserve amendment · before second seed evaluation

The initial three-binomial-standard-error heuristic confirmed 9/12 seeds for the synthetic eight-year production-model plan. Its report is retained as `data/savings-stability-three-se.json`. This amendment replaces that heuristic with a distribution-free sampling bound, not a parameter fitted to those twelve contributions.

Let n be the fitting sample size, m = 5,000 be the independent verification size, and alpha = 0.05. Set epsilon(n) = sqrt(log(4/alpha)/(2n)). By the Dvoretzky–Kiefer–Wolfowitz bound and a union bound, the true contribution-requirement CDF lies within epsilon(n) of the fitting CDF and within epsilon(m) of the verification CDF jointly with probability at least 95%, under independent sampled paths. This statement concerns Monte Carlo sampling under the model only.

The one-sided 95% Wilson lower bound differs from an observed proportion by no more than W = z/(2 sqrt(m + z²)) + z²/(2(m + z²)), z = 1.6448536269514722. Fit the empirical contribution quantile at min(1, requested target + epsilon(n) + epsilon(m) + W). Rounding the contribution upward cannot reduce its fitted funding frequency. When the quantile is not capped, on the joint CDF event the independent verification lower bound therefore meets the requested target. Discrete ties make the result conservative.

At a capped quantile the argument cannot supply the full reserve; report `reserveCapped` and require the same independent check. No guarantee follows from taking the maximum observed requirement. Infinite requirements or a contribution above the user's ceiling remain infeasible. Do not raise the ceiling, change the requested target, or refit against verification outcomes.

This adds a conservative sampling cushion, especially at small trial counts. Display the actual fitted probability and reserve-cap status. It does not compensate for inaccurate economic assumptions or dependent historical observations; independent simulation draws are distinct from independent historical years. The twelve-seed rerun checks implementation and stability, not the economic model's forecasting accuracy.
