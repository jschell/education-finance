import { fitCostTrends, costGrowth } from "../site/js/cost-trends.js";
import { annualIndices } from "../site/js/calibration.js";
import { random, quantile } from "../site/js/random.js";
import { curveFactors, fitResidualCurve } from "../site/js/cost-recalibration.js";
import { mean, summarizeCost } from "./cost-followup-helpers.mjs";
export const CANDIDATES = ["production","fixed","recent10","damped5","regime"];
export function residualBundle(records, origin, model, sectors) {
  return { origin, model, sectors:Object.fromEntries(sectors.map((sector) =>
    [sector,fitResidualCurve(records,{origin,model,sector})])) };
}
export function chooseNested(rows, origin) {
  const earlier = rows.filter((r) => r.lastBillYear < origin);
  const targetYears = [...new Set(earlier.map((r) => r.lastBillYear))].sort();
  if (targetYears.length < 3) return {origin,selected:"production",targetYears,scores:[]};
  const scores = CANDIDATES.map((model) => ({model,score:summarizeCost(earlier,model).score}));
  const best = scores.reduce((a,b) => b.score < a.score ? b : a);
  return {origin,selected:best.model,targetYears,scores};
}
export function promotionGate(production, policy) {
  const checks = {
    score:policy.score <= production.score * 0.95,
    waitScores:policy.byWait.every((x) => x.score <= production.byWait.find((b) => b.wait === x.wait).score * 1.1),
    coverage:Math.abs(policy.covered - 0.8) < Math.abs(production.covered - 0.8),
    bias:policy.byWait.every((x) => Math.abs(x.bias) <= Math.abs(production.byWait.find((b) => b.wait === x.wait).bias) + 0.02)
  };
  return {passed:Object.values(checks).every(Boolean),checks};
}
export function reliabilityNearTargets(rows) {
  return [[0.8,0.85],[0.85,0.9],[0.9,0.95],[0.95,1]].map(([low,high]) => {
    const bin = rows.filter((r) => r.probability >= low &&
      (high === 1 ? r.probability <= high : r.probability < high));
    return {low,high,cases:bin.length,origins:new Set(bin.map((r) => r.origin)).size,
      predicted:mean(bin.map((r) => r.probability)),observed:mean(bin.map((r) => r.actual))};
  });
}
export function rawSequences(training, model, length, trials, seed) {
  const fit = fitCostTrends(training);
  const pi = mean(fit.changes.map((r) => Math.log(r.inflation)));
  return Array.from({length:trials},(_,trial) => {
    const indices = annualIndices(fit.changes.length,length,3,seed,trial);
    const u = random((seed ^ Math.imul(trial + 1,0x85ebca6b)) >>> 0)();
    const out = [{tuition:1,housing:1}];
    for (const [year,index] of indices.entries()) {
      const r = fit.changes[index];
      const g = costGrowth(fit,model,r,year,u,r.inflation * Math.exp(fit.inflation - pi));
      const last = out.at(-1);
      out.push({tuition:last.tuition*g.tuition,housing:last.housing*g.housing});
    }
    return out;
  });
}
export function priceResiduals(prices, {trials=128,seed=850213} = {}) {
  const records = [];
  for (const [sector,levels] of Object.entries(prices))
    for (let at=10;at<levels.length;at++)
      for (const horizon of [2,5,10]) {
        if (at+horizon >= levels.length) continue;
        for (const model of CANDIDATES.slice(1)) {
          const paths = rawSequences(levels.slice(0,at+1),model,horizon,trials,seed);
          const origin = levels[at], actual = levels[at+horizon];
          const med = (key) => quantile(paths.map((p) => p[horizon][key]).sort((a,b) => a-b),0.5)*origin[key];
          records.push({model,sector,origin:origin.year,target:actual.year,horizon,
            tuition:Math.log(actual.tuition/med("tuition")),
            housing:Math.log(actual.housing/med("housing"))});
        }
      }
  return records;
}
export function costOnlyBills(levels, origin, wait, model, records, trials=400, seed=850213) {
  const at = levels.findIndex((r) => r.year === origin);
  const raw = rawSequences(levels.slice(0,at+1),model,wait+3,trials,seed);
  const fit = fitResidualCurve(records,{origin,model,sector:records[0]?.sector});
  const level = levels[at];
  return raw.map((path,trial) => {
    let total = 0;
    for(let year=wait;year<wait+4;year++) {
      const adjustment = curveFactors(fit,year,seed,trial);
      total += level.tuition*path[year].tuition*adjustment.tuition +
        level.housing*path[year].housing*adjustment.housing;
    }
    return total;
  });
}
