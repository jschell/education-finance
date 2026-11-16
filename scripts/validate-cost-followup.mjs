import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { historicalInputs } from "./validation-inputs.mjs";
import { newPlan, validatePlan } from "../site/js/domain.js";
import { compile, runPath, repriceRow } from "../site/js/engine.js";
import { compileCalibrated, calibrationFactory, canonical, annualIndices } from "../site/js/calibration.js";
import { treasuryGross, billGross } from "../site/js/economy.js";
import { PROFILES } from "../site/js/history-config.js";
import { fitCostCorrection } from "../site/js/cost-correction.js";
import { fitCostTrends, costGrowth } from "../site/js/cost-trends.js";
import { random } from "../site/js/random.js";
import { MODELS, FACTORS, mean, actualBillRows, parseCpi, auditBills,
  scoreBills, summarizeCost, chronologicalChoice, recommendation, fundingSummary } from "./cost-followup-helpers.mjs";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const digest = (x) => createHash("sha256").update(x).digest("hex");
const base = read("site/data/calibration-reviewed.json");
const panel = read("site/data/ipeds-panel.json");
const aggregate = read("site/data/calibration.json");
const cpi = parseCpi(readFileSync("data/raw/cpi.csv", "utf8"));
const trials = 400, seed = 850213;
const sectors = { public4: "Public in-state", public4out: "Public out-of-state",
  public2: "Community in-state", public2out: "Community out-of-state", private4: "Private nonprofit" };
