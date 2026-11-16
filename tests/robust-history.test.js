import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fitEconomy, economyPath } from "../site/js/economy.js";
import { costDonorIndices } from "../site/js/robust-history.js";
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
const read = (f) =>
  JSON.parse(readFileSync(new URL("../" + f, import.meta.url)));
const b = read("site/data/calibration-robust.json"),
  r = read("site/data/robustness-validation.json"),
  e = read("site/data/economy-broad.json"),
  h = read("site/data/history.json");
const close = (a, b, t = 1e-9) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const settings = { seed: 623917, trials: 100, threshold: 0.9, ceiling: 10000 };
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
test("live history uses seventy complete years and seven disjoint decade windows", () => {
  assert.equal(e.macroYears.length, 70);
  assert.deepEqual(
    e.macroYears.map((y) => y.year),
    Array.from({ length: 70 }, (_, i) => 1954 + i),
  );
  const fit = fitEconomy(e.macroYears, e.fitting);
  assert.equal(fit.windowCount, 7);
  assert.equal(fit.windowOverlap, false);
  assert.equal(fit.deviations.length, 7);
  const changed = structuredClone(e.macroYears);
  changed[0].rates[0][1] += 0.1;
  assert.notDeepEqual(fit, fitEconomy(changed, e.fitting));
  assert.equal(b.economy.macroYears.length, 70);
  assert.equal(b.annual.length, 23);
});
test("regularization shrinks persistence toward declared priors without using held-out data", () => {
  const training = e.macroYears.slice(0, 20),
    base = fitEconomy(training),
    shrunk = fitEconomy(training, e.fitting);
  assert.ok(
    Math.abs(shrunk.inflation.phi - 0.5) <= Math.abs(base.inflation.phi - 0.5),
  );
  assert.ok(Math.abs(shrunk.long.phi - 0.95) <= Math.abs(base.long.phi - 0.95));
  const altered = structuredClone(e.macroYears);
  altered.at(-1).inflation = 1.29;
  assert.deepEqual(shrunk, fitEconomy(altered.slice(0, 20), e.fitting));
});
test("macro and price histories have shared deterministic donor prefixes without invented old prices", () => {
  const fit = fitEconomy(e.macroYears, e.fitting),
    anchors = b.macro.cases[1].anchors,
    initial = { ...e.initial, inflation: anchors.inflation },
    options = {
      seed: settings.seed,
      trial: 7,
      length: 20,
      blockYears: 3,
      selectionAnchors: anchors,
      conditioned: b.robustness.marketPolicy === "conditioned",
    };
  const path = economyPath(e.macroYears, fit, initial, anchors, options),
    short = economyPath(e.macroYears, fit, initial, anchors, {
      ...options,
      length: 3,
    });
  assert.deepEqual(short, path.slice(0, 3));
  const donors = costDonorIndices(path, b.annual, settings.seed, 7, 3);
  assert.deepEqual(
    costDonorIndices(short, b.annual, settings.seed, 7, 3),
    donors.slice(0, 3),
  );
  assert.ok(donors.every((i) => i >= 0 && i < 23));
  path.forEach((y, i) => {
    const exact = b.annual.findIndex((c) => c.year === y.sourceYear);
    if (exact >= 0) assert.equal(donors[i], exact);
  });
  assert.ok(path.some((y) => y.sourceYear < 1979));
});
test("every rolling cost correction stops at its origin including the former 2014/2016 leak", () => {
  assert.ok(
    r.cost.every((f) => f.fitCutoff === null || f.fitCutoff <= f.origin),
  );
  const former = r.cost.find((f) => f.origin === 2014 && f.target === 2024);
  assert.ok(former);
  assert.equal(former.fitCutoff, 2014);
  assert.ok(r.cost.every((f) => f.shrinkage >= 0 && f.shrinkage < 1));
  if (r.liveCorrection) {
    assert.equal(r.liveCorrection.cutoff, 2023);
    assert.ok(r.liveCorrection.folds.every((f) => f.target <= 2023));
    close(
      r.liveCorrection.shrinkage,
      r.liveCorrection.uniqueTargetYears /
        (r.liveCorrection.uniqueTargetYears + 10),
    );
  }
});
test("release policies follow equal-era score gates and reject any period losing more than ten percent", () => {
  for (const [summary, g, baseline, candidate] of [
    [r.marketSummary, r.marketGate, "uniform", "conditioned"],
    [r.costSummary, r.costGate, "baseline", "adjusted"],
  ]) {
    const a = summary.filter((x) => x.policy === baseline),
      z = summary.filter((x) => x.policy === candidate),
      mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    close(g.baselineScore, mean(a.map((x) => x.score)));
    close(g.candidateScore, mean(z.map((x) => x.score)));
    assert.equal(
      g.passed,
      g.candidateScore < g.baselineScore &&
        z.every((x) => x.score <= 1.1 * a.find((y) => y.era === x.era).score),
    );
  }
  assert.equal(
    b.robustness.marketPolicy,
    r.marketGate.passed ? "conditioned" : "uniform",
  );
  assert.equal(!!b.costCorrection, r.costGate.passed);
  assert.equal(r.marketSummary.filter((x) => x.policy === "uniform").length, 4);
});
test("broad source, report and protocol checksums verify exactly", async () => {
  const { sha256, ...body } = e;
  assert.equal(
    createHash("sha256").update(canonical(body)).digest("hex"),
    sha256,
  );
  assert.equal(await snapshotHash(r), b.robustness.reportHash);
  assert.equal(
    r.protocolHash,
    createHash("sha256")
      .update(
        readFileSync(
          new URL("../docs/robust-history-plan.md", import.meta.url),
        ),
      )
      .digest("hex"),
  );
  assert.equal(await verifyCalibration(b, h), b);
  for (const [name, hash] of Object.entries(e.additionalRawHashes))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(new URL("../" + name, import.meta.url)))
        .digest("hex"),
      hash,
    );
});
test("broader macro paths flow through student and household ledgers without changing funding", () => {
  const { plan, st, sc } = fixture(),
    before = JSON.stringify(plan),
    { c } = compileCalibrated(plan, st, sc, b),
    factory = calibrationFactory(c, b, settings);
  assert.deepEqual(factory.make(2), factory.make(2));
  const result = assessCalibrated(
      plan,
      st,
      sc,
      h,
      b,
      { robustness: r },
      settings,
    ),
    joint = assessHousehold(plan, h, settings, sc.history, () => {}, {
      bundle: b,
      assumptionCase: b.macro.cases[1],
    });
  close(result.simulation.probability, joint.probability);
  close(result.simulation.costRange.p50, joint.cost.p50, 0.011);
  assert.equal(result.simulation.robustHistory.macroYears, 70);
  assert.equal(JSON.stringify(plan), before);
});
test("existing model-7 student records upgrade metadata without changing any student fields", () => {
  const { plan } = fixture();
  plan.modelVersion = "college-funding-7.0.0";
  assert.deepEqual(validatePlan(plan).students, plan.students);
  assert.equal(validatePlan(plan).modelVersion, MODEL);
});
