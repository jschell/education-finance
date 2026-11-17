# Proposed decision scenarios and evaluation plan

Written 2026-11-17 in response to [the deep review](model-and-scenario-review.md). **Status: proposed design, not an implemented scenario catalog or a frozen candidate-promotion protocol.** It supplements the current controlled price/funding study rather than rewriting it. Existing financial defaults, model version, thresholds, source cases and prospective records remain unchanged.

## 1. Five separate contracts

| Object | Required fields / meaning | What it must not imply |
| --- | --- | --- |
| Goal | Tuition-only, all entered expenses, a fixed parent commitment or explicit share; dollar basis and priorities | Funding an entered goal is not degree completion or whole-family solvency |
| Education path | One or more dated attendance episodes; program, residency, living arrangement, annual cost categories, billing dates and source definition | A college choice is not a random market draw; a two-year label is not automatically a four-year program |
| Economic world | Joint asset returns, inflation and a declared price process, with code/source identity | Epistemic assumption cases do not acquire probability weights just because they are simulated |
| Household event | Timing/severity of deposit disruption, gift delay, support reduction or aid loss; reason and dependence assumption | A hypothetical job-loss or aid event is not an estimated personal probability |
| Policy | Deposits by date/student, allocation/fees, review dates and permitted fallback actions | A policy may use only information available at that date; a fixed-share failure is not global infeasibility |

Keep student funding ownership. Account transfers require explicit rules and separate scope; different future deposit priorities do not require transferring existing balances. Gross versus net costs, grant application and restricted support must have unambiguous definitions before a new path is priced. Do not subtract aid twice from a net budget.

An eventual episode-based path would require domain/compiler/UI/version and saved-data design. Until implemented, mark such cases as unsupported rather than silently substituting a constant school path. Changes to attendance duration, a single living arrangement or known grant terms that the current domain already supports can be tested first.

## 2. Curated core suite

Values below are **hypothetical engineering cases**, not prevalence estimates, recommendations or calibrated stress percentiles. Retain a clearly synthetic default case, paired economic paths and a small published registry. Use selected interactions, not a blind full Cartesian product.

| ID | Decision / case | Variation to test | Main outcome / acceptance |
| --- | --- | --- | --- |
| G01 | Known near-entry offer | 0–2 years until entry; actual entered cost/award definitions | Reconcile next invoices and required deposits; state what is already known |
| G02 | Current student | 1–3 attendance years remaining; paid bills excluded | No retroactive costs or aid; preserve first future payment date |
| G03 | Fixed parent commitment | Tuition-only versus all costs versus explicit share | Compare obligations under the same world without claiming all college expenses are covered |
| E01 | Standard four-year path | Four attendance years and entered living months | Reference for paired comparisons; preserve current benchmark separately |
| E02 | Extra attendance | Add one and two years, with grants stopping at their entered expiry | Extra costs/support schedules actually extend; do not extend awards automatically |
| E03 | Public two-year program | Two attendance years, appropriate budget | Distinct duration from the uniform four-year price laboratory |
| E04 | Two-plus-two transfer | Two dated school/residency/cost episodes; moving/setup cost if entered | Charge both episodes correctly; no duplicated savings or aid; explicit unsupported state until episode support exists |
| E05 | Living arrangement | At home versus on campus; optional off-campus alternative | Housing/food/transport change explicitly; on-campus price history is not a validated rent model |
| E06 | Unknown future institution | 8/12/18-year wait; explicit parent budget class/ceiling | Report conditional robustness and data limits; do not invent precise school identity or unsupported calibration |
| H01 | Savings interruption | Zero/reduced deposits for a specified 6/12-month period before entry | Reconcile lost principal, dated rescue need and first unpaid bill |
| H02 | During-college support loss | Reduce entered direct support for a term/year | Cash-flow loss occurs on the relevant dates, not as an opening-balance haircut |
| H03 | Aid renewal | Retain entered aid versus loss after the first year or entered expiry | Honor award scope and stop dates; no automatic eligibility formula |
| H04 | Gift uncertainty | Gift absent, delayed by a term, or delayed beyond first bill | A late gift cannot repair an earlier missed payment |
| M01 | Market sequence | Same severe return event before entry, at entry and during attendance | Compare shortfall timing; asset-specific draws matter for portfolio-policy comparisons |
| M02 | Asset/rate/inflation joint world | Existing generator plus a documented adverse alternative | Validate cross-variable/path semantics; no assumed risk-neutral funding probabilities |
| C01 | Cost level miss | Entered tuition/housing budget 10/20% higher than reference | Show sensitivity to baseline error separately from future growth uncertainty |
| C02 | Cost trend/model miss | Flat-real baseline and a separately specified higher/lower real-growth alternative | Distinguish assumption alternatives from sampled noise; no hidden correction stacking |
| F01 | Sibling overlap | Enrollment gaps 0/2/4 years; actually binding versus nonbinding deposit cap | Demonstrate the cap binds in intended cases; require joint bill success and retain earmarked accounts |
| F02 | Deposit policy comparison | Fixed shares versus a dated-priority alternative with the same cap | Do not conflate a restricted policy's failure with all-policy infeasibility; compare deposit burden too |
| A01 | Annual review/fallback | Review deposits/cost ceiling at predetermined dates using then-observed state | No future-path access; report original goal and fallback goal separately |
| X01 | Compound vulnerability | Pair an asset drawdown with interrupted deposits and an entered aid/cost disruption | Explicit severe conditional case, no assigned joint frequency; avoid applying the same shock twice |

