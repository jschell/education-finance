import test from "node:test";
import assert from "node:assert/strict";
import { fitResidualCurve, curveFactors } from "../site/js/cost-recalibration.js";
import { chooseNested, promotionGate, residualBundle } from "../scripts/full-calibration-helpers.mjs";
import { newPlan } from "../site/js/domain.js";
import { compileCalibrated, calibrationFactory } from "../site/js/calibration.js";
import { runPath } from "../site/js/engine.js";
import { readFileSync } from "node:fs";
function errors(model="fixed",sector="public4") {
  return Array.from({length:8},(_,i)=>({model,sector,horizon:2,origin:2000+i,target:2002+i,
    tuition:i===7?0.5:-0.02*i,housing:i===7?0.3:-0.01*i}));
}
test("own-model residual fitting excludes other models, sectors and future endpoints",()=>{
  const rows=errors(),settings={origin:2007,model:"fixed",sector:"public4"};
  const fit=fitResidualCurve(rows,settings);
  assert.deepEqual(fitResidualCurve([...rows,...errors("regime"),...errors("fixed","private4"),
    {model:"fixed",sector:"public4",origin:2020,target:2022,horizon:2,tuition:99,housing:99}],settings),fit);
  assert.ok(fit.knots[0].targetYears.every((y)=>y<=2007));
});
test("residual support counts target years once and rejects invalid earlier forecasts",()=>{
  const rows=errors().slice(0,2);
  assert.equal(fitResidualCurve([...rows,...rows],{origin:2010,model:"fixed",sector:"public4"}).knots.length,0);
  assert.throws(()=>fitResidualCurve([{...errors()[0],origin:2002}],{origin:2010,model:"fixed",sector:"public4"}),/provenance/);
});
test("asymmetric paired correction preserves empirical tail direction rather than imposing symmetry",()=>{
  const fit=fitResidualCurve(errors(),{origin:2010,model:"fixed",sector:"public4"});
  const xs=Array.from({length:300},(_,t)=>curveFactors(fit,2,850213,t));
  assert.ok(xs.some((x)=>x.tuition>1.2));
  assert.ok(xs.some((x)=>x.tuition<1));
  assert.ok(xs.every((x)=>(x.tuition>1)===(x.housing>1)));
  const bias=fit.knots[0].center.tuition*fit.knots[0].biasWeight;
  const logs=xs.map((x)=>Math.log(x.tuition)-bias);
  assert.ok(Math.max(...logs)>Math.abs(Math.min(...logs))*2);
});
test("cumulative curve is identity at origin and uses the same draw across enrollment horizons",()=>{
  const fit=fitResidualCurve(errors(),{origin:2010,model:"fixed",sector:"public4"});
  assert.deepEqual(curveFactors(fit,0,3,7),{tuition:1,housing:1});
  const a=curveFactors(fit,1,3,7),b=curveFactors(fit,2,3,7);
  assert.ok(Math.abs(a.tuition*a.tuition-b.tuition)<1e-12);
  assert.deepEqual(curveFactors(fit,8,3,7),curveFactors(fit,8,3,7));
  assert.throws(()=>curveFactors(fit,-1,3,7),/nonnegative/);
});
test("thin residual support permits shrunken bias but no empirical spread",()=>{
  const fit=fitResidualCurve(errors().slice(0,3),{origin:2010,model:"fixed",sector:"public4"});
  assert.equal(fit.knots[0].spreadWeight,0);
  assert.deepEqual(curveFactors(fit,2,1,1),curveFactors(fit,2,2,99));
});
test("nested selection never scores incomplete outcomes or counts duplicate years as support",()=>{
  const fold=(target)=>({origin:target-3,wait:0,lastBillYear:target,
    models:Object.fromEntries(["production","fixed","recent10","damped5","regime"].map((m)=>[m,
      {score:m==="fixed"?1:2,bias:0,covered:0.8,below:0.1,above:0.1}]))});
  const rows=[fold(2010),fold(2011),fold(2012)];
  assert.equal(chooseNested(rows,2013).selected,"fixed");
  assert.deepEqual(chooseNested([...rows,fold(2013)],2013),chooseNested(rows,2013));
  assert.equal(chooseNested(Array.from({length:100},()=>fold(2010)),2013).selected,"production");
});
test("promotion demands proper scores, wait protection, coverage and bias together",()=>{
  const a={score:1,covered:0.3,byWait:[{wait:0,score:1,bias:0.03}]};
  const b={score:0.9,covered:0.6,byWait:[{wait:0,score:0.9,bias:0.02}]};
  assert.ok(promotionGate(a,b).passed);
  b.byWait[0].bias=0.1;assert.equal(promotionGate(a,b).passed,false);
});
test("path corrections change paid bills and success, preserve fixed mode and leave source plans untouched",()=>{
  const base=JSON.parse(readFileSync(new URL("../site/data/calibration-reviewed.json",import.meta.url)));
  const p=newPlan(),st=p.students[0],sc=st.scenarios[0];
  p.valuation="2026-09";st.enrollment="2030-09";sc.baseline=p.valuation;sc.path="Public in-state";
  sc.years=1;sc.costs.tuition=10000;st.funding.balance=0;st.funding.monthly=0;
  st.funding.contributionStart=p.valuation;st.funding.contributionEnd="2030-08";
  const rows=errors().map((r)=>({...r,tuition:0.3,housing:0.3}));
  const modified={...base,costRecalibration:residualBundle(rows,2023,base.costModel,["public4"])};
  const before=JSON.stringify(p),{c}=compileCalibrated(p,st,sc,base);
  const a=calibrationFactory(c,base,{seed:1}).make(0),b=calibrationFactory(c,modified,{seed:1}).make(0);
  const first=runPath(a.compiled,()=>1,0,false),second=runPath(b.compiled,()=>1,0,false);
  assert.ok(second.total>first.total);
  const opening=(first.total+second.total)/2;
  assert.equal(runPath({...a.compiled,opening},()=>1,0,false).success,true);
  assert.equal(runPath({...b.compiled,opening},()=>1,0,false).success,false);
  assert.deepEqual(a.gross,b.gross);assert.equal(JSON.stringify(p),before);
  const fixed={...c,history:{...c.history,costMode:"fixed"}};
  assert.deepEqual(calibrationFactory(fixed,base,{seed:1}).make(0).compiled.rows,
    calibrationFactory(fixed,modified,{seed:1}).make(0).compiled.rows);
});

