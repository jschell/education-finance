import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import {
  COST_MODELS,
  fitCostTrends,
  costGrowth,
  mean,
} from "../site/js/cost-trends.js";
import { annualIndices, canonical } from "../site/js/calibration.js";
import { random, quantile } from "../site/js/random.js";
const panel = JSON.parse(readFileSync("site/data/ipeds-panel.json", "utf8"));
const protocolHash = createHash("sha256")
  .update(readFileSync("docs/cost-model-protocol.md"))
  .digest("hex");
const institutions = JSON.parse(
  gunzipSync(readFileSync("data/ipeds-institutions.json.gz")),
).series;
const seed = 972461,
  trials = 1000;
const qs = (values) => {
  values.sort((a, b) => a - b);
  return {
    p10: quantile(values, 0.1),
    p50: quantile(values, 0.5),
    p90: quantile(values, 0.9),
  };
};
const score = (p, actual) =>
  (p.p90 -
    p.p10 +
    10 * Math.max(0, p.p10 - actual) +
    10 * Math.max(0, actual - p.p90)) /
  actual;
function forecast(training, horizon, model) {
  const fit = fitCostTrends(training),
    origin = training.at(-1),
    paths = [];
  const logMeanInflation = mean(fit.changes.map((r) => Math.log(r.inflation)));
  for (let t = 0; t < trials; t++) {
    const u = random(
      (seed ^ Math.imul(t + 1, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0,
    )();
    const draws = annualIndices(fit.changes.length, horizon, 3, seed, t);
    let tuition = 1,
      housing = 1;
    for (const [year, index] of draws.entries()) {
      const source = fit.changes[index],
        inflation =
          source.inflation * Math.exp(fit.inflation - logMeanInflation);
      const g = costGrowth(fit, model, source, year, u, inflation);
      tuition *= g.tuition;
      housing *= g.housing;
    }
    paths.push({ tuition, housing });
  }
  return {
    predicted: qs(
      paths.map((p) => origin.tuition * p.tuition + origin.housing * p.housing),
    ),
    paths,
  };
}
function foldsFor(split, model) {
  const rows = [];
  for (const [series, prices] of Object.entries(panel.prices))
    for (const horizon of [2, 5, 10, 18]) {
      const folds = [];
      for (let i = 10; i + horizon < prices.length; i++) {
        const origin = prices[i],
          target = prices[i + horizon];
        if (
          split === "development"
            ? target.year > 2019 || ![2, 5].includes(horizon)
            : target.year < 2020
        )
          continue;
        const f = forecast(prices.slice(0, i + 1), horizon, model),
          actual = target.tuition + target.housing,
          p = f.predicted;
        const fold = {
          origin: origin.year,
          target: target.year,
          actual,
          predicted: p,
          covered: actual >= p.p10 && actual <= p.p90,
          error: p.p50 / actual - 1,
          intervalScore: score(p, actual),
        };
        if (split === "holdout") {
          // School results share the sector forecast and the same economic years.
          const errors = [],
            coverage = [];
          for (const school of institutions[series]) {
            const amounts = qs(
                f.paths.map(
                  (path) =>
                    school.tuition[i] * path.tuition +
                    school.housing[i] * path.housing,
                ),
              ),
              observed =
                school.tuition[i + horizon] + school.housing[i + horizon];
            errors.push(Math.abs(amounts.p50 / observed - 1));
            coverage.push(
              Number(observed >= amounts.p10 && observed <= amounts.p90),
            );
          }
          fold.schoolCount = errors.length;
          fold.schoolMape = mean(errors);
          fold.schoolCoverage = mean(coverage);
        }
        folds.push(fold);
      }
      const independent = [];
      for (const f of folds)
        if (!independent.length || f.origin >= independent.at(-1).target)
          independent.push(f);
      rows.push({
        series,
        horizon,
        folds,
        coverage: folds.length
          ? mean(folds.map((f) => Number(f.covered)))
          : null,
        mape: folds.length ? mean(folds.map((f) => Math.abs(f.error))) : null,
        bias: folds.length ? mean(folds.map((f) => f.error)) : null,
        intervalScore: folds.length
          ? mean(folds.map((f) => f.intervalScore))
          : null,
        originClusters: folds.map((f) => f.origin),
        nonoverlapping: independent.length,
        schoolCoverage:
          split === "holdout" && folds.length
            ? mean(folds.map((f) => f.schoolCoverage))
            : null,
        schoolMape:
          split === "holdout" && folds.length
            ? mean(folds.map((f) => f.schoolMape))
            : null,
      });
    }
  return {
    model,
    rows,
    score: mean(
      rows
        .filter((r) => r.folds.length && [2, 5].includes(r.horizon))
        .map((r) => r.intervalScore),
    ),
  };
}
// Selection is written before the holdout is evaluated; final-period metrics cannot select.
const development = COST_MODELS.map((model) => foldsFor("development", model));
const winner = development.reduce((a, b) => (b.score < a.score ? b : a)).model;
writeFileSync(
  "data/cost-model-selection.json",
  JSON.stringify(
    {
      protocolHash,
      panelHash: panel.sha256,
      developmentCutoff: 2019,
      winner,
      development,
    },
    null,
    2,
  ) + "\n",
);
const holdout = COST_MODELS.map((model) => foldsFor("holdout", model));
const selected = holdout.find((r) => r.model === winner),
  prior = holdout.find((r) => r.model === "recent10");
const gate = selected.score <= prior.score;
const report = {
  id: "ipeds-cost-model-comparison-v1",
  asOf: "2026-11-16",
  panelId: panel.id,
  panelHash: panel.sha256,
  protocolHash,
  seed,
  trials,
  developmentCutoff: 2019,
  holdoutTargets: [2020, 2023],
  selectionMetric:
    "Equal-series/equal-horizon normalized 80% interval score on development 2/5-year folds. Lower is better.",
  winner,
  gatePassed: gate,
  liveModel: gate ? winner : "recent10",
  development,
  holdout,
  limitations: panel.limitations.concat([
    "Final holdout is now consumed evidence; it must not be used for iterative tuning. No 18-year fold exists with 11 training levels in this panel.",
    "P10–P90 coverage applies to comparable-school sector price indices; school-level coverage is separately reported. Neither establishes individual-family funding-probability calibration.",
  ]),
};
writeFileSync(
  "site/data/cost-model-comparison.json",
  JSON.stringify(report) + "\n",
);
console.log(
  JSON.stringify(
    {
      winner,
      gate,
      liveModel: report.liveModel,
      development: development.map((x) => ({ model: x.model, score: x.score })),
      holdout: holdout.map((x) => ({
        model: x.model,
        score: x.score,
        coverage: mean(
          x.rows
            .filter((r) => r.folds.length && [2, 5].includes(r.horizon))
            .map((r) => r.coverage),
        ),
        mape: mean(
          x.rows
            .filter((r) => r.folds.length && [2, 5].includes(r.horizon))
            .map((r) => r.mape),
        ),
      })),
    },
    null,
    2,
  ),
);
// Version the live input bundle separately. The old aggregate bundle remains reproducible.
const base = JSON.parse(readFileSync("site/data/calibration.json", "utf8"));
const annual = base.annual
  .filter((r) => r.year > panel.start)
  .map((r) => ({
    ...r,
    sectors: Object.fromEntries(
      Object.entries(panel.prices).map(([s, p]) => {
        const i = p.findIndex((x) => x.year === r.year);
        return [
          s,
          {
            tuition: p[i].tuition / p[i - 1].tuition,
            housing: p[i].housing / p[i - 1].housing,
          },
        ];
      }),
    ),
  }));
const bundle = {
  ...base,
  id: "us-panel-calibration-2026-11-16-v2",
  source: panel.source,
  prices: panel.prices,
  annual,
  panel: {
    id: panel.id,
    hash: panel.sha256,
    counts: panel.counts,
    limitations: panel.limitations,
  },
  costModel: report.liveModel,
  comparison: { id: report.id, winner, gatePassed: gate, protocolHash },
  notes: [
    "23 paired academic-year transitions, 2001–2023. Market returns and CPI anchors retain the preceding economic snapshot; college-cost growth now uses fixed-institution panels.",
    "Public in-state and out-of-state tuition growth are separate. Housing uses its own on-campus institution panel; at-home/off-campus and other expenses use general CPI.",
    ...panel.limitations,
    "Cost-trend comparison uses a development/final-period split; funding probabilities remain conditional on assumptions.",
  ],
};
delete bundle.sha256;
bundle.sha256 = createHash("sha256").update(canonical(bundle)).digest("hex");
writeFileSync(
  "site/data/calibration-panel.json",
  JSON.stringify(bundle) + "\n",
);