const profiles = ["cash", "cautious", "balanced"];
function planFor(origin, wait, level, sector, profile = "balanced") {
  const p = newPlan(), st = p.students[0], sc = st.scenarios[0];
  p.valuation = `${origin}-09`;
  st.enrollment = `${origin + wait}-09`;
  Object.assign(st.funding, { balance: 0, monthly: wait ? (level.tuition + level.housing) * 0.01 : 0,
    contributionStart: p.valuation, contributionEnd: wait ? `${origin + wait}-08` : p.valuation,
    assumptionsDate: p.valuation, grant: level.tuition * 0.1, grantYears: 4 });
  st.funding.history.profile = profile;
  Object.assign(sc, { baseline: p.valuation, path: sectors[sector], sourceDate: p.valuation,
    costs: { tuition: level.tuition, housing: level.housing, books: 0, transport: 0, other: 0 } });
  validatePlan(p);
  return { p, st, sc };
}
function correctionAt(origin) {
  if (!base.costCorrection) return null;
  let raw;
  try { raw = fitCostCorrection(panel, { cutoff: origin }); } catch { return null; }
  const n = new Set(raw.folds.map((f) => f.target)).size;
  if (n < 3) return null;
  return { ...raw, uniqueTargetYears: n, shrinkage: n / (n + 10),
    folds: raw.folds.map((f) => ({ ...f, series: Object.fromEntries(
      Object.entries(f.series).map(([s, d]) => [s, {
        tuition: d.tuition * n / (n + 10), housing: d.housing * n / (n + 10) }])) })) };
}
function observedGross(c, origin) {
  return Float64Array.from(c.rows, (_, i) => {
    const y = base.economy.macroYears.find((y) => y.year === origin + Math.floor(i / 12));
    if (!y) throw Error("Incomplete observed macro year");
    const m = i % 12;
    const stage = i >= c.enrollmentIndex ? 2 :
      i >= c.enrollmentIndex - c.a.transitionYears * 12 ? 1 : 0;
    const w = PROFILES[c.history.profile].stages[stage];
    return (1 + w[0] * y.months[m][0] +
      w[1] * (treasuryGross(y.rates[m][0], y.rates[m][1]) - 1) +
      w[2] * (billGross(y.rates[m][2]) - 1)) * (1 - c.history.fee) ** (1 / 12);
  });
}
const cost = [], funding = [], audits = [];
for (let origin = 2011; origin <= 2020; origin++) {
  const bundle = historicalInputs(base, origin, correctionAt(origin));
  for (const wait of [0, 4, 8]) {
    const lastBillYear = origin + wait + 3;
    if (lastBillYear > 2023) continue;
    for (const sector of Object.keys(sectors)) {
      const prices = panel.prices[sector], level = prices.find((p) => p.year === origin);
      const annual = level.tuition + level.housing;
      const row = { origin, wait, sector, lastBillYear,
        macroLast: bundle.economy.macroYears.at(-1).year,
        costLast: bundle.prices[sector].at(-1).year, models: {} };
      for (const profile of profiles) {
        const { p, st, sc } = planFor(origin, wait, level, sector, profile);
        const { c } = compileCalibrated(p, st, sc, bundle);
        const actualRows = actualBillRows(c, prices, cpi, origin);
        const gross = observedGross(c, origin);
        if (profile === "balanced") audits.push({ origin, wait, sector,
          ...auditBills(c, actualRows, prices, origin) });
        const actuals = FACTORS.map((f) => runPath({ ...c, rows: actualRows,
          opening: annual * 4 * f }, (i) => gross[i], c.monthly, false));
        const counts = FACTORS.map(() => 0);
        for (const model of profile === "balanced" ? MODELS : ["fixed"]) {
          const b = { ...bundle, costModel: model };
          const factory = calibrationFactory(c, b, { seed });
          const totals = [];
          for (let t = 0; t < trials; t++) {
            const sample = factory.make(t);
            if (profile === "balanced") {
              // Total billed cost is independent of opening funding.
              totals.push(runPath(sample.compiled, (i) => sample.gross[i], c.monthly, false).total);
            }
            if (model === "fixed")
              for (let k = 0; k < FACTORS.length; k++)
                counts[k] += Number(runPath({ ...sample.compiled, opening: annual * 4 * FACTORS[k] },
                  (i) => sample.gross[i], c.monthly, false).success);
          }
          if (profile === "balanced") row.models[model] = scoreBills(totals, actuals[0].total);
        }
        for (let k = 0; k < FACTORS.length; k++)
          funding.push({ origin, wait, sector, profile, lastBillYear,
            factor: FACTORS[k], probability: counts[k] / trials, actual: Number(actuals[k].success) });
      }
      cost.push(row);
    }
  }
  console.log("Follow-up origin completed", origin);
}
const summaries = MODELS.map((m) => summarizeCost(cost, m));
const selection = [...new Set(cost.map((r) => r.origin))].map((origin) => chronologicalChoice(cost, origin));
const selectedRows = cost.map((r) => ({ ...r, models: {
  selected: r.models[selection.find((s) => s.origin === r.origin).selected] } }));
const newborn = [];
for (const sector of ["public4", "public2"]) {
  const prices = aggregate.prices[sector];
  for (let at = 10; at + 21 < prices.length; at++) {
    const training = prices.slice(0, at + 1), level = prices[at], origin = level.year;
    const fit = fitCostTrends(training);
    const { p, st, sc } = planFor(2026, 18, level, sector);
    const c = compile(p, st, sc);
    const actualRows = c.rows.map((r, i) => {
      const price = prices[at + Math.floor(i / 12)];
      return repriceRow(r, price.tuition / level.tuition, price.housing / level.housing,
        price.deflator / level.deflator);
    });
    const actual = runPath({ ...c, rows: actualRows }, () => 1, 0, false).total;
    const models = {};
    for (const model of MODELS) {
      const totals = [];
      for (let t = 0; t < trials; t++) {
        const draws = annualIndices(fit.changes.length, 22, 3, seed, t);
        const u = random((seed ^ Math.imul(t + 1, 0x85ebca6b)) >>> 0)();
        const piMean = mean(fit.changes.map((r) => Math.log(r.inflation)));
        let tuition = 1, housing = 1;
        const factors = [];
        for (const [year, index] of draws.entries()) {
          factors.push({ tuition, housing });
          const source = fit.changes[index];
          const inflation = source.inflation * Math.exp(fit.inflation - piMean);
          const g = costGrowth(fit, model, source, year, u, inflation);
          tuition *= g.tuition; housing *= g.housing;
        }
        const rows = c.rows.map((r, i) => {
          const f = factors[Math.floor(i / 12)];
          return repriceRow(r, f.tuition, f.housing, 1);
        });
        totals.push(runPath({ ...c, rows }, () => 1, 0, false).total);
      }
      models[model] = scoreBills(totals, actual);
    }
    newborn.push({ origin, wait: 18, sector, lastBillYear: origin + 21, models });
  }
}
const independent = [];
for (const r of newborn.filter((r) => r.sector === "public4"))
  if (!independent.length || r.origin > independent.at(-1).lastBillYear) independent.push(r);
