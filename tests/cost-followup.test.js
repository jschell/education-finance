import test from "node:test";
import assert from "node:assert/strict";
import { newPlan } from "../site/js/domain.js";
import { compile } from "../site/js/engine.js";
import { previousMonth, parseCpi, actualBillRows, auditBills, scoreBills,
  chronologicalChoice, recommendation, fundingSummary, MODELS } from "../scripts/cost-followup-helpers.mjs";
function fixture() {
  const p = newPlan(), st = p.students[0], sc = st.scenarios[0];
  p.valuation = "2011-09"; st.enrollment = "2011-09"; sc.baseline = p.valuation;
  sc.years = 1; sc.costs.tuition = 10000; sc.costs.housing = 9000;
  st.funding.contributionStart = p.valuation; st.funding.contributionEnd = p.valuation;
  return compile(p, st, sc);
}
test("observed CPI is rebased to preceding August and starts at one", () => {
  assert.equal(previousMonth("2011-01"), "2010-12");
  const c = fixture(), pi = new Map([["2011-08", 100]]);
  for (let i = 0; i < c.rows.length; i++) pi.set(previousMonth(c.rows[i].date), 100 + i);
  const rows = actualBillRows(c, [{year:2011, tuition:10000, housing:9000}], pi, 2011);
  assert.equal(rows[0].discount, 1);
  assert.equal(rows[1].discount, 1.01);
  pi.set("2099-12", 1e9);
  assert.deepEqual(actualBillRows(c, [{year:2011, tuition:10000, housing:9000}], pi, 2011), rows);
  assert.equal(parseCpi("date,CPI\n8/1/2011,100").get("2011-08"), 100);
});
test("invoice audit reconciles two tuition bills and nine housing bills without inflation", () => {
  const c = fixture(), prices = [{year:2011, tuition:10000, housing:9000}];
  const pi = new Map(c.rows.map((r) => [previousMonth(r.date), 100]));
  const rows = actualBillRows(c, prices, pi, 2011), a = auditBills(c, rows, prices, 2011);
  assert.equal(a.expected, 19000); assert.equal(a.actual, 19000);
  assert.equal(a.maxAbsoluteDifference, 0);
  assert.equal(rows[0].costs.tuition, 5000); assert.equal(rows[5].costs.tuition, 5000);
  assert.equal(rows.filter((r) => r.costs.tuition > 0).length, 2);
});
test("bill scoring distinguishes overforecast and underforecast misses", () => {
  const over = scoreBills([100,100,100], 50), under = scoreBills([100,100,100], 200);
  assert.equal(over.below, 1); assert.equal(over.above, 0);
  assert.equal(under.below, 0); assert.equal(under.above, 1);
  assert.equal(over.score, 10); assert.equal(under.score, 5);
});
const fold = (origin, lastBillYear, winner) => ({ origin, lastBillYear, wait:0,
  models:Object.fromEntries(MODELS.map((m) => [m, {score:m===winner?1:2,
    bias:0,covered:1,below:0,above:0}])) });
test("chronological selection cannot inspect current or later completed bills", () => {
  const rows = [fold(2001,2004,"recent10"),fold(2002,2005,"recent10"),fold(2003,2006,"recent10")];
  const a = chronologicalChoice(rows, 2007);
  assert.equal(a.selected, "recent10"); assert.ok(a.targetYears.every((y) => y < 2007));
  rows.push(fold(2004,2007,"fixed"), fold(2005,2008,"fixed"));
  assert.deepEqual(chronologicalChoice(rows, 2007), a);
});
test("chronological selection counts completed years once and defaults with thin evidence", () => {
  const rows = Array.from({length:20}, () => fold(2001,2004,"regime"));
  assert.equal(chronologicalChoice(rows,2007).selected,"fixed");
  assert.deepEqual(chronologicalChoice(rows,2007).targetYears,[2004]);
});
test("release gate rejects aggregate wins that lose a wait group by more than ten percent", () => {
  const a = {model:"fixed",score:1,byWait:[{wait:0,score:1},{wait:8,score:1}]};
  const b = {model:"recent10",score:0.9,byWait:[{wait:0,score:0.6},{wait:8,score:1.2}]};
  assert.equal(recommendation([a,b]),"fixed");
  b.byWait[1].score = 1.05; assert.equal(recommendation([a,b]),"recent10");
});
test("expanding funding base rate excludes outcomes unfinished at the current origin", () => {
  const rows = [{origin:2011,lastBillYear:2014,wait:0,profile:"cash",actual:1,probability:1},
    {origin:2012,lastBillYear:2015,wait:0,profile:"cash",actual:0,probability:0}];
  const s = fundingSummary(rows)[0];
  assert.equal(s.brier,0); assert.equal(s.baseBrier,0.25);
  assert.equal(s.reliability.reduce((n,b) => n+b.cases,0),2);
  assert.ok(s.reliability.some((b) => b.cases===0 && b.observed===null));
});
test("missing realized CPI is rejected rather than silently using a future or constant value", () => {
  assert.throws(() => actualBillRows(fixture(),
    [{year:2011,tuition:10000,housing:9000}],new Map(),2011), /preceding-month CPI/);
});
