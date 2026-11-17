import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blockEquityMeans, blockWeights, fitEconomy, economyPath } from '../site/js/economy.js';
import { eligibleGate } from '../scripts/overhaul-gate.mjs';
const read=p=>JSON.parse(readFileSync(p));
const b=read('site/data/calibration-foundation.json');
const years=b.economy.macroYears,fit=fitEconomy(years,b.economy.fitting);
test('analytic conditional equity centering enforces each block-offset arithmetic anchor',()=>{
 for(const block of [1,3,5])for(const conditioned of [false,true])for(const state of [[.02,.03,.01],[.08,.12,.1]]){
  const weights=conditioned?blockWeights(years,state,fit.scales,block):Array(years.length-block+1).fill(1);
  const means=blockEquityMeans(years,weights,block),total=weights.reduce((a,b)=>a+b,0);
  for(const c of b.macro.cases)for(let k=0;k<block;k++){
   const expected=weights.reduce((v,w,j)=>v+w*Math.exp(years[j+k].stockLog)*(1+c.anchors.stocks)/means[k],0)/total;
   assert.ok(Math.abs(expected-1-c.anchors.stocks)<1e-12);
  }
 }
});
test('corrected process preserves source choices, common prefixes, cases and positive gross returns',()=>{
 const initial={...b.economy.initial,inflation:.025}, anchors=b.macro.cases[1].anchors;
 for(const blockYears of [1,3,5])for(const uncertainty of [false,true])for(const conditioned of [false,true]){
  const options={seed:18371,trial:18,blockYears,length:12,uncertainty,conditioned,selectionAnchors:anchors};
  const old=economyPath(years,fit,initial,anchors,options);
  const next=economyPath(years,fit,initial,anchors,{...options,equityCentering:b.equityCentering});
  assert.deepEqual(next.map(x=>x.index),old.map(x=>x.index));
  assert.deepEqual(next.slice(0,4),economyPath(years,fit,initial,anchors,{...options,length:4,equityCentering:b.equityCentering}));
  assert.ok(next.every(r=>r.months.every(m=>m.every(r=>r>-1))));
  const other=economyPath(years,fit,initial,b.macro.cases[0].anchors,{...options,equityCentering:b.equityCentering});
  assert.deepEqual(next.map(x=>x.index),other.map(x=>x.index));
 }
});
test('market year 2000 carries 2000 to 2001 college prices, using August CPI',()=>{
 assert.equal(b.annual[0].year,2000);assert.equal(b.annual.at(-1).year,2022);
 for(const r of b.annual)for(const [sector,p] of Object.entries(b.prices)){
  const a=p.find(x=>x.year===r.year),z=p.find(x=>x.year===r.year+1);
  assert.equal(r.sectors[sector].tuition,z.tuition/a.tuition);
  assert.ok(Math.abs(r.inflation-z.deflator/a.deflator)<1e-12);
 }
 assert.equal(b.costCorrection,null);
});
test('old release gate is oracle-infeasible; missing horizons cannot be mistaken for failure or promotion',()=>{
 const report=read('site/data/full-calibration.json');
 const rows=report.outer.map(r=>({...r,models:{...r.models,policy:r.models.production}}));
 const gate=eligibleGate(rows,report.selection);
 assert.equal(gate.preflight.feasible,false);
 assert.ok(Math.abs(gate.preflight.maxImprovement-.033087346)<1e-7);
 assert.equal(gate.status,'insufficient-evidence');assert.equal(gate.promoted,false);
 assert.deepEqual(gate.comparisons.filter(r=>r.status==='insufficient-evidence').map(r=>r.wait),[4,8]);
});
