import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {newPlan,validatePlan,parseImport,exportPlan,MODEL,SCHEMA} from '../site/js/domain.js';
import {compile,runPath,repriceRow,requiredContribution} from '../site/js/engine.js';
import {validateHistory,verifyHistory,observations,blockIndices,portfolioGross,historicalPath,referenceScenario,simulateHistorical,assessHistorical} from '../site/js/history.js';
const data=JSON.parse(fs.readFileSync(new URL('../site/data/history.json',import.meta.url)));
const close=(a,b,tol=.011)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function fixture(){const p=newPlan();p.valuation='2026-08';const st=p.students[0],s=st.scenarios[0];st.enrollment='2027-08';st.years=1;s.baseline='2026-08';s.sourceDate='2026-08';s.assumptionsDate='2026-08';s.contributionStart='2026-08';s.contributionEnd='2027-07';s.costs={tuition:12000,housing:9000,books:0,transport:0,other:0};return {p,st,s};}
test('historical snapshot is consecutive, complete, finite, and checksum verified',async()=>{
  assert.equal(validateHistory(data).observations.length,564);await verifyHistory(data);
  const bad=structuredClone(data);bad.observations[0][1]+=.001;await assert.rejects(verifyHistory(bad),/checksum/);
  const missing=structuredClone(data);missing.observations.splice(1,1);assert.throws(()=>validateHistory(missing));
});
test('historical stock and bond loss episodes are actual observations, not normal draws',()=>{
  const stock2008=data.observations.filter(r=>r[0].startsWith('2008')).reduce((v,r)=>v*(1+r[1]),1)-1;
  const bond2022=data.observations.filter(r=>r[0].startsWith('2022')).reduce((v,r)=>v*(1+r[2]),1)-1;
  assert.ok(stock2008<-.3);assert.ok(bond2022<-.1);assert.ok(data.observations.find(r=>r[0]==='1987-10')[1]<-.15);
});
test('calendar-aligned blocks copy consecutive paired observations and reproduce prefixes',()=>{
  const rows=observations(data),a=blockIndices(rows,130,10,3,42,7),b=blockIndices(rows,90,10,3,42,7);
  assert.deepEqual(a.slice(0,90),b);
  for(let i=0;i<a.length;i++){if(i%36===0)assert.equal(rows[a[i]][0].slice(5),'11');else assert.equal(a[i],a[i-1]+1);}
  assert.deepEqual(a,blockIndices(rows,130,10,3,42,7));assert.notDeepEqual(a,blockIndices(rows,130,10,3,43,7));
});
test('allocation and fees use observed nominal asset returns without independent resampling',()=>{
  close(portfolioGross(['2000-01',.1,-.05,.01,0,0],[.6,.3,.1]),1.046,1e-10);
  close(portfolioGross(['2000-01',0,0,0,0,0],[0,0,1],.01)**12,.99,1e-10);
});
test('repriced bills recalculate grants, coverage, income and discounted amounts together',()=>{
  const {p,st,s}=fixture();st.enrollment='2026-08';s.grant=4000;s.income=9000;
  const r=compile(p,st,s).rows[0],priced=repriceRow(r,2,.5,3);
  close(priced.costs.tuition,12000);close(priced.costs.housing,500);close(priced.total,12500);close(priced.grant,2000);close(priced.income,1000);close(priced.need,9500);assert.equal(priced.discount,3);
});
test('historical tuition and CPI create variable expense ranges and paired gaps',()=>{
  const {p,st,s}=fixture();s.history.reference='manual';s.balance=0;
  const c=compile(p,st,s),r=simulateHistorical(c,data,{trials:200,seed:12},()=>{},false);
  assert.ok(r.costRange.p90>r.costRange.p10);assert.ok(r.tuitionRange.p90>r.tuitionRange.p10);
  close(r.gap.p10,r.costRange.p10);close(r.gap.p50,r.costRange.p50);close(r.gap.p90,r.costRange.p90);
});
test('fixed-expense mode preserves costs while historical investment returns still vary',()=>{
  const {p,st,s}=fixture();s.balance=20000;s.history.costMode='fixed';
  const r=simulateHistorical(compile(p,st,s),data,{trials:200,seed:12},()=>{},false);
  close(r.costRange.p10,r.costRange.p90);assert.ok(r.enrollment.p90>r.enrollment.p10);
});
test('historical path has correct initial bill timing and never double-applies inflation',()=>{
  const {p,st,s}=fixture();st.enrollment='2026-08';s.balance=50000;s.history.reference='manual';
  const c=compile(p,st,s),rows=observations(data),ix=blockIndices(rows,c.rows.length,c.valuationMonth,3,42,0),path=historicalPath(c,rows,ix);
  close(path.compiled.rows[0].total,7000); // $6,000 tuition and $1,000 housing, no inflation before initial quote.
  close(path.compiled.rows[1].costs.housing,1000*(1+rows[ix[0]][4]));
  const r=runPath(path.compiled,i=>path.gross[i]);assert.ok(r.ledger.every(x=>x.balance>=0));
});
test('historical reference is derived geometrically and never mutates user input',()=>{
  const {s}=fixture();const before=structuredClone(s),ref=referenceScenario(s,data);assert.deepEqual(s,before);assert.notEqual(ref.assumptions.returnRate,s.assumptions.returnRate);
  s.history.reference='manual';assert.deepEqual(referenceScenario(s,data),s);
});
test('single assessment returns primary ranges, actual periods, sensitivity, source metadata and savings target',()=>{
  const {p,st,s}=fixture();s.balance=10000;
  const r=assessHistorical(p,st,s,data,{trials:100,seed:2,threshold:.9,ceiling:10000});
  assert.ok(r.historicalReplay.windows>0);assert.ok(r.historicalReplay.worstStart);assert.equal(r.sensitivity.period,'2000–2024');assert.equal(r.sensitivity.trials,1000);
  assert.equal(r.dataset.hash,data.observationsSha256);assert.equal(r.dataset.sources.length,4);assert.ok(r.simulation.contribution>0);assert.ok(r.simulation.confirmation.calibrationProbability>=.9);assert.equal(r.simulation.confirmation.trials,1000);
});
test('path-specific solver covers repriced bills using the same historical sequence',()=>{
  const {p,st,s}=fixture();const c=compile(p,st,s),rows=observations(data),path=historicalPath(c,rows,blockIndices(rows,c.rows.length,c.valuationMonth,3,43,4));
  const amount=Math.ceil(requiredContribution(path.compiled,i=>path.gross[i]));assert.ok(runPath(path.compiled,i=>path.gross[i],amount).success);
});
test('a complete result is reproducible for the same dataset, inputs and seed',()=>{
  const {p,st,s}=fixture();const c=compile(p,st,s),settings={trials:100,seed:99};
  assert.deepEqual(simulateHistorical(c,data,settings,()=>{},false),simulateHistorical(c,data,settings,()=>{},false));
});
test('old saved plans migrate losslessly, including balances, dates, rates and scenarios',()=>{
  const {p,st,s}=fixture();s.balance=12345.67;s.assumptions.returnRate=.037;const old=structuredClone(p);old.schemaVersion=1;old.modelVersion='college-funding-1.0.0';delete old.students[0].scenarios[0].history;
  const wrapper={format:'education-finance-1',exportedAt:'2026-11-15T00:00:00Z',plan:old},upgraded=parseImport(JSON.stringify(wrapper));
  assert.equal(upgraded.modelVersion,MODEL);assert.equal(upgraded.schemaVersion,SCHEMA);assert.equal(upgraded.students[0].id,st.id);assert.equal(upgraded.students[0].scenarios[0].balance,12345.67);assert.equal(upgraded.students[0].scenarios[0].assumptions.returnRate,.037);
  assert.equal(upgraded.students[0].scenarios[0].history.blockYears,3);assert.deepEqual(parseImport(exportPlan(upgraded)),upgraded);assert.equal(old.schemaVersion,1);
});
test('invalid historical settings are rejected before any assessment',()=>{
  const {p,s}=fixture();for(const [key,value] of [['profile','unknown'],['period','future'],['blockYears',0],['fee',.2],['costMode','invented']]){const candidate=structuredClone(p);candidate.students[0].scenarios[0].history[key]=value;assert.throws(()=>validatePlan(candidate));}
});

test('committed source hashes and derived manifest agree with the runtime snapshot',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../data/manifest.json',import.meta.url)));
  assert.equal(manifest.observationsSha256,'2428c0397502642b2a672473f3a4ad83c0026d64cacef2df99db909ca37c1e4f');
  assert.equal(data.observationsSha256,manifest.observationsSha256);
  for(const [name,hash] of Object.entries(manifest.rawHashes))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../data/raw/'+name,import.meta.url))).digest('hex'),hash,name);
});
