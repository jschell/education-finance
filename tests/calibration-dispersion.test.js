import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
const read=p=>JSON.parse(readFileSync(p));
const hash=x=>createHash('sha256').update(x).digest('hex');
test('dispersion audit is linked to unchanged source cases and reconciles every support group',()=>{
 const {sha256,...audit}=read('data/calibration-diagnostics/dispersion.json');
 assert.equal(hash(canonical(audit)),sha256);
 assert.equal(audit.currentReportHash,read('site/data/current-calibration.json').sha256);
 for(const [path,expected] of Object.entries(audit.sourceHashes))assert.equal(hash(readFileSync(path)),expected,path);
 const baseline=read('data/calibration-cases/school-costs.json').filter(r=>r.model==='baseline');
 assert.equal(audit.summaries.length,6);
 for(const group of audit.summaries){
  const cases=baseline.filter(r=>r.kind===group.kind&&r.wait===group.wait),observed=cases.filter(r=>r.status==='observed');
  assert.equal(group.requested,cases.length);assert.equal(group.observed,observed.length);
  assert.equal(group.unavailable,cases.length-observed.length);
  assert.deepEqual(group.origins,[...new Set(observed.map(r=>r.origin))].sort());
  for(const d of group.decomposition){
   assert.ok(d.withinCellShare>=0&&d.withinCellShare<=1);
   assert.ok(Math.abs(d.mse-d.cellMeanSquared-d.withinCell)<1e-12);
  }
 }
});