const report = {
  id: "cost-followup-v1", asOf: "2026-11-16", reconstruction: true,
  protocolHash: digest(readFileSync("docs/cost-followup-protocol.md")),
  sourceHashes: Object.fromEntries(["site/data/calibration-reviewed.json", "site/data/ipeds-panel.json",
    "site/data/calibration.json", "data/raw/cpi.csv"].map((p) => [p, digest(readFileSync(p))])),
  settings: { trials, seed, models: MODELS, factors: FACTORS, profiles },
  audit: { cases: audits.length, bills: audits.reduce((s, r) => s + r.bills, 0),
    maxAbsoluteDifference: Math.max(...audits.map((r) => r.maxAbsoluteDifference)),
    maxAbsoluteTotalDifference: Math.max(...audits.map((r) => Math.abs(r.totalDifference))), casesDetail: audits },
  cost: { summaries, folds: cost, recommendation: recommendation(summaries),
    chronologicalSelection: selection, chronologicalSummary: summarizeCost(selectedRows, "selected") },
  funding: { summary: fundingSummary(funding), cases: funding },
  newborn: { summaries: MODELS.map((m) => summarizeCost(newborn, m)), folds: newborn,
    distinctOrigins: new Set(newborn.map((r) => r.origin)).size,
    nonoverlappingWindows: independent.map((r) => [r.origin, r.lastBillYear]) },
  limitations: [
    "Reconstruction of reported prior-session work, not recovery of its exact source or numerical results.",
    "All periods are previously inspected retrospective evidence; fixed-panel membership and revised source releases leak future population knowledge.",
    "Origin-limited trend fits reuse benchmark residual correction for a controlled trend-only comparison; alternatives are not independently recalibrated full models.",
    "Related sectors, overlapping origins, funding levels and profiles do not multiply independent economic history.",
    "Historical means do not validate today's survey anchors. Long-horizon aggregate cost evidence does not validate newborn whole-plan funding probabilities.",
    "No production model promotion is performed by this evaluation. Household probability calibration and physical Safari persistence remain unverified."
  ]
};
report.sha256 = digest(canonical(report));
const path = "site/data/cost-followup.json";
writeFileSync(path, JSON.stringify(report) + "\n");
const md = `# Reconstructed cost follow-up results

2026-11-16. Report \`${report.id}\`, hash \`${report.sha256}\`.
Protocol hash \`${report.protocolHash}\`. This is a reconstruction; the previous session's uncommitted implementation was not recovered.

## Independent invoice and CPI audit

${report.audit.cases} cost cases, ${report.audit.bills} attended monthly invoices. Maximum per-invoice difference: $${report.audit.maxAbsoluteDifference.toFixed(2)}; maximum absolute four-year difference: $${report.audit.maxAbsoluteTotalDifference.toFixed(2)}. Independent invoice allocation can differ by cents from repricing already allocated baseline cents. CPI uses preceding-month observations rebased to the August before each September origin; no future CPI enters fitting.

## Complete four-year bill comparison

Lower normalized 80% interval scores are better. Equal weight is given to waits, then origins, then sectors.

| Candidate | Score | Coverage | Signed median error |
| --- | ---: | ---: | ---: |
${summaries.map((r) => `| ${r.model} | ${r.score.toFixed(3)} | ${(r.covered * 100).toFixed(1)}% | ${(r.bias * 100).toFixed(1)}% |`).join("\n")}

Predeclared release recommendation: **${report.cost.recommendation}**. Production remains unchanged pending review. Chronologically selected score: ${report.cost.chronologicalSummary.score.toFixed(3)}. Selection excludes all outcomes whose final bill year is at or after the forecast origin; early origins default to the benchmark.

| Enrollment wait | Distinct origins | Benchmark coverage | Actual below band | Actual above band |
| --- | ---: | ---: | ---: | ---: |
${summaries[0].byWait.map((r) => `| ${r.wait} | ${r.origins} | ${(r.covered * 100).toFixed(1)}% | ${(r.below * 100).toFixed(1)}% | ${(r.above * 100).toFixed(1)}% |`).join("\n")}

## Funding discrimination

Five predeclared opening-balance levels and cash/conservative/balanced profiles are evaluated using the retained production factory and bill ledger. Base-rate forecasts use only earlier origins whose final bills were completed before the forecast origin. Counts are synthetic cases, not independent histories.

| Wait | Profile | Cases | Origins | Brier | Expanding-base Brier | Skill |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${report.funding.summary.map((r) => `| ${r.wait} | ${r.profile} | ${r.cases} | ${r.originYears} | ${r.brier.toFixed(3)} | ${r.baseBrier.toFixed(3)} | ${r.skill === null ? "Unavailable" : r.skill.toFixed(3)} |`).join("\n")}

Empty reliability bins and distinct-origin counts remain in the JSON; these scores do not certify a future 90% funding probability.

## Newborn-horizon cost evidence

18-year wait plus four attendance years; pinned NCES public four-year/two-year aggregates. ${newborn.length} sector/origin outcomes, ${report.newborn.distinctOrigins} distinct origins, ${independent.length} nonoverlapping complete outcome window(s). Shared sectors and overlapping origins are not independent samples.

| Candidate | Bill score | Coverage | Actual below band | Actual above band |
| --- | ---: | ---: | ---: | ---: |
${report.newborn.summaries.map((r) => `| ${r.model} | ${r.score.toFixed(3)} | ${(r.covered * 100).toFixed(1)}% | ${(r.below * 100).toFixed(1)}% | ${(r.above * 100).toFixed(1)}% |`).join("\n")}

These are composition-sensitive aggregate cost tests on a shifted synthetic bill calendar, without investments or panel residual correction. They are not fixed-school or whole-plan newborn backtests. A blanket cost adjustment is not supported by evidence with different miss directions and source definitions.

## Remaining findings

Cost-band coverage and independent long-horizon evidence remain unresolved. The code and reports make the weaknesses measurable; completing this evaluation does not establish forecast calibration. The full JSON retains source/protocol hashes, every bill-score fold, chronological eligibility, audit details, funding cases and reliability bins. Rebuild with \`node scripts/validate-cost-followup.mjs\`.

[Protocol](cost-followup-protocol.md) · [JSON report](../site/data/cost-followup.json) · [Current model](model.md)
`;
writeFileSync("docs/cost-followup-results.md", md);
console.log(JSON.stringify({ summaries, recommendation: report.cost.recommendation,
  audit: { ...report.audit, casesDetail: undefined }, newborn: report.newborn.summaries }));
if (process.env.EMIT_RECOVERY_FILES === "1")
  for (const p of [path, "docs/cost-followup-results.md"]) {
    const content = readFileSync(p, "utf8");
    for (let i = 0; i < content.length; i += 10000)
      console.log("RECOVERY_CHUNK " + JSON.stringify({ path: p, offset: i, content: content.slice(i, i + 10000) }));
  }