test("students with different enrollment years share the same corrected academic prices on common dates",()=>{
  const base=JSON.parse(readFileSync(new URL("../site/data/calibration-reviewed.json",import.meta.url)));
  const bundle={...base,costRecalibration:residualBundle(errors(),2023,base.costModel,["public4"])};
  const p=newPlan(),a=p.students[0];p.valuation="2026-09";
  a.enrollment="2028-09";
  Object.assign(a.funding,{contributionStart:p.valuation,contributionEnd:"2028-08"});
  Object.assign(a.scenarios[0],{baseline:p.valuation,path:"Public in-state",years:3,
    costs:{tuition:10000,housing:9000,books:0,transport:0,other:0}});
  const b=structuredClone(a);b.id="synthetic-second";b.enrollment="2029-09";b.scenarios[0].years=2;
  const ca=compileCalibrated(p,a,a.scenarios[0],bundle).c;
  const cb=compileCalibrated(p,b,b.scenarios[0],bundle).c;
  const ra=calibrationFactory(ca,bundle,{seed:17}).make(4).compiled.rows.find((r)=>r.date==="2029-09");
  const rb=calibrationFactory(cb,bundle,{seed:17}).make(4).compiled.rows.find((r)=>r.date==="2029-09");
  assert.deepEqual(ra.costs,rb.costs);
});

import { createHash } from "node:crypto";
import { canonical } from "../site/js/calibration.js";
test("committed full report verifies inputs, origin cutoffs, proper scores and the unchanged-production baseline",()=>{
  const read=(p)=>readFileSync(new URL("../"+p,import.meta.url));
  const hash=(x)=>createHash("sha256").update(x).digest("hex");
  const report=JSON.parse(read("site/data/full-calibration.json")),{sha256,...body}=report;
  assert.equal(hash(canonical(body)),sha256);
  for(const [path,expected] of Object.entries(report.inputHashes)) assert.equal(hash(read(path)),expected,path);
  assert.equal(report.inner.length,500);assert.equal(report.outer.length,90);
  assert.equal(report.fundingCases.length,2700);
  assert.ok(report.inner.every((r)=>r.macroLast<r.origin&&r.costLast<=r.origin&&r.target-r.origin===r.horizon));
  for(const r of report.outer) for(const s of Object.values(r.models)) {
    assert.equal(s.covered+s.below+s.above,1);
    assert.ok(Math.abs(s.width-(s.p90-s.p10)/s.actual)<1e-12);
    const proper=(s.p90-s.p10+10*Math.max(0,s.p10-s.actual)+10*Math.max(0,s.actual-s.p90))/s.actual;
    assert.ok(Math.abs(s.score-proper)<1e-12);
  }
  assert.ok(report.selection.every((r)=>r.targetYears.every((y)=>y<r.origin)));
  const prior=JSON.parse(read("site/data/cost-followup.json")).cost.summaries.find((r)=>r.model==="fixed");
  assert.equal(report.summaries[0].score,prior.score);
  assert.equal(report.summaries[0].covered,prior.covered);
  assert.equal(report.gate.passed,false);
  assert.equal(report.liveModel,"production");
});
test("2024 endpoint data and the first prospective record retain honest missingness and immutable provenance",()=>{
  const read=(p)=>readFileSync(new URL("../"+p,import.meta.url));
  const snapshot=JSON.parse(read("data/forecast-snapshots/2026-11-16-model9.json"));
  const {sha256,...body}=snapshot;
  assert.equal(createHash("sha256").update(canonical(body)).digest("hex"),sha256);
  assert.ok(snapshot.forecasts.every((r)=>r.outcome===null&&r.targetMonth>snapshot.asOf.slice(0,7)));
  assert.equal(snapshot.forecasts.length,5);
  assert.equal(snapshot.syntheticBudget.tuition,10000);
  const prices=JSON.parse(read("data/comparable-prices-through-2024.json"));
  for(const r of Object.values(prices.series)) {
    assert.equal(r.actual.year,2024);assert.equal(r.actual.deflator,null);
    assert.equal(r.training.length,24);
    assert.ok(r.training.every((p)=>p.year<2024&&p.deflator>0));
  }
});
