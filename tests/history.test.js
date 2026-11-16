import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  resolveScenario,
  newPlan,
  validatePlan,
  parseImport,
  exportPlan,
  MODEL,
  SCHEMA,
} from "../site/js/domain.js";
import {
  compile,
  runPath,
  repriceRow,
  requiredContribution,
} from "../site/js/engine.js";
import {
  validateHistory,
  verifyHistory,
  observations,
  blockIndices,
  portfolioGross,
  historicalPath,
  referenceScenario,
  simulateHistorical,
  assessHistorical,
} from "../site/js/history.js";
const data = JSON.parse(
  fs.readFileSync(new URL("../site/data/history.json", import.meta.url)),
);
const close = (a, b, tol = 0.011) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
function fixture() {
  const p = newPlan();
  p.valuation = "2026-08";
  const st = p.students[0],
    s = st.scenarios[0];
  const f = st.funding;
  st.enrollment = "2027-08";
  s.years = 1;
  s.baseline = "2026-08";
  s.sourceDate = "2026-08";
  f.assumptionsDate = "2026-08";
  f.contributionStart = "2026-08";
  f.contributionEnd = "2027-07";
  s.costs = { tuition: 12000, housing: 9000, books: 0, transport: 0, other: 0 };
  return { p, st, s, f };
}
test("historical snapshot is consecutive, complete, finite, and checksum verified", async () => {
  assert.equal(validateHistory(data).observations.length, 564);
  await verifyHistory(data);
  const bad = structuredClone(data);
  bad.observations[0][1] += 0.001;
  await assert.rejects(verifyHistory(bad), /checksum/);
  const missing = structuredClone(data);
  missing.observations.splice(1, 1);
  assert.throws(() => validateHistory(missing));
});
test("historical stock and bond loss episodes are actual observations, not normal draws", () => {
  const stock2008 =
    data.observations
      .filter((r) => r[0].startsWith("2008"))
      .reduce((v, r) => v * (1 + r[1]), 1) - 1;
  const bond2022 =
    data.observations
      .filter((r) => r[0].startsWith("2022"))
      .reduce((v, r) => v * (1 + r[2]), 1) - 1;
  assert.ok(stock2008 < -0.3);
  assert.ok(bond2022 < -0.1);
  assert.ok(data.observations.find((r) => r[0] === "1987-10")[1] < -0.15);
});
test("calendar-aligned blocks copy consecutive paired observations and reproduce prefixes", () => {
  const rows = observations(data),
    a = blockIndices(rows, 130, 10, 3, 42, 7),
    b = blockIndices(rows, 90, 10, 3, 42, 7);
  assert.deepEqual(a.slice(0, 90), b);
  for (let i = 0; i < a.length; i++) {
    if (i % 36 === 0) assert.equal(rows[a[i]][0].slice(5), "11");
    else assert.equal(a[i], a[i - 1] + 1);
  }
  assert.deepEqual(a, blockIndices(rows, 130, 10, 3, 42, 7));
  assert.notDeepEqual(a, blockIndices(rows, 130, 10, 3, 43, 7));
});
test("allocation and fees use observed nominal asset returns without independent resampling", () => {
  close(
    portfolioGross(["2000-01", 0.1, -0.05, 0.01, 0, 0], [0.6, 0.3, 0.1]),
    1.046,
    1e-10,
  );
  close(
    portfolioGross(["2000-01", 0, 0, 0, 0, 0], [0, 0, 1], 0.01) ** 12,
    0.99,
    1e-10,
  );
});
test("repriced bills recalculate grants, coverage, income and discounted amounts together", () => {
  const { p, st, s, f } = fixture();
  st.enrollment = "2026-08";
  f.grant = 4000;
  f.income = 9000;
  const r = compile(p, st, s).rows[0],
    priced = repriceRow(r, 2, 0.5, 3);
  close(priced.costs.tuition, 12000);
  close(priced.costs.housing, 500);
  close(priced.total, 12500);
  close(priced.grant, 2000);
  close(priced.income, 1000);
  close(priced.need, 9500);
  assert.equal(priced.discount, 3);
});
test("historical tuition and CPI create variable expense ranges and paired gaps", () => {
  const { p, st, s, f } = fixture();
  f.history.reference = "manual";
  f.balance = 0;
  const c = compile(p, st, s),
    r = simulateHistorical(c, data, { trials: 200, seed: 12 }, () => {}, false);
  assert.ok(r.costRange.p90 > r.costRange.p10);
  assert.ok(r.tuitionRange.p90 > r.tuitionRange.p10);
  close(r.gap.p10, r.costRange.p10);
  close(r.gap.p50, r.costRange.p50);
  close(r.gap.p90, r.costRange.p90);
});
test("fixed-expense mode preserves costs while historical investment returns still vary", () => {
  const { p, st, s, f } = fixture();
  f.balance = 20000;
  s.history.costMode = "fixed";
  const r = simulateHistorical(
    compile(p, st, s),
    data,
    { trials: 200, seed: 12 },
    () => {},
    false,
  );
  close(r.costRange.p10, r.costRange.p90);
  assert.ok(r.enrollment.p90 > r.enrollment.p10);
});
test("historical path has correct initial bill timing and never double-applies inflation", () => {
  const { p, st, s, f } = fixture();
  st.enrollment = "2026-08";
  f.balance = 50000;
  f.history.reference = "manual";
  const c = compile(p, st, s),
    rows = observations(data),
    ix = blockIndices(rows, c.rows.length, c.valuationMonth, 3, 42, 0),
    path = historicalPath(c, rows, ix);
  close(path.compiled.rows[0].total, 7000); // $6,000 tuition and $1,000 housing, no inflation before initial quote.
  close(path.compiled.rows[1].costs.housing, 1000 * (1 + rows[ix[0]][4]));
  const r = runPath(path.compiled, (i) => path.gross[i]);
  assert.ok(r.ledger.every((x) => x.balance >= 0));
});
test("historical reference is derived geometrically and never mutates user input", () => {
  const { s, st, f } = fixture();
  const before = structuredClone(s),
    ref = referenceScenario(s, data, st);
  assert.deepEqual(s, before);
  assert.notEqual(ref.assumptions.returnRate, f.assumptions.returnRate);
  f.history.reference = "manual";
  assert.deepEqual(referenceScenario(s, data, st), resolveScenario(st, s));
});
test("single assessment returns primary ranges, actual periods, sensitivity, source metadata and savings target", () => {
  const { p, st, s, f } = fixture();
  f.balance = 10000;
  const r = assessHistorical(p, st, s, data, {
    trials: 100,
    seed: 2,
    threshold: 0.9,
    ceiling: 10000,
  });
  assert.ok(r.historicalReplay.windows > 0);
  assert.ok(r.historicalReplay.worstStart);
  assert.equal(r.sensitivity.period, "2000–2024");
  assert.equal(r.sensitivity.trials, 100);
  assert.equal(r.dataset.hash, data.observationsSha256);
  assert.equal(r.dataset.sources.length, 4);
  assert.ok(r.simulation.contribution > 0);
  assert.ok(r.simulation.confirmation.calibrationProbability >= 0.9);
  assert.equal(r.simulation.confirmation.trials, 1000);
});
test("path-specific solver covers repriced bills using the same historical sequence", () => {
  const { p, st, s, f } = fixture();
  const c = compile(p, st, s),
    rows = observations(data),
    path = historicalPath(
      c,
      rows,
      blockIndices(rows, c.rows.length, c.valuationMonth, 3, 43, 4),
    );
  const amount = Math.ceil(
    requiredContribution(path.compiled, (i) => path.gross[i]),
  );
  assert.ok(runPath(path.compiled, (i) => path.gross[i], amount).success);
});
test("a complete result is reproducible for the same dataset, inputs and seed", () => {
  const { p, st, s, f } = fixture();
  const c = compile(p, st, s),
    settings = { trials: 100, seed: 99 };
  assert.deepEqual(
    simulateHistorical(c, data, settings, () => {}, false),
    simulateHistorical(c, data, settings, () => {}, false),
  );
});
test("older stored schemas are deliberately rejected without migration", () => {
  const { p, st, f } = fixture();
  for (const version of [1, 2, 3, 4]) {
    const old = structuredClone(p);
    old.schemaVersion = version;
    assert.throws(() => validatePlan(old), /incompatible/);
  }
});
test("invalid historical settings are rejected before any assessment", () => {
  const { p, s, st, f } = fixture();
  for (const [key, value] of [
    ["profile", "unknown"],
    ["period", "future"],
    ["blockYears", 0],
    ["fee", 0.2],
    ["costMode", "invented"],
  ]) {
    const candidate = structuredClone(p);
    (key === "profile" || key === "fee"
      ? candidate.students[0].funding.history
      : candidate.students[0].scenarios[0].history)[key] = value;
    assert.throws(() => validatePlan(candidate));
  }
});

