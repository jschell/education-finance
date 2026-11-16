import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  fitCostCorrection,
  costForecastPaths,
  intervalScore,
} from "../site/js/cost-correction.js";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const panel = read("site/data/ipeds-panel.json"),
  final = read("data/cost-holdout-2024.json"),
  correction = fitCostCorrection(panel);
const metrics = (forecast, actual) => ({
  intervalScore: intervalScore(forecast, actual),
  coverage: Number(actual >= forecast.p10 && actual <= forecast.p90),
  error: forecast.p50 / actual - 1,
  predicted: forecast,
  actual,
});
const development = [];
for (const [series, prices] of Object.entries(panel.prices))
  for (const horizon of [2, 5])
    for (let i = 10; i + horizon < prices.length; i++) {
      const actual = prices[i + horizon];
      if (actual.year < 2017 || actual.year > 2019) continue;
      const a = actual.tuition + actual.housing,
        training = prices.slice(0, i + 1);
      development.push({
        series,
        horizon,
        origin: prices[i].year,
        target: actual.year,
        baseline: metrics(costForecastPaths(training, horizon).total, a),
        adjusted: metrics(
          costForecastPaths(training, horizon, { correction, series }).total,
          a,
        ),
      });
    }
// Frozen correction is serialized before the new 2024 final price outcomes are scored.
writeFileSync("data/cost-residual-fit.json", JSON.stringify(correction) + "\n");
const finalRows = [];
for (const [series, data] of Object.entries(final.series))
  for (const horizon of [2, 5, 10]) {
    const origin = 2024 - horizon,
      training = data.training.filter((p) => p.year <= origin),
      actual = data.actual.tuition + data.actual.housing;
    finalRows.push({
      series,
      horizon,
      origin,
      target: 2024,
      counts: data.counts,
      baseline: metrics(costForecastPaths(training, horizon).total, actual),
      adjusted: metrics(
        costForecastPaths(training, horizon, { correction, series }).total,
        actual,
      ),
    });
  }
const avg = (rows, key, metric) =>
  rows.reduce((v, r) => v + r[key][metric], 0) / rows.length;
const baseline = avg(finalRows, "baseline", "intervalScore"),
  adjusted = avg(finalRows, "adjusted", "intervalScore");
const gatePassed = adjusted <= baseline;
const report = {
  id: "cost-residual-check-2026-11-16-v1",
  protocolHash: createHash("sha256")
    .update(readFileSync("docs/economic-model-fix-plan.md"))
    .digest("hex"),
  panelHash: panel.sha256,
  finalSources: final.sources,
  fit: correction,
  development,
  final: finalRows,
  gatePassed,
  active: gatePassed,
  baselineScore: baseline,
  adjustedScore: adjusted,
  baselineCoverage: avg(finalRows, "baseline", "coverage"),
  adjustedCoverage: avg(finalRows, "adjusted", "coverage"),
  independentTargetYears: 1,
  limits: final.limitations,
};
writeFileSync("site/data/cost-correction.json", JSON.stringify(report) + "\n");
console.log(
  JSON.stringify({
    gatePassed,
    baselineScore: baseline,
    adjustedScore: adjusted,
    baselineCoverage: report.baselineCoverage,
    adjustedCoverage: report.adjustedCoverage,
    independentTargetYears: 1,
  }),
);
