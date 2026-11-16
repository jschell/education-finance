import { repriceRow, portion } from "../site/js/engine.js";
import { quantile } from "../site/js/random.js";
import { intervalScore } from "../site/js/cost-correction.js";
export const MODELS = ["fixed", "recent10", "damped5", "regime"];
export const FACTORS = [0.55, 0.70, 0.85, 1, 1.15];
export const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
export function previousMonth(date) {
  const [y, m] = date.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
export function parseCpi(csv) {
  return new Map(csv.trim().split(/\r?\n/).slice(1).map((line) => {
    const [date, value] = line.split(","), [m, , y] = date.split("/");
    return [`${y}-${m.padStart(2, "0")}`, Number(value)];
  }));
}
export function actualBillRows(c, prices, cpi, origin) {
  const level = prices.find((p) => p.year === origin);
  if (!level) throw Error("Missing origin price");
  const initial = cpi.get(previousMonth(c.rows[0].date));
  if (!(initial > 0)) throw Error("Missing preceding-month CPI");
  return c.rows.map((row, i) => {
    const price = prices.find((p) => p.year === origin + Math.floor(i / 12));
    const index = cpi.get(previousMonth(row.date));
    if (!price || !(index > 0)) throw Error("Incomplete observed outcome");
    const factor = index / initial;
    return { ...repriceRow(row, price.tuition / level.tuition,
      price.housing / level.housing, factor, factor), discount: factor };
  });
}
// Independent invoice allocation: no production repricing helper is used here.
export function auditBills(c, rows, prices, origin, livingMonths = 9, terms = [0, 5]) {
  const expected = [];
  for (let i = 0; i < c.rows.length; i++) {
    const elapsed = i - c.enrollmentIndex, within = ((elapsed % 12) + 12) % 12;
    if (elapsed < 0 || !c.rows[i].attending) continue;
    const price = prices.find((p) => p.year === origin + Math.floor(i / 12));
    const term = terms.indexOf(within);
    const tuition = term < 0 ? 0 : portion(price.tuition, term, terms.length);
    const housing = portion(price.housing, within, livingMonths);
    expected.push({ date: c.rows[i].date, expected: tuition + housing,
      actual: rows[i].total, difference: rows[i].total - tuition - housing });
  }
  return { bills: expected.length, expected: expected.reduce((s, r) => s + r.expected, 0),
    actual: expected.reduce((s, r) => s + r.actual, 0),
    maxAbsoluteDifference: Math.max(0, ...expected.map((r) => Math.abs(r.difference))),
    totalDifference: expected.reduce((s, r) => s + r.difference, 0) };
}
export function scoreBills(values, actual) {
  const ordered = [...values].sort((a, b) => a - b);
  const p = { p10: quantile(ordered, 0.1), p50: quantile(ordered, 0.5),
    p90: quantile(ordered, 0.9) };
  return { ...p, actual, score: intervalScore(p, actual), bias: p.p50 / actual - 1,
    covered: Number(actual >= p.p10 && actual <= p.p90),
    below: Number(actual < p.p10), above: Number(actual > p.p90) };
}
export function summarizeCost(rows, model) {
  const waits = [...new Set(rows.map((r) => r.wait))];
  const metrics = ["score", "bias", "covered", "below", "above"];
  const byWait = waits.map((wait) => {
    const r = rows.filter((r) => r.wait === wait);
    const origins = [...new Set(r.map((x) => x.origin))];
    const grouped = origins.map((origin) => r.filter((x) => x.origin === origin));
    return { wait, origins: origins.length, cases: r.length,
      ...Object.fromEntries(metrics.map((k) =>
        [k, mean(grouped.map((g) => mean(g.map((x) => x.models[model][k]))))])) };
  });
  return { model, byWait,
    ...Object.fromEntries(metrics.map((k) => [k, mean(byWait.map((x) => x[k]))])) };
}
export function chronologicalChoice(rows, origin, models = MODELS) {
  const eligible = rows.filter((r) => r.lastBillYear < origin);
  const targetYears = [...new Set(eligible.map((r) => r.lastBillYear))].sort();
  if (targetYears.length < 3) return { origin, selected: "fixed", targetYears,
    reason: "Fewer than three completed target years" };
  const scores = models.map((m) => summarizeCost(eligible, m));
  let best = scores[0];
  for (const x of scores.slice(1)) if (x.score < best.score) best = x;
  return { origin, selected: best.model, targetYears,
    scores: scores.map(({ model, score }) => ({ model, score })) };
}
export function recommendation(summaries) {
  const baseline = summaries.find((x) => x.model === "fixed");
  const eligible = summaries.filter((x) => x.model !== "fixed" &&
    x.score <= baseline.score * 0.95 &&
    x.byWait.every((w) => w.score <= baseline.byWait.find((b) => b.wait === w.wait).score * 1.1));
  eligible.sort((a, b) => a.score - b.score);
  return eligible[0]?.model || "fixed";
}
export function fundingSummary(rows) {
  const out = [];
  for (const wait of [...new Set(rows.map((r) => r.wait))])
    for (const profile of [...new Set(rows.map((r) => r.profile))]) {
      const r = rows.filter((r) => r.wait === wait && r.profile === profile);
      const scored = r.map((x) => {
        const earlier = r.filter((p) => p.origin < x.origin);
        // Expanding base rate uses only outcomes completed before the forecast origin.
        const completed = earlier.filter((p) => p.lastBillYear < x.origin);
        const baseRate = completed.length ? mean(completed.map((p) => p.actual)) : 0.5;
        return { ...x, baseRate, brier: (x.probability - x.actual) ** 2,
          baseBrier: (baseRate - x.actual) ** 2 };
      });
      const brier = mean(scored.map((x) => x.brier));
      const baseBrier = mean(scored.map((x) => x.baseBrier));
      out.push({ wait, profile, cases: r.length,
        originYears: new Set(r.map((x) => x.origin)).size,
        brier, coinFlipBrier: 0.25, baseBrier,
        skill: baseBrier > 0 ? 1 - brier / baseBrier : null,
        reliability: Array.from({ length: 5 }, (_, i) => {
          const bin = scored.filter((x) => Math.min(4, Math.floor(x.probability * 5)) === i);
          return { band: [i / 5, (i + 1) / 5], cases: bin.length,
            originYears: new Set(bin.map((x) => x.origin)).size,
            predicted: mean(bin.map((x) => x.probability)),
            observed: mean(bin.map((x) => x.actual)) };
        }) });
    }
  return out;
}
