// Macro history and college-cost history have deliberately different coverage.
import { random } from "./simulation.js?v=0.9.0";
export function costDonorIndices(macro, costYears, seed, trial, blockYears) {
  const rand = random(
    (seed ^ Math.imul(trial + 1, 0x7feb352d) ^ 0x846ca68b) >>> 0,
  );
  const byYear = new Map(costYears.map((r, i) => [r.year, i]));
  const logs = costYears.map((r) => Math.log(r.inflation)),
    mean = logs.reduce((a, b) => a + b, 0) / logs.length;
  const scale = Math.max(
    0.01,
    Math.sqrt(logs.reduce((a, x) => a + (x - mean) ** 2, 0) / logs.length),
  );
  let donor = 0,
    within = blockYears;
  return macro.map((y) => {
    if (byYear.has(y.sourceYear)) {
      within = blockYears;
      return byYear.get(y.sourceYear);
    }
    if (within === blockYears || donor + within >= costYears.length) {
      const weights = logs
        .slice(0, logs.length - blockYears + 1)
        .map(
          (x) =>
            0.25 +
            Math.exp(-0.5 * ((Math.log(y.sourceInflation) - x) / scale) ** 2),
        );
      let x = rand() * weights.reduce((a, b) => a + b, 0);
      donor = weights.length - 1;
      for (let i = 0; i < weights.length; i++) {
        x -= weights[i];
        if (x < 0) {
          donor = i;
          break;
        }
      }
      within = 0;
    }
    return donor + within++;
  });
}
