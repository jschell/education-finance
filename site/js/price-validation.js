// Component validation only: no current macro forecasts enter a historical fold.
import { costFit, annualIndices } from "./calibration.js?v=0.10.2";
import { random, quantile } from "./random.js?v=0.10.2";
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
export function priceForecast(
  training,
  horizon,
  { trials = 1000, seed = 972461 } = {},
) {
  const fit = costFit(training),
    origin = training.at(-1),
    out = [];
  for (let t = 0; t < trials; t++) {
    const u = random(
      (seed ^ Math.imul(t + 1, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0,
    )();
    const draws = annualIndices(
      fit.changes.length,
      horizon,
      Math.min(3, fit.changes.length),
      seed,
      t,
    );
    let tuition = origin.tuition,
      housing = origin.housing;
    const longInflation = fit.inflation;
    const sourceInflation = mean(fit.changes.map((c) => Math.log(c.inflation)));
    for (const i of draws) {
      const r = fit.changes[i],
        inflation = r.inflation * Math.exp(longInflation - sourceInflation);
      for (const key of ["tuition", "housing"]) {
        const f = fit[key],
          drift =
            f.deviations[
              Math.min(
                f.deviations.length - 1,
                Math.floor(u * f.deviations.length),
              )
            ];
        const factor =
          (r[key] / r.inflation) *
          Math.exp(f.center + drift - f.historical) *
          inflation;
        if (key === "tuition") tuition *= factor;
        else housing *= factor;
      }
    }
    out.push(tuition + housing);
  }
  out.sort((a, b) => a - b);
  return {
    p10: quantile(out, 0.1),
    p50: quantile(out, 0.5),
    p90: quantile(out, 0.9),
  };
}
export function validatePrices(bundle, settings = {}) {
  const results = [];
  for (const [sector, prices] of Object.entries(bundle.prices))
    for (const horizon of [2, 5, 10, 18]) {
      const folds = [];
      for (let i = 10; i + horizon < prices.length; i++) {
        const training = prices.slice(0, i + 1),
          origin = prices[i],
          actual = prices[i + horizon];
        const predicted = priceForecast(training, horizon, settings),
          observed = actual.tuition + actual.housing;
        folds.push({
          origin: origin.year,
          target: actual.year,
          observed,
          predicted,
          covered: observed >= predicted.p10 && observed <= predicted.p90,
          error: predicted.p50 / observed - 1,
          baselineError:
            (origin.tuition * 1.04 ** horizon +
              origin.housing * 1.03 ** horizon) /
              observed -
            1,
        });
      }
      const independent = [];
      for (const f of folds)
        if (!independent.length || f.origin >= independent.at(-1).target)
          independent.push(f);
      const coverage = folds.length
        ? mean(folds.map((f) => Number(f.covered)))
        : null;
      const n = independent.length,
        k = independent.filter((f) => f.covered).length,
        z = 1.96,
        den = 1 + (z * z) / (n || 1),
        center = (k / (n || 1) + (z * z) / (2 * (n || 1))) / den,
        width =
          (z *
            Math.sqrt(
              ((k / (n || 1)) * (1 - k / (n || 1))) / (n || 1) +
                (z * z) / (4 * (n || 1) ** 2),
            )) /
          den;
      results.push({
        sector,
        horizon,
        folds,
        coverage,
        medianBias: folds.length ? mean(folds.map((f) => f.error)) : null,
        mape: folds.length ? mean(folds.map((f) => Math.abs(f.error))) : null,
        baselineMape: folds.length
          ? mean(folds.map((f) => Math.abs(f.baselineError)))
          : null,
        nonoverlapping: n,
        nonoverlappingCoverage: n ? k / n : null,
        coverageInterval: n
          ? [Math.max(0, center - width), Math.min(1, center + width)]
          : null,
        status:
          n < 10
            ? "Insufficient independent periods"
            : "Retrospective component evidence",
      });
    }
  return {
    bundleId: bundle.id,
    bundleHash: bundle.sha256,
    method:
      "Expanding year-cutoff forecasts of actual published tuition + on-campus room/board; P10–P90 coverage. Revised aggregates, not historical release vintages. No 2026 expectations used in training.",
    limitations:
      "Overlapping folds and sectors share economic history. Non-overlapping counts remain too small to validate long-horizon funding probabilities. This tests sector prices only, not investments, aid or individual-family funding success.",
    ...settings,
    results,
  };
}
