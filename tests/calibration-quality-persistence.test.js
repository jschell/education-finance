import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {classifyFlag,qualityAllowed,levelQuality,caseSensitivity,pairedStatistics,completeWindow,annualSector} from '../scripts/calibration/quality-persistence.mjs';
import {identityHash} from '../scripts/calibration/schools.mjs';
import {canonical} from '../site/js/calibration.js';
import {random} from '../site/js/random.js';
function fixture(effects=true){
 const table=new Map(),cpi=new Map(),dictionaries={};
 for(let year=2000;year<=2020;year++){
  cpi.set(`${year}-08`,100*Math.exp(.02*(year-2000)));
  dictionaries[year]={fields:Object.fromEntries(['CHG2AY3','CHG3AY3','CHG5AY3'].map(f=>[f,{codes:{R:'Reported',C:'Analyst corrected reported value',P:'Imputed using Carry Forward procedure'}}]))};
  for(let id=100;id<130;id++){
   if(!table.has(id))table.set(id,new Map());const e=effects?(id-115)*.001:0;
   table.get(id).set(year,{SECTOR:'1',CHG2AY3:10000*Math.exp((.03+e)*(year-2000)),CHG3AY3:20000*Math.exp((.03+e)*(year-2000)),CHG5AY3:8000*Math.exp((.025+2*e)*(year-2000)),XCHG2AY3:'R',XCHG3AY3:'R',XCHG5AY3:'R'});
  }
 }
 return {table,cpi,dictionaries};
}
test('flag interpretation is year/field-specific and unknown codes never pass strict source filters',()=>{
 const f=fixture();assert.equal(classifyFlag(f.dictionaries,2010,'CHG2AY3','R'),'reported');
 assert.equal(classifyFlag(f.dictionaries,2010,'CHG2AY3','C'),'corrected');
 assert.equal(classifyFlag(f.dictionaries,2010,'CHG2AY3','P'),'other-documented');
 assert.equal(classifyFlag(f.dictionaries,1999,'CHG2AY3','R'),'unclassified');
 f.table.get(100).get(2011).XCHG2AY3='?';const q=levelQuality(f.table,f.dictionaries,100,'public4',2010,2013);
 assert.equal(q.unclassified,1);assert.equal(qualityAllowed(q,'reported-only'),false);assert.equal(qualityAllowed(q,'all'),true);
 assert.throws(()=>qualityAllowed(q,'invented'),/Unknown/);
});
test('fixed-forecast quality sensitivity retains exclusions and unavailable outcomes',()=>{
 const f=fixture();f.table.get(100).get(2012).XCHG2AY3='C';
 const make=id=>({model:'baseline',kind:'known',wait:0,origin:2011,lastBillYear:2014,sector:'public4',unitid:id,status:'observed',covered:1,score:.2,bias:0,below:0,above:0});
 const r=caseSensitivity([make(100),make(101),{...make(102),status:'changed-sector',covered:null}],f.table,f.dictionaries)[0];
 assert.equal(r.registered,3);assert.equal(r.observed,2);assert.equal(r.statuses['changed-sector'],1);
 assert.deepEqual(r.groups.map(g=>g.cases),[2,1,2]);assert.equal(r.flags.corrected,1);
 assert.deepEqual(r.groups.map(g=>g.covered),[1,1,1]);
});
test('complete-window statistics never fill missing annual observations with zeros',()=>{
 assert.equal(completeWindow([{year:2000,status:'observed',centered:[1,2]}],[2000,2001]),null);
 assert.equal(pairedStatistics([]).correlation,null);
 assert.equal(pairedStatistics([[1,1],[1,1]]).correlation,null);
 assert.equal(pairedStatistics([[1,3],[2,2],[3,1]]).correlation,-1);
});
test('shared boundary measurement error can create false reversal even without school trends',()=>{
 const rand=random(475901),adjacent=[],gapped=[];
 for(let i=0;i<10000;i++){
  const e=Array.from({length:4},()=>rand()-.5);
  adjacent.push([(e[1]-e[0])/5,(e[2]-e[1])/5]);
  gapped.push([(e[1]-e[0])/5,(e[3]-e[2])/5]);
 }
 assert.ok(Math.abs(pairedStatistics(adjacent).correlation+.5)<.04);
 assert.ok(Math.abs(pairedStatistics(gapped).correlation)<.04);
});
test('shared deterministic growth has zero centered dispersion and persistent school effects survive disjoint windows',()=>{
 const fixed=fixture(false),a=annualSector(fixed.table,fixed.cpi,fixed.dictionaries,'public4');
 for(const s of a.summaries)for(const c of s.comparisons){assert.ok(c.tuition.varianceA<1e-24);assert.equal(c.tuition.correlation,null);}
 const f=fixture(),r=annualSector(f.table,f.cpi,f.dictionaries,'public4');
 for(const s of r.summaries)for(const c of s.comparisons){assert.ok(c.tuition.correlation>1-1e-10);assert.ok(c.housing.correlation>1-1e-10);assert.equal(c.paired,s.originInstitutions);}
});
test('future attrition cannot change the 2010 cohort and withheld histories cannot change training centering',()=>{
 const f=fixture(),before=annualSector(f.table,f.cpi,f.dictionaries,'public4');
 for(const id of before.originWithheldIds)for(const [year,row] of f.table.get(id))row.CHG2AY3*=Math.exp((year-2000)*.3);
 const changed=annualSector(f.table,f.cpi,f.dictionaries,'public4');
 assert.deepEqual(changed.summaries.filter(s=>s.kind==='known'),before.summaries.filter(s=>s.kind==='known'));
 const known=before.originKnownIds[0];f.table.get(known).delete(2016);
 const missing=annualSector(f.table,f.cpi,f.dictionaries,'public4');
 assert.deepEqual(missing.originKnownIds,before.originKnownIds);
 const s=missing.summaries.find(s=>s.kind==='known'&&s.mode==='all');
 assert.equal(s.comparisons[2].missingEither,1);assert.equal(s.annualStatuses['missing-school-row'],2);
 assert.ok(before.originKnownIds.every(id=>identityHash(id)%5!==0));
});
test('large-change sensitivity is separate from retained original comparisons',()=>{
 const f=fixture(),first=annualSector(f.table,f.cpi,f.dictionaries,'public4'),id=first.originKnownIds[0];
 f.table.get(id).get(2007).CHG2AY3*=2;
 const r=annualSector(f.table,f.cpi,f.dictionaries,'public4');
 const c=r.summaries.find(s=>s.mode==='all'&&s.kind==='known').comparisons[0];
 assert.ok(c.pairedIds.includes(id));assert.equal(c.paired,first.originKnownIds.length);
 assert.equal(c.largeChangeScreen.removed,1);assert.equal(c.largeChangeScreen.retained,c.paired-1);
});
test('quality/persistence evidence verifies original dictionaries and all analysis source identities',()=>{
 const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
 const {sha256,...r}=read('data/calibration-diagnostics/quality-persistence.json');
 assert.equal(hash(canonical(r)),sha256);assert.equal(r.currentReportHash,read('site/data/current-calibration.json').sha256);
 for(const [path,expected]of Object.entries(r.sourceHashes))assert.equal(hash(readFileSync(path)),expected,path);
 const d=read('data/ipeds-price-dictionaries.json');assert.equal(d.years.length,24);
 for(const row of d.years){assert.equal(hash(readFileSync(row.path)),row.sha256);if(row.supplement)assert.equal(hash(readFileSync(row.supplement.path)),row.supplement.sha256);}
 for(const sector of r.persistence){
  assert.ok(sector.originKnownIds.every(id=>identityHash(id)%5!==0));assert.ok(sector.originWithheldIds.every(id=>identityHash(id)%5===0));
  for(const s of sector.summaries)for(const c of s.comparisons){
   assert.ok(c.first[1]<c.second[0]);if(c.design==='gapped-price-observations')assert.ok(c.first[1]+1<c.second[0]);
   assert.equal(c.paired+c.missingEither,c.originInstitutions);assert.equal(c.paired,c.pairedIds.length);assert.equal(c.tuition.n,c.paired);
   assert.equal(c.largeChangeScreen.retained+c.largeChangeScreen.removed,c.paired);
  }
 }
});
