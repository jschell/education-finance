import { random, quantile } from "./random.js?v=0.10.0";
const median = (xs) => quantile([...xs].sort((a, b) => a - b), 0.5);
export const RECALIBRATION_HORIZONS = [2, 5, 10];
// Fit each model from its OWN earlier, raw price forecasts.
export function fitResidualCurve(records, { origin, model, sector }) {
  const knots = [];
  for (const horizon of RECALIBRATION_HORIZONS) {
    const byTarget = new Map();
    for (const r of records) {
      if (r.model !== model || r.sector !== sector || r.horizon !== horizon ||
          r.target > origin) continue;
      if (!(r.origin < r.target) || r.target - r.origin !== horizon ||
          !Number.isFinite(r.tuition) || !Number.isFinite(r.housing))
        throw Error("Invalid residual provenance or value");
      if (!byTarget.has(r.target) || byTarget.get(r.target).origin < r.origin)
        byTarget.set(r.target, r);
    }
    const rows = [...byTarget.values()].sort((a, b) => a.target - b.target);
    if (rows.length < 3) continue;
    const center = { tuition: median(rows.map((r) => r.tuition)),
      housing: median(rows.map((r) => r.housing)) };
    const weight = rows.length / (rows.length + 10);
    knots.push({ horizon, count: rows.length, targetYears: rows.map((r) => r.target),
      center, biasWeight: weight, spreadWeight: rows.length >= 5 ? Math.sqrt(weight) : 0,
      errors: rows.map((r) => ({ tuition:r.tuition, housing:r.housing })) });
  }
  return { version:"paired-asymmetric-curve-1", origin, model, sector, knots,
    extrapolation:"Last supported cumulative log correction extended at its annual rate; unvalidated beyond support" };
}
function knotError(knot, key, u) {
  const r = knot.errors[Math.min(knot.errors.length - 1, Math.floor(u * knot.errors.length))];
  return knot.center[key] * knot.biasWeight +
    (r[key] - knot.center[key]) * knot.spreadWeight;
}
export function curveFactors(fit, elapsedYears, seed, trial) {
  if (!Number.isFinite(elapsedYears) || elapsedYears < 0)
    throw Error("Elapsed forecast time must be nonnegative");
  if (!fit || !fit.knots.length || elapsedYears === 0) return {tuition:1,housing:1};
  const u = random((seed ^ Math.imul(trial + 1, 0x6c8e9cf5) ^ 0x4a39b70d) >>> 0)();
  const points = [{horizon:0}, ...fit.knots];
  let upper = points.findIndex((k) => k.horizon >= elapsedYears);
  if (upper < 0) upper = points.length - 1;
  const last = points.at(-1), beyond = elapsedYears > last.horizon;
  const lo = beyond ? points[0] : points[upper - 1];
  const hi = beyond ? last : points[upper];
  return Object.fromEntries(["tuition","housing"].map((key) => {
    const a = lo.horizon ? knotError(lo,key,u) : 0, b = knotError(hi,key,u);
    const shift = a + (b - a) * (elapsedYears - lo.horizon) / (hi.horizon - lo.horizon);
    return [key, Math.exp(shift)];
  }));
}
