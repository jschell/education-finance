# Research sources and reusable model families

Researched 2026-11-17 for [the deep review](model-and-scenario-review.md). Primary research, official data/tool methodology and maintainer documentation are used below. These sources establish available methods and their stated scope, not that their fitted parameters or probability claims transfer to this application. Commercial studies are examples of practice, not independent validation of our model. No proprietary source code or full paper text is copied.

## S1: Actuarial scenario design

**Pedersen et al., Society of Actuaries/Conning, July 2016:** [Economic Scenario Generators: A Practical Guide](https://www.soa.org/globalassets/assets/Files/Research/Projects/research-2016-economic-scenario-generators.pdf), especially chapters 5 and 8. Full PDF inspected.

Distinguishes real-world forecasting/risk scenarios from market-consistent pricing scenarios and discusses initial-state, historical and out-of-sample validation. Useful as a validation checklist for joint assets/inflation/rates; not a calibrated college-cost dataset or a reason to import insurance reserve assumptions.

## S2: Education-specific lifecycle investing

**Daga, Kahler and Hassett, 2024:** [529 portfolio-choice study](https://ssrn.com/abstract=4963751), DOI [10.2139/ssrn.4963751](https://doi.org/10.2139/ssrn.4963751). Author-posted abstract retrieved; full SSRN download returned 403, so no claim of full-text replication is made. It describes a lifecycle model varying savings patterns, funding conditions and investment horizon.

**Kane, Kahler and Hassett, Vanguard, June 2024:** [K–12 education study](https://corporate.vanguard.com/content/dam/corp/research/pdf/its_elementary_using_529s_to_pay_for_k_12_education.pdf), especially pp. 10–11 and Figure 9. Full PDF inspected. Its model comparisons vary time until withdrawals and withdrawal duration. Reusable lesson: distinguish accumulation horizon from spending horizon. The internal VLCM/VCMM implementation is not supplied as a public drop-in engine. Historical tax examples in this paper are not adopted as current tax rules, and K–12 is not added to our scope.

## S3: An operational 529 scenario model

**Reinhard, Yuen and Belessakos, Voya, August 12, 2026:** [529 design methodology](https://advisors.voya.com/insights/investment-insights/save-today-thrive-tomorrow-designing-529-college-savings-plans). Official methodology inspected.

Describes annual contribution/withdrawal modeling, real tuition above CPI, capped goal utility and median/worst-tail outcomes from 50,000 market/economic scenarios. Useful comparison for liability-relative outcomes and avoiding rewards for unlimited surplus. Its representative goal and economic assumptions are not school-specific forecast calibration; no reported portfolio optimum or vendor parameter is imported.

## S4: Multiple dated financial goals

**Das, Ostrov, Radhakrishnan and Srivastav, author manuscript May 25, 2021:** [Multigoal wealth-management paper](https://srdas.github.io/Papers/MultWealthGoals.pdf), listed on the [author's research page](https://srdas.github.io/research.htm), subsequently published in Journal of Banking & Finance, volume 140, article 106192. Full manuscript inspected, particularly its formulation, college example and dimensionality discussion.

Uses dynamic programming for competing dated full/partial goals and goal priorities. A useful conceptual reference for tuition installments and family trade-offs. Its core formulation includes non-stochastic goals and a pooled wealth state: neither stochastic college liabilities nor legally/contractually earmarked accounts transfer automatically. Its stylized performance comparisons are not promised improvements for this repository. Monte Carlo can also evaluate adaptive policies; dynamic programming is not a prerequisite for simulating adaptation.

## S5: Household income and portfolio risk

**Econ-ARK/HARK maintainers:** [portfolio-choice model](https://docs.econ-ark.org/examples/ConsPortfolioModel/RiskyAssetConsumerType.html) and [income-shock model](https://docs.econ-ark.org/examples/ConsIndShockModel/IndShockConsumerType.html). Model equations and documentation inspected.

Provides reusable offline household consumption/saving and risky-asset reference models with income shocks and borrowing constraints. Useful for checking the treatment of disrupted contributions and limited liquidity. The displayed portfolio example separates income and return distributions by default; adverse joint dependence is not obtained merely by installing it. Its utility objective and constraints need an explicit mapping to our bill-funding goal. Do not put this research stack into the browser.

## S6: Decision making without trusted forecast weights

**RAND:** [Making Good Decisions Without Predictions / RB9701](https://www.rand.org/pubs/research_briefs/RB9701.html). Official methodological description inspected.

Robust decision making evaluates candidate plans across plausible futures and investigates their vulnerabilities instead of requiring agreement on a single predictive distribution. Useful as a design pattern while economic probabilities remain weakly supported; it does not justify interpreting an arbitrarily sampled scenario-success fraction as a real-world probability.

## S7: Reusable experiment and scenario-discovery tooling

**EMA Workbench maintainers:** [documentation](https://emaworkbench.readthedocs.io/en/latest/), [open exploration](https://emaworkbench.readthedocs.io/en/latest/indepth_tutorial/open-exploration.html), [PRIM scenario discovery](https://emaworkbench.readthedocs.io/en/latest/ema_documentation/analysis/prim.html).

Supports experimental designs, external-model evaluation and vulnerability discovery. An optional offline orchestration/analysis tool; an initial small JSON scenario registry plus Node runner would fit our stack better. PRIM/CART findings need checking on other design samples; a discovered vulnerable region is not a calibrated event probability. No package version or dependency is installed by this review.

## S8: Established price-process baselines

**Hyndman and Athanasopoulos:** [Forecasting: Principles and Practice, toolbox](https://otexts.com/fpp3/toolbox.html) and [exponential smoothing](https://otexts.com/fpp3/exponential-smoothing.html). Relevant benchmark, rolling-origin and damped-trend material inspected.

Provides naive/drift baselines, horizon-aware evaluation and damped extrapolation methods. Useful as baselines before bespoke residual curves; not evidence that an off-the-shelf trend captures institutional policy changes.

**statsmodels maintainers:** [UnobservedComponents](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.structural.UnobservedComponents.html). Supports trend/level, irregular and autoregressive components. A suitable offline reference implementation for a small state-space benchmark. A univariate Gaussian model does not supply hierarchical pooling, paired tuition/housing tails or a robust observation model automatically. Parameter identification must be tested with our short annual histories; export compact parameters only after qualification.

## S9: Existing economic process implementations

**pyesg maintainers:** [repository and README](https://github.com/jason-ash/pyesg). MIT-licensed process implementations include equity and interest-rate models and an actuarial rate-generator implementation. Useful for independent mathematical comparisons; its README does not provide a complete fitted college-cost/household model and describes historical parameter fitting as future work. Benchmark selected processes rather than replacing the production sampler with defaults.

**CRAN ESG:** [official package record](https://CRAN.R-project.org/package=ESG). R asset-scenario framework; the retrieved record lists version 1.3, published 2023-08-29, GPL-2/GPL-3. An alternative offline methodological reference, with less stack fit than Python/Node. Presence on CRAN does not establish household or tuition calibration. Verify release and licensing for a concrete integration rather than assuming the application's MIT license covers upstream code.

## S10: Funding allocation and tail-loss optimization

**CVXPY maintainers:** [atomic functions](https://www.cvxpy.org/tutorial/functions/index.html), including `cvar`, and [disciplined convex programming](https://www.cvxpy.org/tutorial/dcp/index.html).

Can serve as an independent offline solver for a carefully formulated fixed-scenario cash-flow allocation benchmark. CVaR is a tail-loss objective, not a success-probability calibration method. Full portfolio/policy optimization with products of decision variables or integer choices is not automatically convex. Earmarked balances, monthly dates/caps and nonanticipativity must be explicit. For unweighted deep-uncertainty cases, worst-case/regret comparisons are often clearer than inventing probability weights.

## S11: Forecast evaluation

**Gneiting and Raftery, JASA, 2007:** [author-hosted paper](https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf). Full paper inspected.

Proper distributional/interval scores provide an appropriate comparison foundation; widening bands to hit coverage alone is inadequate. They do not make an underpowered or repeatedly inspected evaluation independent. Keep proper scores separate from the household's decision loss and assess both. The repository already uses an interval score with a known origin-budget denominator; retain that repair.

## S12: Real educational pathways

**NCES:** [BPS overview](https://nces.ed.gov/surveys/bps/), [PETS overview](https://nces.ed.gov/surveys/pets/), and [2020 transcript-study report description, NCES 2020501](https://nces.ed.gov/use-work/resource-library/report/first-look-ed-tab/courses-taken-credits-earned-and-time-degree-first-look-postsecondary-transcripts-2011-12-beginning). Official descriptions/search results retrieved; some direct NCES page opens timed out.

These sources follow persistence, transfers, credits and time to degree. Use them to justify including pathway/duration dimensions and, if needed later, design a cohort-specific transition model. Aggregate completion rates or time-to-degree conditional on graduating are not individual transition probabilities. No historical cohort rate is assigned to our users in this review.

## S13: Price and aid concepts

**College Board:** [Trends in College Pricing](https://research.collegeboard.org/trends/college-pricing) and [published/net-price discussion](https://research.collegeboard.org/trends/college-pricing/highlights). Distinguishes published prices from costs after grant aid, alongside sector differences. Use for definition cross-checks and external aggregate comparisons, not to subtract average aid again from an already net user budget or to replace a household-specific award.

## S14: A directly comparable planning product

**Consumer Financial Protection Bureau:** [Your Financial Path to Graduation methodology](https://www.consumerfinance.gov/paying-for-college/your-financial-path-to-graduation/how-we-got-these-numbers/) and [tool](https://www.consumerfinance.gov/paying-for-college/your-financial-path-to-graduation/). Official calculation notes inspected.

A useful near-enrollment comparator for offer-based costs, direct/indirect expenses, living arrangements, duration and funding sources. Borrow its explicit input definitions and comparison structure. Its published methodology is not an open stochastic school-cost generator. Repayment, eligibility and tax rules are not imported; our next scope can use user-entered amounts and conditional aid-loss cases without implementing legal formulas.

## Reuse decision

**Now:** reuse the methodology of S6/S7 for experiment design, S8 for independent price baselines, S11 for scoring, and S14 for scenario/input definitions. **Next:** use S10 as a small offline allocation reference if the policy scope is specified. **Later:** S4/S5 for a genuinely broader household model. S2/S3 are education-specific conceptual comparators, and S1 is a generator-validation checklist. S9 offers independent component implementations, not a complete replacement.

No reviewed source establishes an openly reusable, already calibrated, school-specific joint college-price/aid/income/portfolio/family-path engine matching all our contracts. This is the result of this search, not a proof that no such system exists. The right reuse unit is a validated component or experiment method with a clear adapter, not a wholesale claim of transferred calibration.
