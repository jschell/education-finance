// Reproducible synthetic diagnostics; never reads browser plans or family inputs.
import fs from "node:fs";
import { newPlan, MODEL } from "../site/js/domain.js";
import { assessHistorical } from "../site/js/history.js";
const data = JSON.parse(
  fs.readFileSync(new URL("../site/data/history.json", import.meta.url)),
);
const results = [];
for (const yearsToEntry of [3, 8, 18]) {
  const plan = newPlan();
  plan.valuation = "2026-11";
  const student = plan.students[0],
    scenario = student.scenarios[0];
  student.alias = `Synthetic ${yearsToEntry}-year horizon`;
  student.enrollment = `${2026 + yearsToEntry}-11`;
  scenario.years = 4;
  scenario.baseline = plan.valuation;
  student.funding.contributionStart = plan.valuation;
  student.funding.contributionEnd = `${2026 + yearsToEntry}-10`;
  scenario.costs = {
    tuition: 14000,
    housing: 16000,
    books: 1000,
    transport: 2000,
    other: 1000,
  };
  student.funding.balance = 60000;
  student.funding.monthly = 400;
  const result = assessHistorical(plan, student, scenario, data, {
    seed: 90210,
    trials: 1000,
    threshold: 0.9,
    ceiling: 10000,
  });
  results.push({
    yearsToEntry,
    probability: result.simulation.probability,
    gap: result.simulation.gap,
    contribution: result.simulation.contribution,
    confirmation: result.simulation.confirmation,
    blocks: result.robustness.blocks,
    stresses: result.robustness.stresses,
    walkForward: result.robustness.validation,
  });
}
const report = {
  model: MODEL,
  dataset: data.id,
  seed: 90210,
  primaryTrials: 1000,
  description:
    "Synthetic repeatable model diagnostics; overlapping historical tests cannot establish future calibration.",
  results,
};
fs.writeFileSync(
  new URL("../docs/validation-report.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  results.map((r) => ({
    yearsToEntry: r.yearsToEntry,
    modelFrequency: r.probability,
    walkForwardFolds: r.walkForward.folds.length,
    brier: r.walkForward.brier,
    costCoverage: r.walkForward.coverage,
  })),
);
