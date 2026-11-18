import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
test('REML study keeps the failed original gate, all registered worlds and explicit historical block',()=>{
 const r=read('data/calibration-diagnostics/reml-boundary-study.json'),old=read('data/calibration-diagnostics/revision-estimator-recovery.json');
 for(const [path,h]of Object.entries(r.sourceHashes))assert.equal(hash(readFileSync(path)),h,path);
 assert.deepEqual(r.originalGate,old.gate);assert.equal(r.originalGate.passed,false);assert.equal(r.originalGateUnchanged,true);assert.equal(r.historicalFittingAuthorized,false);
 assert.deepEqual(r.worlds.map(w=>w.seed),[2026111801,2026111802,2026111803,2026111804,2026111805,2026111806,2026111901,2026111902,2026111903]);
 for(const w of r.worlds){assert.equal(w.trace.effectiveTransitions,23);assert.equal(w.trace.sharedInnovations.length,24);assert.equal(w.trace.excludedFirstDraw,true);assert.deepEqual(Object.keys(w.methods).sort(),['known-drift','ml','reml']);
  for(const f of Object.values(w.methods))assert.equal(f.historicalFittingBlocked,true);
  if(w.group==='original'){const prior=old.worlds.find(x=>x.seed===w.seed&&x.scenario==='ideal').result;assert.deepEqual(w.methods.ml.parameters,prior.parameters);assert.equal(w.methods.ml.parameterSource,'immutable v1 ideal fit');}
 }
 assert.equal(r.summaries.length,6);assert.ok(r.summaries.every(s=>s.historicalFittingAuthorized===false));
});
test('nuisance profiles reoptimize other coordinates, retain selected points and do not claim confidence intervals',()=>{
 const r=read('data/calibration-diagnostics/reml-boundary-study.json');assert.equal(r.nuisanceProfiles.length,4);
 for(const row of r.nuisanceProfiles){
  const profile=row.profile;if(profile.status!=='profiled'){assert.equal(profile.status,'selected-fit-unavailable');continue;}
  assert.match(profile.kind,/nuisance-reoptimized/);assert.match(profile.kind,/not a confidence interval/);
  for(const value of [-.95,0,.4,.95])assert.ok(profile.points.some(p=>Math.abs(p.fixedValue-value)<1e-12));
  assert.ok(profile.points.some(p=>p.reusedSelectedOptimum));
  for(const p of profile.points){if(!p.fit.parameters){assert.equal(p.objectiveDelta,null);continue;}assert.ok(Math.abs(p.fit.parameters[2]-p.fixedValue)<1e-12);if(!p.reusedSelectedOptimum){assert.equal(p.fit.fixedCoordinates['2'],p.fixedValue);assert.ok(p.fit.starts.some(s=>s.standardDeviation==='warm'));}}
 }
});
