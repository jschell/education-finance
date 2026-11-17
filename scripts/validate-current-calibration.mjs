import {buildCurrentReport}from './calibration/report.mjs';
import {readFileSync,writeFileSync,mkdirSync}from 'node:fs';
import {gunzipSync}from 'node:zlib';
import {createHash}from 'node:crypto';
import {SECTORS,parseSchools,cohortAt,originBundle,outcomeLevels}from './calibration/schools.mjs';
import {fitSchoolCurve,correctedPath}from './calibration/residuals.mjs';
import {equalOriginMean,originBootstrap,nonoverlap,fundingSummary,qualify}from './calibration/statistics.mjs';
import {schoolPlan,compileSchool,observedGross}from './calibration/ledger.mjs';
import {parseCpi,actualBillRows,scoreBills}from './cost-followup-helpers.mjs';
import {fitHierarchy}from '../site/js/cost-hierarchy.js';
import {calibrationFactory,canonical}from '../site/js/calibration.js';
import {runPath}from '../site/js/engine.js';
import {capHouseholdContributions}from '../site/js/household.js';
import {MODEL}from '../site/js/domain.js';
import {quantile}from '../site/js/random.js';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const base=read('site/data/calibration-foundation.json'),table=parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString()),cpi=parseCpi(readFileSync('data/raw/cpi.csv','utf8'));
const sectors=Object.keys(SECTORS),trials=400,innerTrials=128,seed=850213,levels=[.55,.70,.85,1,1.15];
const endpointErrors=[],endpointMissing=[],costCases=[],fundingCases=[],householdCases=[],cohortAudit=[],fitAudit=[];
const split=last=>last<=2016?'development':last>=2020?'final':'transition';
function context(origin,withHierarchy=false){
 const cohorts=Object.fromEntries(sectors.map(s=>[s,cohortAt(table,origin,s,cpi)])),bundle=originBundle(base,origin,cohorts);
 const hierarchy=withHierarchy?{...bundle,costHierarchy:{id:'paired-real-cost-hierarchy-v1',sectors:Object.fromEntries(sectors.map(s=>[s,fitHierarchy(cohorts[s].fit.flatMap(x=>x.rows),origin)]))}}:null;
 return {cohorts,bundle,hierarchy};
}
function samples(cohort){return [['known',cohort.known],['unknown',cohort.unknown]].flatMap(([kind,schools])=>schools.map(s=>({...s,kind})));}
function metric(values,actual){
 const sorted=[...values].sort((a,b)=>a-b),p10=quantile(sorted,.1),p50=quantile(sorted,.5),p90=quantile(sorted,.9);
 if(actual===null)return {p10,p50,p90,actual:null,score:null,bias:null,covered:null,width:null,pit:null};
 return {...scoreBills(sorted,actual),width:(p90-p10)/actual,absBias:Math.abs(p50/actual-1),pit:(sorted.filter(x=>x<actual).length+.5*sorted.filter(x=>x===actual).length)/sorted.length};
}
for(let origin=2010;origin<=2018;origin++){
 const ctx=context(origin);
 for(const sector of sectors)for(const school of samples(ctx.cohorts[sector]))for(const horizon of [2,5,10]){
  const target=origin+horizon;if(target>2020)continue;
  const outcome=outcomeLevels(table,school.unitid,origin,target,sector,cpi);
  if(outcome.status!=='observed'){endpointMissing.push({origin,sector,kind:school.kind,unitid:school.unitid,horizon,target,status:outcome.status});continue;}
  const level=school.rows.at(-1),x=schoolPlan(origin,horizon,level,sector);x.sc.years=1;
  const c=compileSchool(x,ctx.bundle,school),factory=calibrationFactory(c,ctx.bundle,{seed}),prices={tuition:[],housing:[]};
  for(let t=0;t<innerTrials;t++){
   const r=factory.make(t).compiled.rows[c.enrollmentIndex];
   for(const k of ['tuition','housing'])prices[k].push(r.costs[k]/r.valuationCosts[k]*level[k]);
  }
  const actual=outcome.levels.at(-1),med=k=>quantile(prices[k].sort((a,b)=>a-b),.5);
  endpointErrors.push({origin,target,horizon,sector,kind:school.kind,unitid:school.unitid,tuition:Math.log(actual.tuition/med('tuition')),housing:Math.log(actual.housing/med('housing'))});
 }
 console.log('Completed endpoint origin',origin);
}
for(let origin=2011;origin<=2020;origin++){
 const ctx=context(origin,true);
 for(const sector of sectors){
  const cohort=ctx.cohorts[sector];cohortAudit.push({origin,sector,...cohort.counts,trainingHash:hash(cohort.training.map(s=>s.unitid).join(',')),hierarchyTrainingIds:cohort.fit.map(s=>s.unitid),knownIds:cohort.known.map(s=>s.unitid),unknownIds:cohort.unknown.map(s=>s.unitid)});
  for(const school of samples(cohort))for(const wait of [0,4,8]){
   const lastBillYear=origin+wait+3,identity={origin,sector,kind:school.kind,unitid:school.unitid,wait,lastBillYear,split:split(lastBillYear)};
   const outcome=lastBillYear>2023?{status:'unreached-window',levels:null}:outcomeLevels(table,school.unitid,origin,lastBillYear,sector,cpi);
   const level=school.rows.at(-1),curve=fitSchoolCurve(endpointErrors,{origin,sector,kind:school.kind});
   const support=curve.knots.length>0&&curve.knots.at(-1).horizon>=wait+3&&curve.knots.every(k=>k.count>=3);
   if(!fitAudit.some(r=>r.origin===origin&&r.sector===sector&&r.kind===school.kind))fitAudit.push({origin,sector,kind:school.kind,knots:curve.knots.map(({horizon,targetYears,count,groups})=>({horizon,targetYears,count,trainingIds:[...new Set(groups.flatMap(g=>g.errors.map(r=>r.unitid)))].sort((a,b)=>a-b)}))});
   if(outcome.status==='unreached-window'){
    for(const model of ['baseline','hierarchy','residual'])costCases.push({...identity,model,status:outcome.status});
    for(const profile of ['cash','balanced'])for(const factor of levels)fundingCases.push({...identity,profile,factor,status:outcome.status,probability:null,actual:null});
    continue;
   }
   const x=schoolPlan(origin,wait,level,sector),c=compileSchool(x,ctx.bundle,school);
   const actualCompiled=outcome.levels?{...c,rows:actualBillRows(c,outcome.levels,cpi,origin)}:null;
   const actualCost=actualCompiled?runPath(actualCompiled,()=>1,0,false):null;
   const amounts={baseline:{total:[],tuition:[],housing:[],real:[]},hierarchy:{total:[],tuition:[],housing:[],real:[]},residual:{total:[],tuition:[],housing:[],real:[]}};
   for(const profile of ['cash','balanced']){
    x.st.funding.history.profile=profile;const compiled=compileSchool(x,ctx.bundle,school),f=calibrationFactory(compiled,ctx.bundle,{seed});
    const observed=actualCompiled?{...compiled,rows:actualCompiled.rows}:null,gross=observed?observedGross(compiled,origin,base):null;
    const annual=level.tuition+level.housing,actuals=levels.map(factor=>observed?runPath({...observed,opening:4*annual*factor},i=>gross[i],compiled.monthly,false):null),counts=levels.map(()=>0);
    const h=profile==='balanced'?calibrationFactory(compileSchool(x,ctx.hierarchy,school),ctx.hierarchy,{seed}):null;
    for(let t=0;t<trials;t++){
     const path=f.make(t);
     for(let j=0;j<levels.length;j++)if(runPath({...path.compiled,opening:4*annual*levels[j]},i=>path.gross[i],compiled.monthly,false).success)counts[j]++;
     if(profile==='balanced')for(const [model,p]of [['baseline',path],['hierarchy',h.make(t)],['residual',correctedPath(path,curve,seed,t)]]){
      const r=runPath(p.compiled,i=>p.gross[i],compiled.monthly,false);amounts[model].total.push(r.total);amounts[model].tuition.push(r.tuitionTotal);amounts[model].housing.push(r.total-r.tuitionTotal);amounts[model].real.push(r.realTotal);
     }
    }
    for(let j=0;j<levels.length;j++)fundingCases.push({...identity,profile,factor:levels[j],status:outcome.status,probability:counts[j]/trials,actual:actuals[j]?Number(actuals[j].success):null,firstUnpaid:actuals[j]?.firstUnpaid||null});
   }
   for(const model of ['baseline','hierarchy','residual']){
    const a=amounts[model],r=metric(a.total,actualCost?.total??null);
    costCases.push({...identity,model,status:outcome.status,residualSupported:support,...r,
     tuition:metric(a.tuition,actualCost?.tuitionTotal??null),housing:metric(a.housing,actualCost?actualCost.total-actualCost.tuitionTotal:null),real:metric(a.real,actualCost?.realTotal??null),
     macroLast:ctx.bundle.economy.macroYears.at(-1).year,costLast:origin});
   }
  }
 }
 // Synthetic household policies: same vs different known schools, second entry +2y.
 for(const wait of [0,4,8])for(const configuration of ['same-school','different-schools'])for(const factor of [.7,1])for(const capped of [false,true]){
  const lastBillYear=origin+wait+5,info={origin,sector:configuration,kind:'household',profile:'balanced',configuration,factor,capped,wait,lastBillYear,split:split(lastBillYear)};
  if(lastBillYear>2023){householdCases.push({...info,status:'unreached-window',probability:null,actual:null});continue;}
  const a=ctx.cohorts.public4.known[0],secondSector=configuration==='same-school'?'public4':'private4',b=configuration==='same-school'?a:ctx.cohorts[secondSector].known[0];
  if(!a||!b){householdCases.push({...info,status:'missing-origin-school',probability:null,actual:null});continue;}
  const choices=[{school:a,sector:'public4',wait},{school:b,sector:secondSector,wait:wait+2}];
  const plans=choices.map(({school,sector,wait})=>schoolPlan(origin,wait,school.rows.at(-1),sector));
  const p=plans[0].p;p.students=[plans[0].st,plans[1].st];
  const annuals=choices.map(({school})=>school.rows.at(-1).tuition+school.rows.at(-1).housing);
  p.family.monthlyLimit=capped?.0075*(annuals[0]+annuals[1]):null;
  const compiled=choices.map(({school},j)=>compileSchool({...plans[j],p},ctx.bundle,{kind:'known',unitid:school.unitid}));
  compiled.forEach((c,j)=>c.opening=4*annuals[j]*factor);
  const beforePeak=Math.max(...Array.from({length:Math.max(...compiled.map(c=>c.rows.length))},(_,i)=>compiled.reduce((s,c)=>s+(c.rows[i]?.factor||0)*c.monthly,0)));
  const schedule=capHouseholdContributions(compiled,p.family.monthlyLimit),factories=compiled.map(c=>calibrationFactory(c,ctx.bundle,{seed}));
  const outcomes=choices.map(({school,sector,wait})=>outcomeLevels(table,school.unitid,origin,origin+wait+3,sector,cpi));
  const missing=outcomes.find(o=>o.status!=='observed');let actual=null,firstUnpaid=null;
  if(!missing){
   const observed=compiled.map((c,j)=>{const gross=observedGross(c,origin,base);return runPath({...c,rows:actualBillRows(c,outcomes[j].levels,cpi,origin)},i=>gross[i],c.monthly,false);});
   actual=Number(observed.every(r=>r.success));firstUnpaid=observed.map(r=>r.firstUnpaid).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
  }
  let passed=0;for(let t=0;t<trials;t++){let success=true;for(let j=0;j<compiled.length;j++){const path=factories[j].make(t);success &&=runPath(path.compiled,i=>path.gross[i],compiled[j].monthly,false).success;}passed+=Number(success);}
  householdCases.push({...info,status:missing?.status||'observed',probability:passed/trials,actual,firstUnpaid,monthlyLimit:p.family.monthlyLimit,uncappedPeak:beforePeak,peak:Math.max(...schedule),capBinds:capped&&beforePeak>p.family.monthlyLimit});
 }
 console.log('Completed school and funding origin',origin);
}
const report=buildCurrentReport({base,table,cpi,costCases,fundingCases,householdCases,endpointErrors,endpointMissing,cohortAudit,fitAudit,trials,innerTrials,seed});
console.log(JSON.stringify({schoolCases:costCases.length,fundingCases:fundingCases.length,householdCases:householdCases.length,qualifications:report.qualifications}));
