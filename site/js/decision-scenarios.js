import { compile, runPath, repriceRow } from './engine.js?v=0.13.0';
import { clone, month, resolveScenario } from './domain.js?v=0.13.0';
import { compileCalibrated, calibrationFactory } from './calibration.js?v=0.13.0';
import { referenceScenario, observations, historicalPath, blockIndices, tuitionLogMean } from './history.js?v=0.13.0';
import { quantile } from './random.js?v=0.13.0';

// Additive diagnostic methodology; economic model and saved schema are unchanged.
export const DECISION_VERSION = 'funding-decisions-1.0.0';
export const DECISION_CASES = [
  ['baseline', 'Entered attendance and support'],
  ['extra-year', 'One extra attendance year'],
  ['pause6', 'Last six pre-entry deposit months missed'],
  ['pause12', 'Last twelve pre-entry deposit months missed'],
  ['aid', 'Grants stop after first attendance year'],
  ['income', 'No income during first attendance year'],
  ['gift', 'Future gifts delayed six months'],
];
export function decisionView(plan, student, scenario, data, bundle = null) {
  return bundle ? compileCalibrated(plan, student, scenario, bundle).c
    : compile(plan, student, referenceScenario(scenario, data, student));
}
export function decisionFactory(c, data, settings, bundle = null, length = c.rows.length) {
  if (bundle) return calibrationFactory(c, bundle, settings);
  const rows = observations(data, c.history.period), center = tuitionLogMean(rows);
  const make = (trial, seed) => historicalPath(c, rows,
    blockIndices(rows, length, c.valuationMonth, c.history.blockYears, seed, trial), center);
  return { make: t => make(t, settings.seed), verify: t => make(t, settings.seed ^ 0x51ed270b) };
}
// Transform already-priced rows so a disruption never resamples the economic world.
export function applyDecision(c, id) {
  if (!DECISION_CASES.some(([key]) => key === id)) throw Error('Unknown decision case.');
  let affected = 0, deferredGifts = 0;
  const entry = c.enrollmentIndex, start = month(c.rows[0].date), gifts = new Map();
  if (id === 'gift') for (const r of c.rows) if (r.gift > 0) {
    const index = month(r.date) - start + 6;
    if (index < c.rows.length) gifts.set(index, (gifts.get(index) || 0) + r.gift);
    else deferredGifts += r.gift;
    affected++;
  }
  const rows = c.rows.map((r, i) => {
    if ((id === 'pause6' || id === 'pause12') && i >= Math.max(0, entry - (id === 'pause6' ? 6 : 12)) && i < entry && r.factor * c.monthly > 0) {
      affected++; return { ...r, factor: 0 };
    }
    if (id === 'aid' && i >= entry + 12 && r.grantOffer > 0) {
      affected++; return repriceRow({ ...r, valuationCosts: r.costs, grantOffer: 0 }, 1, 1, r.discount, 1);
    }
    if (id === 'income' && i >= Math.max(0, entry) && i < entry + 12 && r.incomeAllowance > 0) {
      affected++; return repriceRow({ ...r, valuationCosts: r.costs, incomeAllowance: 0 }, 1, 1, r.discount, 1);
    }
    return id === 'gift' ? { ...r, gift: gifts.get(i) || 0 } : r;
  });
  const always = id === 'baseline' || id === 'extra-year';
  return { compiled: { ...c, rows }, affected, deferredGifts,
    applicable: always || affected > 0,
    reason: always || affected ? null : 'No remaining matching deposits, grants, income or gifts on the entered dates.' };
}
export function summarizeDecisions(results) {
  const gaps = results.map(r => r.shortfall).sort((a,b) => a-b);
  const worst = results.reduce((a,b) => b.shortfall > a.shortfall ? b : a);
  return { probability: results.filter(r => r.success).length / results.length,
    gap: { p50: quantile(gaps,.5), p90: quantile(gaps,.9) },
    exampleFirstUnpaid: worst.firstUnpaid,
    exampleLabel: 'First unpaid bill on the largest sampled shortfall path',
    deposits: results[0].deposits };
}
export function assessDecisionScenarios(plan, student, scenario, data, settings, bundle = null) {
  const c = decisionView(plan, student, scenario, data, bundle),
    extra = clone(scenario), resolved = resolveScenario(student, scenario);
  extra.years++;
  let extended = null, extraReason = null;
  if (extra.years > 8) extraReason = 'Eight attendance years is the supported maximum.';
  else try { extended = decisionView(plan, student, extra, data, bundle); }
  catch (error) { extraReason = error.message; }
  const length = extended?.rows.length || c.rows.length,
    factory = decisionFactory(c, data, settings, bundle, length),
    extraFactory = extended ? decisionFactory(extended, data, settings, bundle, length) : null,
    trials = Math.min(settings.trials, 256),
    cases = DECISION_CASES.map(([id,label]) => ({ id, label, results: [], applicable: id === 'extra-year' ? !!extended : true, reason: id === 'extra-year' ? extraReason : null }));
  for (let t=0;t<trials;t++) {
    const base = factory.make(t), longer = extraFactory?.make(t);
    for (const item of cases) {
      if (item.id === 'extra-year' && !longer) continue;
      const path = item.id === 'extra-year' ? longer : base,
        variant = applyDecision(path.compiled, item.id);
      item.applicable &&= variant.applicable;
      item.reason ||= variant.reason;
      item.affected = variant.affected;
      item.deferredGifts = variant.deferredGifts;
      item.results.push(runPath(variant.compiled, i => path.gross[i], c.monthly, false));
    }
  }
  return { version: DECISION_VERSION, trials, seed: settings.seed,
    scope: bundle ? 'Central economic assumptions; this student before any household cap' : 'Historical replay; this student before any household cap',
    missingBudget: !Object.values(scenario.costs).some(x => x > 0),
    extraYear: { originalYears: resolved.years, alternativeYears: extended ? extra.years : null },
    cases: cases.map(({results,...item}) => ({ ...item, ...(results.length ? summarizeDecisions(results) : {}) })) };
}
// Exact pathwise opening reserve: maximum discounted cumulative deficit, no future borrowing.
export function requiredOpening(c, gross) {
  let fixed = 0, sensitivity = 1, required = 0;
  for (let i=0;i<c.rows.length;i++) {
    const row = c.rows[i], g = gross[i] * (c.stress && i === c.crashIndex ? .75 : 1);
    fixed = fixed*g + c.monthly*row.factor + row.gift - row.need;
    sensitivity *= g;
    required = Math.max(required, -fixed/sensitivity);
  }
  return Math.max(0,required);
}
// Origin-side selection only. Identical dollar reserves retain their target labels.
export function boundaryReserves(requirements, targets = [.8,.9,.95], multipliers = [.95,1,1.05]) {
  const ordered = [...requirements].sort((a,b)=>a-b), choices = new Map();
  if (!ordered.length || ordered.some(x=>!Number.isFinite(x)||x<0)) throw Error('Opening requirements must be finite and nonnegative.');
  for (const target of targets) for (const multiplier of multipliers) {
    const fitted = quantile(ordered,target), opening = Math.ceil(fitted*multiplier);
    if (!choices.has(opening)) choices.set(opening,{opening,aliases:[]});
    choices.get(opening).aliases.push({target,multiplier,fitted});
  }
  return [...choices.values()];
}
