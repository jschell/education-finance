import {readFileSync,writeFileSync,mkdirSync}from 'node:fs';
import {createHash}from 'node:crypto';
import {canonical}from '../../site/js/calibration.js';
import {MODEL}from '../../site/js/domain.js';
import {equalOriginMean,originBootstrap,nonoverlap,fundingSummary,qualify}from './statistics.mjs';
import {priceAt}from './schools.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function originScore(metric,normalizer){
 if(!(normalizer>0))throw Error('A positive known origin budget must normalize scores.');
 const result={...metric,normalizer};
 if(metric.actual===null)return result;
 result.rawIntervalScore=metric.p90-metric.p10+10*Math.max(0,metric.p10-metric.actual)+10*Math.max(0,metric.actual-metric.p90);
 result.score=result.rawIntervalScore/normalizer;result.width=(metric.p90-metric.p10)/normalizer;
 return result;
}
export function buildCurrentReport({base,table,cpi,costCases,fundingCases,householdCases,endpointErrors,endpointMissing,cohortAudit,fitAudit,trials=400,innerTrials=128,seed=850213}){
 for(let i=0;i<costCases.length;i++){
  const r=costCases[i];if(r.p10===undefined)continue;
  const p=priceAt(table,r.unitid,r.origin,r.sector,cpi);
  if(p.status!=='observed')throw Error('Missing known origin budget during scoring.');
  costCases[i]={...originScore(r,4*(p.tuition+p.housing)),tuition:originScore(r.tuition,4*p.tuition),housing:originScore(r.housing,4*p.housing),real:originScore(r.real,4*(p.tuition+p.housing))};
 }
function costSummary(rows){
 const xs=rows.filter(r=>r.status==='observed');
 const stats=Object.fromEntries(['score','bias','absBias','covered','below','above','width','pit'].map(k=>[k,equalOriginMean(xs,k)]));
 return {cases:rows.length,observed:xs.length,unavailable:rows.length-xs.length,origins:new Set(xs.map(r=>r.origin)).size,nonoverlappingWindows:nonoverlap(xs),...stats,clusterInterval:originBootstrap(xs,'score'),
  tuition:equalOriginMean(xs.map(r=>({...r,score:r.tuition.score})),'score'),housing:equalOriginMean(xs.map(r=>({...r,score:r.housing.score})),'score'),real:equalOriginMean(xs.map(r=>({...r,score:r.real.score})),'score')};
}
const schoolSummary=[];
for(const splitName of ['all','development','transition','final'])for(const kind of ['known','unknown'])for(const wait of [0,4,8])for(const model of ['baseline','hierarchy','residual']){
 const rows=costCases.filter(r=>r.kind===kind&&r.wait===wait&&r.model===model&&(splitName==='all'||r.split===splitName));
 schoolSummary.push({split:splitName,kind,wait,model,...costSummary(rows)});
}
const individualSummary=[];
for(const kind of ['known','unknown'])for(const wait of [0,4,8])for(const profile of ['cash','balanced'])individualSummary.push({kind,wait,profile,...fundingSummary(fundingCases.filter(r=>r.kind===kind&&r.wait===wait&&r.profile===profile))});
const householdSummary=[0,4,8].flatMap(wait=>[false,true].map(capped=>({wait,capped,...fundingSummary(householdCases.filter(r=>r.wait===wait&&r.capped===capped))})));
const qualifications=['hierarchy','residual'].flatMap(model=>['known','unknown'].flatMap(kind=>[0,4,8].map(wait=>qualify(costCases,model,kind,wait))));
mkdirSync('data/calibration-cases',{recursive:true});
const files={'data/calibration-cases/school-costs.json':costCases,'data/calibration-cases/individual-funding.json':fundingCases,'data/calibration-cases/household-funding.json':householdCases,'data/calibration-cases/endpoint-errors.json':{records:endpointErrors,unavailable:endpointMissing}};
for(const [path,body]of Object.entries(files))writeFileSync(path,JSON.stringify(body)+'\n');
const sourcePaths=['docs/forecast-calibration-plan.md','scripts/validate-current-calibration.mjs','scripts/calibration/report.mjs','scripts/calibration/schools.mjs','scripts/calibration/residuals.mjs','scripts/calibration/statistics.mjs','scripts/calibration/ledger.mjs','site/js/calibration.js','site/js/engine.js','site/js/economy.js','site/js/cost-hierarchy.js','site/js/household.js','data/raw/ipeds/selected.csv.gz','data/raw/cpi.csv'];
const report={id:'school-and-current-funding-calibration-v1',modelVersion:MODEL,bundleHash:base.sha256,seed,trials,innerTrials,protocolRevision:'frozen-before-financial-scores',
 sourceHashes:Object.fromEntries(sourcePaths.map(p=>[p,hash(readFileSync(p))])),caseHashes:Object.fromEntries(Object.keys(files).map(p=>[p,hash(readFileSync(p))])),cohortAudit,fitAudit,schoolSummary,individualSummary,householdSummary,qualifications,
 unsupportedHorizons:[{wait:18,status:'insufficient-evidence',reason:'No complete 18-year-wait plus four-year attendance outcome with the required origin training history in comparable 2000–2023 prices.'}],activated:false,status:'Retrospective school and synthetic funding evidence; current forward probability calibration remains unestablished.',
 limitations:['Published revised price histories are not original publication vintages. Cohorts include established positive-price on-campus schools only.','Origin-only cohort reconstruction differs from the full-window survivor panels in the current forward bundle; this diagnoses the model process, not current SPF anchors.','Six schools per origin/sector/type and at most 200 hierarchy training schools bound runtime; school selection is identity-based, not a census.','Related sectors, plans, schools and overlapping outcomes share economic years. Case counts are not independent evidence.','The final economic years have appeared in earlier studies; this frozen comparison is retrospective, not a new untouched experiment.','Reconstructed instruments and fixed synthetic aid, deposits and household choices do not represent observed family behavior.','Passing a cost qualification does not activate a model or validate its funding probabilities. Missing long-horizon support remains explicit.']};
report.scoreNormalization='Known four-year origin category budget; weights do not depend on realized outcomes.';
report.sha256=hash(canonical(report));writeFileSync('site/data/current-calibration.json',JSON.stringify(report)+'\n');
return report;
}
