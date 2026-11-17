import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
import {boundaryReserves,DECISION_VERSION} from '../site/js/decision-scenarios.js';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
test('boundary selector keeps zero/tied-resource aliases and does not mutate fitting requirements',()=>{
 const requirements=[100,0,50,100],before=[...requirements],choices=boundaryReserves(requirements);
 assert.deepEqual(requirements,before);assert.equal(choices.reduce((v,r)=>v+r.aliases.length,0),9);
 const degenerate=boundaryReserves([0,0,0]);assert.equal(degenerate.length,1);assert.equal(degenerate[0].opening,0);assert.equal(degenerate[0].aliases.length,9);
 assert.throws(()=>boundaryReserves([Infinity]));assert.throws(()=>boundaryReserves([]));
});
test('decision evidence identities reconcile and original evidence remains separate',()=>{
 const report=read('site/data/decision-validation.json'),{sha256,...body}=report;
 assert.equal(hash(canonical(body)),sha256);assert.equal(report.method,DECISION_VERSION);
 assert.equal(report.bundleHash,read('site/data/calibration-foundation.json').sha256);
 for(const [path,expected] of Object.entries(report.sourceHashes))assert.equal(hash(readFileSync(path)),expected,path);
 const individual=read('data/decision-cases/individual.json'),household=read('data/decision-cases/household.json'),selection=read('data/decision-cases/selection.json');
 assert.equal(report.individual.cases,individual.length);assert.equal(report.individual.observed,individual.filter(r=>r.status==='observed').length);
 assert.equal(report.selection.schoolIdentities,new Set(individual.map(r=>r.unitid)).size);assert.equal(report.selection.cells,selection.length);assert.ok(individual.every(r=>(r.status==='observed')===(r.actual!==null)));
 assert.ok(household.every(r=>r.bindingMonths>0&&r.peak<=r.cap+1e-7));
 assert.ok(household.filter(r=>r.wait===8).every(r=>r.actual===null&&r.status==='unreached-window'));
 assert.equal(report.trials,512);assert.equal(report.fitTrials,512);
 for(const cell of selection){assert.ok(cell.macroLast<cell.origin);assert.equal(cell.costLast,cell.origin);
  const cases=(cell.kind==='household'?household:individual).filter(r=>r.origin===cell.origin&&r.wait===cell.wait&&r.sector===cell.sector&&r.profile===cell.profile&&r.kind===cell.kind);
  assert.deepEqual([...new Set(cases.map(r=>r.opening))].sort((a,b)=>a-b),cell.choices.map(r=>r.opening).sort((a,b)=>a-b));
 }
 for(const fixed of household.filter(r=>r.policy==='fixed')){
  const priority=household.find(r=>r.origin===fixed.origin&&r.wait===fixed.wait&&r.opening===fixed.opening&&r.policy==='dated-priority');
  assert.ok(priority);assert.equal(priority.totalDeposits,fixed.totalDeposits);assert.equal(priority.peak,fixed.peak);assert.equal(priority.status,fixed.status);
 }
 assert.ok(read('data/calibration-cases/individual-funding.json').length>individual.length);
});
