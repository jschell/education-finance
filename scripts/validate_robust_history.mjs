import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  fitEconomy,
  economyPath,
  treasuryGross,
  billGross,
} from "../site/js/economy.js";
import {
  fitCostCorrection,
  costForecastPaths,
  intervalScore,
} from "../site/js/cost-correction.js";
import { quantile } from "../site/js/random.js";
const read = (f) => JSON.parse(readFileSync(f, "utf8")),
  bundle = read("site/data/economy-broad.json"),
  years = bundle.macroYears,
  panel = read("site/data/ipeds-panel.json"),
  fresh = read("data/cost-holdout-2024.json");
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length,
  metrics = ["stocks", "treasury", "cash", "inflation", "portfolio"];
const q = (xs) => {
  xs.sort((a, b) => a - b);
  return {
    p10: quantile(xs, 0.1),
    p50: quantile(xs, 0.5),
    p90: quantile(xs, 0.9),
  };
};
const stats = (p, actual) => ({
  intervalScore: intervalScore(p, actual),
  coverage: Number(actual >= p.p10 && actual <= p.p90),
  error: p.p50 / actual - 1,
});
const marketEra = (end) =>
  end <= 1989
    ? "1974–1989"
    : end <= 2009
      ? "1990–2009"
      : end <= 2019
        ? "2010–2019"
        : "2020–2023";
function outcome(path) {
  const r = Object.fromEntries(metrics.map((k) => [k, 1]));
  for (const y of path) {
    r.inflation *= y.inflation;
    for (const m of y.months) {
      r.stocks *= 1 + m[0];
      r.treasury *= 1 + m[1];
      r.cash *= 1 + m[2];
      r.portfolio *= 1 + 0.6 * m[0] + 0.3 * m[1] + 0.1 * m[2];
    }
  }
  return r;
}
const market = [];
for (let n = 20; n < years.length; n++)
  for (const horizon of [1, 3, 5]) {
    if (n + horizon > years.length) continue;
    const training = years.slice(0, n),
      test = years.slice(n, n + horizon),
      last = training.at(-1),
      fit = fitEconomy(training, bundle.fitting);
    const anchors = {
        stocks: mean(training.map((y) => Math.exp(y.stockLog))) - 1,
        bonds: fit.long.center,
        cash: mean(
          training.flatMap((y) =>
            y.rates.map((r) => billGross(r[2]) ** 12 - 1),
          ),
        ),
        inflation: Math.expm1(fit.inflation.center),
      },
      initial = {
        long: last.rates.at(-1)[1],
        short: last.rates.at(-1)[3],
        inflation: last.inflation - 1,
      };
    const actual = outcome(
      test.map((y) => ({
        ...y,
        months: y.months.map((m, i) => [
          m[0],
          treasuryGross(y.rates[i][0], y.rates[i][1]) - 1,
          billGross(y.rates[i][2]) - 1,
        ]),
      })),
    );
    for (const conditioned of [false, true]) {
      const samples = Object.fromEntries(metrics.map((k) => [k, []]));
      for (let t = 0; t < 500; t++) {
        const r = outcome(
          economyPath(training, fit, initial, anchors, {
            seed: 623917,
            trial: t,
            blockYears: 3,
            length: horizon,
            conditioned,
          }),
        );
        for (const k of metrics) samples[k].push(r[k]);
      }
      for (const metric of metrics)
        market.push({
          policy: conditioned ? "conditioned" : "uniform",
          horizon,
          metric,
          origin: last.year,
          start: test[0].year,
          target: test.at(-1).year,
          era: marketEra(test.at(-1).year),
          ...stats(q(samples[metric]), actual[metric]),
        });
    }
  }
const marketSummary = [];
for (const policy of ["uniform", "conditioned"])
  for (const era of ["1974–1989", "1990–2009", "2010–2019", "2020–2023"]) {
    const scores = [];
    for (const horizon of [1, 3, 5])
      for (const metric of metrics) {
        const rows = market.filter(
          (r) =>
            r.policy === policy &&
            r.era === era &&
            r.horizon === horizon &&
            r.metric === metric,
        );
        if (rows.length) scores.push(mean(rows.map((r) => r.intervalScore)));
      }
    const rows = market.filter((r) => r.policy === policy && r.era === era);
    marketSummary.push({
      policy,
      era,
      score: mean(scores),
      coverage: mean(rows.map((r) => r.coverage)),
      originYears: [...new Set(rows.map((r) => r.origin))].length,
    });
  }
