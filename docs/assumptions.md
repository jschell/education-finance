# Assumption register

As of 2026-11-15. All numerical values below are **illustrative planning placeholders**, not forecasts, verified school prices, investment recommendations, or an agreed family target.

| ID | Meaning / units | Initial value | Status / treatment |
| --- | --- | --- | --- |
| scope | Currency and education system | USD; U.S. undergraduate | Proposed scope |
| deterministic-return | Annual nominal compound return, net | 3% / 5% / 7% | Adverse/base/favorable sensitivity only |
| tuition-growth | Annual nominal growth | 6% / 4% / 2% | Adverse/base/favorable sensitivity |
| living-growth | Annual nominal growth | 4% / 3% / 2% | Adverse/base/favorable sensitivity |
| general-inflation | Annual nominal inflation | 3.5% / 2.5% / 2% | Today's-dollar display only |
| mc-return-mean | Annual arithmetic expected return | Unset | Needs calibrated investment profile |
| mc-return-volatility | Annual simple-return standard deviation | Unset | Needs calibration, required before MC |
| cost-volatility | Annual growth standard deviation | Unset | Fixed-growth mode until calibrated |
| price-baselines | Annual expense by category | Unset | User amount or dated source required |
| unconfirmed-aid | Grants / scholarships | $0 in no-aid scenario | Unknown aid is not predicted eligibility |
| attendance | Remaining years | User required | Additional year is a separate stress test |
| contributions | Nominal scheduled amounts | User required, explicit $0 allowed | No assumed household capacity |
| contribution-step-up | Annual increase | 0% | Editable |
| trials | Trials per full run | 10,000 | Performance/convergence target |
| success-threshold | Desired simulated success frequency | User selected | Offer 80/90/95%; none pre-endorsed |

Scenario labels bundle assumptions for sensitivity, not statistically calibrated best/worst outcomes. Users must be able to vary returns and costs independently.

Each stored assumption needs: ID, label, units, value, source URL or user-entry provenance, source/as-of date, provisional/verified/user status, scope, and override history. Unknown and zero differ. Never silently default absent costs or volatility to zero.

School data intake must record academic year, residency, attendance/living basis, included categories, annual versus term pricing, sticker versus net price, source date, and URL. Net-price estimates need their household context and grant assumptions; do not apply a national average aid discount automatically. Do not infer 529 eligibility from a generic cost category.

Before calibrated release: choose sourced portfolio profiles, validate arithmetic versus geometric return interpretation, select cost baseline data, and document limitations. Tax/aid/account eligibility rules require current official sources when implemented.
