import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import {
  COST_MODELS,
  fitCostTrends,
  realTrend,
  costGrowth,
  mean,
} from "../site/js/cost-trends.js";
import {
  canonical,
  verifyCalibration,
  calibratedEconomy,
  compileCalibrated,
  calibrationFactory,
  assessCalibrated,
} from "../site/js/calibration.js";
import { newPlan, validatePlan, MODEL } from "../site/js/domain.js";
import { assessHousehold } from "../site/js/household.js";
const read = (name) =>
  JSON.parse(readFileSync(new URL("../" + name, import.meta.url)));
const p = read("site/data/ipeds-panel.json"),
  b = read("site/data/calibration-panel.json"),
  h = read("site/data/history.json"),
  report = read("site/data/cost-model-comparison.json");
const close = (a, b, t = 1e-9) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
function fixture() {
  const plan = newPlan();
  plan.valuation = "2026-08";
  const st = plan.students[0],
    sc = st.scenarios[0];
  st.enrollment = "2034-08";
  st.funding.balance = 60000;
  st.funding.monthly = 500;
  sc.baseline = "2026-08";
  sc.path = "Public out-of-state";
  sc.costs.tuition = 24000;
  sc.costs.housing = 12000;
  return { plan, st, sc };
}
const settings = { seed: 123456, trials: 100, threshold: 0.9, ceiling: 10000 };
test("fixed-institution source, panel and live checksums link to the same snapshot", async () => {
  const { sha256, ...body } = p;
  assert.equal(
    createHash("sha256").update(canonical(body)).digest("hex"),
    sha256,
  );
  assert.equal(p.sha256, b.panel.hash);
  assert.equal(report.panelHash, p.sha256);
  assert.equal(
    report.protocolHash,
    createHash("sha256")
      .update(
        readFileSync(
          new URL("../docs/cost-model-protocol.md", import.meta.url),
        ),
      )
      .digest("hex"),
  );
  const source = read("data/raw/ipeds/sources.json");
  assert.equal(source.selectedSha256, p.selectedSha256);
  assert.equal(
    source.selectedSha256,
    createHash("sha256")
      .update(
        readFileSync(
          new URL("../data/raw/ipeds/selected.csv.gz", import.meta.url),
        ),
      )
      .digest("hex"),
  );
  assert.equal(await verifyCalibration(b, h), b);
});
test("retained UNITIDs have complete positive raw histories and stable sectors", () => {
  const raw = gunzipSync(
      readFileSync(
        new URL("../data/raw/ipeds/selected.csv.gz", import.meta.url),
      ),
    )
      .toString()
      .trim()
      .split("\n"),
    header = raw.shift().split(",");
  assert.deepEqual(header.slice(0, 3), ["YEAR", "UNITID", "SECTOR"]);
  const sample = p.panels.public4.tuition.slice(0, 10),
    records = new Map(sample.map((id) => [id, []]));
  for (const line of raw) {
    const row = line.split(",");
    if (records.has(+row[1])) records.get(+row[1]).push(row);
  }
  for (const rows of records.values()) {
    assert.equal(rows.length, 24);
    assert.ok(rows.every((r) => r[2] === "1" && Number(r[3]) > 0));
  }
  assert.equal(p.counts.public4.tuitionInstitutions, 480);
  assert.equal(p.counts.private4.tuitionInstitutions, 839);
  assert.ok(
    p.counts.public2.housingInstitutions < p.counts.public2.tuitionInstitutions,
  );
  assert.deepEqual(p.panels.public4.housing, p.panels.public4out.housing);
});
test("residency-specific history changes tuition but retains its housing panel", () => {
  assert.notEqual(
    p.prices.public4.at(-1).tuition,
    p.prices.public4out.at(-1).tuition,
  );
  close(p.prices.public4.at(-1).housing, p.prices.public4out.at(-1).housing);
  assert.deepEqual(
    b.annual.map((r) => r.year),
    Array.from({ length: 23 }, (_, i) => i + 2001),
  );
});
test("changing-trend models converge as specified without future price inputs", () => {
  const training = p.prices.public4.slice(0, 14),
    fit = fitCostTrends(training);
  const changed = structuredClone(p.prices.public4);
  changed.at(-1).tuition *= 20;
  assert.deepEqual(fit, fitCostTrends(changed.slice(0, 14)));
  const f = fit.tuition;
  close(realTrend(fit, "tuition", "regime", 0, 0.2), f.recent5);
  const sampled = f.five[Math.floor(0.2 * f.five.length)];
  close(realTrend(fit, "tuition", "regime", 80, 0.2), sampled, 1e-8);
  const drift = sampled - mean(f.five);
  close(
    realTrend(fit, "tuition", "damped5", 80, 0.2),
    f.historical + drift,
    1e-8,
  );
  assert.throws(() => fitCostTrends(training.slice(0, 10)));
  const bad = structuredClone(training);
  bad[3].year++;
  assert.throws(() => fitCostTrends(bad));
});
test("nominal benchmark trends and real-model growth apply inflation once", () => {
  const fit = fitCostTrends(p.prices.public4);
  for (const model of COST_MODELS) {
    for (const r of fit.changes) {
      const g = costGrowth(fit, model, r, 2, 0.2, 1.02);
      assert.ok(g.tuition > 0 && g.housing > 0);
      if (model !== "fixed")
        close(
          Math.log(g.tuition / 1.02),
          Math.log(r.tuition / r.inflation) +
            realTrend(fit, "tuition", model, 2, 0.2) -
            fit.tuition.historical,
        );
    }
  }
  close(
    mean(
      fit.changes.map((r) =>
        Math.log(costGrowth(fit, "fixed", r, 0, 0.5, 1.02).tuition),
      ),
    ),
    Math.log(1.04),
  );
});
test("development selects before final-period evaluation; gate and unavailable horizons are explicit", () => {
  assert.deepEqual(
    report.development.map((r) => r.model),
    COST_MODELS,
  );
  for (const m of report.development)
    for (const r of m.rows) assert.ok(r.folds.every((f) => f.target <= 2019));
  for (const m of report.holdout)
    for (const r of m.rows) {
      assert.ok(
        r.folds.every(
          (f) => f.target >= 2020 && f.target <= 2023 && f.origin < f.target,
        ),
      );
      if (r.horizon === 18) {
        assert.equal(r.coverage, null);
        assert.equal(r.folds.length, 0);
      }
      assert.ok(r.nonoverlapping <= r.folds.length);
    }
  const winner = report.development.reduce((a, c) =>
    c.score < a.score ? c : a,
  ).model;
  assert.equal(report.winner, winner);
  assert.equal(winner, "fixed");
  assert.equal(b.costModel, report.liveModel);
  assert.equal(report.gatePassed, true);
  assert.ok(
    report.holdout.find((m) => m.model === winner).score <=
      report.holdout.find((m) => m.model === "recent10").score,
  );
  assert.ok(
    report.holdout.some((m) =>
      m.rows.some((r) => r.coverage !== null && r.coverage < 0.8),
    ),
  );
});
test("live annual cost factors use the same fitted candidate as the validation implementation", () => {
  const e = calibratedEconomy(b, "public4out"),
    fit = fitCostTrends(b.prices.public4out);
  for (const year of [0, 5, 18]) {
    const actual = e.transform(2, 0.37, true, year),
      raw = b.annual[2],
      source = { ...raw.sectors.public4out, inflation: raw.inflation };
    const expected = costGrowth(
      fit,
      b.costModel,
      source,
      year,
      0.37,
      actual.inflation,
    );
    close(actual.tuition, expected.tuition);
    close(actual.housing, expected.housing);
  }
});
test("panel simulation keeps case shocks paired and student/household results consistent", () => {
  const { plan, st, sc } = fixture(),
    before = JSON.stringify(plan),
    compiled = compileCalibrated(plan, st, sc, b).c;
  const central = calibrationFactory(compiled, b, settings).make(1),
    cautious = calibrationFactory(compiled, b, settings, b.macro.cases[0]).make(
      1,
    );
  assert.ok(cautious.gross.every((g, i) => g < central.gross[i]));
  const bill = central.compiled.rows.findIndex((r) => r.costs.tuition > 0);
  assert.ok(
    cautious.compiled.rows[bill].total > central.compiled.rows[bill].total,
  );
  const r = assessCalibrated(
      plan,
      st,
      sc,
      h,
      b,
      { comparison: report },
      settings,
    ),
    joint = assessHousehold(plan, h, settings, sc.history, () => {}, {
      bundle: b,
      assumptionCase: b.macro.cases[1],
    });
  close(r.simulation.probability, joint.probability);
  close(r.simulation.costRange.p50, joint.cost.p50, 0.011);
  assert.equal(r.calibration.sector, "public4out");
  assert.equal(JSON.stringify(plan), before);
});
test("schema-5 plans from the previous methodology retain all student funding", () => {
  const { plan } = fixture();
  plan.modelVersion = "college-funding-5.0.0";
  assert.deepEqual(validatePlan(plan).students, plan.students);
  assert.equal(validatePlan(plan).modelVersion, MODEL);
});