Do not treat the first favorable adaptation as success at the original goal. If a family switches to a cheaper path or reduces its commitment, report success for the revised goal alongside failure/compromise of the original goal. This preserves meaningful comparisons.

K–12 funding, automatic FAFSA/tax formulas, borrowing optimization, lifetime retirement planning and stochastic degree completion remain outside the first implementation. Research sources justify additional dimensions; they do not authorize adding those systems by implication.

## 3. Three evaluation suites, with different purposes

### A. Accounting and contract suite

Use hand-checkable, zero-return/zero-price-growth plans to verify durations, dates, interrupted support and ownership. The review's three controlled examples are seeds, not the whole suite. Add metamorphic checks where appropriate: an earlier usable gift should not worsen a fixed plan; increasing unrestricted opening funds should not increase its missed bills; an extra required attendance year must add the correct costs. Funding-goal changes must not silently retain the old success label.

### B. Forecast-model laboratory

Keep the current registered cases immutable. Add simple real-price/ordinary-trend baselines and compare distributions at the actual bill unit with proper scores, miss direction and width. Preserve known/withheld identity isolation and chronological completed-outcome cutoffs. A new candidate needs its own frozen protocol and funding runs; no partial cost qualification activates it.

No new historical family outcome may be declared available simply because the accounting suite can represent it. For a transfer or household interruption, public prices may be observed while the household policy/event is synthetic. Mark that distinction. New waits beyond data support remain unavailable for empirical qualification.

### C. Decision robustness and policy suite

Evaluate the curated plans across declared plausible worlds, keeping each policy paired on the same world. Include a small fixed registry first; optional offline EMA-style exploration can follow once the interfaces are stable. Report which assumptions cause an unacceptable dollar gap or cap conflict, and how a permitted action changes it. Do not report the design sample's pass fraction as the probability of real-world success.

For optimization comparisons, policies obey nonanticipativity: identical observed histories must receive identical actions up to that point. A perfect-foresight solution is an explicitly labeled upper bound, never a deployable policy. Portfolio return scenarios must be exogenous to a fixed-contribution feasibility benchmark; if allocation is also a decision, formulate that different optimization problem explicitly.

## 4. Select informative plans before observing outcomes

The old opening-balance factors remain a broad control group. Add a **decision-region cohort** using only origin-available data and baseline predictions: choose resources near its predicted 80/90/95% funding thresholds, then evaluate every candidate on the exact same resource plans and realized outcomes. Freeze that selection rule before new scores. Retain both sides of the decision boundary, and show how many cases actually land in each predicted-probability range.

Baseline-selected cohorts can favor the baseline's geometry; label them and retain independently selected broad resource cases. Never use future actual success/shortfall to choose the cohort. Do not shift each candidate's cohort to its own easiest resources and call the resulting comparison matched.

For cap cases, assert that the cap constrains deposits in the intended dates. A scenario label is insufficient. Include both binding/nonbinding controls and record changed schedules. For duration and transfer cases, assert the number and source of attendance-year bills. For support shocks, assert actual dollars lost and timing.

## 5. Outputs and comparison criteria

Every result should retain:

- Goal/path/world/event/policy IDs, source/model version, dates and units.
- Whether the scenario is observed, conditional synthetic, unreached or unsupported, and the reason.
- First unpaid date/amount, cumulative unpaid covered bills, ending earmarked funds, deposits and cap conflicts.
- Required rescue deposit or budget reduction, with infeasible dates and ceilings explicit.
- Current strict all-bills-paid success plus goal-specific partial outcomes; no graduation label.
- Forecast scores and reliability only where they apply; actual case counts, origins, institutions and nonoverlapping windows.
- For policy comparisons, total/peak contribution burden and compromise of the original goal, as well as shortfall severity.

Use deterministic dated-bill matching and an origin-known funded-ratio rule as funding comparators, not only a 50% coin-flip. Cost comparators should include last real price and a conventional damped trend. These baselines are proposed; this review has not run the full comparative study.

The existing 5%/sector/horizon research gates remain unchanged. Before any new promotion experiment, separately specify how cost skill, funding reliability, unacceptable dollar gaps, data support and household feasibility interact. A narrower interval or a higher modeled success rate alone cannot qualify a policy that exceeds the family's cap.

## 6. Delivery order and completion evidence

1. Specify the goal/path/world/event/policy contract in repository docs and implement only the first supported subset of cases.
2. Complete the bounded source trace in parallel; retain unresolved definition changes.
3. Implement deterministic reference cases and the same-world policy runner. Add origin-only near-threshold selection for the evaluator.
4. Prototype parsimonious price baselines offline; commit one candidate protocol if justified by the trace and benchmark findings.
5. Run matched cost/funding/decision comparisons and preserve non-promotion where evidence is inadequate.
6. Update the UI's interpretation and unsupported-case messages only when corresponding calculations exist; retain one Calculate action and the requested gauge behavior.

Completion of scenario representation, economic calibration and a useful family decision are separate milestones. Record each separately in continuity notes; do not collapse them into a generic “calibration complete” status.
