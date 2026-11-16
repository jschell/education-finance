# Requirements and scope

## Goal

Assess the range of future college expenses and the gap against available funding for multiple students of different ages. No school, education path, coverage commitment, or savings target is selected yet. Initially assume U.S. undergraduate education and USD; confirm before introducing jurisdiction-specific behavior.

## Student workflow

Student → education path(s) → funding → assumptions → results → save/export. Any student can be evaluated independently. Support family-level defaults and explicit student/scenario overrides with visible inheritance. Age/grade assists entry, but enrollment month/year controls calculations. Allow students already enrolled and count only remaining expenses.

Required input groups:

| Group | Inputs |
| --- | --- |
| Student | Alias, enrollment month/year, remaining attendance years |
| Cost path | Baseline date, per-year tuition/fees, housing/food, books/equipment, transport/personal, other costs; category growth rates |
| Choices | At home/on campus/off campus; school category or optional named school; transfer sequence |
| Funding | Account balances and dates; account type; investment profile; earmarked/shared allocation |
| Contributions | Monthly amount, effective dates, annual step-up, gifts and one-time amounts |
| College-year support | Parent and student income payments and annual limits |
| Aid | Explicit grants/scholarships, years applicable, renewal conditions |
| Goal | Tuition-only, full attendance cost, percentage, or dollar cap; initially compare alternatives |

The quick-start form begins with zero-valued annual cost and optional funding amounts; omitted amounts resolve to zero. If the whole college budget is zero, label the result as savings growth only and omit funding-success percentages and contribution targets. Other assumptions and the four-year duration are prefilled and visible in the summary. Separate current-savings-only, planned-contribution, and income-supported assessments.

## Outputs

Per scenario: annual expenses by category; funding sources; balance at enrollment; nominal and today's-dollar cost; percent funded; total unpaid expense; first shortfall date; ending surplus. Monte Carlo adds success frequency, P10/P50/P90 cost and shortfall, conditional shortfall severity, balance bands, and contribution needed for a chosen success threshold. All summaries identify whether they include income support and aid.

Loans are financing, not cost reductions. Work income is funding when received, not a grant. Zero projected loans in the initial engine; do not automatically finance shortfalls. Tuition and total attendance expenses must both be visible.

## Family support

Store multiple students from the beginning. Initially allocate shared money explicitly to students; enforce allocations no greater than the pool. Individual success probabilities are not a family success probability. Implemented joint simulation shares calendar-aligned market/inflation paths and applies an optional household savings-deposit limit with proportional monthly allocation. Direct income payments remain outside that limit. Dynamic fund transfers and allocation optimization remain future work.

## Boundaries

Initial delivery excludes automated FAFSA/CSS Profile eligibility, tax-credit optimization, borrowing/repayment, graduate education, live school integrations, login, cloud sync, and dynamic family allocation. Preserve extension points without showing unsupported answers.

## Nonfunctional requirements

Responsive phone/desktop/iPad landscape; keyboard and screen-reader access; tabular alternatives to charts; cancellable worker simulations; saved-input validation; versioned exports; clear storage failure recovery; no silent data loss or off-device financial data transmission. Browser storage is convenient persistence, not a backup. Target a 10,000-trial assessment in under five seconds on a representative iPad; this is an unverified performance target, to measure before release.

## Student funding ownership (v0.5.0)

Switching, creating or duplicating education scenarios must not change a student's savings, deposit schedule, general scholarships, income support, goal or investments. These belong to the student. School-specific aid, costs, duration and billing remain in education scenarios. Existing saved schema-1/2/3/4 plans are intentionally unsupported and reset; no migration or reconciliation UI is required. Duplicating a student resets monetary funding inputs to prevent duplicating the same funds.
