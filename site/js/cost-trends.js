// Shared by offline validation and live paths. No current expectations enter fitting.
export const COST_MODELS = ["fixed", "recent10", "damped5", "regime"];
export const mean = (values) =>
  values.reduce((a, b) => a + b, 0) / values.length;
const quantile = (values, p) => {
  const v = [...values].sort((a, b) => a - b),
    i = (v.length - 1) * p,
    j = Math.floor(i);
  return v[j] + (v[Math.ceil(i)] - v[j]) * (i - j);
};
export function fitCostTrends(prices) {
  if (prices.length < 11)
    throw Error("Cost models require at least eleven annual levels.");
  if (
    prices.some(
      (p, i) =>
        !["tuition", "housing", "deflator"].every(
          (k) => Number.isFinite(p[k]) && p[k] > 0,
        ) ||
        (i && p.year !== prices[i - 1].year + 1),
    )
  )
    throw Error("Cost levels must be positive and consecutive.");
  const changes = prices.slice(1).map((p, i) => ({
    inflation: p.deflator / prices[i].deflator,
    tuition: p.tuition / prices[i].tuition,
    housing: p.housing / prices[i].housing,
  }));
  const fit = {
    changes,
    inflation: mean(changes.slice(-10).map((r) => Math.log(r.inflation))),
  };
  for (const key of ["tuition", "housing"]) {
    const logs = changes.map((r) => Math.log(r[key] / r.inflation)),
      nominal = changes.map((r) => Math.log(r[key]));
    const windows = (n) =>
      Array.from({ length: logs.length - n + 1 }, (_, i) =>
        mean(logs.slice(i, i + n)),
      );
    const five = windows(5),
      ten = windows(10);
    fit[key] = {
      historical: mean(logs),
      nominal: mean(nominal),
      recent5: mean(logs.slice(-5)),
      recent10: mean(logs.slice(-10)),
      five,
      ten,
      fiveMean: mean(five),
      tenMean: mean(ten),
      fiveHalfIqr: (quantile(five, 0.75) - quantile(five, 0.25)) / 2,
      tenHalfIqr: (quantile(ten, 0.75) - quantile(ten, 0.25)) / 2,
    };
  }
  return fit;
}
export function realTrend(fit, key, model, year, u = 0.5, costShift = 0) {
  const f = fit[key],
    windows = model === "recent10" ? f.ten : f.five;
  const sampled =
    windows[Math.min(windows.length - 1, Math.floor(u * windows.length))];
  const shift =
    costShift * (model === "recent10" ? f.tenHalfIqr : f.fiveHalfIqr);
  if (model === "recent10") return f.recent10 + sampled - f.tenMean + shift;
  const weight = 0.8 ** year;
  if (model === "damped5")
    return (
      f.historical +
      (f.recent5 - f.historical) * weight +
      sampled -
      f.fiveMean +
      shift
    );
  if (model === "regime")
    return f.recent5 * weight + sampled * (1 - weight) + shift;
  throw Error("Unsupported real cost model.");
}
export function costGrowth(
  fit,
  model,
  source,
  year,
  u,
  inflation,
  costShift = 0,
) {
  if (!COST_MODELS.includes(model)) throw Error("Unsupported cost model.");
  const result = { inflation };
  for (const key of ["tuition", "housing"]) {
    const f = fit[key];
    result[key] =
      model === "fixed"
        ? Math.exp(
            Math.log(key === "tuition" ? 1.04 : 1.03) +
              costShift * f.fiveHalfIqr +
              Math.log(source[key]) -
              f.nominal,
          )
        : (source[key] / source.inflation) *
          Math.exp(
            realTrend(fit, key, model, year, u, costShift) - f.historical,
          ) *
          inflation;
  }
  return result;
}
