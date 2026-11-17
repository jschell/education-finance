import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve,dirname,relative} from 'node:path';
import {SECTORS,parseSchools,cohortAt,originBundle,outcomeLevels} from './calibration/schools.mjs';
import {schoolPlan,compileSchool,observedGross} from './calibration/ledger.mjs';
import {fundingSummary,equalOriginMean} from './calibration/statistics.mjs';
import {parseCpi,actualBillRows} from './cost-followup-helpers.mjs';
import {calibrationFactory,canonical} from '../site/js/calibration.js';
import {MODEL} from '../site/js/domain.js';
import {runPath,repriceRow} from '../site/js/engine.js';
import {DECISION_VERSION,requiredOpening,boundaryReserves} from '../site/js/decision-scenarios.js';
import {allocateDeposits} from '../site/js/deposit-policy.js';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const base=read('site/data/calibration-foundation.json'),table=parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString()),cpi=parseCpi(readFileSync('data/raw/cpi.csv','utf8'));
const trials=512,seed=714903,individual=[],household=[],selection=[];
function observed(c,school,origin,last,sector){
 const outcome=last>2023?{status:'unreached-window',levels:null}:outcomeLevels(table,school.unitid,origin,last,sector,cpi);
 return {...outcome,path:outcome.levels?{compiled:{...c,rows:actualBillRows(c,outcome.levels,cpi,origin)},gross:observedGross(c,origin,base)}:null};
}
const score=(c,path)=>runPath({...path.compiled,opening:c.opening},i=>path.gross[i],c.monthly,false);
function zeroReference(c){return {...c,rows:c.rows.map(r=>repriceRow(r,1,1,1,1))};}
for(let origin=2011;origin<=2020;origin++){
 const cohorts=Object.fromEntries(Object.keys(SECTORS).map(s=>[s,cohortAt(table,origin,s,cpi)])),bundle=originBundle(base,origin,cohorts);
 for(const sector of ['public4','private4'])for(const kind of ['known','unknown'])for(const wait of [0,4,8])for(const profile of ['cash','balanced']){
  const school=cohorts[sector][kind][0],lastBillYear=origin+wait+3,identity={origin,sector,kind,wait,profile,lastBillYear};
  if(!school){individual.push({...identity,status:'missing-origin-school',probability:null,actual:null});continue;}
  const x=schoolPlan(origin,wait,school.rows.at(-1),sector,profile),c=compileSchool(x,bundle,{...school,kind}),factory=calibrationFactory(c,bundle,{seed}),requirements=[];
  // Resource choices are frozen from fitting draws before any verification or outcome lookup.
  for(let t=0;t<trials;t++){const p=factory.make(t);requirements.push(requiredOpening(p.compiled,p.gross));}
  const choices=boundaryReserves(requirements),audit={...identity,unitid:school.unitid,macroLast:bundle.economy.macroYears.at(-1).year,costLast:origin,choices};selection.push(audit);
  const counts=choices.map(()=>0),gaps=choices.map(()=>0);
  for(let t=0;t<trials;t++){
   const p=factory.verify(t);
   choices.forEach(({opening},j)=>{const r=score({...c,opening},p);counts[j]+=Number(r.success);gaps[j]+=r.shortfall;});
  }
  const outcome=observed(c,school,origin,lastBillYear,sector);
  choices.forEach(({opening,aliases},j)=>{
   const fixed=runPath({...c,opening},undefined,c.monthly,false),zero=runPath({...zeroReference(c),opening},()=>1,c.monthly,false),actual=outcome.path?score({...c,opening},outcome.path):null;
   individual.push({...identity,unitid:school.unitid,opening,aliases,status:outcome.status,probability:counts[j]/trials,
    fixedReference:Number(fixed.success),zeroReference:Number(zero.success),meanSimulatedUnpaid:gaps[j]/trials,
    actual:actual?Number(actual.success):null,actualUnpaid:actual?.shortfall??null,firstUnpaid:actual?.firstUnpaid??null});
  });
 }
 // Binding caps at entry as well as during attendance. No resource retuning per policy.
 for(const wait of [0,4,8]){
  const choices=[{school:cohorts.public4.known[0],sector:'public4',wait},{school:cohorts.private4.known[0],sector:'private4',wait:wait+2}],lastBillYear=origin+wait+5,
   identity={origin,sector:'public4-private4',kind:'household',profile:'balanced',wait,lastBillYear};
  if(choices.some(x=>!x.school)){household.push({...identity,status:'missing-origin-school',probability:null,actual:null});continue;}
  const annuals=choices.map(({school})=>school.rows.at(-1).tuition+school.rows.at(-1).housing),total=annuals.reduce((a,b)=>a+b,0),weights=annuals.map(x=>x/total),cap=.0075*total;
  const reference=choices.map(({school,sector,wait})=>{
   const x=schoolPlan(origin,wait,school.rows.at(-1),sector);Object.assign(x.st.funding,{monthly:.01*(school.rows.at(-1).tuition+school.rows.at(-1).housing),stepUp:0,contributionEnd:`${origin+wait+3}-05`});
   return compileSchool(x,bundle,{...school,kind:'known'});
  });
  const factories=reference.map(c=>calibrationFactory(c,bundle,{seed})),requirements=[];
  // Fixed policy's cent-rounded schedule determines pathwise joint reserve requirements.
  for(let t=0;t<trials;t++){
   const paths=factories.map(f=>f.make(t)),allocation=allocateDeposits(reference,paths,cap,'fixed');
   requirements.push(Math.max(...paths.map((p,j)=>requiredOpening({...p.compiled,monthly:1,rows:p.compiled.rows.map((r,i)=>({...r,factor:allocation.schedule[i].allocations[j]}))},p.gross)/weights[j])));
  }
  const reserves=boundaryReserves(requirements,[.9]),outcomes=choices.map(({school,sector,wait},j)=>observed(reference[j],school,origin,origin+wait+3,sector)),missing=outcomes.find(o=>o.status!=='observed');
  selection.push({...identity,unitids:choices.map(x=>x.school.unitid),weights,cap,choices:reserves,macroLast:bundle.economy.macroYears.at(-1).year,costLast:origin});
  const rows=reserves.map(({opening,aliases})=>{
   const refs=reference.map((c,j)=>({...c,opening:Math.ceil(opening*weights[j]*100)/100}));
   return {opening,aliases,refs,fixed:{passed:0,gap:0},'dated-priority':{passed:0,gap:0}};
  });
  for(let t=0;t<trials;t++){
   const paths=factories.map(f=>f.verify(t));
   for(const row of rows){const matched=paths.map((p,j)=>({...p,compiled:{...p.compiled,opening:row.refs[j].opening}}));
    const fixed=allocateDeposits(row.refs,matched,cap,'fixed'),priority=allocateDeposits(row.refs,matched,cap,'dated-priority');
    assert.deepEqual(fixed.schedule.map(x=>x.amount),priority.schedule.map(x=>x.amount));assert.ok(fixed.bindingMonths>0);
    for(const [policy,result] of [['fixed',fixed],['dated-priority',priority]]){row[policy].passed+=Number(result.success);row[policy].gap+=result.shortfall;}
   }
  }
  for(const row of rows)for(const policy of ['fixed','dated-priority']){
   const paths=outcomes.map((o,j)=>o.path?{...o.path,compiled:{...o.path.compiled,opening:row.refs[j].opening}}:null),actual=missing?null:allocateDeposits(row.refs,paths,cap,policy),
    example=allocateDeposits(row.refs,row.refs.map(c=>({compiled:c,gross:c.rows.map(()=>1)})),cap,policy);
   household.push({...identity,opening:row.opening,aliases:row.aliases,policy,status:missing?.status||'observed',probability:row[policy].passed/trials,
    actual:actual?Number(actual.success):null,actualUnpaid:actual?.shortfall??null,firstUnpaid:actual?.firstUnpaid??null,
    meanSimulatedUnpaid:row[policy].gap/trials,cap,peak:example.peak,bindingMonths:example.bindingMonths,totalDeposits:example.deposits});
  }
 }
 console.log('Decision-boundary origin completed',origin);
}
function summarize(rows){
 const xs=rows.filter(r=>r.status==='observed');
 return {...fundingSummary(rows),interior05to95:xs.filter(r=>r.probability>.05&&r.probability<.95).length,
  extremes:xs.filter(r=>r.probability===0||r.probability===1).length,
  statuses:Object.fromEntries([...new Set(rows.map(r=>r.status))].sort().map(s=>[s,rows.filter(r=>r.status===s).length])),
  fixedReferenceBrier:xs.every(r=>'fixedReference' in r)?equalOriginMean(xs.map(r=>({...r,score:(r.fixedReference-r.actual)**2})),'score'):null,
  zeroReferenceBrier:xs.every(r=>'zeroReference' in r)?equalOriginMean(xs.map(r=>({...r,score:(r.zeroReference-r.actual)**2})),'score'):null,
  meanObservedUnpaid:equalOriginMean(xs,'actualUnpaid')};
}
const groups=[0,4,8].flatMap(wait=>['cash','balanced'].flatMap(profile=>['known','unknown'].map(kind=>({wait,profile,kind,...summarize(individual.filter(r=>r.wait===wait&&r.profile===profile&&r.kind===kind))})))),
 policies=[0,4,8].flatMap(wait=>['fixed','dated-priority'].map(policy=>({wait,policy,...summarize(household.filter(r=>r.wait===wait&&r.policy===policy))}))),
 paired=household.filter(r=>r.policy==='fixed'&&r.status==='observed').map(r=>{
 const other=household.find(x=>x.origin===r.origin&&x.wait===r.wait&&x.opening===r.opening&&x.policy==='dated-priority');
 return {origin:r.origin,wait:r.wait,opening:r.opening,fixed:r.actual,priority:other.actual,gapChange:other.actualUnpaid-r.actualUnpaid};
 });
