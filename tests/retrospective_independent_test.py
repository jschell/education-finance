"""Independent adversarial tests: origin isolation and model data contracts.

Synthetic fixtures contain no study outcomes. Runner/input tests below exercise
actual origin/label contracts rather than reproducing estimator arithmetic.
"""
import copy
import json
import pathlib
import sys
import subprocess
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
import retrospective_cost_models as models
import retrospective_inputs as inputs
import run_retrospective_walkforward as runner


def records():
    rows = []
    for unitid in (11, 22, 33, 44):
        for year in range(2000, 2007):
            t = year - 2000
            rows.append({'unitid': unitid, 'year': year,
                         'tuition': float((8000 + 21 * unitid) * np.exp(.025 * t + .013 * np.sin(t + unitid))),
                         'housing': float((6000 + 13 * unitid) * np.exp(.018 * t + .009 * np.cos(t + unitid))),
                         'deflator': float(100 * np.exp(.017 * t + .003 * np.sin(t)))})
    return rows


def canonical(value):
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {str(k): canonical(v) for k, v in sorted(value.items(), key=lambda item: str(item[0]))}
    if isinstance(value, (list, tuple)):
        return [canonical(v) for v in value]
    return value


class IndependentModelContracts(unittest.TestCase):
    def setUp(self):
        self.rows = records()
        self.origin = 2005

    def predict(self, fitted, candidate='C1', unitid=11):
        return models.forecast(fitted, unitid, horizon=11, trials=128,
                               seed=7341, candidate=candidate, school_key='fixed-target')

    def test_future_price_and_cpi_poison_does_not_change_forecast(self):
        past = [r for r in self.rows if r['year'] <= self.origin]
        poisoned = copy.deepcopy(self.rows)
        for row in poisoned:
            if row['year'] > self.origin:
                row.update(tuition=-999., housing=float('inf'), deflator=0.)
        poisoned.append({'unitid': 999, 'year': 2040, 'tuition': 1e200,
                         'housing': 1e250, 'deflator': -1.})
        a, b = models.fit(past, self.origin), models.fit(poisoned, self.origin)
        self.assertEqual(canonical(a), canonical(b))
        for candidate in ('B2', 'C1'):
            np.testing.assert_array_equal(self.predict(a, candidate), self.predict(b, candidate))

    def test_permuting_rows_does_not_change_fit_or_draws(self):
        permuted = copy.deepcopy(self.rows)
        np.random.default_rng(47).shuffle(permuted)
        a, b = models.fit(self.rows, self.origin), models.fit(permuted, self.origin)
        self.assertEqual(canonical(a), canonical(b))
        np.testing.assert_array_equal(self.predict(a), self.predict(b))

    def test_excluded_school_cannot_influence_sector_pool_or_noise(self):
        clean = [r for r in self.rows if r['unitid'] != 22]
        poisoned = copy.deepcopy(self.rows)
        for row in poisoned:
            if row['unitid'] == 22:
                row['tuition'] *= np.exp(.8 * (row['year'] - 2000))
                row['housing'] *= np.exp(-.5 * (row['year'] - 2000))
        a = models.fit(clean, self.origin)
        b = models.fit(poisoned, self.origin, excluded_unitids={22})
        self.assertEqual(canonical(a), canonical(b))
        np.testing.assert_array_equal(self.predict(a), self.predict(b))

    def test_calendar_history_cannot_be_inflated_by_many_schools(self):
        # Two adjacent transition years, despite eight institution transitions.
        short = [r for r in self.rows if r['year'] in (2000, 2001, 2003, 2004)]
        with self.assertRaises(ValueError):
            models.fit(short, self.origin)

    def test_gap_does_not_create_a_yearly_transition(self):
        # 2001 -> 2003 must not be treated as a third one-year increment.
        gapped = [r for r in self.rows if r['year'] in (2000, 2001, 2003, 2004)]
        with self.assertRaises(ValueError):
            models.fit(gapped, 2004)

    def test_fit_does_not_mutate_caller_records(self):
        original = copy.deepcopy(self.rows)
        models.fit(self.rows, self.origin)
        self.assertEqual(self.rows, original)

    def test_paths_are_positive_finite_reproducible_annual_increments(self):
        fitted = models.fit(self.rows, self.origin)
        for candidate in ('B2', 'C1'):
            a, b = self.predict(fitted, candidate), self.predict(fitted, candidate)
            self.assertEqual(a.shape, (128, 11, 2))
            self.assertTrue(np.isfinite(a).all())
            self.assertTrue((a > 0).all())
            np.testing.assert_array_equal(a, b)

    def test_global_numpy_rng_does_not_change_forecast(self):
        fitted = models.fit(self.rows, self.origin)
        np.random.seed(17)
        a = self.predict(fitted)
        np.random.seed(88)
        np.random.normal(size=1000)
        np.testing.assert_array_equal(a, self.predict(fitted))


class IndependentAsOfContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.table, cls.cpi = inputs.load_data()

    def test_future_prices_cpi_and_directory_metadata_cannot_select_survivors(self):
        origin = 2005
        original = inputs.context(self.table, self.cpi, origin, 'public4')
        poison = {}
        for unitid, years in self.table.items():
            poison[unitid] = {}
            for year, row in years.items():
                if year <= origin:
                    poison[unitid][year] = row
                else:
                    changed = dict(row)
                    changed.update(SECTOR='9', CHG2AY3='-9000', CHG3AY3='9999999', CHG5AY3='0')
                    poison[unitid][year] = changed
        poison[99999999] = {2040: {'SECTOR': '1', 'CHG2AY3': '1', 'CHG3AY3': '1', 'CHG5AY3': '1'}}
        cpi = {year: value if year <= origin else float('nan') for year, value in self.cpi.items()}
        cpi[2040] = float('inf')
        changed = inputs.context(poison, cpi, origin, 'public4')
        self.assertEqual(original, changed)
        a, b = models.fit(original['records'], origin), models.fit(changed['records'], origin)
        self.assertEqual(canonical(a), canonical(b))
        target = original['selection']['known_ids'][0]
        np.testing.assert_array_equal(models.forecast(a, target, 11, trials=32, seed=7521),
                                      models.forecast(b, target, 11, trials=32, seed=7521))

    def test_lagged_training_isolation_preserves_explicit_origin_anchor(self):
        origin = 2005
        selected = inputs.cohort_at(self.table, origin, 'public4')
        before = inputs.context(self.table, self.cpi, origin, 'public4', lag=1, selection=selected)
        # Origin cohort/anchors are supplied observables. Only training is lagged.
        poison = {unitid: dict(years) for unitid, years in self.table.items()}
        for unitid, years in poison.items():
            for year in list(years):
                if year >= origin:
                    years[year] = {'SECTOR': '9', 'CHG2AY3': '-1', 'CHG3AY3': '-1', 'CHG5AY3': '-1'}
        cpi = {year: value if year < origin else float('nan') for year, value in self.cpi.items()}
        after = inputs.context(poison, cpi, origin, 'public4', lag=1, selection=selected)
        self.assertEqual(before, after)
        self.assertEqual(before['training_cutoff'], 2004)
        self.assertTrue(all(r['year'] <= 2004 for r in before['records']))
        self.assertEqual(before['selection']['anchors'], selected['anchors'])

    def test_all_withheld_identities_absent_from_every_admitted_training_record(self):
        payload = inputs.context(self.table, self.cpi, 2010, 'public4')
        ids = {r['unitid'] for r in payload['records']}
        self.assertFalse(ids.intersection(payload['selection']['withheld_ids']))
        self.assertFalse(ids.intersection(payload['selection']['unknown_ids']))
        self.assertTrue(set(payload['selection']['known_ids']).issubset(ids))
        self.assertTrue(all(r['year'] <= 2010 for r in payload['records']))

    def test_lagged_earliest_origin_keeps_short_history_unavailable(self):
        payload = inputs.context(self.table, self.cpi, 2003, 'public4', lag=1)
        self.assertEqual(payload['training_cutoff'], 2002)
        with self.assertRaises(ValueError):
            models.fit(payload['records'], 2003)

    def test_input_hash_is_cutoff_and_anchor_sensitive(self):
        payload = inputs.context(self.table, self.cpi, 2005, 'public4')
        table = {u: dict(rows) for u, rows in self.table.items()}
        target = payload['selection']['known_ids'][0]
        table[target][2004] = dict(table[target][2004])
        table[target][2004]['CHG2AY3'] = str(float(table[target][2004]['CHG2AY3']) + 1)
        changed = inputs.context(table, self.cpi, 2005, 'public4')
        self.assertNotEqual(payload['input_sha256'], changed['input_sha256'])


class IndependentCurrentProcessContracts(unittest.TestCase):
    def test_future_macro_cost_price_directory_and_cpi_poison_does_not_change_B0(self):
        source = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {parseSchools,cohortAt,originBundle,SECTORS} from './scripts/calibration/schools.mjs';
import {parseCpi} from './scripts/cost-followup-helpers.mjs';
import {fitEconomy} from './site/js/economy.js';
import {calibratedEconomy} from './site/js/calibration.js';
import {productionFactors} from './scripts/retrospective_current_baseline.mjs';
const origin=2010, sectors=Object.keys(SECTORS);
const base=JSON.parse(readFileSync('site/data/calibration-foundation.json'));
const table=parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString());
const cpi=parseCpi(readFileSync('data/raw/cpi.csv','utf8'));
const badBase=structuredClone(base),badTable=structuredClone(table),badCpi=structuredClone(cpi);
for(const key of ['macroYears','productionYears'])if(badBase.economy[key])
  badBase.economy[key]=badBase.economy[key].map(r=>r.year>=origin?{year:r.year,poison:'future macro unreadable'}:r);
badBase.annual=badBase.annual.map(r=>r.year>=origin?{year:r.year,poison:'future annual unreadable'}:r);
for(const key of Object.keys(badBase.prices))
  badBase.prices[key]=badBase.prices[key].map(r=>r.year>origin?{year:r.year,tuition:NaN,housing:Infinity}:r);
