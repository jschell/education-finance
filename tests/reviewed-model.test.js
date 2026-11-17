import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { historicalInputs } from "../scripts/validation-inputs.mjs";
import { fitCostSpread, costSpreadDraw } from "../site/js/cost-uncertainty.js";
import {
  savingsFitProbability,
  legacySavingsFitProbability,
  savingsReserve,
  savingsConfirmation,
} from "../site/js/savings-target.js";
import { newPlan, validatePlan, MODEL } from "../site/js/domain.js";
import { compile, runPath } from "../site/js/engine.js";
import { random } from "../site/js/random.js";
import { samplingInterval } from "../site/js/probability.js";
import { simulateHistorical } from "../site/js/history.js";
import {
  canonical,
  snapshotHash,
  compileCalibrated,
  calibrationFactory,
} from "../site/js/calibration.js";
import { assessHousehold } from "../site/js/household.js";
const read = (f) =>
  JSON.parse(readFileSync(new URL("../" + f, import.meta.url)));
const base = read("site/data/calibration-robust.json"),
  b = read("site/data/calibration-reviewed.json"),
  f = read("site/data/funding-validation.json"),
  r = read("site/data/critique-validation.json"),
  h = read("site/data/history.json");
test("whole-plan origin inputs ignore later market, price and survey values and reject future residuals", () => {
  const before = historicalInputs(base, 2014),
    changed = structuredClone(base);
  for (const y of changed.economy.macroYears)
    if (y.year >= 2014) {
      y.stockLog = 20;
      y.inflation = 1.5;
      y.months[0][0] = 2;
    }
  for (const y of changed.economy.productionYears)
    if (y.year >= 2014) y.stockLog = 20;
  for (const y of changed.annual) if (y.year >= 2014) y.inflation = 10;
  for (const p of Object.values(changed.prices))
    for (const y of p) if (y.year > 2014) y.tuition *= 100;
  changed.macro.cases.forEach(
    (c) => (c.anchors = { stocks: 20, bonds: 20, cash: 20, inflation: 20 }),
  );
  assert.deepEqual(historicalInputs(changed, 2014), before);
  assert.throws(
    () => historicalInputs(base, 2014, { cutoff: 2016, folds: [] }),
    /Future/,
  );
  assert.throws(
    () =>
      historicalInputs(base, 2014, null, { cutoff: 2014, targetYears: [2015] }),
    /Future/,
  );
  assert.ok(before.economy.macroYears.every((y) => y.year < 2014));
});
test("uncertainty fitting clusters sectors by target year and excludes later errors", () => {
  const folds = Array.from({ length: 6 }, (_, i) => ({
    target: 2000 + i,
    series: {
      a: { tuition: 0.01 * (i + 1), housing: -0.01 },
      b: { tuition: 0.02, housing: 0.01 },
    },
  }));
  const fit = fitCostSpread({ folds }, 2004);
  assert.equal(fit.count, 5);
  assert.equal(fit.rank, 5);
  assert.equal(fit.annualLogExtent, 0.05);
  folds.at(-1).series.a.tuition = 100;
  assert.deepEqual(fitCostSpread({ folds }, 2004), fit);
  assert.equal(fitCostSpread({ folds }, 2003), null);
  assert.equal(costSpreadDraw(fit, 1, 2), costSpreadDraw(fit, 1, 2));
  assert.ok(Math.abs(costSpreadDraw(fit, 1, 2)) <= fit.amplitude);
});
test("frozen uncertainty gate retains baseline when wider bands lose too much interval score", () => {
  const expected =
    r.spreadGate.expanded.score <= r.spreadGate.baseline.score * 1.1 &&
    Math.abs(r.spreadGate.expanded.coverage - 0.8) <
      Math.abs(r.spreadGate.baseline.coverage - 0.8);
  assert.equal(r.spreadGate.passed, expected);
  assert.equal(!!b.costUncertainty, expected);
  assert.ok(r.cost.every((x) => x.targetYears.every((y) => y <= x.origin)));
});
test("current bundle links exact candidate and whole-plan reports and preserves recorded failures", async () => {
  const { sha256, ...body } = b;
  assert.equal(await snapshotHash(body), sha256);
  assert.equal(await snapshotHash(r), b.review.critiqueHash);
  assert.equal(await snapshotHash(f), b.review.fundingHash);
  assert.equal(f.critiqueHash, b.review.critiqueHash);
  assert.ok(
    f.cases.every(
      (x) =>
        x.macroLast < x.origin &&
        x.annualLast < x.origin &&
        x.costLast <= x.origin &&
        (x.correctionCutoff === null || x.correctionCutoff <= x.origin) &&
        (x.spreadCutoff === null || x.spreadCutoff <= x.origin),
    ),
  );
  assert.equal(f.unavailable.eligibleOrigins, 0);
  for (const s of f.summary) {
    const rows = f.cases.filter((x) => x.wait === s.wait);
    assert.equal(s.originYears, new Set(rows.map((x) => x.origin)).size);
    assert.ok(
      Math.abs(
        s.brier -
          rows.reduce((a, x) => a + (x.probability - x.actual) ** 2, 0) /
            rows.length,
      ) < 1e-12,
    );
  }
  assert.ok(f.summary.some((x) => x.costCoverage < 0.5));
});
test("sampling reserve preserves requested target and confirmation requires its lower bound", () => {
  assert.ok(savingsFitProbability(0.9) > 0.9);
  assert.ok(savingsFitProbability(0.99) <= 1);
  const atLine = savingsConfirmation(4500, 5000, 0.9);
  assert.equal(atLine.probability, 0.9);
  assert.equal(atLine.meets, false);
  assert.ok(atLine.lowerBound < 0.9);
  assert.equal(atLine.requestedProbability, 0.9);
  assert.ok(savingsConfirmation(4700, 5000, 0.9).meets);
});
test("distribution-free reserve covers fitting and verification error plus worst Wilson distance", () => {
  for (const n of [20000, 50000])
    for (const target of [0.5, 0.8, 0.9, 0.95]) {
      const fitted = legacySavingsFitProbability(target, n);
      if (fitted === 1) continue;
      const error =
        Math.sqrt(Math.log(80) / (2 * n)) +
        Math.sqrt(Math.log(80) / (2 * 5000));
      const worstObserved = fitted - error;
      assert.ok(
        samplingInterval(worstObserved, 5000, 1.6448536269514722).low >=
          target - 1e-12,
      );
    }
  assert.ok(savingsReserve(50000) < savingsReserve(20000));
  assert.equal(savingsConfirmation(5000, 5000, 0.99).reserveCapped, false);
});
function fixture() {
  const p = newPlan(),
    st = p.students[0],
    sc = st.scenarios[0];
  p.valuation = "2026-09";
  st.enrollment = "2027-09";
  Object.assign(st.funding, {
    balance: 0,
    monthly: 0,
    contributionStart: p.valuation,
    contributionEnd: "2027-08",
  });
  sc.baseline = p.valuation;
  sc.years = 1;
  sc.costs.tuition = 10000;
  sc.assumptions.tuitionGrowth = 0;
  return { p, st, sc };
}
test("reserved savings targets remain stable across twelve seeds on independently checked variable-return ledgers", () => {
  const { p, st, sc } = fixture(),
    c = compile(p, st, sc),
    results = [];
  for (let seed = 1; seed <= 12; seed++) {
    const make = (t, s = seed) => {
      const annual =
        0.8 + 0.4 * random((s ^ Math.imul(t + 1, 0x7feb352d)) >>> 0)();
      return {
        compiled: c,
        gross: Float64Array.from(c.rows, (_, i) =>
          i < 12 ? annual ** (1 / 12) : 1,
        ),
      };
    };
    const result = simulateHistorical(
      c,
      h,
      { seed, trials: 100, threshold: 0.9, ceiling: 10000 },
      () => {},
      true,
      {
        make: (t) => make(t),
        verify: (t) => make(t, seed ^ 0x51ed270b),
        metadata: { method: "Controlled variable-return ledger" },
      },
    );
    assert.equal(result.confirmation.trials, 5000);
    assert.equal(
      result.confirmation.fitProbability,
      savingsFitProbability(0.9),
    );
    assert.equal(
      result.confirmation.meets,
      result.confirmation.lowerBound >= 0.9,
    );
    results.push(result);
  }
  const values = results.map((x) => x.contribution);
  assert.ok(results.filter((x) => x.confirmation.meets).length >= 10);
  assert.ok(
    (Math.max(...values) - Math.min(...values)) / Math.min(...values) < 0.02,
  );
});
test("fully funded goals stay zero and infeasible contribution dates stay infeasible", () => {
  const { p, st, sc } = fixture();
  st.funding.balance = 50000;
  let c = compile(p, st, sc),
    make = () => ({ compiled: c, gross: Float64Array.from(c.rows, () => 1) });
  const good = simulateHistorical(
    c,
    h,
    { seed: 3, trials: 100, threshold: 0.99 },
    () => {},
    true,
    { make, verify: make, metadata: {} },
  );
  assert.equal(good.contribution, 0);
  assert.ok(good.confirmation.meets);
  st.funding.balance = 0;
  st.funding.contributionStart = "2027-10";
  st.funding.contributionEnd = "2027-11";
  c = compile(p, st, sc);
  const bad = simulateHistorical(
    c,
    h,
    { seed: 3, trials: 100 },
    () => {},
    true,
    { make, verify: make, metadata: {} },
  );
  assert.equal(bad.contribution, null);
  assert.ok(bad.infeasible);
});
test("reviewed student and household ledgers agree and model-8 plans preserve all funding", () => {
  const { p, st, sc } = fixture();
  st.funding.balance = 10000;
  const before = canonical(p),
    saved = structuredClone(p);
  saved.modelVersion = "college-funding-8.0.0";
  assert.deepEqual(validatePlan(saved).students, p.students);
  assert.equal(validatePlan(saved).modelVersion, MODEL);
  const { c } = compileCalibrated(p, st, sc, b),
    factory = calibrationFactory(c, b, { seed: 11 });
  const probs = Array.from({ length: 100 }, (_, i) => {
    const x = factory.make(i);
    return Number(runPath(x.compiled, (j) => x.gross[j], c.monthly).success);
  });
  const family = assessHousehold(
    p,
    h,
    { seed: 11, trials: 100, threshold: 0.9 },
    sc.history,
    () => {},
    { bundle: b, assumptionCase: b.macro.cases[1] },
  );
  assert.equal(family.probability, probs.reduce((a, b) => a + b) / 100);
  assert.equal(canonical(p), before);
});
