// Persistent paired residual correction; fitting and final gate are offline.
import { fitCostTrends, costGrowth, mean } from "./cost-trends.js?v=0.9.0";
import { annualIndices } from "./calibration.js?v=0.9.0";
import { random, quantile } from "./simulation.js?v=0.9.0";
const qs = (xs) => {
  xs.sort((a, b) => a - b);
  return {
    p10: quantile(xs, 0.1),
    p50: quantile(xs, 0.5),
    p90: quantile(xs, 0.9),
  };
};
export function costForecastPaths(
  training,
  horizon,
  { seed = 972461, trials = 1000, correction = null, series = null } = {},
) {
  const fit = fitCostTrends(training),
    origin = training.at(-1),
    paths = [];
  const piMean = mean(fit.changes.map((r) => Math.log(r.inflation)));
  for (let t = 0; t < trials; t++) {
    const draws = annualIndices(fit.changes.length, horizon, 3, seed, t);
    const u = random(
      (seed ^ Math.imul(t + 1, 0x27d4eb2d) ^ 0x165667b1) >>> 0,
    )();
    const drift = correction
      ? correction.folds[
          Math.min(
            correction.folds.length - 1,
            Math.floor(u * correction.folds.length),
          )
        ].series[series]
      : { tuition: 0, housing: 0 };
    let tuition = 1,
      housing = 1;
    for (const [year, index] of draws.entries()) {
      const r = fit.changes[index],
        inflation = r.inflation * Math.exp(fit.inflation - piMean);
      const g = costGrowth(fit, "fixed", r, year, 0.5, inflation);
      tuition *= g.tuition * Math.exp(drift.tuition);
      housing *= g.housing * Math.exp(drift.housing);
    }
    paths.push({
      tuition,
      housing,
      total: origin.tuition * tuition + origin.housing * housing,
    });
  }
  return {
    paths,
    tuition: qs(paths.map((p) => p.tuition * origin.tuition)),
    housing: qs(paths.map((p) => p.housing * origin.housing)),
    total: qs(paths.map((p) => p.total)),
  };
}
export function fitCostCorrection(
  panel,
  { cutoff = 2016, trials = 1000, seed = 972461 } = {},
) {
  const byFold = new Map();
  for (const [series, prices] of Object.entries(panel.prices))
    for (const horizon of [2, 5])
      for (let i = 10; i + horizon < prices.length; i++) {
        const origin = prices[i],
          actual = prices[i + horizon];
        if (actual.year > cutoff) continue;
        const f = costForecastPaths(prices.slice(0, i + 1), horizon, {
            trials,
            seed,
          }),
          key = origin.year + ":" + horizon;
        if (!byFold.has(key))
          byFold.set(key, {
            origin: origin.year,
            target: actual.year,
            horizon,
            series: {},
          });
        byFold.get(key).series[series] = {
          tuition: Math.log(actual.tuition / f.tuition.p50) / horizon,
          housing: Math.log(actual.housing / f.housing.p50) / horizon,
        };
      }
  const folds = [...byFold.values()].sort(
    (a, b) => a.target - b.target || a.origin - b.origin,
  );
  if (!folds.length)
    throw Error("No earlier residual-training folds are available.");
  return {
    cutoff,
    trials,
    seed,
    folds,
    method:
      "Paired annualized log errors of training-only nominal price forecasts; persistent draw per household path, independent of macro-expectation draw.",
  };
}
export const intervalScore = (p, actual) =>
  (p.p90 -
    p.p10 +
    10 * Math.max(0, p.p10 - actual) +
    10 * Math.max(0, actual - p.p90)) /
  actual;