function gate(summary, baseline, candidate) {
  const base = summary.filter((r) => r.policy === baseline),
    alt = summary.filter((r) => r.policy === candidate),
    baseScore = mean(base.map((r) => r.score)),
    altScore = mean(alt.map((r) => r.score));
  return {
    passed:
      altScore < baseScore &&
      alt.every(
        (r) => r.score <= 1.1 * base.find((b) => b.era === r.era).score,
      ),
    baselineScore: baseScore,
    candidateScore: altScore,
    eraLimit: 1.1,
  };
}
const marketGate = gate(marketSummary, "uniform", "conditioned");
// Correction fitting is origin-specific; targets after the origin cannot enter it.
function originCorrection(origin) {
  let fit;
  try {
    fit = fitCostCorrection(panel, { cutoff: origin });
  } catch {
    return null;
  }
  const targetYears = [...new Set(fit.folds.map((f) => f.target))];
  if (targetYears.length < 3) return null;
  const weight = targetYears.length / (targetYears.length + 10);
  return {
    ...fit,
    uniqueTargetYears: targetYears.length,
    shrinkage: weight,
    folds: fit.folds.map((f) => ({
      ...f,
      series: Object.fromEntries(
        Object.entries(f.series).map(([s, d]) => [
          s,
          { tuition: d.tuition * weight, housing: d.housing * weight },
        ]),
      ),
    })),
  };
}
const correctionCache = new Map();
const correctionAt = (origin) => {
  if (!correctionCache.has(origin))
    correctionCache.set(origin, originCorrection(origin));
  return correctionCache.get(origin);
};
const cost = [],
  costEra = (end) =>
    end <= 2016
      ? "2012–2016"
      : end <= 2019
        ? "2017–2019"
        : end <= 2023
          ? "2020–2023"
          : "2024";
for (const [series, prices] of Object.entries(panel.prices))
  for (const horizon of [2, 5, 10])
    for (let i = 10; i + horizon < prices.length; i++) {
      const origin = prices[i].year,
        actual = prices[i + horizon],
        training = prices.slice(0, i + 1),
        correction = correctionAt(origin),
        value = actual.tuition + actual.housing;
      const baseline = costForecastPaths(training, horizon).total,
        adjusted = costForecastPaths(training, horizon, {
          correction,
          series,
        }).total;
      cost.push({
        series,
        horizon,
        origin,
        target: actual.year,
        era: costEra(actual.year),
        fitCutoff: correction?.cutoff ?? null,
        shrinkage: correction?.shrinkage ?? 0,
        baseline: stats(baseline, value),
        adjusted: stats(adjusted, value),
      });
    }
for (const [series, data] of Object.entries(fresh.series))
  for (const horizon of [2, 5, 10]) {
    const origin = 2024 - horizon,
      training = data.training.filter((r) => r.year <= origin),
      value = data.actual.tuition + data.actual.housing,
      correction = correctionAt(origin);
    cost.push({
      series,
      horizon,
      origin,
      target: 2024,
      era: "2024",
      fitCutoff: correction?.cutoff ?? null,
      shrinkage: correction?.shrinkage ?? 0,
      baseline: stats(costForecastPaths(training, horizon).total, value),
      adjusted: stats(
        costForecastPaths(training, horizon, { correction, series }).total,
        value,
      ),
    });
  }
const costSummary = [];
for (const policy of ["baseline", "adjusted"])
  for (const era of ["2012–2016", "2017–2019", "2020–2023", "2024"]) {
    const scores = [];
    for (const series of Object.keys(panel.prices))
      for (const horizon of [2, 5, 10]) {
        const rows = cost.filter(
          (r) => r.series === series && r.horizon === horizon && r.era === era,
        );
        if (rows.length)
          scores.push(mean(rows.map((r) => r[policy].intervalScore)));
      }
    const rows = cost.filter((r) => r.era === era);
    costSummary.push({
      policy,
      era,
      score: mean(scores),
      coverage: mean(rows.map((r) => r[policy].coverage)),
      originYears: [...new Set(rows.map((r) => r.origin))].length,
    });
  }
const costGate = gate(costSummary, "baseline", "adjusted"),
  liveCorrection = costGate.passed ? correctionAt(2023) : null;
const report = {
  id: "broad-history-robustness-v1",
  asOf: "2026-11-16",
  protocolHash: createHash("sha256")
    .update(readFileSync("docs/robust-history-plan.md"))
    .digest("hex"),
  marketHistory: [1954, 2023],
  macroYears: years.length,
  macroDataHash: bundle.sha256,
  costHistory: [2000, 2023],
  nonoverlappingExpectationWindows: fitEconomy(years, bundle.fitting)
    .windowCount,
  marketSummary,
  marketGate,
  marketPolicy: marketGate.passed ? "conditioned" : "uniform",
  costSummary,
  costGate,
  costPolicy: costGate.passed
    ? "origin-fitted shrunk correction"
    : "unadjusted benchmark",
  liveCorrection,
  market,
  cost,
  limitations: [
    "Era comparisons are retrospective robustness checks, not new prospective holdouts; 2020–2024 observations were inspected in earlier releases.",
    "School counts, horizons and overlapping origin windows share economic shocks. Seven disjoint expectation windows do not guarantee independent economies.",
    "Treasury and cash returns use the stated instrument reconstructions. Longer history reduces sample restrictions but cannot establish future funding-probability calibration.",
  ],
};
writeFileSync(
  "site/data/robustness-validation.json",
  JSON.stringify(report) + "\n",
);
console.log(
  JSON.stringify(
    {
      marketGate,
      marketPolicy: report.marketPolicy,
      costGate,
      costPolicy: report.costPolicy,
      years: years.length,
      windows: report.nonoverlappingExpectationWindows,
      marketSummary,
      costSummary,
    },
    null,
    2,
  ),
);
