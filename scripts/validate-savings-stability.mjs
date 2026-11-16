import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { newPlan } from "../site/js/domain.js";
import {
  compileCalibrated,
  calibrationFactory,
} from "../site/js/calibration.js";
import { simulateHistorical } from "../site/js/history.js";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const b = read("site/data/calibration-reviewed.json"),
  h = read("site/data/history.json");
const p = newPlan(),
  st = p.students[0],
  sc = st.scenarios[0];
p.valuation = "2026-09";
st.enrollment = "2034-09";
sc.baseline = p.valuation;
sc.path = "Public in-state";
sc.costs.tuition = 12000;
sc.costs.housing = 9000;
Object.assign(st.funding, {
  balance: 50000,
  monthly: 300,
  contributionStart: p.valuation,
  contributionEnd: "2034-08",
});
const { c } = compileCalibrated(p, st, sc, b, b.macro.cases[1]);
const results = [];
for (let seed = 1; seed <= 12; seed++) {
  const settings = { seed, trials: 1000, threshold: 0.9, ceiling: 10000 };
  const r = simulateHistorical(
    c,
    h,
    settings,
    () => {},
    true,
    calibrationFactory(c, b, settings),
  );
  results.push({ seed, contribution: r.contribution, ...r.confirmation });
  console.log(JSON.stringify(results.at(-1)));
}
const values = results.map((r) => r.contribution);
const report = {
  id: "savings-stability-v1",
  asOf: "2026-11-16",
  bundleHash: b.sha256,
  ruleHash: createHash("sha256")
    .update(readFileSync("docs/savings-reserve-rule.md"))
    .digest("hex"),
  fixture: {
    valuation: p.valuation,
    enrollment: st.enrollment,
    balance: 50000,
    monthly: 300,
    tuition: 12000,
    housing: 9000,
    profile: c.history.profile,
  },
  target: 0.9,
  confirmed: results.filter((r) => r.meets).length,
  seeds: results.length,
  min: Math.min(...values),
  max: Math.max(...values),
  results,
  limitation:
    "One synthetic plan and twelve seeds test Monte Carlo consistency, not economic accuracy. Verification samples never refit the contribution.",
};
writeFileSync("data/savings-stability.json", JSON.stringify(report) + "\n");
