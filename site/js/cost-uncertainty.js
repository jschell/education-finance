import { random } from "./random.js?v=0.13.0";

// Count each economic target year once, rather than treating sectors as independent.
export function fitCostSpread(residualFit, cutoff) {
  const byYear = new Map();
  for (const f of residualFit?.folds || []) {
    if (f.target > cutoff) continue;
    const error = Math.max(
      ...Object.values(f.series).flatMap((d) => [
        Math.abs(d.tuition),
        Math.abs(d.housing),
      ]),
    );
    byYear.set(f.target, Math.max(byYear.get(f.target) || 0, error));
  }
  const errors = [...byYear.values()].sort((a, b) => a - b);
  if (errors.length < 5) return null;
  const rank = Math.min(errors.length, Math.ceil((errors.length + 1) * 0.8));
  return {
    cutoff,
    targetYears: [...byYear.keys()].sort(),
    count: errors.length,
    rank,
    annualLogExtent: errors[rank - 1],
    amplitude: errors[rank - 1] / 0.8,
    method:
      "Target-year maximum absolute annualized errors; finite-sample 80% rank; shared symmetric persistent uniform drift. No coverage guarantee under temporal dependence.",
  };
}
export function costSpreadDraw(fit, seed, trial) {
  if (!fit) return 0;
  const u = random(
    (seed ^ Math.imul(trial + 1, 0x632be5ab) ^ 0x45d9f3b) >>> 0,
  )();
  return (2 * u - 1) * fit.amplitude;
}
