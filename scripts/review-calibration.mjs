import { historicalInputs } from "./validation-inputs.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  fitCostCorrection,
  costForecastPaths,
  intervalScore,
} from "../site/js/cost-correction.js";
import { fitCostSpread } from "../site/js/cost-uncertainty.js";
import {
  canonical,
  compileCalibrated,
  calibrationFactory,
} from "../site/js/calibration.js";
import { fitEconomy, treasuryGross, billGross } from "../site/js/economy.js";
import { newPlan, validatePlan } from "../site/js/domain.js";
import { repriceRow, runPath } from "../site/js/engine.js";
import { PROFILES } from "../site/js/history-config.js";
import { quantile } from "../site/js/random.js";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const base = read("site/data/calibration-robust.json"),
  panel = read("site/data/ipeds-panel.json"),
  robust = read("site/data/robustness-validation.json"),
  fresh = read("data/cost-holdout-2024.json");
const hash = (x) => createHash("sha256").update(canonical(x)).digest("hex");
const protocolHash = createHash("sha256")
  .update(readFileSync("docs/critique-fix-plan.md"))
  .digest("hex");
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const cache = new Map();
function fits(origin) {
  if (!cache.has(origin)) {
    let raw = null;
    try {
      raw = fitCostCorrection(panel, { cutoff: origin });
    } catch {}
    const n = new Set(raw?.folds.map((f) => f.target)).size;
    const correction =
      n < 3
        ? null
        : {
            ...raw,
            uniqueTargetYears: n,
            shrinkage: n / (n + 10),
            folds: raw.folds.map((f) => ({
              ...f,
              series: Object.fromEntries(
                Object.entries(f.series).map(([s, d]) => [
                  s,
                  {
                    tuition: (d.tuition * n) / (n + 10),
                    housing: (d.housing * n) / (n + 10),
                  },
                ]),
              ),
            })),
          };
    cache.set(origin, { correction, spread: fitCostSpread(raw, origin) });
  }
  return cache.get(origin);
}
const cost = [];
for (const row of robust.cost) {
  const training =
    row.target === 2024
      ? fresh.series[row.series].training.filter((p) => p.year <= row.origin)
      : panel.prices[row.series].filter((p) => p.year <= row.origin);
  const actual =
    row.target === 2024
      ? fresh.series[row.series].actual
      : panel.prices[row.series].find((p) => p.year === row.target);
  const { correction, spread } = fits(row.origin);
  const options = {
    correction: robust.costGate.passed ? correction : null,
    series: row.series,
  };
  const a = costForecastPaths(training, row.horizon, options).total;
  const b = costForecastPaths(training, row.horizon, {
    ...options,
    spread,
  }).total;
  const value = actual.tuition + actual.housing;
  const stat = (p) => ({
    score: intervalScore(p, value),
    covered: Number(value >= p.p10 && value <= p.p90),
  });
  cost.push({
    series: row.series,
    origin: row.origin,
    target: row.target,
    horizon: row.horizon,
    era: row.era,
    fitCutoff: spread?.cutoff ?? null,
    targetYears: spread?.targetYears ?? [],
    baseline: stat(a),
    expanded: stat(b),
  });
}
const costSummary = [];
for (const policy of ["baseline", "expanded"])
  for (const era of [...new Set(cost.map((r) => r.era))]) {
    const cells = [];
    for (const series of Object.keys(panel.prices))
      for (const horizon of [2, 5, 10]) {
        const rows = cost.filter(
          (r) => r.era === era && r.series === series && r.horizon === horizon,
        );
        if (rows.length)
          cells.push({
            score: mean(rows.map((r) => r[policy].score)),
            coverage: mean(rows.map((r) => r[policy].covered)),
          });
      }
    costSummary.push({
      policy,
      era,
      score: mean(cells.map((c) => c.score)),
      coverage: mean(cells.map((c) => c.coverage)),
    });
  }
const overall = (policy) => ({
  score: mean(
    costSummary.filter((r) => r.policy === policy).map((r) => r.score),
  ),
  coverage: mean(
    costSummary.filter((r) => r.policy === policy).map((r) => r.coverage),
  ),
});
const baseline = overall("baseline"),
  expanded = overall("expanded");
