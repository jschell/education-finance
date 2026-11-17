// Read-only support audit and controlled zero-return counterexamples for the review.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {newPlan} from '../site/js/domain.js';
import {compile,runPath} from '../site/js/engine.js';
import {canonical} from '../site/js/calibration.js';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const individuals=read('data/calibration-cases/individual-funding.json'),households=read('data/calibration-cases/household-funding.json');
const observed=individuals.filter(r=>r.status==='observed');
function plan({wait=0,years=4,balance=100000,monthly=0,tuition=12000,housing=13000}={}){
 const p=newPlan(),st=p.students[0],sc=st.scenarios[0];p.valuation='2026-09';st.enrollment=`${2026+wait}-09`;
 Object.assign(st.funding,{balance,monthly,stepUp:0,grant:0,income:0,gifts:[],contributionStart:p.valuation,contributionEnd:wait?`${2026+wait}-08`:p.valuation});
 Object.assign(sc,{years,baseline:p.valuation,costs:{tuition,housing,books:0,transport:0,other:0},schoolGrant:0});
 Object.assign(sc.assumptions,{tuitionGrowth:0,livingGrowth:0,otherGrowth:0});
 return compile(p,st,sc);
}
const outcome=c=>{const r=runPath(c,()=>1,c.monthly,false);return {success:r.success,total:r.total,shortfall:r.shortfall,deposits:r.deposits,firstUnpaid:r.firstUnpaid,ending:r.ending};};
const four=outcome(plan()),five=outcome(plan({years:5}));assert.equal(four.success,true);assert.ok(Math.abs(five.shortfall-25000)<1e-7);
const continuous=plan({wait:8,balance:52000,monthly:500}),paused={...continuous,rows:continuous.rows.map(r=>r.date>='2033-09'&&r.date<='2034-08'?{...r,factor:0}:r)};
const full=outcome(continuous),pause=outcome(paused);assert.equal(full.success,true);assert.ok(Math.abs(pause.shortfall-6000)<1e-7);
const a=plan({years:1,balance:100,monthly:50,tuition:200,housing:0}),b=plan({wait:1,years:1,balance:0,monthly:50,tuition:200,housing:0});
const alternativeA={...a,monthly:100},alternativeB={...b,rows:b.rows.map((r,i)=>i===0?{...r,factor:0}:r)};
const fixed=[outcome(a),outcome(b)],prioritized=[outcome(alternativeA),outcome(alternativeB)];
const peak=cs=>Math.max(...Array.from({length:Math.max(...cs.map(c=>c.rows.length))},(_,i)=>cs.reduce((v,c)=>v+c.monthly*(c.rows[i]?.factor||0),0)));
assert.ok(peak([a,b])<=100&&peak([alternativeA,alternativeB])<=100);
assert.equal(fixed.reduce((v,r)=>v+r.deposits,0),prioritized.reduce((v,r)=>v+r.deposits,0));
assert.equal(fixed.every(r=>r.success),false);assert.equal(prioritized.every(r=>r.success),true);
const sources=['scripts/review-scenario-design.mjs','site/js/engine.js','site/js/domain.js','site/js/planning.js','data/calibration-cases/individual-funding.json','data/calibration-cases/household-funding.json'];
const body={id:'scenario-design-review-support-v1',reviewedRevision:'1b79753ebcd335e339a89c14ae9631114d1f01bd',
 sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),
 registeredIndividual:individuals.length,observedIndividual:observed.length,individualStatuses:Object.fromEntries([...new Set(individuals.map(r=>r.status))].map(s=>[s,individuals.filter(r=>r.status===s).length])),
 profiles:[...new Set(individuals.map(r=>r.profile))].sort(),waits:[...new Set(individuals.map(r=>r.wait))].sort(),openingFactors:[...new Set(individuals.map(r=>r.factor))].sort(),
 pointForecastExtremes:{cases:observed.filter(r=>r.probability===0||r.probability===1).length,denominator:observed.length,note:'Raw case count, not equal-origin calibration evidence. Finite simulation extremes are not guarantees.'},
 householdSupport:[0,4,8].flatMap(wait=>[false,true].map(capped=>{const rows=households.filter(r=>r.status==='observed'&&r.wait===wait&&r.capped===capped);return {wait,capped,observed:rows.length,actualSuccesses:rows.filter(r=>r.actual===1).length,bindingCaps:rows.filter(r=>r.capBinds).length,interior05to95:rows.filter(r=>r.probability>.05&&r.probability<.95).length};})),
 controlledExamples:{extraAttendanceYear:{fourYears:four,fiveYears:five},depositInterruption:{uninterrupted:full,twelveMonthPause:pause},depositPolicy:{fixedShares:fixed,prioritizedDates:prioritized,monthlyCap:100,fixedPeak:peak([a,b]),prioritizedPeak:peak([alternativeA,alternativeB]),note:'A receives 100 rather than 50 in the first month, B receives zero rather than 50 that month; B then continues 50. No money transfers between accounts; cap is never exceeded.'}},
 limitation:'Controlled synthetic zero-return/zero-price-growth examples establish scenario relevance, not frequencies or calibrated risks. Existing production models, source cases, gates and original forecasts are unchanged.'};
body.sha256=hash(canonical(body));mkdirSync('data/calibration-diagnostics',{recursive:true});writeFileSync('data/calibration-diagnostics/scenario-review.json',JSON.stringify(body)+'\n');
console.log(JSON.stringify({observed:body.observedIndividual,extremes:body.pointForecastExtremes.cases,examples:body.controlledExamples}));
