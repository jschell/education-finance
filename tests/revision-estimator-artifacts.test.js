import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
import {identityHash} from '../scripts/calibration/schools.mjs';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
test('matched graph audit pins source bytes, preserves withheld separation and equal transition support',()=>{
 const r=read('data/calibration-diagnostics/observation-graph-support.json'),{sha256,...body}=r;
 assert.equal(hash(canonical(body)),sha256);for(const [p,h]of Object.entries(r.sourceHashes))assert.equal(hash(readFileSync(p)),h,p);
 assert.equal(r.historicalFits,0);assert.equal(r.groups.length,15);assert.match(r.availability,/not an actual vintage backtest/);
 for(const g of r.groups){assert.ok(g.cohort.fitIds.every(id=>identityHash(id)%5!==0));assert.ok(g.cohort.withheldIds.every(id=>identityHash(id)%5===0));assert.equal(g.graphs.stitched.edges,g.graphs.coherent.edges);assert.deepEqual(g.graphs.stitched.academicTransitions,g.graphs.coherent.academicTransitions);assert.ok(g.graphs.coherent.collectionYears.every(y=>y<Number(g.origin.slice(0,4))));}
});
test('registered recovery retains every seed/failure and cannot authorize historical fitting',()=>{
 const r=read('data/calibration-diagnostics/revision-estimator-recovery.json');
 for(const [p,h]of Object.entries(r.sourceHashes))assert.equal(hash(readFileSync(p)),h,p);
 assert.equal(r.historicalFittingAuthorized,false);assert.equal(r.worlds.length,12);assert.equal(r.gate.passed,Object.values(r.gate.checks).every(Boolean));
 for(const scenario of ['ideal','shared-reporting-bias'])assert.deepEqual(r.worlds.filter(w=>w.scenario===scenario).map(w=>w.seed),Array.from({length:6},(_,i)=>2026111801+i));
 for(const w of r.worlds){
  const f=w.result;assert.equal(f.historicalFittingBlocked,true);assert.equal(f.starts.length,6);assert.ok(f.starts.slice(0,2).every(s=>s.status==='singular-start'));
  if(!f.parameters){assert.equal(f.status,'nonconverged');continue;}
  assert.equal(f.parameters.length,12);assert.ok(f.starts.some(s=>s.status==='converged'));
  for(const [i,name]of ['shared','permanent','temporary','measurement'].entries()){
   const [s,t,p]=f.parameters.slice(3*i,3*i+3),q=f.covariances[name];assert.ok(Math.abs(q[0][0]-s*s)<1e-12);assert.ok(Math.abs(q[1][1]-t*t)<1e-12);assert.ok(Math.abs(q[0][1]-p*s*t)<1e-12);
  }
 }
});
