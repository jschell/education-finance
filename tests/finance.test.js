import test from "node:test";
import assert from "node:assert/strict";
import {
  newPlan,
  validatePlan,
  parseImport,
  exportPlan,
  duplicateStudent,
  MODEL,
} from "../site/js/domain.js";
import {
  compile,
  runPath,
  annualRows,
  requiredContribution,
} from "../site/js/engine.js";
import { quantile, simulate, trialGrowth } from "../site/js/simulation.js";
const close = (x, y, tol = 0.011) =>
  assert.ok(Math.abs(x - y) < tol, `${x} != ${y}`);
function fixture() {
  const p = newPlan();
  p.valuation = "2026-08";
  const st = p.students[0];
  st.enrollment = "2027-08";
  const s = st.scenarios[0];
  const f = st.funding;
  s.years = 1;
  s.baseline = "2026-08";
  s.sourceDate = "2026-08";
  f.assumptionsDate = "2026-08";
  f.contributionStart = "2026-08";
  f.contributionEnd = "2027-07";
  for (const key of Object.keys(s.assumptions)) s.assumptions[key] = 0;
  for (const key of Object.keys(f.assumptions)) f.assumptions[key] = 0;
  f.assumptions.transitionYears = 3;
  s.costs = { tuition: 12000, housing: 9000, books: 0, transport: 0, other: 0 };
  return { p, st, s, f };
}
test("zero-return cash flows reconcile to hand-calculated costs and funds", () => {
  const { p, st, s, f } = fixture();
  f.balance = 5000;
  f.monthly = 500;
  const r = runPath(compile(p, st, s));
  close(r.total, 21000);
  close(r.deposits, 6000);
  close(r.enrollmentBalance, 11000);
  close(r.shortfall, 10000);
  close(r.ending, 0);
  assert.equal(r.firstShortfall, "2028-01");
  const annual = annualRows(r);
  close(
    annual.reduce((v, y) => v + y.total, 0),
    21000,
  );
  assert.ok(r.ledger.every((r) => r.balance >= 0));
});
test("separate cost and fund growth match FV at entry with exactly 12 periods", () => {
  const { p, st, s, f } = fixture();
  f.balance = 10000;
  f.assumptions.returnRate = 0.1;
  f.assumptions.lateReturn = 0.1;
  f.assumptions.attendanceReturn = 0;
  s.assumptions.tuitionGrowth = 0.05;
  const r = runPath(compile(p, st, s));
  close(r.enrollmentBalance, 11000);
  close(r.ledger.find((r) => r.date === "2027-08").costs.tuition, 6300);
});
test("tuition reprices once per academic year; nine monthly living payments", () => {
  const { p, st, s, f } = fixture();
  s.years = 2;
  s.assumptions.tuitionGrowth = 0.1;
  const c = compile(p, st, s);
  assert.equal(c.rows.filter((r) => r.costs.housing > 0).length, 18);
  close(
    c.rows.find((r) => r.date === "2028-08").costs.tuition,
    6000 * 1.1 ** 2,
  );
  assert.equal(
    c.rows.find((r) => r.date === "2028-01").costs.tuition,
    c.rows.find((r) => r.date === "2027-08").costs.tuition,
  );
});
test("a later gift and positive ending balance do not erase earlier failure", () => {
  const { p, st, s, f } = fixture();
  f.gifts = [{ date: "2028-04", amount: 50000 }];
  const r = runPath(compile(p, st, s));
  assert.equal(r.success, false);
  assert.ok(r.ending > 0);
  assert.equal(r.firstShortfall, "2027-08");
});
test("grants expire, are capped, and reduce tuition before coverage", () => {
  const { p, st, s, f } = fixture();
  s.years = 2;
  f.grant = 50000;
  f.grantYears = 1;
  f.coverage = "tuition";
  const r = runPath(compile(p, st, s));
  close(r.obligation, 12000);
  assert.ok(r.grants < 50000);
  close(
    r.ledger
      .filter((r) => r.date >= "2028-08")
      .reduce((v, r) => v + r.grant, 0),
    0,
  );
});
test("income used once, capped at bill; not deposited as unused funds", () => {
  const { p, st, s, f } = fixture();
  f.income = 900000;
  const r = runPath(compile(p, st, s));
  close(r.income, 21000);
  close(r.deposits, 0);
  close(r.ending, 0);
  assert.ok(r.success);
  close(runPath(compile(p, st, s, "contributions")).shortfall, 21000);
});
test("remaining expenses for a currently enrolled student omit past bills", () => {
  const { p, st, s, f } = fixture();
  p.valuation = "2027-12";
  f.contributionStart = "2027-12";
  f.contributionEnd = "2028-04";
  s.baseline = "2027-08";
  const r = runPath(compile(p, st, s));
  close(r.total, 11000);
  assert.equal(r.enrollmentBalance, null);
  assert.ok(r.ledger.every((r) => r.date >= "2027-12"));
});
test("stage returns change by calendar month; no hidden extra entry growth", () => {
  const { p, st, s, f } = fixture();
  st.enrollment = "2030-08";
  f.contributionEnd = "2030-07";
  f.balance = 10000;
  f.assumptions.transitionYears = 2;
  f.assumptions.returnRate = 0.1;
  f.assumptions.lateReturn = 0.02;
  f.assumptions.attendanceReturn = 0;
  const c = compile(p, st, s),
    r = runPath(c);
  close(r.enrollmentBalance, 10000 * 1.1 ** 2 * 1.02 ** 2);
  close(r.ledger.at(-1).earned, 0);
});
test("zero-volatility Monte Carlo agrees with deterministic projection", () => {
  const { p, st, s, f } = fixture();
  f.balance = 5000;
  f.monthly = 500;
  for (const prefix of ["", "late", "attendance"]) {
    const key = prefix ? prefix + "Return" : "returnRate",
      mean = prefix ? prefix + "Mean" : "mean";
    f.assumptions[key] = 0.04;
    f.assumptions[mean] = 0.04;
  }
  const c = compile(p, st, s),
    r = runPath(c),
    sim = simulate(c, { trials: 100, seed: 7 });
  close(sim.gap.p50, r.shortfall);
  close(sim.gap.p10, sim.gap.p90);
  assert.equal(sim.probability, r.success ? 1 : 0);
});
test("seeded trials reproduce, change with seed, and gross returns stay positive", () => {
  const { p, st, s, f } = fixture();
  f.assumptions.mean = 0.06;
  f.assumptions.volatility = 0.2;
  f.assumptions.lateMean = 0.04;
  f.assumptions.lateVolatility = 0.15;
  const c = compile(p, st, s),
    a = trialGrowth(c, 123, 3),
    b = trialGrowth(c, 123, 3),
    d = trialGrowth(c, 124, 3);
  let different = false;
  for (let i = 0; i < c.rows.length; i++) {
    const x = a(i);
    assert.equal(x, b(i));
    assert.ok(x > 0);
    if (x !== d(i)) different = true;
  }
  assert.ok(different);
});
test("annual simulated mean and volatility reflect supplied arithmetic values", () => {
  const { p, st, s, f } = fixture();
  f.assumptions.lateMean = 0.06;
  f.assumptions.lateVolatility = 0.15;
  const c = compile(p, st, s);
  let sum = 0,
    squares = 0,
    n = 30000;
  for (let t = 0; t < n; t++) {
    const g = trialGrowth(c, 4321, t);
    let gross = 1;
    for (let i = 0; i < 12; i++) gross *= g(i);
    const r = gross - 1;
    sum += r;
    squares += r * r;
  }
  close(sum / n, 0.06, 0.004);
  close(Math.sqrt(squares / n - (sum / n) ** 2), 0.15, 0.004);
});
test("percentiles use documented linear interpolation including infinities", () => {
  close(quantile([0, 10, 20, 30], 0.1), 3);
  close(quantile([0, 10, 20, 30], 0.5), 15);
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([0, Infinity], 0.9), Infinity);
});
test("path-specific contribution solver covers all bills, with date infeasibility", () => {
  const { p, st, s, f } = fixture();
  const c = compile(p, st, s),
    required = requiredContribution(c, () => 1);
  close(required, 1750);
  assert.ok(runPath(c, () => 1, Math.ceil(required)).success);
  f.contributionStart = "2028-01";
  f.contributionEnd = "2028-04";
  assert.equal(
    requiredContribution(compile(p, st, s), () => 1),
    Infinity,
  );
});
test("solver returns zero for funded goals, and respects contribution ceiling", () => {
  const { p, st, s, f } = fixture();
  f.balance = 50000;
  const good = simulate(compile(p, st, s), { trials: 100, seed: 7 });
  assert.equal(good.contribution, 0);
  assert.ok(good.confirmation.meets);
  f.balance = 0;
  const bad = simulate(compile(p, st, s), {
    trials: 100,
    seed: 7,
    ceiling: 100,
  });
  assert.ok(bad.infeasible);
  assert.equal(bad.contribution, null);
});
test("market stress applies one loss before entry and all cost ranges stay fixed", () => {
  const { p, st, s, f } = fixture();
  f.balance = 100000;
  const normal = runPath(compile(p, st, s));
  f.stress = true;
  const stress = runPath(compile(p, st, s));
  close(stress.enrollmentBalance, normal.enrollmentBalance * 0.75);
});
test("export/import round-trip, unknown versions, null and nonfinite inputs", () => {
  const { p, st, f } = fixture();
  assert.deepEqual(parseImport(exportPlan(p)), p);
  for (const mutate of [
    (x) => (x.modelVersion = "future"),
    (x) => (x.students[0].scenarios[0].years = 0),
    (x) => (x.students[0].scenarios[0].costs.tuition = null),
    (x) => (x.sharedPool = Infinity),
    (x) => (x.students[0].funding.assumptions.mean = NaN),
    (x) => (x.extra = 1),
  ]) {
    const copy = structuredClone(p);
    mutate(copy);
    assert.throws(() => validatePlan(copy));
  }
  assert.throws(() => parseImport("{broken"));
  assert.throws(() => parseImport("x".repeat(2_000_001)));
});
test("shared pools cannot be double counted; duplicate student allocation resets", () => {
  const { p, st, f } = fixture();
  p.sharedPool = 1000;
  st.sharedAllocation = 1000;
  const copy = duplicateStudent(st);
  assert.equal(copy.sharedAllocation, 0);
  p.students.push(copy);
  validatePlan(p);
  copy.sharedAllocation = 1;
  assert.throws(() => validatePlan(p), /exceed/);
});
test("unsafe aliases preserved as text; invalid references/dates are rejected", () => {
  const { p, st, s, f } = fixture();
  st.alias = "<img src=x onerror=alert(1)>";
  assert.equal(parseImport(exportPlan(p)).students[0].alias, st.alias);
  f.contributionStart = "2029-01";
  assert.throws(() => validatePlan(p));
  f.contributionStart = "2026-08";
  s.baseline = "2028-01";
  assert.throws(() => validatePlan(p));
});
test("education scenarios need no acknowledgement flags to project or compare", async () => {
  const { p, st, s, f } = fixture();
  validatePlan(p);
  assert.ok(runPath(compile(p, st, s)).total > 0);
  const { compareScenarios } = await import("../site/js/simulation.js");
  assert.equal(
    compareScenarios(p, st, { trials: 100, seed: 7, ceiling: 0 }).length,
    1,
  );
  assert.deepEqual(parseImport(exportPlan(p)), p);
});
test("discounted expenses and coverage percentage are independent of general inflation", () => {
  const { p, st, s, f } = fixture();
  f.coverage = "percent";
  f.share = 0.5;
  s.assumptions.inflation = 0.1;
  const r = runPath(compile(p, st, s));
  close(r.obligation, 10500);
  assert.ok(r.realShortfall < r.shortfall);
});
test("stochastic solver verifies the selected sample threshold after refinement", () => {
  const { p, st, s, f } = fixture();
  f.balance = 1000;
  f.assumptions.lateMean = 0.04;
  f.assumptions.lateVolatility = 0.1;
  f.assumptions.attendanceMean = 0.02;
  f.assumptions.attendanceVolatility = 0.03;
  const result = simulate(compile(p, st, s), {
    trials: 1000,
    seed: 4321,
    threshold: 0.9,
    ceiling: 10000,
  });
  assert.ok(result.confirmation.meets);
  assert.ok(result.confirmation.probability >= 0.9);
  assert.equal(result.confirmation.trials, 20000);
  assert.ok(Number.isInteger(result.contribution));
});
test("identical settings reproduce entire simulation summaries", () => {
  const { p, st, s, f } = fixture();
  f.assumptions.lateMean = 0.04;
  f.assumptions.lateVolatility = 0.1;
  f.balance = 12000;
  const c = compile(p, st, s),
    settings = { trials: 200, seed: 99, ceiling: 0 };
  assert.deepEqual(simulate(c, settings), simulate(c, settings));
});
test("contribution increase and end dates are honored, CSV is formula-safe", async () => {
  const { p, st, s, f } = fixture();
  f.monthly = 100;
  f.stepUp = 0.1;
  f.contributionEnd = "2027-08";
  const r = runPath(compile(p, st, s));
  close(r.deposits, 1310);
  const { csvText } = await import("../site/js/render.js");
  assert.match(csvText([["=SUM(A1)", 123]]), /"'=SUM\(A1\)"/);
});
