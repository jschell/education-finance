import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  resolveScenario,
  newPlan,
  newStudent,
  clone,
  validatePlan,
  MODEL,
  SCHEMA,
} from "../site/js/domain.js";
import { compile, runPath, portion } from "../site/js/engine.js";
import {
  historicalPath,
  referenceScenario,
  simulateHistorical,
  tuitionLogMean,
  walkForward,
} from "../site/js/history.js";
import {
  assessHousehold,
  capHouseholdContributions,
} from "../site/js/household.js";
import {
  samplingInterval,
  samplingRangeText,
  targetStatus,
} from "../site/js/probability.js";
import {
  acquireEditor,
  saveDraft,
  loadDraft,
  clearDraft,
} from "../site/js/storage.js";
const data = JSON.parse(
  fs.readFileSync(new URL("../site/data/history.json", import.meta.url)),
);
function fixture() {
  const p = newPlan();
  p.valuation = "2026-08";
  const st = p.students[0],
    s = st.scenarios[0];
  const f = st.funding;
  st.enrollment = "2026-08";
  s.years = 2;
  s.baseline = p.valuation;
  f.contributionStart = p.valuation;
  f.contributionEnd = "2028-04";
  s.costs.tuition = 12000;
  s.costs.housing = 9000;
  return { p, st, s, f };
}
const close = (a, b, t = 1e-7) =>
  assert.ok(Math.abs(a - b) <= t, `${a} != ${b}`);