test("committed source hashes and derived manifest agree with the runtime snapshot", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("../data/manifest.json", import.meta.url)),
  );
  assert.equal(
    manifest.observationsSha256,
    "2428c0397502642b2a672473f3a4ad83c0026d64cacef2df99db909ca37c1e4f",
  );
  assert.equal(data.observationsSha256, manifest.observationsSha256);
  for (const [name, hash] of Object.entries(manifest.rawHashes))
    assert.equal(
      createHash("sha256")
        .update(
          fs.readFileSync(new URL("../data/raw/" + name, import.meta.url)),
        )
        .digest("hex"),
      hash,
      name,
    );
});

test("display distributions reconcile to the same simulated success and cost paths", () => {
  const { p, st, s, f } = fixture();
  f.balance = 15000;
  const result = simulateHistorical(
    compile(p, st, s),
    data,
    { trials: 200, seed: 12 },
    () => {},
    false,
  );
  for (const [name, distribution] of Object.entries(result.distributions)) {
    assert.equal(distribution.total, 200, name);
    assert.equal(
      distribution.bins.reduce((n, b) => n + b.count, 0),
      200,
      name,
    );
  }
  close(
    result.distributions.gap.bins[0].probability,
    result.probability,
    1e-12,
  );
  assert.equal(
    result.distributions.gap.bins[0].count,
    200 - result.failedCount,
  );
});
