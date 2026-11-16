import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  fitEconomy,
  economyPath,
  treasuryGross,
  billGross,
  returnToBillQuote,
  blockWeights,
} from "../site/js/economy.js";
import {
  canonical,
  snapshotHash,
  verifyCalibration,
  compileCalibrated,
  calibrationFactory,
  assessCalibrated,
} from "../site/js/calibration.js";
import { assessHousehold } from "../site/js/household.js";
import { newPlan, validatePlan, MODEL } from "../site/js/domain.js";
import {
  fitCostCorrection,
  costForecastPaths,
} from "../site/js/cost-correction.js";
const read = (f) =>
  JSON.parse(readFileSync(new URL("../" + f, import.meta.url)));
const e = read("site/data/economy.json"),
  b = read("site/data/calibration-economic.json"),
  h = read("site/data/history.json"),
  v = read("site/data/economy-validation.json"),
  corr = read("site/data/cost-correction.json"),
  p = read("site/data/ipeds-panel.json");
const fit = fitEconomy(e.productionYears),
  anchors = b.macro.cases[1].anchors,
  initial = { ...e.initial, inflation: anchors.inflation };
const close = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const settings = { seed: 283745, trials: 100, threshold: 0.9, ceiling: 10000 };
const options = {
  seed: 283745,
  trial: 12,
  blockYears: 3,
  length: 12,
  selectionAnchors: anchors,
};
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
test("Treasury repricing handles unchanged, rising, falling and near-zero yields", () => {
  for (const y of [0, 1e-12, 0.01, 0.04, 0.2])
    close(treasuryGross(y, y), (1 + y / 2) ** (1 / 6));
  assert.ok(treasuryGross(0.04, 0.06) < 1);
  assert.ok(treasuryGross(0.04, 0.02) > 1);
  assert.ok(treasuryGross(0.04, 0) > 1.19);
  assert.throws(() => treasuryGross(-0.1, 0.04));
  assert.throws(() => treasuryGross(0.04, NaN));
});
test("bill return uses discount-price conversion and start-of-month accrual", () => {
  for (const r of [0, 0.01, 0.03, 0.2])
    close(billGross(returnToBillQuote(r)) ** 12 - 1, r);
  const path = economyPath(e.productionYears, fit, initial, anchors, {
    ...options,
    length: 1,
  });
  close(path[0].months[0][2], billGross(initial.short) - 1);
  assert.throws(() => billGross(0.5));
});
test("dynamic paths are deterministic, horizon-prefix stable and joint across cases", () => {
  const a = economyPath(e.productionYears, fit, initial, anchors, options),
    short = economyPath(e.productionYears, fit, initial, anchors, {
      ...options,
      length: 3,
    }),
    cautious = economyPath(
      e.productionYears,
      fit,
      initial,
      b.macro.cases[0].anchors,
      options,
    );
  assert.deepEqual(short, a.slice(0, 3));
  assert.deepEqual(
    a,
    economyPath(e.productionYears, fit, initial, anchors, options),
  );
  assert.deepEqual(
    a.map((y) => y.index),
    cautious.map((y) => y.index),
  );
  assert.ok(a.every((y) => y.expectationDraw === a[0].expectationDraw));
  assert.notDeepEqual(a[0].months, cautious[0].months);
});
test("inflation/rate conditioning changes source weights and expectation uncertainty changes paths", () => {
  const low = blockWeights(
      e.productionYears,
      [Math.log(1.01), 0.01, 0.005],
      fit.scales,
      3,
    ),
    high = blockWeights(
      e.productionYears,
      [Math.log(1.08), 0.08, 0.07],
      fit.scales,
      3,
    );
  assert.notDeepEqual(low, high);
  assert.ok([...low, ...high].every((x) => x >= 0.25 && x <= 1.25));
  const base = economyPath(e.productionYears, fit, initial, anchors, options),
    known = economyPath(e.productionYears, fit, initial, anchors, {
      ...options,
      uncertainty: false,
    });
  assert.notDeepEqual(base, known);
  assert.ok(
    base
      .flatMap((y) => y.states)
      .every((r) => r.every((x) => Number.isFinite(x) && x >= 0 && x <= 0.25)),
  );
});
test("historical fitting never reads appended future values or current forecasts", () => {
  const training = e.validationYears.slice(0, 20),
    a = fitEconomy(training),
    changed = structuredClone(e.validationYears);
  changed.at(-1).rates[0][1] = 0.2;
  assert.deepEqual(a, fitEconomy(changed.slice(0, 20)));
  assert.equal(v.minimumTrainingYears, 10);
  assert.ok(v.folds.every((f) => f.trainEnd < f.start));
  assert.ok(
    v.folds.filter((f) => f.split === "final").every((f) => f.end > 2019),
  );
  assert.ok(
    v.summary.filter((r) => r.split === "final").some((r) => r.coverage < 0.8),
  );
  assert.ok(v.summary.every((r) => r.nonoverlapping <= r.folds));
});
test("economic and source hashes include original yields, final cost files and frozen plan", async () => {
  const { sha256, ...body } = e;
  assert.equal(
    createHash("sha256").update(canonical(body)).digest("hex"),
    sha256,
  );
  for (const [name, hash] of Object.entries(e.rawHashes))
    assert.equal(
      createHash("sha256")
        .update(
          readFileSync(new URL("../data/raw/economy/" + name, import.meta.url)),
        )
        .digest("hex"),
      hash,
    );
  assert.equal(v.bundleHash, e.sha256);
  assert.equal(await snapshotHash(v), b.processValidationHash);
  assert.equal(await snapshotHash(corr), b.costValidationHash);
  assert.equal(
    v.protocolHash,
    createHash("sha256")
      .update(
        readFileSync(
          new URL("../docs/economic-model-fix-plan.md", import.meta.url),
        ),
      )
      .digest("hex"),
  );
  assert.equal(corr.protocolHash, v.protocolHash);
  assert.equal(e.rateDate, "2026-10");
  close(e.initial.long, 0.0493);
  close(e.initial.short, 0.0405);
  assert.equal(await verifyCalibration(b, h), b);
  const final = read("data/cost-holdout-2024.json");
  for (const s of final.sources)
    assert.equal(
      createHash("sha256")
        .update(
          readFileSync(
            new URL(
              "../data/raw/economy/" + s.url.split("/").at(-1),
              import.meta.url,
            ),
          ),
        )
        .digest("hex"),
      s.sha256,
    );
});
test("cost correction is fit before 2017 and its 2024 gate is disclosed, not used for fitting", () => {
  assert.ok(
    corr.fit.folds.every((f) => f.target <= 2016 && f.origin < f.target),
  );
  assert.ok(
    corr.development.every((f) => f.target >= 2017 && f.target <= 2019),
  );
  assert.ok(corr.final.every((f) => f.target === 2024));
  assert.equal(corr.independentTargetYears, 1);
  assert.equal(corr.active, corr.adjustedScore <= corr.baselineScore);
  assert.equal(!!b.costCorrection, corr.active);
  const changed = structuredClone(p);
  for (const prices of Object.values(changed.prices))
    prices.at(-1).tuition *= 20;
  assert.deepEqual(fitCostCorrection(changed), corr.fit);
  const paths = costForecastPaths(p.prices.public4.slice(0, 15), 2, {
    trials: 100,
    correction: corr.fit,
    series: "public4",
  });
  assert.ok(paths.paths.every((r) => r.total > 0));
});
test("live state paths retain academic-year bills and student funds, with identical joint household result", () => {
  const { plan, st, sc } = fixture(),
    before = JSON.stringify(plan),
    { c } = compileCalibrated(plan, st, sc, b),
    f = calibrationFactory(c, b, settings),
    path = f.make(1);
  assert.deepEqual(path, f.make(1));
  assert.notDeepEqual(path.gross, f.verify(1).gross);
  const bills = path.compiled.rows.filter((r) => r.costs.tuition > 0);
  close(bills[0].costs.tuition, bills[1].costs.tuition, 0.011);
  const result = assessCalibrated(
      plan,
      st,
      sc,
      h,
      b,
      { processValidation: v, correction: corr },
      settings,
    ),
    joint = assessHousehold(plan, h, settings, sc.history, () => {}, {
      bundle: b,
      assumptionCase: b.macro.cases[1],
    });
  close(result.simulation.probability, joint.probability);
  close(result.simulation.costRange.p50, joint.cost.p50, 0.011);
  assert.equal(result.simulation.costCorrectionActive, corr.active);
  assert.equal(result.simulation.economicState.rateDate, e.rateDate);
  assert.equal(JSON.stringify(plan), before);
});
test("model-6 schema-5 student funding survives model-7 upgrade", () => {
  const { plan } = fixture();
  plan.modelVersion = "college-funding-6.0.0";
  assert.deepEqual(validatePlan(plan).students, plan.students);
  assert.equal(validatePlan(plan).modelVersion, MODEL);
});