mkdirSync('data/decision-cases',{recursive:true});
for(const [name,body] of [['individual',individual],['household',household],['selection',selection]])writeFileSync(`data/decision-cases/${name}.json`,JSON.stringify(body)+'\n');
const sources=['docs/decision-release-plan.md','scripts/validate-decision-boundaries.mjs','scripts/calibration/schools.mjs','scripts/calibration/ledger.mjs','scripts/calibration/statistics.mjs','scripts/validation-inputs.mjs','scripts/full-calibration-inputs.mjs','scripts/cost-followup-helpers.mjs','site/js/decision-scenarios.js','site/js/deposit-policy.js','site/js/domain.js','site/js/engine.js','site/js/calibration.js','site/js/history.js','site/js/random.js','site/js/economy.js','site/js/planning.js','site/js/history-config.js','site/js/cost-hierarchy.js','site/js/cost-correction.js','site/js/cost-recalibration.js','site/data/calibration-foundation.json','data/raw/ipeds/selected.csv.gz','data/raw/cpi.csv',...['individual','household','selection'].map(n=>`data/decision-cases/${n}.json`)];
// Record the complete static module dependency closure, including inactive hooks.
const sourceSet=new Set(sources);
function visit(path){
 if(!/\.[cm]?js$/.test(path))return;
 const text=readFileSync(path,'utf8');
 for(const m of text.matchAll(/from\s*['"](\.[^'"]+)['"]/g)){
  const dependency=relative(process.cwd(),resolve(dirname(path),m[1].split('?')[0]));
  if(!sourceSet.has(dependency)){sourceSet.add(dependency);visit(dependency);}
 }
}
for(const path of sources)visit(path);
const body={id:'decision-boundary-validation-v1',method:DECISION_VERSION,modelVersion:MODEL,bundleHash:base.sha256,seed,trials,fitTrials:trials,
 sourceHashes:Object.fromEntries([...sourceSet].sort().map(p=>[p,hash(readFileSync(p))])),individual:summarize(individual),groups,policies,
 householdPolicyPairs:{observed:paired.length,priorityImproves:paired.filter(r=>r.priority>r.fixed).length,priorityWorsens:paired.filter(r=>r.priority<r.fixed).length,sameFunding:paired.filter(r=>r.priority===r.fixed).length,meanUnpaidChange:paired.length?paired.reduce((v,r)=>v+r.gapChange,0)/paired.length:null},
 selection:{schoolIdentities:new Set(individual.map(r=>r.unitid).filter(Boolean)).size,householdSchoolIdentities:new Set(selection.filter(r=>r.kind==='household').flatMap(r=>r.unitids||[])).size,cells:selection.length,registeredIndividual:individual.length,registeredHousehold:household.length,deduplicatedAliases:selection.reduce((v,r)=>v+r.choices.reduce((n,c)=>n+c.aliases.length-1,0),0)},
 limitations:['Retrospective extension on previously inspected histories; no new untouched holdout or production promotion.','Origin cohorts, revised source data and reconstructed return anchors are not original publication vintages.','Related reserves, school identities and overlapping origins are dependent; plan counts are not independent economic decades.','Wait-8 household complete outcomes are unavailable. Numerical decision tests do not establish future probability calibration.','Dated-bill priority uses reference future bills and current realized data only; it is not globally optimal.']};
body.sha256=hash(canonical(body));writeFileSync('site/data/decision-validation.json',JSON.stringify(body)+'\n');
console.log(JSON.stringify({individual:body.individual,policies:body.policies,pairs:body.householdPolicyPairs,selection:body.selection}));