const spreadGate = {
  baseline,
  expanded,
  passed:
    expanded.score <= baseline.score * 1.1 &&
    Math.abs(expanded.coverage - 0.8) < Math.abs(baseline.coverage - 0.8),
};
const report = {
  id: "critique-validation-v1",
  asOf: "2026-11-16",
  protocolHash,
  baseHash: base.sha256,
  costSummary,
  spreadGate,
  liveSpread: spreadGate.passed ? fits(2023).spread : null,
  cost,
  limitations: [
    "Target-year maxima deliberately pool related sectors. Temporal dependence prevents a conformal coverage guarantee.",
    "These are retrospective comparisons of previously examined periods; the gate does not certify whole-plan probabilities.",
  ],
};
writeFileSync(
  "site/data/critique-validation.json",
  JSON.stringify(report) + "\n",
);
console.log(
  JSON.stringify(
    { spreadGate, costSummary, liveSpread: report.liveSpread },
    null,
    2,
  ),
);

// Whole-plan historical transplantation. The same production factory and ledger
// generate predictions; actual costs use published panel levels on real bill dates.
const cases = [],
  trials = 400,
  seed = 850213,
  waits = [0, 4, 8];
const paths = {
  public4: "Public in-state",
  public4out: "Public out-of-state",
  public2: "Community in-state",
  public2out: "Community out-of-state",
  private4: "Private nonprofit",
};
function originBundle(origin) {
  return historicalInputs(
    base,
    origin,
    robust.costGate.passed ? fits(origin).correction : null,
    spreadGate.passed ? fits(origin).spread : null,
  );
}
for (let origin = 2011; origin <= 2020; origin++) {
  const bundle = originBundle(origin);
  for (const wait of waits) {
    const end = origin + wait + 3;
    if (end > 2023) continue;
    for (const [sector, path] of Object.entries(paths)) {
      const p = newPlan(),
        st = p.students[0],
        sc = st.scenarios[0],
        prices = panel.prices[sector];
      const level = prices.find((x) => x.year === origin),
        annual = level.tuition + level.housing;
      p.valuation = `${origin}-09`;
      st.enrollment = `${origin + wait}-09`;
      Object.assign(st.funding, {
        balance: 0,
        monthly: wait ? annual * 0.01 : 0,
        contributionStart: p.valuation,
        contributionEnd: wait ? `${origin + wait}-08` : p.valuation,
        assumptionsDate: p.valuation,
        grant: level.tuition * 0.1,
        grantYears: 4,
      });
      Object.assign(sc, {
        baseline: p.valuation,
        path,
        sourceDate: p.valuation,
        costs: {
          tuition: level.tuition,
          housing: level.housing,
          books: 0,
          transport: 0,
          other: 0,
        },
      });
      validatePlan(p);
      const { c } = compileCalibrated(p, st, sc, bundle, bundle.macro.cases[1]);
      const factory = calibrationFactory(
        c,
        bundle,
        { seed },
        bundle.macro.cases[1],
      );
      const actualGross = Float64Array.from(c.rows, (row, i) => {
        const y = base.economy.macroYears.find(
            (y) => y.year === origin + Math.floor(i / 12),
          ),
          m = i % 12;
        const stage =
          i >= c.enrollmentIndex
            ? 2
            : i >= c.enrollmentIndex - c.a.transitionYears * 12
              ? 1
              : 0;
        const w = PROFILES[c.history.profile].stages[stage];
        return (
          (1 +
            w[0] * y.months[m][0] +
            w[1] * (treasuryGross(y.rates[m][0], y.rates[m][1]) - 1) +
            w[2] * (billGross(y.rates[m][2]) - 1)) *
          (1 - c.history.fee) ** (1 / 12)
        );
      });
      const actualRows = c.rows.map((row, i) => {
        const year = origin + Math.floor(i / 12),
          price = prices.find((p) => p.year === year);
        return repriceRow(
          row,
          price.tuition / level.tuition,
          price.housing / level.housing,
          price.deflator / level.deflator,
        );
      });
      const balances = [0.55, 0.85, 1.15].map((f) => annual * 4 * f),
        counts = [0, 0, 0],
        costs = [];
      for (let t = 0; t < trials; t++) {
        const sampled = factory.make(t);
        for (let k = 0; k < balances.length; k++) {
          const r = runPath(
            { ...sampled.compiled, opening: balances[k] },
            (i) => sampled.gross[i],
            c.monthly,
            "bands",
          );
          counts[k] += Number(r.success);
          if (k === 0) costs.push(r.total);
        }
      }
      costs.sort((a, b) => a - b);
      for (let k = 0; k < balances.length; k++) {
        const actual = runPath(
          { ...c, opening: balances[k], rows: actualRows },
          (i) => actualGross[i],
          c.monthly,
          "bands",
        );
        const probability = counts[k] / trials;
        cases.push({
          origin,
          wait,
          attendanceYears: 4,
          lastBillYear: end,
          sector,
          fundingFactor: [0.55, 0.85, 1.15][k],
          probability,
          actual: Number(actual.success),
          brier: (probability - Number(actual.success)) ** 2,
          costCovered: Number(
            actual.total >= quantile(costs, 0.1) &&
              actual.total <= quantile(costs, 0.9),
          ),
          actualCost: actual.total,
          p10Cost: quantile(costs, 0.1),
          p90Cost: quantile(costs, 0.9),
          macroLast: bundle.economy.macroYears.at(-1).year,
          annualLast: bundle.annual.at(-1).year,
          costLast: bundle.prices[sector].at(-1).year,
          correctionCutoff: bundle.costCorrection?.cutoff ?? null,
          spreadCutoff: bundle.costUncertainty?.cutoff ?? null,
        });
      }
    }
  }
  console.log("Whole-plan origin completed", origin);
}
const summary = waits.map((wait) => {
  const r = cases.filter((r) => r.wait === wait);
  return {
    wait,
    attendanceYears: 4,
    cases: r.length,
    originYears: new Set(r.map((x) => x.origin)).size,
    brier: mean(r.map((x) => x.brier)),
    coinFlipBrier: 0.25,
    costCoverage: mean(r.map((x) => x.costCovered)),
    predictedSuccess: mean(r.map((x) => x.probability)),
    actualSuccess: mean(r.map((x) => x.actual)),
  };
});
const reliability = Array.from({ length: 5 }, (_, i) => {
  const rows = cases.filter(
    (r) =>
      r.probability >= i * 0.2 &&
      (i === 4 ? r.probability <= 1 : r.probability < (i + 1) * 0.2),
  );
  return {
    band: `${i * 20}–${(i + 1) * 20}%`,
    cases: rows.length,
    originYears: new Set(rows.map((x) => x.origin)).size,
    predicted: rows.length ? mean(rows.map((x) => x.probability)) : null,
    observed: rows.length ? mean(rows.map((x) => x.actual)) : null,
  };
});
const funding = {
  id: "whole-plan-validation-v1",
  asOf: "2026-11-16",
  protocolHash,
  baseHash: base.sha256,
  critiqueHash: hash(report),
  trials,
  seed,
  summary,
  reliability,
  cases,
  unavailable: {
    wait: 18,
    attendanceYears: 4,
    eligibleOrigins: 0,
    reason:
      "At least eleven cost levels are required before the origin; no complete subsequent 22-year bill window exists.",
  },
  limitations: [
    "Historical plans are synthetic; current fixed-panel membership creates survivorship bias. School prices are revised published index levels, not individual family invoices or historical release vintages.",
    "Origins, sectors and funding levels share shocks and overlapping bill windows; case counts are not independent economic observations. No binomial confidence interval over case counts is justified.",
    "Historical anchors are training means, not vintage survey forecasts. This tests the production path and ledger machinery, not the accuracy of today's forward anchors.",
    "Full-period-selected macro/cost policy is fixed for these diagnostics. It is not a nested policy-selection backtest or untouched holdout. No parameters were tuned to these results.",
    "Four attendance years and 0/4/8-year waits are tested. Household, aid eligibility and 18-year-wait probability calibration remain unestablished.",
  ],
};
writeFileSync(
  "site/data/funding-validation.json",
  JSON.stringify(funding) + "\n",
);
console.log(JSON.stringify({ summary, reliability }, null, 2));
