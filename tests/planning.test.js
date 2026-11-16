import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newPlan,newStudent,validatePlan,clone,MODEL,SCHEMA,parseImport,exportPlan} from '../site/js/domain.js';
import {compile,runPath,annualRows,requiredContribution} from '../site/js/engine.js';
import {attendanceCalendar,allocationAt} from '../site/js/planning.js';
import {applyCostPreset,COST_PRESETS} from '../site/js/cost-presets.js';
import {historicalPath,referenceScenario,blockIndices,observations,portfolioGross} from '../site/js/history.js';
const data=JSON.parse(fs.readFileSync(new URL('../site/data/history.json',import.meta.url)));
const close=(a,b,tol=.011)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
function fixture(){const p=newPlan();p.valuation='2026-08';const st=p.students[0],s=st.scenarios[0];st.enrollment='2026-08';st.years=1;s.baseline=p.valuation;s.contributionStart=p.valuation;s.contributionEnd='2027-04';s.costs={tuition:10000,housing:9000,books:0,transport:0,other:0};for(const key of Object.keys(s.assumptions))s.assumptions[key]=0;s.billing.calendar='quarter';return {p,st,s};}
test('quarter tuition/grants have three dated bills and exact annual cent totals',()=>{
 const {p,st,s}=fixture();s.grant=1000.01;const c=compile(p,st,s),r=runPath(c);
 assert.deepEqual(c.rows.filter(r=>r.costs.tuition>0).map(r=>r.date),['2026-08','2026-11','2027-02']);
 close(r.tuitionTotal,10000);close(r.grants,1000.01);close(r.total,19000);
 assert.deepEqual(c.rows.filter(r=>r.costs.tuition>0).map(r=>r.costs.tuition),[3333.34,3333.33,3333.33]);assert.ok(c.rows.every(r=>r.costs.housing===1000));
});
test('payment frequency does not alter annual compounding and grants match bill dates',()=>{
 const {p,st,s}=fixture();s.costs={tuition:0,housing:0,books:0,transport:0,other:0};s.balance=10000;s.billing.livingMonths=12;s.assumptions.attendanceReturn=.06;
 close(runPath(compile(p,st,s)).ending,10600);
 s.billing.calendar='semester';close(runPath(compile(p,st,s)).ending,10600);
 s.costs.tuition=12000;s.grant=2000;const rows=compile(p,st,s).rows;assert.deepEqual(rows.filter(r=>r.grant).map(r=>r.date),['2026-08','2027-01']);
});
test('12-month living extends through summer without inventing an extra annual budget',()=>{
 const {p,st,s}=fixture();s.costs.tuition=0;s.costs.housing=12000;s.billing.livingMonths=12;s.income=12000;
 const c=compile(p,st,s),r=runPath(c);assert.equal(c.rows.length,12);assert.equal(c.rows.at(-1).date,'2027-07');close(r.total,12000);close(r.income,12000);close(r.shortfall,0);
});
test('already-enrolled quarter scenarios omit paid terms and solver uses remaining bills',()=>{
 const {p,st,s}=fixture();p.valuation='2026-12';s.contributionStart=p.valuation;s.contributionEnd='2027-04';
 const c=compile(p,st,s);assert.deepEqual(c.rows.filter(r=>r.costs.tuition>0).map(r=>r.date),['2027-02']);
 const required=Math.ceil(requiredContribution(c,()=>1));assert.ok(runPath(c,()=>1,required).success);assert.ok(!runPath(c,()=>1,required-1).success);
});
test('annual reference roll-forwards reconcile through returns, gifts and depleted balances',()=>{
 const {p,st,s}=fixture();s.balance=5000;s.monthly=200;s.gifts=[{date:'2026-12',amount:1000}];s.assumptions.attendanceReturn=.05;
 const result=runPath(compile(p,st,s)),years=annualRows(result);
 for(const year of years)close(year.opening+year.earned+year.contribution-year.withdrawal,year.balance,1e-7);
 close(years.reduce((n,y)=>n+y.shortfall,0),result.shortfall);assert.ok(result.ledger.every(row=>row.balance>=0));
});
test('published budget categories reconcile and applying one preserves funding and calendar',()=>{
 for(const preset of Object.values(COST_PRESETS))assert.equal(Object.values(preset.costs).reduce((a,b)=>a+b,0),preset.total);
 const {s}=fixture();s.balance=12345;s.grant=1000;s.history.tuitionBasis='index';const out=applyCostPreset(s,'public-in-2026','2026-11');
 assert.equal(out.costs.tuition,12290);assert.equal(out.costs.housing,14430);assert.equal(Object.values(out.costs).reduce((a,b)=>a+b,0),32030);
 assert.equal(out.history.tuitionBasis,'published');assert.equal(out.billing.calendar,'quarter');assert.equal(out.balance,12345);assert.equal(out.grant,1000);assert.equal(out.costSource.academicYear,'2026-2027');assert.equal(s.costs.tuition,10000);
 assert.throws(()=>applyCostPreset(s,'public-in-2026','2026-01'));assert.throws(()=>applyCostPreset(s,'missing','2026-11'));
});
test('schema-2 plans migrate without changing saved amounts, dates, flags or seed-independent assumptions',()=>{
 const {p}=fixture(),old=clone(p);old.schemaVersion=2;old.modelVersion='college-funding-2.0.0';const sc=old.students[0].scenarios[0];delete sc.billing;delete sc.costSource;delete sc.history.allocations;
 const migrated=validatePlan(old);assert.equal(migrated.schemaVersion,SCHEMA);assert.equal(migrated.modelVersion,MODEL);assert.deepEqual(migrated.students[0].scenarios[0].costs,sc.costs);assert.equal(migrated.students[0].scenarios[0].billing.calendar,'semester');assert.deepEqual(migrated.students[0].scenarios[0].history.allocations,[]);assert.equal(old.schemaVersion,2);
 assert.deepEqual(parseImport(exportPlan(migrated)),migrated);
});
test('dated asset allocations affect joint historical paths and the resolved fixed reference',()=>{
 const {p,st,s}=fixture();s.balance=10000;s.history.allocations=[{date:'2026-11',stocks:0,bonds:0,cash:1,referenceRate:null}];
 const ref=referenceScenario(s,data),c=compile(p,st,ref),rows=observations(data),indices=blockIndices(rows,c.rows.length,c.valuationMonth,3,123,0),path=historicalPath(c,rows,indices);
 close(path.gross[3],portfolioGross(rows[indices[3]],[0,0,1]),1e-12);assert.equal(allocationAt('2026-10',s.history.allocations),null);assert.equal(allocationAt('2026-11',s.history.allocations).cash,1);
 close(c.rates[3].returnRate,ref.history.allocations[0].referenceRate,1e-12);assert.equal(s.history.allocations[0].referenceRate,null);
 const required=Math.ceil(requiredContribution(path.compiled,i=>path.gross[i]));assert.ok(runPath(path.compiled,i=>path.gross[i],required).success);
});
test('attendance overview counts actual monthly overlap rather than adding student probabilities',()=>{
 const p=newPlan();p.valuation='2026-01';p.students[0].enrollment='2026-01';p.students[0].years=1;const second=newStudent(p.valuation);second.enrollment='2026-10';second.years=1;p.students.push(second);
 let rows=attendanceCalendar(p);assert.equal(rows.find(r=>r.year===2026).peak,1);assert.equal(rows[0].counts[p.students[0].id],9);assert.equal(rows[0].counts[second.id],3);
 second.enrollment='2026-08';rows=attendanceCalendar(p);assert.equal(rows[0].peak,2);
});
test('invalid calendar, source links, duplicate allocation dates and leveraged weights are rejected',()=>{
 for(const mutate of [s=>s.billing.calendar='monthly',s=>s.billing.livingMonths=10,s=>s.history.allocations=[{date:'2026-08',stocks:0,bonds:0,cash:1,referenceRate:null},{date:'2026-08',stocks:0,bonds:0,cash:1,referenceRate:null}],s=>s.costSource.url='javascript:alert(1)',s=>s.costSource.academicYear='2026-2028',s=>s.history.allocations=[{date:'2026-08',stocks:.8,bonds:.5,cash:-.3,referenceRate:null}]]){const {p,s}=fixture();mutate(s);assert.throws(()=>validatePlan(p));}
});
test('historical tuition holds its academic-year price across all quarter bills',()=>{
 const {p,st,s}=fixture();s.history.reference='manual';s.grant=1000;s.costs.housing=10000.01;
 const c=compile(p,st,s),rows=Array.from({length:c.rows.length},(_,i)=>['2000-01',0,0,0,.01,.01]),path=historicalPath(c,rows,rows.map((_,i)=>i));
 const expected=10000;
 close(runPath(path.compiled,()=>1).tuitionTotal,expected);close(c.rows.reduce((v,r)=>v+r.costs.housing,0),10000.01);close(runPath(path.compiled,()=>1).grants,1000);
});
