import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { newPlan, validatePlan, MODEL } from "../site/js/domain.js";
import {
  verifyCalibration,
  calibratedEconomy,
  calibrationFactory,
  compileCalibrated,
  assessCalibrated,
  sectorFor,
  costFit,
} from "../site/js/calibration.js";
import { priceForecast, validatePrices } from "../site/js/price-validation.js";
import { assessHousehold } from "../site/js/household.js";
const read = (name) =>
  JSON.parse(fs.readFileSync(new URL("../site/data/" + name, import.meta.url)));
const b = read("calibration.json"),
  h = read("history.json"),
  v = read("calibration-validation.json");
const close = (a, b, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
function fixture() {
  const p = newPlan();
  p.valuation = "2026-08";
  const st = p.students[0],
    sc = st.scenarios[0];
  st.enrollment = "2034-08";
  st.funding.balance = 60000;
  st.funding.monthly = 500;
  st.funding.contributionStart = "2026-08";
  st.funding.contributionEnd = "2034-07";
  sc.baseline = "2026-08";
  sc.path = "Public in-state";
  sc.living = "On campus";
  sc.costs.tuition = 14000;
  sc.costs.housing = 16000;
  return { p, st, sc };
}
const settings = {
  seed: 4294967295,
  trials: 100,
  threshold: 0.9,
  ceiling: 10000,
};
test("calibration checksum, paired history and pinned raw source hashes verify", async () => {
  assert.equal(await verifyCalibration(b, h), b);
  const bad = structuredClone(b);
  bad.macro.cases[1].anchors.stocks = 0.8;
  await assert.rejects(() => verifyCalibration(bad, h));
  for (const [name, hash] of Object.entries(b.rawHashes))
    assert.equal(
      createHash("sha256")
        .update(
          fs.readFileSync(
            new URL("../data/raw/calibration/" + name, import.meta.url),
          ),
        )
        .digest("hex"),
      hash,
    );
});
test("source columns, common vintage, sector proxies and annual matching remain explicit", () => {
  assert.equal(b.prices.public4.at(-1).tuition, 9872);
  assert.equal(b.prices.private4.at(-1).tuition, 39408);
  assert.equal(b.prices.public4.at(-1).housing, 13304);
  assert.equal(b.macro.commonVintage, "2026Q1");
  assert.equal(b.annual[0].year, 2000);
  assert.deepEqual(
    b.annual[0].months[0],
    h.observations.find((r) => r[0] === "2000-09").slice(1, 4),
  );
  assert.equal(sectorFor({ path: "Private nonprofit" }), "private4");
  assert.equal(sectorFor({ path: "Public out-of-state" }), "public4out");
});
test("arithmetic one-year return anchors and inflation align exactly without double inflation", () => {
  for (const ac of b.macro.cases) {
    const e = calibratedEconomy(b, "public4", ac),
      years = b.annual.map((_, i) => e.transform(i, 0.5, false));
    for (const [k, key] of ["stocks", "bonds", "cash"].entries()) {
      const avg =
        years.reduce(
          (v, y) => v + y.months.reduce((g, m) => g * (1 + m[k]), 1),
          0,
        ) / years.length;
      close(avg, 1 + ac.anchors[key]);
    }
    close(
      years.reduce((v, y) => v + y.inflation, 0) / years.length,
      1 + ac.anchors.inflation,
    );
    const y = years[0],
      r = b.annual[0];
    close(
      Math.log(y.tuition / y.inflation) -
        Math.log(r.sectors.public4.tuition / r.inflation),
      e.fit.tuition.center +
        ac.costShift * e.fit.tuition.shift -
        e.fit.tuition.historical,
    );
  }
});
test("cases share deterministic shocks while cautious returns fall and real costs rise", () => {
  const { p, st, sc } = fixture();
  const central = compileCalibrated(p, st, sc, b, b.macro.cases[1]).c,
    cautious = compileCalibrated(p, st, sc, b, b.macro.cases[0]).c;
  const a = calibrationFactory(central, b, settings),
    z = calibrationFactory(cautious, b, settings, b.macro.cases[0]);
  assert.deepEqual(a.make(8), a.make(8));
  const x = a.make(8),
    y = z.make(8);
  assert.ok(y.gross.every((g, i) => g < x.gross[i]));
  const bill = x.compiled.rows.findIndex((r) => r.costs.tuition > 0);
  assert.ok(
    y.compiled.rows[bill].costs.tuition > x.compiled.rows[bill].costs.tuition,
  );
  assert.notDeepEqual(a.make(8).gross, a.verify(8).gross);
  const tuition = x.compiled.rows.filter((r) => r.costs.tuition > 0);
  close(tuition[0].costs.tuition, tuition[1].costs.tuition, 0.02);
});
test("fixed costs preserve bills, but simulated inflation changes real-dollar deflators", () => {
  const { p, st, sc } = fixture();
  sc.history.costMode = "fixed";
  const { c } = compileCalibrated(p, st, sc, b);
  const path = calibrationFactory(c, b, settings).make(1);
  assert.deepEqual(
    path.compiled.rows.map((r) => r.costs),
    c.rows.map((r) => r.costs),
  );
  assert.notEqual(path.compiled.rows.at(-1).discount, 1);
});
test("calibrated assessment integrates all cases and leaves saved student funds untouched", () => {
  const { p, st, sc } = fixture(),
    before = JSON.stringify(p);
  const r = assessCalibrated(p, st, sc, h, b, v, settings);
  assert.equal(r.calibration.cases.length, 3);
  assert.equal(r.simulation.calibrationHash, b.sha256);
  assert.ok(Number.isFinite(r.simulation.costRange.p50));
  assert.equal(r.simulation.period, b.macro.cases[1].name);
  assert.equal(r.simulation.confirmation.trials, 5000);
  assert.equal(JSON.stringify(p), before);
  const joint = assessHousehold(p, h, settings, sc.history, () => {}, {
    bundle: b,
    assumptionCase: b.macro.cases[1],
  });
  close(joint.probability, r.simulation.probability);
  close(joint.cost.p50, r.simulation.costRange.p50, 0.011);
});
test("cost validation uses training only; records poor coverage and missing long-horizon evidence", () => {
  const training = b.prices.private4.slice(0, 11),
    before = priceForecast(training, 5, { trials: 100 });
  const altered = structuredClone(b);
  altered.prices.private4.at(-1).tuition *= 100;
  assert.deepEqual(
    priceForecast(altered.prices.private4.slice(0, 11), 5, { trials: 100 }),
    before,
  );
  assert.equal(costFit(training).changes.length, 10);
  const long = v.results.find(
    (r) => r.sector === "private4" && r.horizon === 18,
  );
  assert.equal(long.folds.length, 0);
  assert.equal(long.coverage, null);
  assert.match(long.status, /Insufficient/);
  assert.equal(v.bundleHash, b.sha256);
  assert.ok(v.results.some((r) => r.coverage !== null && r.coverage < 0.5));
  assert.deepEqual(
    validatePrices(
      { ...b, prices: { private4: b.prices.private4 } },
      { trials: 100, seed: 1 },
    ).results.map((r) => r.horizon),
    [2, 5, 10, 18],
  );
});
test("schema 5 funding survives metadata-only upgrade; older funding schemas still rejected", () => {
  const { p } = fixture();
  p.modelVersion = "college-funding-4.0.0";
  const upgraded = validatePlan(p);
  assert.equal(upgraded.modelVersion, MODEL);
  assert.deepEqual(upgraded.students, p.students);
  p.schemaVersion = 4;
  assert.throws(() => validatePlan(p));
});
