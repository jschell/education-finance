import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  fitEconomy,
  economyPath,
  treasuryGross,
  billGross,
} from "../site/js/economy.js";
import { quantile } from "../site/js/simulation.js";
const bundle = JSON.parse(readFileSync("site/data/economy.json", "utf8")),
  years = bundle.validationYears;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const metrics = [
  "stocks",
  "treasury",
  "cash",
  "inflation",
  "portfolio",
  "longYield",
  "billQuote",
];
function outcomes(path) {
  const out = { stocks: 1, treasury: 1, cash: 1, inflation: 1, portfolio: 1 };
  for (const y of path) {
    out.inflation *= y.inflation;
    for (const m of y.months) {
      out.stocks *= 1 + m[0];
      out.treasury *= 1 + m[1];
      out.cash *= 1 + m[2];
      out.portfolio *= 1 + 0.6 * m[0] + 0.3 * m[1] + 0.1 * m[2];
    }
  }
  out.longYield = path.at(-1).states.at(-1)[0];
  out.billQuote = path.at(-1).states.at(-1)[1];
  return out;
}
function observed(rows) {
  return outcomes(
    rows.map((y) => ({
      ...y,
      months: y.months.map((m, i) => [
        m[0],
        treasuryGross(y.rates[i][0], y.rates[i][1]) - 1,
        billGross(y.rates[i][2]) - 1,
      ]),
      states: y.rates.map((r) => [r[1], r[3]]),
    })),
  );
}
const folds = [];
const trials = 500,
  seed = 623917;
for (let n = 10; n < years.length; n++)
  for (const horizon of [1, 3, 5]) {
    if (n + horizon > years.length) continue;
    const training = years.slice(0, n),
      test = years.slice(n, n + horizon),
      last = training.at(-1),
      fit = fitEconomy(training);
    const anchors = {
      stocks: mean(training.map((y) => Math.exp(y.stockLog))) - 1,
      bonds: fit.long.center,
      cash: mean(
        training.flatMap((y) => y.rates.map((r) => billGross(r[2]) ** 12 - 1)),
      ),
      inflation: Math.expm1(fit.inflation.center),
    };
    const initial = {
        long: last.rates.at(-1)[1],
        short: last.rates.at(-1)[3],
        inflation: last.inflation - 1,
      },
      samples = Object.fromEntries(metrics.map((k) => [k, []]));
    for (let t = 0; t < trials; t++) {
      const r = outcomes(
        economyPath(training, fit, initial, anchors, {
          seed,
          trial: t,
          blockYears: 3,
          length: horizon,
        }),
      );
      for (const k of metrics) samples[k].push(r[k]);
    }
    const actual = observed(test),
      predicted = {};
    for (const k of metrics) {
      samples[k].sort((a, b) => a - b);
      const p10 = quantile(samples[k], 0.1),
        p50 = quantile(samples[k], 0.5),
        p90 = quantile(samples[k], 0.9),
        a = actual[k],
        rate = ["longYield", "billQuote"].includes(k);
      predicted[k] = {
        p10,
        p50,
        p90,
        actual: a,
        covered: a >= p10 && a <= p90,
        error: p50 - a,
        intervalScore:
          (p90 - p10 + 10 * Math.max(0, p10 - a) + 10 * Math.max(0, a - p90)) /
          (rate ? 1 : a),
      };
    }
    folds.push({
      trainEnd: last.year,
      start: test[0].year,
      end: test.at(-1).year,
      horizon,
      split: test.at(-1).year > 2019 ? "final" : "development",
      predicted,
    });
  }
const summary = [];
for (const split of ["development", "final"])
  for (const horizon of [1, 3, 5])
    for (const metric of metrics) {
      const selected = folds.filter(
          (f) => f.split === split && f.horizon === horizon,
        ),
        nonoverlapping = [];
      for (const f of selected)
        if (!nonoverlapping.length || f.start > nonoverlapping.at(-1).end)
          nonoverlapping.push(f);
      summary.push({
        split,
        horizon,
        metric,
        folds: selected.length,
        nonoverlapping: nonoverlapping.length,
        coverage: selected.length
          ? mean(selected.map((f) => Number(f.predicted[metric].covered)))
          : null,
        meanAbsoluteError: selected.length
          ? mean(selected.map((f) => Math.abs(f.predicted[metric].error)))
          : null,
        intervalScore: selected.length
          ? mean(selected.map((f) => f.predicted[metric].intervalScore))
          : null,
      });
    }
const report = {
  id: "economic-process-hindcast-v1",
  bundleHash: bundle.sha256,
  protocolHash: createHash("sha256")
    .update(readFileSync("docs/economic-model-fix-plan.md"))
    .digest("hex"),
  trials,
  seed,
  minimumTrainingYears: 10,
  finalTargets: [2020, 2023],
  summary,
  folds,
  limitations: [
    "Historical training-only expanding cutoffs; 2026 forecasts and initial yields are excluded from every fold. Final-period rows were not used to tune parameters.",
    "Treasury/cash observations are reconstructed from the same explicitly defined instruments using held-out observed yields, not independently measured fund/index returns. Portfolio is 60/30/10, monthly rebalanced, before fees.",
    "Ranges are for terminal wealth factors, inflation factors or yields. Overlapping folds and common macro years are not independent observations; long-horizon funding success remains unvalidated.",
  ],
};
writeFileSync(
  "site/data/economy-validation.json",
  JSON.stringify(report) + "\n",
);
console.table(
  summary
    .filter((r) => r.split === "final")
    .map(({ horizon, metric, folds, nonoverlapping, coverage }) => ({
      horizon,
      metric,
      folds,
      nonoverlapping,
      coverage,
    })),
);
