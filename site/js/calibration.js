import { fitCostTrends, costGrowth, realTrend } from "./cost-trends.js?v=0.7.0";
import { clone, resolveScenario } from "./domain.js?v=0.7.0";
import { compile, runPath, repriceRow } from "./engine.js?v=0.7.0";
import { simulateHistorical } from "./history.js?v=0.7.0";
import { PROFILES } from "./history-config.js?v=0.7.0";
import { allocationAt } from "./planning.js?v=0.7.0";
import { random, quantile } from "./simulation.js?v=0.7.0";
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const q = (xs, p) =>
  quantile(
    [...xs].sort((a, b) => a - b),
    p,
  );
export function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "number")
    return (Object.is(value, -0) ? 0 : value).toFixed(10);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export async function verifyCalibration(bundle, history) {
  const { sha256, ...body } = bundle;
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical(body)),
  );
  const hash = [...new Uint8Array(bytes)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  if (
    sha256 !== hash ||
    bundle.historyHash !== history.observationsSha256 ||
    bundle.annual.length !== (bundle.panel ? 23 : 24) ||
    bundle.macro.cases.length !== 3
  )
    throw Error(
      "Economic calibration snapshot mismatch. Reload before calculating.",
    );
  return bundle;
}
export const sectorFor = (s) =>
  /Community/.test(s.path)
    ? /out-of-state/.test(s.path)
      ? "public2out"
      : "public2"
    : /private|Private/.test(s.path)
      ? "private4"
      : /out-of-state/.test(s.path)
        ? "public4out"
        : "public4";