for(const years of badTable.values())for(const [year,row]of years)if(year>origin)
  years.set(year,{...row,SECTOR:'9',CHG2AY3:'-1',CHG3AY3:'999999',CHG5AY3:'0'});
badTable.set(99999999,new Map([[2050,{SECTOR:'1',CHG2AY3:'1',CHG3AY3:'1',CHG5AY3:'1'}]]));
for(const key of badCpi.keys())if(Number(key.slice(0,4))>origin)badCpi.set(key,NaN);
function admitted(base,table,cpi){
 const cohorts=Object.fromEntries(sectors.map(s=>[s,cohortAt(table,origin,s,cpi)]));
 const bundle=originBundle(base,origin,cohorts);
 const fitted=fitEconomy(bundle.economy.macroYears,bundle.economy.fitting);
 const trends=Object.fromEntries(sectors.map(s=>[s,calibratedEconomy(bundle,s).trends]));
 return {cohorts, factors:productionFactors(bundle,fitted,trends,2026112701+origin,9)};
}
const a=admitted(base,table,cpi),b=admitted(badBase,badTable,badCpi);
assert.deepEqual(a.cohorts,b.cohorts);
assert.deepEqual(a.factors,b.factors);
console.log('Independent B0 full-input future-poison invariance passed');
"""
        result = subprocess.run(['node', '--input-type=module', '-e', source],
                                cwd=pathlib.Path(__file__).resolve().parents[1],
                                text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class IndependentScoringContracts(unittest.TestCase):
    def test_origin_anchor_and_annual_bills_have_hand_checked_values(self):
        annual = np.broadcast_to([2., 3.], (5, 11, 2)).copy()
        levels = runner.bill_draws(annual, [10., 20.])
        np.testing.assert_array_equal(levels[:, 0], np.broadcast_to([10., 20.], (5, 2)))
        np.testing.assert_array_equal(levels[:, 1], np.broadcast_to([20., 60.], (5, 2)))
        np.testing.assert_array_equal(levels[:, :4].sum(axis=(1, 2)), np.full(5, 950.))

    def test_interval_score_uses_known_origin_budget_not_actual(self):
        a = runner.score_bill([100., 100.], 130., [10., 20.])
        self.assertEqual(a['normalizer'], 120.)
        self.assertEqual(a['score'], 2.5)
        self.assertEqual(a['width'], 0.)
        self.assertTrue(a['above'])
        self.assertFalse(a['covered'])
        b = runner.score_bill([100., 100.], 160., [10., 20.])
        self.assertEqual(b['normalizer'], a['normalizer'])
        self.assertEqual(b['score'], 5.)

    def test_currency_unit_changes_leave_normalized_scores_unchanged(self):
        a = runner.score_bill([80., 100., 120.], 103., [10., 20.])
        b = runner.score_bill([8000., 10000., 12000.], 10300., [1000., 2000.])
        for key in ('score', 'width', 'bias'):
            self.assertAlmostEqual(a[key], b[key])
        self.assertEqual(a['covered'], b['covered'])

    @staticmethod
    def row(origin, sector, wait, score, *, models=('B2', 'C1'), status='observed'):
        return {'origin': origin, 'sector': sector, 'kind': 'known', 'wait': wait,
                'outcome': {'status': status},
                'scores': {m: {'score': score, 'covered': True} for m in models}}

    def test_nested_equal_weighting_does_not_reweight_by_school_count(self):
        rows = [self.row(2005, 'A', 0, 1.) for _ in range(5)]
        rows += [self.row(2005, 'B', 0, 5.), self.row(2006, 'A', 0, 1.),
                 self.row(2005, 'A', 4, 9.)]
        # wait0: mean(origin2005 mean(sectorA=1,sectorB=5)=3,origin2006=1)=2.
        # wait4: 9. Equal-wait primary aggregate=(2+9)/2=5.5.
        self.assertEqual(runner.equal_mean(rows, 'B2', 'score'), 5.5)

    def test_matched_case_selection_keeps_missing_and_unsupported_out(self):
        available = self.row(2005, 'A', 0, 1.)
        unavailable = self.row(2006, 'A', 0, 999., models=('B2',))
        missing = self.row(2007, 'A', 0, 999., status='missing-school-row')
        rows = [available, unavailable, missing]
        matched = runner.matched(rows, ('B2', 'C1'))
        self.assertEqual(matched, [available])
        self.assertEqual(len(rows), 3)  # Original denominator is not mutated.
        self.assertEqual(runner.equal_mean(matched, 'B2', 'score'), 1.)
        self.assertEqual(runner.equal_mean(matched, 'C1', 'score'), 1.)

    def test_nonfinite_prediction_and_cumulative_overflow_rejected(self):
        for values in ([1., float('nan')], [1., float('inf')], []):
            with self.assertRaises(ValueError):
                runner.score_bill(values, 100., [10., 20.])
        with np.errstate(over='ignore'):
            with self.assertRaises(ValueError):
                runner.bill_draws(np.full((3, 11, 2), 1e100), [10., 20.])


if __name__ == '__main__':
    unittest.main()
