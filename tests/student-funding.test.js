import test from "node:test";
import assert from "node:assert/strict";
import {
  newPlan,
  newStudent,
  defaultScenario,
  duplicateStudent,
  resolveScenario,
  validatePlan,
  exportPlan,
  parseImport,
  id,
  clone,
  MODEL,
  SCHEMA,
} from "../site/js/domain.js";
import { compile, runPath } from "../site/js/engine.js";
import { assessHistorical } from "../site/js/history.js";
import { isLegacyPlan, discardLegacyCopies } from "../site/js/storage.js";
import fs from "node:fs";
const data = JSON.parse(
  fs.readFileSync(new URL("../site/data/history.json", import.meta.url)),
);
function fixture() {
  const plan = newPlan();
  plan.valuation = "2026-08";
  const student = plan.students[0];
  student.enrollment = "2027-08";
  const funding = student.funding;
  funding.contributionStart = plan.valuation;
  funding.contributionEnd = "2027-07";
  funding.balance = 12345.67;
  funding.monthly = 250;
  const first = student.scenarios[0];
  first.baseline = plan.valuation;
  first.costs.tuition = 12000;
  first.costs.housing = 9000;
  first.years = 2;
  const second = defaultScenario(plan.valuation);
  second.years = 4;
  second.costs.tuition = 30000;
  second.costs.housing = 14000;
  student.scenarios.push(second);
  return { plan, student, funding, first, second };
}
test("switching education paths retains one student balance, contribution plan and investments", () => {
  const { plan, student, funding, first, second } = fixture(),
    before = clone(funding);
  const a = compile(plan, student, first),
    b = compile(plan, student, second);
  assert.equal(a.opening, 12345.67);
  assert.equal(b.opening, a.opening);
  assert.equal(b.monthly, a.monthly);
  assert.deepEqual(a.history.allocations, b.history.allocations);
  assert.equal(a.history.profile, b.history.profile);
  assert.notEqual(a.rows.length, b.rows.length);
  assert.ok(runPath(b).total > runPath(a).total);
  assert.deepEqual(student.funding, before);
  validatePlan(plan);
});
test("funding edits affect every school path while a different student retains independent funding", () => {
  const { plan, student, funding, first, second } = fixture();
  const other = newStudent(plan.valuation);
  plan.students.push(other);
  funding.balance = 45678;
  funding.monthly = 500;
  funding.history.fee = 0.01;
  for (const sc of [first, second]) {
    const result = compile(plan, student, sc);
    assert.equal(result.opening, 45678);
    assert.equal(result.monthly, 500);
    assert.equal(result.history.fee, 0.01);
  }
  assert.equal(other.funding.balance, 0);
  assert.equal(other.funding.monthly, 0);
  assert.equal(other.funding.history.fee, 0);
});
test("saved education records cannot hold hidden balances or investment overrides", () => {
  const { plan, first } = fixture();
  for (const [key, value] of [
    ["balance", 999],
    ["monthly", 100],
    ["funding", {}],
    ["resolved", true],
  ]) {
    const candidate = clone(plan);
    candidate.students[0].scenarios[0][key] = value;
    assert.throws(() => validatePlan(candidate), /unsupported fields/);
  }
  const candidate = clone(plan);
  candidate.students[0].scenarios[0].history.profile = "cash";
  assert.throws(() => validatePlan(candidate));
  assert.equal(Object.hasOwn(first, "balance"), false);
});
test("education copies reuse destination funding and retain school costs and award details", () => {
  const { plan, student, first } = fixture();
  first.schoolGrant = 6000;
  const other = newStudent(plan.valuation);
  other.enrollment = student.enrollment;
  other.funding.balance = 900;
  const copy = clone(first);
  copy.id = id();
  other.scenarios = [copy];
  plan.students.push(other);
  const source = compile(plan, student, first),
    destination = compile(plan, other, copy);
  assert.notEqual(source.opening, destination.opening);
  assert.equal(destination.opening, 900);
  assert.equal(
    source.rows.reduce((n, r) => n + r.total, 0),
    destination.rows.reduce((n, r) => n + r.total, 0),
  );
  assert.equal(other.funding.monthly, 0);
  validatePlan(plan);
});
test("general aid and school aid are combined once and expire independently", () => {
  const { plan, student, funding, first, second } = fixture();
  student.enrollment = plan.valuation;
  first.years = 2;
  funding.grant = 3000;
  funding.grantYears = 1;
  first.schoolGrant = 6000;
  first.schoolGrantYears = 2;
  for (const key of Object.keys(first.assumptions)) first.assumptions[key] = 0;
  const a = runPath(compile(plan, student, first)),
    b = runPath(compile(plan, student, second));
  assert.equal(a.grants, 15000);
  assert.equal(b.grants, 3000);
  assert.equal(
    a.ledger.filter((r) => r.date < "2027-08").reduce((n, r) => n + r.grant, 0),
    9000,
  );
  assert.equal(
    a.ledger
      .filter((r) => r.date >= "2027-08")
      .reduce((n, r) => n + r.grant, 0),
    6000,
  );
});
test("duplicating a student never duplicates account balances, gifts or shared allocations", () => {
  const { plan, student, funding } = fixture();
  student.sharedAllocation = 1000;
  plan.sharedPool = 1000;
  funding.gifts = [{ date: plan.valuation, amount: 2000 }];
  funding.grant = 500;
  funding.income = 1000;
  student.scenarios[0].schoolGrant = 2500;
  const copy = duplicateStudent(student);
  plan.students.push(copy);
  validatePlan(plan);
  assert.equal(copy.sharedAllocation, 0);
  for (const key of ["balance", "monthly", "grant", "income"])
    assert.equal(copy.funding[key], 0);
  assert.deepEqual(copy.funding.gifts, []);
  assert.equal(copy.scenarios[0].schoolGrant, 0);
  assert.deepEqual(copy.funding.history, student.funding.history);
  assert.equal(funding.balance, 12345.67);
});
test("new backups round trip the normalized schema; older schemas and backup formats are rejected", () => {
  const { plan } = fixture();
  assert.equal(SCHEMA, 5);
  assert.equal(MODEL, "college-funding-11.0.0");
  assert.deepEqual(parseImport(exportPlan(plan)), plan);
  const old = clone(plan);
  old.schemaVersion = 4;
  old.modelVersion = "college-funding-3.0.0";
  assert.throws(
    () => validatePlan(old),
    (e) => e.code === "INCOMPATIBLE_PLAN",
  );
  const wrapper = JSON.parse(exportPlan(plan));
  wrapper.format = "education-finance-1";
  assert.throws(() => parseImport(JSON.stringify(wrapper)), /incompatible/);
  assert.equal(isLegacyPlan(old), true);
  assert.equal(isLegacyPlan(plan), false);
  assert.equal(isLegacyPlan({ schemaVersion: 6 }), false);
});
test("reference calculations never write derived investment rates back into student funding", () => {
  const { plan, student, funding, first } = fixture(),
    before = clone(funding);
  const result = assessHistorical(plan, student, first, data, {
    seed: 42,
    trials: 100,
    ceiling: 0,
  });
  assert.deepEqual(funding, before);
  assert.notEqual(
    result.referenceScenario.assumptions.returnRate,
    funding.assumptions.returnRate,
  );
  const view = resolveScenario(student, first);
  view.balance = 0;
  view.history.allocations.push({});
  assert.deepEqual(funding, before);
});

test("breaking reset removes only legacy recovery/draft copies and keeps newly created funding plans", () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
      removeItem: (k) => values.delete(k),
    };
  const current = newPlan();
  storage.setItem(
    "education-finance-recovery-v1",
    JSON.stringify({ plan: current }),
  );
  storage.setItem(
    "education-finance-draft-v1",
    JSON.stringify({ plan: { schemaVersion: 4 } }),
  );
  assert.equal(discardLegacyCopies(storage), true);
  assert.ok(storage.getItem("education-finance-recovery-v1"));
  assert.equal(storage.getItem("education-finance-draft-v1"), null);
  assert.equal(discardLegacyCopies(storage), false);
});

test("no-aid stress is exactly unchanged when both types of aid are zero; history periods have matching trial counts", () => {
  const { plan, student, first } = fixture();
  const result = assessHistorical(plan, student, first, data, {
    seed: 987,
    trials: 100,
    ceiling: 0,
  });
  const noAid = result.robustness.stresses.find(
    (s) => s.name === "No future grants or scholarships",
  );
  assert.equal(noAid.deltaProbability, 0);
  assert.deepEqual(noAid.gap, result.robustness.baseline.gap);
  assert.equal(result.simulation.trials, result.sensitivity.trials);
});
