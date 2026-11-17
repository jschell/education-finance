import { readFileSync } from "node:fs";
import { newPlan, validatePlan } from "../site/js/domain.js";
import { PROFILES } from "../site/js/history-config.js";
import { treasuryGross, billGross } from "../site/js/economy.js";
import { fitCostCorrection } from "../site/js/cost-correction.js";
const base = JSON.parse(readFileSync("site/data/calibration-reviewed.json","utf8"));
const panel = JSON.parse(readFileSync("site/data/ipeds-panel.json","utf8"));
const sectors = { public4:"Public in-state", public4out:"Public out-of-state", public2:"Community in-state",
  public2out:"Community out-of-state", private4:"Private nonprofit" };
export function planFor(origin, wait, level, sector, profile = "balanced") {
  const p = newPlan(), st = p.students[0], sc = st.scenarios[0];
  p.valuation = `${origin}-09`;
  st.enrollment = `${origin + wait}-09`;
  Object.assign(st.funding, { balance: 0, monthly: wait ? (level.tuition + level.housing) * 0.01 : 0,
    contributionStart: p.valuation, contributionEnd: wait ? `${origin + wait}-08` : p.valuation,
    assumptionsDate: p.valuation, grant: level.tuition * 0.1, grantYears: 4 });
  st.funding.history.profile = profile;
  Object.assign(sc, { baseline: p.valuation, path: sectors[sector], sourceDate: p.valuation,
    costs: { tuition: level.tuition, housing: level.housing, books: 0, transport: 0, other: 0 } });
  validatePlan(p);
  return { p, st, sc };
}
export function correctionAt(origin) {
  if (!base.costCorrection) return null;
  let raw;
  try { raw = fitCostCorrection(panel, { cutoff: origin }); } catch { return null; }
  const n = new Set(raw.folds.map((f) => f.target)).size;
  if (n < 3) return null;
  return { ...raw, uniqueTargetYears: n, shrinkage: n / (n + 10),
    folds: raw.folds.map((f) => ({ ...f, series: Object.fromEntries(
      Object.entries(f.series).map(([s, d]) => [s, {
        tuition: d.tuition * n / (n + 10), housing: d.housing * n / (n + 10) }])) })) };
}
export function observedGross(c, origin) {
  return Float64Array.from(c.rows, (_, i) => {
    const y = base.economy.macroYears.find((y) => y.year === origin + Math.floor(i / 12));
    if (!y) throw Error("Incomplete observed macro year");
    const m = i % 12;
    const stage = i >= c.enrollmentIndex ? 2 :
      i >= c.enrollmentIndex - c.a.transitionYears * 12 ? 1 : 0;
    const w = PROFILES[c.history.profile].stages[stage];
    return (1 + w[0] * y.months[m][0] +
      w[1] * (treasuryGross(y.rates[m][0], y.rates[m][1]) - 1) +
      w[2] * (billGross(y.rates[m][2]) - 1)) * (1 - c.history.fee) ** (1 / 12);
  });
}
