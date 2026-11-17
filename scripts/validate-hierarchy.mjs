import {readFileSync,writeFileSync}from 'node:fs';
import {gunzipSync}from 'node:zlib';
import {createHash}from 'node:crypto';
import {fitHierarchy}from '../site/js/cost-hierarchy.js';
import {historicalInputs}from './validation-inputs.mjs';
import {planFor}from './full-calibration-inputs.mjs';
import {compileCalibrated,calibrationFactory,canonical}from '../site/js/calibration.js';
import {runPath}from '../site/js/engine.js';
import {actualBillRows,parseCpi,scoreBills,summarizeCost}from './cost-followup-helpers.mjs';
import {eligibleGate}from './overhaul-gate.mjs';
const read=p=>JSON.parse(readFileSync(p));
const legacy=read('data/legacy-ipeds-audit.json');
const base=read('site/data/calibration-foundation.json'),panel=JSON.parse(gunzipSync(readFileSync('data/ipeds-institutions.json.gz'))),cpi=parseCpi(readFileSync('data/raw/cpi.csv','utf8'));
const sectors=Object.keys(base.prices),trials=400,seed=850213,outer=[],fits=[],growth=[];
function recordsFor(sector){return panel.series[sector].flatMap(s=>panel.years.map((year,i)=>({unitid:s.unitid,year,tuition:s.tuition[i],housing:s.housing[i],deflator:base.prices[sector].find(p=>p.year===year).deflator})));}
const records=Object.fromEntries(sectors.map(s=>[s,recordsFor(s)]));
for(const sector of sectors){
 const xs=panel.series[sector].filter(s=>s.tuition.every(v=>v>0)&&s.housing.every(v=>v>0));
 const rates=xs.map(s=>(s.tuition.at(-1)/s.tuition[13])**.1-1).sort((a,b)=>a-b);
 growth.push({sector,institutions:xs.length,from:2013,to:2023,tuitionCagr:{p10:rates[Math.floor((rates.length-1)*.1)],p50:rates[Math.floor((rates.length-1)*.5)],p90:rates[Math.floor((rates.length-1)*.9)]}});
}
for(let origin=2011;origin<=2020;origin++){
 const baseline=historicalInputs(base,origin),bySector=Object.fromEntries(sectors.map(s=>[s,fitHierarchy(records[s],origin)]));
 const candidate={...baseline,costCorrection:null,costUncertainty:null,costRecalibration:null,costHierarchy:{id:'paired-real-cost-hierarchy-v1',sectors:bySector}};
 fits.push({origin,sectors:sectors.map(sector=>({sector,institutions:bySector[sector].institutions,years:bySector[sector].years,lastTransition:bySector[sector].lastTransition,center:bySector[sector].center,signal:bySector[sector].signal}))});
 for(const wait of [0,4,8]){
  if(origin+wait+3>2023)continue;
  for(const sector of sectors){
   const prices=base.prices[sector],level=prices.find(p=>p.year===origin),{p,st,sc}=planFor(origin,wait,level,sector);
   const {c}=compileCalibrated(p,st,sc,baseline);
   const actual=runPath({...c,rows:actualBillRows(c,prices,cpi,origin)},()=>1,0,false).total;
   const models={};
   for(const [model,bundle]of [['production',baseline],['hierarchy',candidate]]){
    const {c}=compileCalibrated(p,st,sc,bundle);
    // Stable explicit unknown school key; random UI IDs never enter evaluation.
    c.costSchoolKey='unknown:synthetic-school:'+sector;
    const factory=calibrationFactory(c,bundle,{seed}),costs=[];
    for(let t=0;t<trials;t++){const x=factory.make(t);costs.push(runPath(x.compiled,i=>x.gross[i],0,false).total);}
    models[model]=scoreBills(costs,actual);
   }
   outer.push({origin,wait,sector,lastBillYear:origin+wait+3,macroLast:baseline.economy.macroYears.at(-1).year,costLast:baseline.prices[sector].at(-1).year,models});
  }
 }
 console.log('Hierarchy origin',origin);
}
const selection=[...new Set(outer.map(r=>r.origin))].map(origin=>({origin,targetYears:[...new Set(outer.filter(r=>r.lastBillYear<origin).map(r=>r.lastBillYear))]}));
const gate=eligibleGate(outer,selection,'hierarchy');
const report={id:'coherent-cost-evaluation-v1',bundleHash:base.sha256,trials,seed,protocolHash:createHash('sha256').update(readFileSync('docs/hierarchical-cost-protocol.md')).digest('hex'),
 sourceHashes:Object.fromEntries(['site/js/cost-hierarchy.js','site/js/calibration.js','scripts/validate-hierarchy.mjs','data/ipeds-institutions.json.gz'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),
 legacyAudit:{status:legacy.status,selectedInstitutions:legacy.selectedInstitutions,counts:legacy.counts,bridgeAudit:legacy.bridgeAudit,hash:createHash("sha256").update(readFileSync("data/legacy-ipeds-audit.json")).digest("hex")},
 fits,growth,outer,summaries:['production','hierarchy'].map(m=>summarizeCost(outer,m)),gate,promoted:gate.promoted,
 limitations:['Comparison targets sector fixed-school geometric price indices, not net prices or a verified distribution of individual-school outcomes.','Full-window membership selects survivors; each origin truncates observations but not original membership.','Unknown-school effects are explicit candidate uncertainty; school-specific probability calibration is unestablished.','No legacy residual/spread layers; no candidate score was used to retune the fit.','1990s tuition research bridge is not spliced across its population-definition break.','Insufficient eligible long-wait support prevents promotion even if aggregate scores improve.']};
report.sha256=createHash('sha256').update(canonical(report)).digest('hex');
writeFileSync('site/data/hierarchy-validation.json',JSON.stringify(report)+'\n');
console.log(JSON.stringify({summaries:report.summaries,gate:gate.status,promoted:gate.promoted}));
