import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newPlan,clone} from '../site/js/domain.js';
import {compile,runPath} from '../site/js/engine.js';
import {applyDecision,requiredOpening,assessDecisionScenarios} from '../site/js/decision-scenarios.js';
import {allocateDeposits,proportionalCents} from '../site/js/deposit-policy.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture({wait=0,years=4,balance=100000,monthly=0,tuition=12000,housing=13000}={}){
 const p=newPlan(),st=p.students[0],sc=st.scenarios[0],f=st.funding;p.valuation='2026-09';st.enrollment=`${2026+wait}-09`;
 Object.assign(f,{balance,monthly,stepUp:0,grant:0,income:0,gifts:[],contributionStart:p.valuation,contributionEnd:wait?`${2026+wait}-08`:p.valuation});
 Object.assign(sc,{years,baseline:p.valuation,costs:{tuition,housing,books:0,transport:0,other:0},schoolGrant:0});
 for(const a of [sc.assumptions,f.assumptions])for(const k of Object.keys(a))a[k]=0;
 return {p,st,sc,f,c:()=>compile(p,st,sc)};
}
const outcome=c=>runPath(c,()=>1,c.monthly,false),path=c=>({compiled:c,gross:c.rows.map(()=>1)});
test('extra attendance retains full bills and interrupted deposits remove exactly $6,000',()=>{
 const x=fixture();assert.equal(outcome(x.c()).success,true);x.sc.years++;close(outcome(x.c()).shortfall,25000);
 const y=fixture({wait:8,balance:52000,monthly:500});assert.equal(outcome(y.c()).success,true);
 const before=JSON.stringify(y.p),variant=applyDecision(y.c(),'pause12');close(outcome(variant.compiled).shortfall,6000);assert.equal(variant.affected,12);assert.equal(JSON.stringify(y.p),before);
});
test('support alternatives honor aid expiry, income timing and gift arrival beyond the goal',()=>{
 const x=fixture({years:2,balance:0});x.f.grant=1000;x.f.grantYears=4;x.sc.schoolGrant=2000;x.f.income=900;
 let c=x.c();close(outcome(applyDecision(c,'aid').compiled).grants,3000);close(outcome(applyDecision(c,'income').compiled).income,900);
 x.f.grantYears=1;x.sc.schoolGrantYears=1;assert.equal(applyDecision(x.c(),'aid').applicable,false);
 x.f.gifts=[{date:'2028-05',amount:2000}];const gift=applyDecision(x.c(),'gift');close(gift.deferredGifts,2000);close(outcome(gift.compiled).deposits,0);
 x.f.gifts=[{date:'2026-09',amount:100},{date:'2027-03',amount:200}];const shifted=applyDecision(x.c(),'gift');close(shifted.compiled.rows.find(r=>r.date==='2027-03').gift,100);close(shifted.compiled.rows.find(r=>r.date==='2027-09').gift,200);
 assert.equal(applyDecision(x.c(),'pause6').applicable,false);assert.throws(()=>applyDecision(c,'unknown'));
});
test('opening reserve funds every dated bill without treating later gifts as borrowing',()=>{
 const x=fixture({years:1,balance:0,monthly:50});x.f.gifts=[{date:'2027-03',amount:50000}];const c=x.c(),gross=c.rows.map(()=>1.002),needed=requiredOpening(c,gross);
 assert.ok(needed>0);assert.equal(runPath({...c,opening:needed},i=>gross[i],c.monthly,false).success,true);assert.equal(runPath({...c,opening:needed-.01},i=>gross[i],c.monthly,false).success,false);
});
test('cent allocation conserves arbitrary caps, respects dates and never transfers opening savings',()=>{
 for(let total=0;total<100;total++)assert.equal(proportionalCents(total,[1,1,1]).reduce((a,b)=>a+b,0),total);
 const a=fixture({years:1,balance:100,monthly:50,tuition:200,housing:0}).c(),b=fixture({wait:1,years:1,balance:0,monthly:50,tuition:200,housing:0}).c(),refs=[a,b],paths=refs.map(path);
 const fixed=allocateDeposits(refs,paths,75.01,'fixed'),priority=allocateDeposits(refs,paths,75.01,'dated-priority');
 assert.ok(fixed.bindingMonths>0);assert.deepEqual(fixed.schedule.map(r=>r.amount),priority.schedule.map(r=>r.amount));
 for(const r of priority.schedule)assert.ok(r.amount<=75.01+1e-9);
 const fractional=allocateDeposits(refs,paths,75.005,'fixed');assert.ok(fractional.peak<=75.005);

 assert.equal(allocateDeposits([{...a,opening:1000000},{...b,opening:0,monthly:0}], [{compiled:{...a,opening:1000000},gross:path(a).gross},{compiled:{...b,opening:0,monthly:0},gross:path(b).gross}],0,'dated-priority').success,false);
});
test('dated priority funds the sibling counterexample with the same deposits and no transfers',()=>{
 const refs=[fixture({years:1,balance:100,monthly:50,tuition:200,housing:0}).c(),fixture({wait:1,years:1,balance:0,monthly:50,tuition:200,housing:0}).c()];
 const fixed=allocateDeposits(refs,refs.map(path),100,'fixed'),priority=allocateDeposits(refs,refs.map(path),100,'dated-priority');
 assert.equal(fixed.success,false);assert.equal(priority.success,true);close(fixed.deposits,priority.deposits);assert.deepEqual(priority.schedule[0].allocations,[100,0]);
});
test('priority cannot see future sampled returns, prices or gifts',()=>{
 const refs=[fixture({wait:1,years:1,monthly:500,balance:1000}).c(),fixture({wait:2,years:1,monthly:500,balance:1000}).c()],original=refs.map(path),changed=clone(original);
 for(const p of changed){p.gross[8]=.1;p.compiled.rows[9].need+=100000;p.compiled.rows[10].gift+=100000;}
 const before=allocateDeposits(refs,original,750,'dated-priority'),after=allocateDeposits(refs,changed,750,'dated-priority');
 assert.deepEqual(before.schedule.slice(0,8),after.schedule.slice(0,8));
});
test('paired diagnostic runs reproduce, include extra-year bills, preserve inputs and label unsupported years',()=>{
 const x=fixture({years:4,balance:100000}),data=JSON.parse(fs.readFileSync('site/data/history.json')),settings={seed:71,trials:16};
 x.f.history.reference='manual';x.f.history.costMode='fixed';const before=JSON.stringify(x.p),a=assessDecisionScenarios(x.p,x.st,x.sc,data,settings);
 assert.deepEqual(a,assessDecisionScenarios(x.p,x.st,x.sc,data,settings));assert.equal(JSON.stringify(x.p),before);assert.equal(a.cases.length,7);assert.equal(a.extraYear.alternativeYears,5);
 x.sc.years=8;assert.equal(assessDecisionScenarios(x.p,x.st,x.sc,data,settings).cases.find(r=>r.id==='extra-year').applicable,false);
});
test('priority may worsen a plan when future earmarked gifts make reference-bill urgency misleading',()=>{
 const a=fixture({wait:1,years:1,balance:0,monthly:50,tuition:100,housing:0}),b=fixture({wait:2,years:1,balance:50,monthly:50,tuition:100,housing:0});
 a.f.contributionEnd=a.p.valuation;b.f.contributionEnd=b.p.valuation;a.f.gifts=[{date:a.st.enrollment,amount:100}];
 const refs=[a.c(),b.c()],fixed=allocateDeposits(refs,refs.map(path),100,'fixed'),priority=allocateDeposits(refs,refs.map(path),100,'dated-priority');
 assert.equal(fixed.success,true);assert.equal(priority.success,false);close(fixed.deposits,priority.deposits);
});
test('extra-year calibrated paths preserve common economic and price prefixes',async()=>{
 const {decisionView,decisionFactory}=await import('../site/js/decision-scenarios.js');
 const x=fixture({wait:4}),bundle=JSON.parse(fs.readFileSync('site/data/calibration-foundation.json')),data=JSON.parse(fs.readFileSync('site/data/history.json')),settings={seed:713,trials:8};
 const c=decisionView(x.p,x.st,x.sc,data,bundle),extra=clone(x.sc);extra.years++;
 const longer=decisionView(x.p,x.st,extra,data,bundle),a=decisionFactory(c,data,settings,bundle),b=decisionFactory(longer,data,settings,bundle);
 for(let t=0;t<settings.trials;t++){
  const p=a.make(t),q=b.make(t);assert.deepEqual([...p.gross],[...q.gross].slice(0,p.gross.length));assert.deepEqual(p.compiled.rows,q.compiled.rows.slice(0,p.compiled.rows.length));
 }
});
