import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {binomialCDF,targetReserve} from '../site/js/binomial-reserve.js';
import {budgetCapacity,budgetPaid,householdRequirement,householdDepositSchedule} from '../site/js/planning-decisions.js';
import {compile,runPath,repriceRow} from '../site/js/engine.js';
import {newPlan} from '../site/js/domain.js';
test('exact target reserve matches independent SciPy critical passes, population probabilities and ranks',()=>{
 for(const row of JSON.parse(readFileSync('tests/binomial-reference.json')).cases){
  const actual=targetReserve(row.target,row.fitTrials,row.verifyTrials);
  assert.equal(actual.rank,row.rank);assert.equal(actual.criticalPasses,row.criticalPasses);
  assert.ok(Math.abs(actual.populationProbability-row.populationProbability)<1e-11);
 }
 assert.equal(binomialCDF(2,4,.5),11/16);assert.equal(binomialCDF(0,5,0),1);assert.equal(binomialCDF(4,5,1),0);
 assert.equal(targetReserve(.99,20000,10).available,false);assert.throws(()=>targetReserve(1));
});
function fixture(){const p=newPlan(),st=p.students[0],sc=st.scenarios[0];p.valuation='2026-09';st.enrollment='2027-09';sc.baseline=p.valuation;sc.years=1;sc.costs={tuition:10000,housing:3000,books:0,transport:0,other:0};Object.assign(st.funding,{balance:12000,monthly:200,contributionStart:p.valuation,contributionEnd:'2027-08',grant:1000,income:500,coverage:'full'});return compile(p,st,sc);}
test('budget capacity preserves bill timing, fixed aid, costs and exact ledger feasibility',()=>{
 const c=fixture(),before=JSON.stringify(c),g=()=>1.002,scale=budgetCapacity(c,g);
 assert.ok(scale>0);assert.ok(budgetPaid(c,g,scale));assert.ok(!budgetPaid(c,g,scale+.001));
 const scaled={...c,rows:c.rows.map(r=>repriceRow({...r,valuationCosts:r.costs},scale,scale,r.discount,scale))};
 assert.equal(runPath(scaled,g,c.monthly,false).success,true);
 assert.equal(JSON.stringify(c),before);
 const miss=runPath({...c,opening:0},()=>1,0);
 assert.equal(miss.firstUnpaid.date,miss.firstShortfall);assert.equal(miss.firstUnpaid.amount,miss.firstUnpaid.coveredBill);
});
test('household proposals enforce every earmarked requirement and dated step-ups, including zero shares',()=>{
 const a=fixture(),b=fixture();a.monthly=100;b.monthly=300;b.rows=b.rows.map(r=>({...r,factor:r.factor*2}));
 assert.equal(householdRequirement([a,b],[200,300]),800);
 const schedule=householdDepositSchedule([a,b],800);assert.equal(schedule[0].amount,1400);
 b.monthly=0;assert.equal(householdRequirement([a,b],[200,1]),Infinity);
 a.monthly=0;assert.equal(householdRequirement([a,b],[200,300]),600);
});
import {stressCompiled}from '../site/js/planning-stress.js';
test('planning stresses preserve baseline costs and returns while applying exactly the named change',()=>{
 const c=fixture(),before=JSON.stringify(c),base=runPath(c,()=>1);
 const noAid=runPath(stressCompiled(c,'aid'),()=>1);
 assert.equal(noAid.total,base.total);assert.ok(noAid.grants<base.grants);
 const housing=runPath(stressCompiled(c,'housing'),()=>1);
 assert.ok(housing.total>base.total);assert.equal(housing.tuitionTotal,base.tuitionTotal);
 const crash=stressCompiled(c,'market');assert.deepEqual(crash.rows,c.rows);
 assert.deepEqual(stressCompiled(crash,'market'),crash);assert.equal(JSON.stringify(c),before);
 const zero=stressCompiled(c,"aid");
 assert.deepEqual(stressCompiled(zero,'aid').rows,zero.rows);
});
import {createHash}from 'node:crypto';
import {canonical}from '../site/js/calibration.js';
test('planning stability report retains independent checks and source provenance',()=>{
 const r=JSON.parse(readFileSync('site/data/planning-validation.json')),{sha256,...body}=r;
 assert.equal(createHash('sha256').update(canonical(body)).digest('hex'),sha256);
 assert.equal(r.results.length,12);assert.ok(r.confirmed>=10);
 assert.ok(r.results.every(x=>x.confirmation.trials===5000&&x.confirmation.lowerBound>=.9===x.confirmation.meets));
 for(const [p,h]of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),h);
});
