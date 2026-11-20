// Research-only adapter for the unchanged current-production forecasting process.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { SECTORS, parseSchools, cohortAt, originBundle } from './calibration/schools.mjs';
import { schoolPlan, compileSchool } from './calibration/ledger.mjs';
import { parseCpi } from './cost-followup-helpers.mjs';
import { calibrationFactory, calibratedEconomy } from '../site/js/calibration.js';
import { fitEconomy, economyPath } from '../site/js/economy.js';
import { costDonorIndices } from '../site/js/robust-history.js';
import { costGrowth } from '../site/js/cost-trends.js';
import { repriceRow } from '../site/js/engine.js';
import { quantile, random } from '../site/js/random.js';

export const TRIALS = 512;
export const SEED = 2026112701;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function totalBill(compiled) {
  const total = compiled.rows.reduce((sum, row) => sum + row.total, 0);
  if (!Number.isFinite(total) || total <= 0) throw Error('Nonfinite/nonpositive current-process bill');
  return total;
}

function load() {
  return {
    base: JSON.parse(readFileSync('site/data/calibration-foundation.json', 'utf8')),
    table: parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString()),
    cpi: parseCpi(readFileSync('data/raw/cpi.csv', 'utf8')),
  };
}

export function productionFactors(bundle, fittedEconomy, trends, seed, trial, blockYears=3) {
  if (!bundle.economy || bundle.costCorrection || bundle.costUncertainty || bundle.costRecalibration || bundle.costHierarchy)
    throw Error('Unsupported changed current-process bundle');
  const assumptionCase = bundle.macro.cases[1];
  const macro = economyPath(bundle.economy.macroYears || bundle.economy.productionYears, fittedEconomy,
    { ...bundle.economy.initial, inflation: bundle.macro.cases[1].anchors.inflation }, assumptionCase.anchors,
    { seed, trial, blockYears, length: 12, selectionAnchors: bundle.macro.cases[1].anchors,
      equityCentering: bundle.equityCentering || 'legacy',
      conditioned: bundle.robustness ? bundle.robustness.marketPolicy === 'conditioned' : true });
  const donors = bundle.robustness ? costDonorIndices(macro, bundle.annual, seed, trial, blockYears)
                                   : macro.map(year => year.index);
  const u = random((seed ^ Math.imul(trial + 1, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0)();
  return Object.fromEntries(Object.entries(trends).map(([sector, trend]) => {
    let tuition = 1, housing = 1;
    const factors = macro.map((year, index) => {
      const raw = bundle.annual[donors[index]], result = [tuition, housing];
      const growth = costGrowth(trend, bundle.costModel,
        { ...raw.sectors[sector], inflation: raw.inflation }, index, u, year.inflation, assumptionCase.costShift);
      // Match the production factory's monthly multiplication order exactly.
      for (let month=0; month<12; month++) {
        tuition *= growth.tuition ** (1/12);
        housing *= growth.housing ** (1/12);
      }
      return result;
    });
    return [sector, factors];
  }));
}

const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
export function scheduleFor(compiled) {
  if (compiled.calibrationLiving !== 'On campus' || compiled.history.costMode !== 'historical')
    throw Error('Unsupported current-process bill contract');
  return compiled.rows.flatMap((row, month) => {
    if (Object.entries(row.valuationCosts).some(([key, value]) => !['tuition','housing'].includes(key) && value !== 0))
      throw Error('Unexpected additional bill component');
    if (!row.valuationCosts.tuition && !row.valuationCosts.housing) return [];
    return [{ year: Math.floor(month/12), tuition: row.valuationCosts.tuition, housing: row.valuationCosts.housing }];
  });
}
export function replayBill(schedule, factors) {
  let total = 0;
  for (const row of schedule) {
    const factor = factors[row.year];
    total += cents(cents(row.tuition * factor[0]) + cents(row.housing * factor[1]));
  }
  if (!Number.isFinite(total) || total <= 0) throw Error('Nonfinite/nonpositive replay bill');
  return total;
}

export function selfTest() {
  const { base, table, cpi } = load();
  const origin = 2010, sectors = Object.keys(SECTORS);
  const cohorts = Object.fromEntries(sectors.map(sector => [sector, cohortAt(table, origin, sector, cpi)]));
  const bundle = originBundle(base, origin, cohorts);
  const fitted = fitEconomy(bundle.economy.macroYears || bundle.economy.productionYears, bundle.economy.fitting);
  const trends = Object.fromEntries(sectors.map(sector => [sector, calibratedEconomy(bundle, sector).trends]));
  const anchor = { tuition: 12000, housing: 9000 };
  for (const wait of [0, 4, 8]) {
    const plan = schoolPlan(origin, wait, anchor, 'public4');
    const compiled = compileSchool(plan, bundle, { kind: 'known', unitid: cohorts.public4.known[0].unitid });
    const flat = { ...compiled, rows: compiled.rows.map(row => repriceRow(row, 1, 1, 1, 1)) };
    assert.ok(Math.abs(totalBill(flat) - 4 * (anchor.tuition + anchor.housing)) < 1e-7);
    const factory = calibrationFactory(compiled, bundle, { seed: SEED + origin });
    const a = totalBill(factory.make(0).compiled), b = totalBill(factory.make(0).compiled);
    assert.equal(a, b);
    assert.ok(a > 0 && Number.isFinite(a));
  }
  for (const sector of sectors) for (const kind of ['known', 'unknown']) {
    const school = cohorts[sector][kind][0], level = school.rows.at(-1);
    for (const wait of [0,4,8]) {
      const compiled = compileSchool(schoolPlan(origin, wait, level, sector), bundle, { kind, unitid: school.unitid });
      const factory = calibrationFactory(compiled, bundle, { seed: SEED + origin });
      for (const trial of [0,1,9]) {
        const factors = productionFactors(bundle, fitted, trends, SEED + origin, trial, compiled.history.blockYears);
        assert.equal(replayBill(scheduleFor(compiled), factors[sector]), totalBill(factory.make(trial).compiled));
      }
    }
  }
  assert.equal(totalBill({ rows: [{ total: 1.25 }, { total: 2.75 }] }), 4);
  assert.throws(() => totalBill({ rows: [{ total: Infinity }] }));
  console.log('Current-process adapter manual bill/reproducibility fixtures pass');
}

export function run({ origins = Array.from({ length: 18 }, (_, i) => 2003 + i),
                      trials = TRIALS, sample = 6 } = {}) {
  const started = performance.now();
  const { base, table, cpi } = load(), sectors = Object.keys(SECTORS), records = [];
  const audit = [];
  for (const origin of origins) {
    const cohorts = Object.fromEntries(sectors.map(sector => [sector, cohortAt(table, origin, sector, cpi, { sample })]));
    // Preserve the current process's eleven-level minimum; no early-origin patch.
    const supported = origin - 2000 + 1 >= 11;
    const bundle = supported ? originBundle(base, origin, cohorts) : null;
    const fittedEconomy = supported ? fitEconomy(bundle.economy.macroYears || bundle.economy.productionYears, bundle.economy.fitting) : null;
    const trends = supported ? Object.fromEntries(sectors.map(sector => [sector, calibratedEconomy(bundle, sector).trends])) : null;
    let factorsByTrial = null;
    for (const sector of sectors) {
      const cohort = cohorts[sector];
      audit.push({ origin, sector, counts: cohort.counts,
                   fitIds: cohort.fit.map(school => school.unitid),
                   trainingIdentityHash: hash(cohort.training.map(school => school.unitid).join(',')),
                   knownIds: cohort.known.map(school => school.unitid),
                   unknownIds: cohort.unknown.map(school => school.unitid) });
      for (const [kind, schools] of [['known', cohort.known], ['unknown', cohort.unknown]]) {
        for (const school of schools) {
          const level = school.rows.at(-1);
          for (const wait of [0, 4, 8]) {
            const identity = { origin, sector, kind, unitid: school.unitid, wait,
                               lastBillYear: origin + wait + 3, method: 'B0',
                               anchor: { tuition: level.tuition, housing: level.housing } };
            if (!supported) {
              records.push({ ...identity, status: 'unsupported-eleven-level-minimum' });
              continue;
            }
            if (identity.lastBillYear > 2023) {
              records.push({ ...identity, status: 'unreached-window' });
              continue;
            }
            const plan = schoolPlan(origin, wait, level, sector);
            const compiled = compileSchool(plan, bundle, { kind, unitid: school.unitid });
            const schedule = scheduleFor(compiled);
            if (factorsByTrial === null)
              factorsByTrial = Array.from({ length: trials }, (_, trial) =>
                productionFactors(bundle, fittedEconomy, trends, SEED + origin, trial, compiled.history.blockYears));
            const values = factorsByTrial.map(factors => replayBill(schedule, factors[sector]));
            values.sort((a, b) => a - b);
            records.push({ ...identity, status: 'available',
                           p10: quantile(values, .1), p50: quantile(values, .5), p90: quantile(values, .9),
                           bills: values });
          }
        }
      }
    }
    console.log(`Current-process origin ${origin}: ${records.length} records accumulated`);
  }
  const sourceFiles = [
    'scripts/retrospective_current_baseline.mjs', 'scripts/calibration/schools.mjs',
    'scripts/calibration/ledger.mjs', 'scripts/validation-inputs.mjs',
    'scripts/full-calibration-inputs.mjs', 'site/js/calibration.js', 'site/js/engine.js',
    'site/js/economy.js', 'site/js/cost-trends.js', 'site/js/cost-uncertainty.js',
    'site/js/robust-history.js', 'site/js/random.js',
    'site/data/calibration-foundation.json', 'data/raw/ipeds/selected.csv.gz', 'data/raw/cpi.csv',
  ];
  return { method: 'unchanged-current-production-retrospective-adapter-v1',
           trials, seed: SEED, seedRole: 'SEED + origin shared across sectors and identities',
           information: 'revised AY3 prices, assumed-known origin budget; no original-vintage claim',
           currentProcessCostModel: base.costModel,
           sourceHashes: Object.fromEntries(sourceFiles.map(path => [path, hash(readFileSync(path))])),
           origins, records, cohortAudit: audit,
           elapsedSeconds: (performance.now() - started) / 1000 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const outputIndex = process.argv.indexOf('--output');
    if (outputIndex < 0 || !process.argv[outputIndex + 1]) throw Error('Supply --output temporary.json');
    const smoke = process.argv.includes('--smoke');
    const result = run(smoke ? { origins: [2010], trials: 8, sample: 1 } : {});
    writeFileSync(process.argv[outputIndex + 1], JSON.stringify(result) + '\n');
    console.log(JSON.stringify({ output: process.argv[outputIndex + 1], records: result.records.length,
      available: result.records.filter(row => row.status === 'available').length,
      elapsedSeconds: result.elapsedSeconds, smoke }));
  }
}
