import { readFileSync, writeFileSync } from "node:fs";
import { validatePrices } from "../site/js/price-validation.js";
const bundle = JSON.parse(readFileSync("site/data/calibration.json", "utf8"));
const report = validatePrices(bundle, { trials: 1000, seed: 972461 });
writeFileSync(
  "site/data/calibration-validation.json",
  JSON.stringify(report) + "\n",
);
console.table(
  report.results.map(
    ({ sector, horizon, coverage, nonoverlapping, mape, baselineMape }) => ({
      sector,
      horizon,
      coverage,
      nonoverlapping,
      mape,
      baselineMape,
    }),
  ),
);
