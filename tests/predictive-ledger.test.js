import test from 'node:test';
import assert from 'node:assert/strict';
import {cashTemplate,cashPath,evaluateCashPaths} from '../scripts/predictive-ledger.mjs';
import {runPath,requiredContribution} from '../site/js/engine.js';
test('predictive cash laboratory preserves full bills, waits and ledger deposits',()=>{
 const flat=Array.from({length:14},()=>[0,0]),results=evaluateCashPaths([[flat,flat]])[0];
 for(const group of results){
  for(const r of group.individual){assert.ok(Math.abs(r.total-72000)<1e-7);assert.equal(r.depositMonths,12*group.wait);}
  const c=cashPath(flat,group.wait,0,.9),n=requiredContribution(c,()=>1);
  if(group.wait){assert.ok(Math.abs(n-7200/(12*group.wait))<1e-9);assert.equal(runPath(c,()=>1,n,false).success,true);assert.equal(runPath(c,()=>1,n-.01,false).success,false);}
  else assert.equal(n,Infinity);
  assert.ok(group.household.peak<=146.25);if(group.wait)assert.equal(group.household.bindingMonths,12*group.wait);
 }
 assert.ok(Math.abs(results[0].individual[0].unpaid-7200)<1e-7);assert.equal(results[0].individual[1].unpaid,0);
});
test('joint path bridge keeps school costs separate and does not mutate input',()=>{
 const flat=Array.from({length:14},()=>[0,0]),double=flat.map(()=>[Math.log(2),Math.log(2)]),pair=[flat,double],saved=structuredClone(pair);
 const r=evaluateCashPaths([pair])[0];assert.ok(Math.abs(r[1].individual[1].total-72000)<1e-7);assert.ok(r[1].household.unpaid>0);assert.deepEqual(pair,saved);
 assert.equal(cashTemplate(4).opening,72000);assert.throws(()=>evaluateCashPaths([[[[NaN,0]],flat]]));
});