export function costFit(prices) {
  if (prices.length < 11)
    throw Error("At least 11 annual price levels are required.");
  const changes = prices.slice(1).map((p, i) => ({
    inflation: p.deflator / prices[i].deflator,
    tuition: p.tuition / prices[i].tuition,
    housing: p.housing / prices[i].housing,
  }));
  const fit = { changes };
  for (const key of ["tuition", "housing"]) {
    const logs = changes.map((c) => Math.log(c[key] / c.inflation));
    const windows = Array.from({ length: logs.length - 9 }, (_, i) =>
      mean(logs.slice(i, i + 10)),
    );
    fit[key] = {
      center: mean(logs.slice(-10)),
      historical: mean(logs),
      deviations: windows.map((x) => x - mean(windows)),
      shift: (q(windows, 0.75) - q(windows, 0.25)) / 2,
    };
  }
  fit.inflation = mean(changes.slice(-10).map((c) => Math.log(c.inflation)));
  return fit;
}
export function annualIndices(count, length, blockYears, seed, trial) {
  if (![1, 3, 5].includes(blockYears) || count < blockYears)
    throw Error("Unsupported annual block length.");
  const rand = random((seed ^ Math.imul(trial + 1, 0x9e3779b9)) >>> 0),
    indices = [];
  while (indices.length < length) {
    const start = Math.floor(rand() * (count - blockYears + 1));
    for (let j = 0; j < blockYears && indices.length < length; j++)
      indices.push(start + j);
  }
  return indices;
}
export function calibratedEconomy(
  bundle,
  sector,
  assumptionCase = bundle.macro.cases[1],
) {
  if (!bundle.prices[sector]) sector = sector.replace("out", "");
  // Fit on the same common years in all sectors so joint drift draws remain aligned.
  const first = bundle.annual[0].year - 1;
  const fit = costFit(bundle.prices[sector].filter((p) => p.year >= first));
  const trends = bundle.panel ? fitCostTrends(bundle.prices[sector]) : null;
  const anchors = assumptionCase.anchors;
  const annualMeans = [0, 1, 2].map((k) =>
    mean(
      bundle.annual.map((r) => r.months.reduce((v, m) => v * (1 + m[k]), 1)),
    ),
  );
  const adjustment = [anchors.stocks, anchors.bonds, anchors.cash].map(
    (r, k) => ((1 + r) / annualMeans[k]) ** (1 / 12),
  );
  const inflationShift =
    (1 + anchors.inflation) / mean(bundle.annual.map((r) => r.inflation));
  const costCenter = {};
  for (const k of ["tuition", "housing"])
    costCenter[k] = mean(
      bundle.annual.map((r) => Math.log(r.sectors[sector][k] / r.inflation)),
    );
  const drift = (key, u = 0.5) => {
    const f = fit[key],
      i = Math.min(
        f.deviations.length - 1,
        Math.floor(u * f.deviations.length),
      );
    return f.center + f.deviations[i] + assumptionCase.costShift * f.shift;
  };
  const adjustedMonths = bundle.annual.map((r) =>
    r.months.map((m) => m.map((x, k) => (1 + x) * adjustment[k] - 1)),
  );
  const transform = (index, u = 0.5, includeDrift = true, year = 0) => {
    const r = bundle.annual[index],
      inflation = r.inflation * inflationShift;
    const costs = {};
    if (!trends)
      for (const key of ["tuition", "housing"]) {
        const target = includeDrift
          ? drift(key, u)
          : fit[key].center + assumptionCase.costShift * fit[key].shift;
        costs[key] =
          (r.sectors[sector][key] / r.inflation) *
          Math.exp(target - costCenter[key]) *
          inflation;
      }
    if (trends) {
      Object.assign(
        costs,
        costGrowth(
          trends,
          bundle.costModel,
          r.sectors[sector]
            ? { ...r.sectors[sector], inflation: r.inflation }
            : r,
          year,
          u,
          inflation,
          assumptionCase.costShift,
        ),
      );
      delete costs.inflation;
    }
    return {
      months: adjustedMonths[index],
      inflation,
      ...costs,
    };
  };
  return { fit, trends, adjustment, transform, anchors, assumptionCase };
}
export function calibrationReference(
  scenario,
  student,
  bundle,
  assumptionCase = bundle.macro.cases[1],
) {
  const s = resolveScenario(student, scenario),
    economy = calibratedEconomy(bundle, sectorFor(s), assumptionCase);
  const observations = bundle.annual.flatMap(
    (_, i) => economy.transform(i, 0.5, false).months,
  );
  const rate = (weights) =>
    Math.expm1(
      mean(
        observations.map((m) =>
          Math.log(
            (1 + m.reduce((v, r, k) => v + r * weights[k], 0)) *
              (1 - s.history.fee) ** (1 / 12),
          ),
        ),
      ) * 12,
    );
  if (s.history.reference !== "manual") {
    const rates = PROFILES[s.history.profile].stages.map(rate);
    [
      s.assumptions.returnRate,
      s.assumptions.lateReturn,
      s.assumptions.attendanceReturn,
    ] = rates;
    for (const a of s.history.allocations)
      a.referenceRate = rate([a.stocks, a.bonds, a.cash]);
  }
  if (s.history.costMode === "historical") {
    s.assumptions.inflation = economy.anchors.inflation;
    s.assumptions.otherGrowth = economy.anchors.inflation;
    s.assumptions.tuitionGrowth = Math.expm1(
      economy.fit.tuition.center +
        assumptionCase.costShift * economy.fit.tuition.shift +
        Math.log1p(economy.anchors.inflation),
    );
    s.assumptions.livingGrowth =
      s.living === "On campus"
        ? Math.expm1(
            economy.fit.housing.center +
              assumptionCase.costShift * economy.fit.housing.shift +
              Math.log1p(economy.anchors.inflation),
          )
        : economy.anchors.inflation;
  }
  if (bundle.panel && s.history.costMode === "historical") {
    // Fixed-rate reference is the model's initial trend, without residual shocks.
    const tr = economy.trends;
    if (bundle.costModel === "fixed") {
      const source = {
        inflation: Math.exp(tr.inflation),
        tuition: Math.exp(tr.tuition.nominal),
        housing: Math.exp(tr.housing.nominal),
      };
      const g = costGrowth(
        tr,
        "fixed",
        source,
        0,
        0.5,
        1 + economy.anchors.inflation,
        assumptionCase.costShift,
      );
      s.assumptions.tuitionGrowth = g.tuition - 1;
      s.assumptions.livingGrowth =
        s.living === "On campus" ? g.housing - 1 : economy.anchors.inflation;
    } else {
      s.assumptions.tuitionGrowth = Math.expm1(
        realTrend(
          tr,
          "tuition",
          bundle.costModel,
          0,
          0.5,
          assumptionCase.costShift,
        ) + Math.log1p(economy.anchors.inflation),
      );
      s.assumptions.livingGrowth =
        s.living === "On campus"
          ? Math.expm1(
              realTrend(
                tr,
                "housing",
                bundle.costModel,
                0,
                0.5,
                assumptionCase.costShift,
              ) + Math.log1p(economy.anchors.inflation),
            )
          : economy.anchors.inflation;
    }
  }
  s.assumptionsDate = bundle.asOf.slice(0, 7);
  return s;
}
export function calibrationFactory(
  c,
  bundle,
  settings,
  assumptionCase = bundle.macro.cases[1],
) {
  // compile exposes no education path: callers supply sector/living on the calculation view.
  const e = calibratedEconomy(
    bundle,
    c.calibrationSector || sectorFor(c),
    assumptionCase,
  );
  const make = (trial, seed = settings.seed) => {
    const indices = annualIndices(
      bundle.annual.length,
      Math.ceil(c.rows.length / 12),
      c.history.blockYears,
      seed,
      trial,
    );
    const u = random(
      (seed ^ Math.imul(trial + 1, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0,
    )();
    const years = indices.map((i, year) => e.transform(i, u, true, year));
    const gross = new Float64Array(c.rows.length),
      rows = [];
    let tuition = 1,
      housing = 1,
      inflation = 1,
      academicTuition = 1,
      academicHousing = 1;
    for (let i = 0; i < c.rows.length; i++) {
      const y = years[Math.floor(i / 12)],
        m = y.months[i % 12],
        a = allocationAt(c.rows[i].date, c.history.allocations);
      const stage =
        i >= c.enrollmentIndex
          ? 2
          : i >= c.enrollmentIndex - c.a.transitionYears * 12
            ? 1
            : 0;
      const weights = a
        ? [a.stocks, a.bonds, a.cash]
        : PROFILES[c.history.profile].stages[stage];
      gross[i] =
        (1 + m.reduce((v, r, k) => v + r * weights[k], 0)) *
        (1 - c.history.fee) ** (1 / 12);
      if (
        i === 0 ||
        (i >= c.enrollmentIndex && (i - c.enrollmentIndex) % 12 === 0)
      ) {
        academicTuition = tuition;
        academicHousing = housing;
      }
      const row =
        c.history.costMode === "fixed"
          ? { ...c.rows[i], discount: inflation }
          : repriceRow(
              c.rows[i],
              academicTuition,
              c.calibrationLiving === "On campus" ? academicHousing : inflation,
              inflation,
              inflation,
            );
      // Real dollars use the simulated deflator even in months without bills.
      rows.push({ ...row, discount: inflation });
      tuition *= y.tuition ** (1 / 12);
      housing *= y.housing ** (1 / 12);
      inflation *= y.inflation ** (1 / 12);
    }
    return { compiled: { ...c, rows }, gross };
  };
  return {
    make: (t) => make(t),
    verify: (t) => make(t, settings.seed ^ 0x51ed270b),
    metadata: {
      method: "Forward-anchored joint annual-block simulation",
      period: assumptionCase.name,
      assumptionsVersion: bundle.id,
      calibrationCase: assumptionCase.id,
      calibrationHash: bundle.sha256,
      costModel: bundle.costModel || "recent10",
    },
  };
}
export function compileCalibrated(
  plan,
  student,
  scenario,
  bundle,
  assumptionCase,
) {
  const reference = calibrationReference(
    scenario,
    student,
    bundle,
    assumptionCase,
  );
  const c = compile(plan, student, reference);
  c.calibrationSector = sectorFor(reference);
  c.calibrationLiving = reference.living;
  return { c, reference };
}
export function assessCalibrated(
  plan,
  student,
  scenario,
  data,
  bundle,
  validation,
  settings,
  progress = () => {},
) {
  const cases = [];
  let central;
  for (const assumptionCase of bundle.macro.cases) {
    const { c, reference } = compileCalibrated(
      plan,
      student,
      scenario,
      bundle,
      assumptionCase,
    );
    const sim = simulateHistorical(
      c,
      data,
      settings,
      (p) => progress({ ...p, stage: assumptionCase.name + " · " + p.stage }),
      assumptionCase.id === bundle.macro.cases[1].id,
      calibrationFactory(c, bundle, settings, assumptionCase),
    );
    cases.push({
      id: assumptionCase.id,
      name: assumptionCase.name,
      anchors: assumptionCase.anchors,
      probability: sim.probability,
      gap: sim.gap,
      costRange: sim.costRange,
    });
    if (assumptionCase.id === bundle.macro.cases[1].id)
      central = {
        simulation: sim,
        referenceScenario: reference,
        deterministic: runPath(c),
      };
  }
  return {
    ...central,
    snapshot: resolveScenario(student, scenario),
    calibration: {
      id: bundle.id,
      hash: bundle.sha256,
      asOf: bundle.asOf,
      source: bundle.source,
      macro: bundle.macro,
      sector: sectorFor(scenario),
      cases,
      notes: bundle.notes,
      panel: bundle.panel,
      costModel: bundle.costModel,
      validation,
    },
    dataset: { id: bundle.id, hash: bundle.sha256, asOf: bundle.asOf },
  };
}