test("integer-cent schedules conserve all small budgets without negative bills", () => {
  for (let units = 0; units < 200; units++)
    for (const count of [2, 3, 9, 12]) {
      const parts = Array.from({ length: count }, (_, i) =>
        portion(units / 100, i, count),
      );
      assert.ok(parts.every((x) => x >= 0));
      close(
        parts.reduce((a, b) => a + b, 0),
        units / 100,
      );
      assert.ok(Math.max(...parts) - Math.min(...parts) < 0.0100001);
    }
  const { p, st, s, f } = fixture();
  s.years = 1;
  s.costs.tuition = 0;
  s.costs.housing = 0.06;
  s.billing.livingMonths = 12;
  for (const k of Object.keys(s.assumptions)) s.assumptions[k] = 0;
  for (const k of Object.keys(f.assumptions)) f.assumptions[k] = 0;
  const r = runPath(compile(p, st, s));
  close(r.grants, 0);
  close(r.shortfall, 0.06);
  assert.equal(r.success, false);
  assert.ok(r.ledger.every((x) => x.total >= 0));
});
test("published-price trend is user controlled and does not inherit the aid-adjusted index mean", () => {
  const { p, st, s, f } = fixture();
  s.assumptions.tuitionGrowth = 0.04;
  const ref = referenceScenario(s, data, st);
  assert.equal(ref.assumptions.tuitionGrowth, 0.04);
  const c = compile(p, st, ref),
    rows = Array.from({ length: c.rows.length }, () => [
      "2000-01",
      0,
      0,
      0,
      0,
      0.01,
    ]),
    path = historicalPath(
      c,
      rows,
      rows.map((_, i) => i),
    );
  close(path.compiled.rows[0].costs.tuition, 6000);
  close(path.compiled.rows[5].costs.tuition, 6000);
  close(path.compiled.rows[12].costs.tuition, 6240, 0.011);
  s.history.tuitionBasis = "index";
  assert.notEqual(
    referenceScenario(s, data, st).assumptions.tuitionGrowth,
    0.04,
  );
  const indexPath = historicalPath(
    compile(p, st, s),
    rows,
    rows.map((_, i) => i),
  );
  close(
    indexPath.compiled.rows[12].costs.tuition,
    Math.round(6000 * 1.01 ** 12 * 100) / 100,
    0.011,
  );
});
test("detrending retains paired high tuition deviations during a market loss", () => {
  const { p, st, s, f } = fixture();
  st.enrollment = "2027-08";
  const c = compile(p, st, s);
  const rows = Array.from({ length: c.rows.length }, (_, i) => [
    "2000-01",
    i === 0 ? -0.4 : 0,
    0,
    0,
    0,
    i === 0 ? 0.1 : 0,
  ]);
  const path = historicalPath(
    c,
    rows,
    rows.map((_, i) => i),
  );
  assert.ok(path.gross[0] < 1);
  assert.ok(path.compiled.rows[12].costs.tuition > 6000 * 1.04);
});
test("representative outcomes use complete ledgers from the exact ranked simulation paths", () => {
  const { p, st, s, f } = fixture();
  f.balance = 10000;
  const result = simulateHistorical(
    compile(p, st, s),
    data,
    { seed: 19, trials: 100 },
    () => {},
    false,
  );
  assert.equal(result.representativePaths.length, 3);
  assert.ok(
    result.representativePaths[0].score <= result.representativePaths[1].score,
  );
  assert.ok(
    result.representativePaths[1].score <= result.representativePaths[2].score,
  );
  for (const path of result.representativePaths) {
    close(
      path.ledger.reduce((n, row) => n + row.shortfall, 0),
      path.shortfall,
    );
    for (const y of path.annual)
      close(y.opening + y.earned + y.contribution - y.withdrawal, y.balance);
  }
});
test("sampling intervals handle 0/100% and identify near-target Monte Carlo noise", () => {
  assert.ok(samplingInterval(0, 1000).high > 0);
  assert.ok(samplingInterval(1, 1000).low < 1);
  assert.equal(targetStatus(0.9, 10000, 0.9), "Near target");
  assert.equal(targetStatus(0.98, 10000, 0.9), "Target met");
  assert.equal(targetStatus(0.7, 10000, 0.9), "Below target");
});
test("unfinished drafts keep invalid text and dynamic rows without changing the valid plan", () => {
  const store = new Map(),
    storage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
    { p, st, s, f } = fixture();
  const selection = { studentId: st.id, scenarioId: s.id };
  saveDraft(
    p,
    selection,
    [{ key: "amount", value: "-5", checked: false }],
    { gifts: 1, allocations: 1 },
    storage,
  );
  p.students[0].funding.balance = 999;
  const draft = loadDraft(storage);
  assert.equal(draft.fields[0].value, "-5");
  assert.equal(draft.plan.students[0].funding.balance, 0);
  assert.equal(draft.structure.gifts, 1);
  clearDraft(storage);
  assert.equal(loadDraft(storage), null);
});
test("browser lock allows one editor and releases ownership after editor closes", async () => {
  let held = false;
  const locks = {
    request: async (name, options, callback) => {
      const acquired = !held;
      if (acquired) held = true;
      try {
        return await callback(acquired ? {} : null);
      } finally {
        if (acquired) held = false;
      }
    },
  };
  const first = await acquireEditor(locks);
  assert.equal(first.editable, true);
  const second = await acquireEditor(locks);
  assert.equal(second.editable, false);
  first.release();
  await new Promise((resolve) => setImmediate(resolve));
  const third = await acquireEditor(locks);
  assert.equal(third.editable, true);
  third.release();
  assert.equal((await acquireEditor(null)).editable, false);
});
test("household deposit cap prorates monthly savings without using gifts or shared balances twice", () => {
  const { p, st, s, f } = fixture();
  f.monthly = 600;
  f.gifts = [{ date: "2026-08", amount: 1000 }];
  const second = clone(st);
  second.id = "second";
  second.scenarios[0].id = "second-path";
  second.funding.monthly = 400;
  p.students.push(second);
  const compiled = p.students.map((st) => compile(p, st, st.scenarios[0])),
    schedule = capHouseholdContributions(compiled, 500);
  close(schedule[0], 500);
  close(compiled[0].rows[0].factor * 600, 300);
  close(compiled[1].rows[0].factor * 400, 200);
  assert.equal(compiled[0].rows[0].gift, 1000);
});
test("identical students on shared economic paths have identical success, not multiplied probabilities", () => {
  const { p, st, s, f } = fixture();
  f.balance = 20000;
  s.history.costMode = "fixed";
  const second = clone(st);
  second.id = "second";
  second.scenarios[0].id = "second-path";
  p.students.push(second);
  p.sharedPool = 100;
  st.sharedAllocation = 50;
  second.sharedAllocation = 50;
  const settings = { trials: 100, seed: 18 },
    joint = assessHousehold(p, data, settings, s.history),
    single = simulateHistorical(
      compile(p, st, referenceScenario(s, data, st)),
      data,
      settings,
      () => {},
      false,
    );
  close(joint.probability, single.probability);
  close(joint.gap.p50, 2 * single.gap.p50);
  close(joint.unallocatedPool, 0);
  assert.equal(joint.students.length, 2);
  p.family.monthlyLimit = 0;
  f.monthly = 1000;
  const zero = assessHousehold(p, data, settings, s.history);
  assert.equal(zero.peakMonthlyContribution, 0);
});
test("household scenario selections persist, and incomplete budgets suppress joint percentage", () => {
  const { p, st, s, f } = fixture();
  const second = newStudent(p.valuation);
  p.students.push(second);
  const alt = clone(s);
  alt.id = "alt";
  alt.name = "Alternative";
  st.scenarios.push(alt);
  p.family.scenarios[st.id] = alt.id;
  const r = assessHousehold(p, data, { trials: 100, seed: 2 }, s.history);
  assert.equal(r.students[0].scenario, "Alternative");
  assert.equal(r.probability, null);
  assert.equal(r.missingBudgets.length, 1);
  p.family.scenarios[st.id] = "missing";
  assert.throws(() => validatePlan(p));
});
test("walk-forward fits only earlier observations and explicitly reports insufficient history", () => {
  const { p, st, s, f } = fixture();
  const result = walkForward(p, st, s, data, { seed: 1, trials: 100 });
  assert.ok(result.folds.length > 0);
  for (const fold of result.folds) assert.ok(fold.trainEnd < fold.start);
  assert.ok(result.brier >= 0 && result.brier <= 1);
  const short = { ...data, observations: data.observations.slice(0, 180) };
  assert.equal(walkForward(p, st, s, short, { seed: 1 }).folds.length, 0);
  // A later regime change must not change the first fold's forecast.
  const changed = clone(data),
    first = result.folds[0];
  changed.observations = changed.observations.map((row) =>
    row[0] >= first.start
      ? [row[0], -0.2, row[2], row[3], row[4], row[5]]
      : row,
  );
  const altered = walkForward(p, st, s, changed, { seed: 1 });
  assert.equal(altered.folds[0].predicted, first.predicted);
});
test("older stored schemas are deliberately rejected without migration", () => {
  const { p, st, f } = fixture();
  for (const version of [1, 2, 3, 4]) {
    const old = structuredClone(p);
    old.schemaVersion = version;
    assert.throws(() => validatePlan(old), /incompatible/);
  }
});

test("sampling range text rounds outward so zero observed failures never imply zero uncertainty", () => {
  assert.equal(samplingRangeText(0, 10000), "0%–0.1%");
  assert.equal(samplingRangeText(1, 10000), "99.9%–100%");
});
