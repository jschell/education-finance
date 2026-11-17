// Descriptive source sensitivity and nonoverlapping growth diagnostics; no forecast fitting.
import {SECTORS,cohortAt,priceAt} from './schools.mjs';
import {equalOriginMean} from './statistics.mjs';
export const QUALITY_MODES=['all','reported-only','reported-or-corrected'];
export const WINDOWS=[[[2000,2004],[2005,2009]],[[2000,2009],[2010,2019]],[[2010,2014],[2015,2019]]];
export const GAPPED_WINDOWS=[[[2000,2004],[2006,2010]],[[2000,2008],[2011,2019]]];
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
export function classifyFlag(dictionaries,year,field,code){
 const label=dictionaries[year]?.fields[field]?.codes[code];
 if(!label)return 'unclassified';
 if(label.trim().toLowerCase()==='reported')return 'reported';
 if(label.trim().toLowerCase()==='analyst corrected reported value')return 'corrected';
 return 'other-documented';
}
export function levelQuality(table,dictionaries,unitid,sector,start,end){
 const result={reported:0,corrected:0,'other-documented':0,unclassified:0,missing:0,changedSector:0};
 const field=SECTORS[sector].field;
 for(let year=start;year<=end;year++){
  const row=table.get(unitid)?.get(year);
  if(!row){result.missing+=2;continue;}
  if(+row.SECTOR!==SECTORS[sector].raw)result.changedSector++;
  for(const f of [field,'CHG5AY3']){
   if(!(Number.isFinite(+row[f])&&+row[f]>0)){result.missing++;continue;}
   result[classifyFlag(dictionaries,year,f,row['X'+f]||'')]++;
  }
 }
 return result;
}
export function qualityAllowed(quality,mode){
 if(!QUALITY_MODES.includes(mode))throw Error('Unknown quality mode');
 if(quality.missing||quality.changedSector)return false;
 return mode==='all'||(!quality.unclassified&&!quality['other-documented']&&(mode!=='reported-only'||!quality.corrected));
}
export function caseSensitivity(cases,table,dictionaries){
 const baseline=cases.filter(r=>r.model==='baseline'),summaries=[];
 for(const kind of ['known','unknown'])for(const wait of [0,4,8]){
  const registered=baseline.filter(r=>r.kind===kind&&r.wait===wait),observed=registered.filter(r=>r.status==='observed');
  const rows=observed.map(r=>({...r,quality:levelQuality(table,dictionaries,r.unitid,r.sector,r.origin,r.lastBillYear)}));
  const statuses={};for(const r of registered)statuses[r.status]=(statuses[r.status]||0)+1;
  const groups=QUALITY_MODES.map(mode=>{
   const xs=rows.filter(r=>qualityAllowed(r.quality,mode));
   return {mode,cases:xs.length,excludedObserved:rows.length-xs.length,origins:[...new Set(xs.map(r=>r.origin))].sort(),
    sectors:[...new Set(xs.map(r=>r.sector))].sort(),institutions:new Set(xs.map(r=>r.unitid)).size,
    covered:equalOriginMean(xs,'covered'),score:equalOriginMean(xs,'score'),bias:equalOriginMean(xs,'bias'),below:equalOriginMean(xs,'below'),above:equalOriginMean(xs,'above')};
  });
  const flags={reported:0,corrected:0,'other-documented':0,unclassified:0,missing:0,changedSector:0};
  for(const r of rows)for(const key of Object.keys(flags))flags[key]+=r.quality[key];
  summaries.push({kind,wait,registered:registered.length,observed:observed.length,statuses,flags,groups});
 }
 return summaries;
}
export function pairedStatistics(pairs){
 if(!pairs.length)return {n:0,meanA:null,meanB:null,varianceA:null,varianceB:null,covariance:null,correlation:null};
 const a=mean(pairs.map(p=>p[0])),b=mean(pairs.map(p=>p[1]));
 const va=mean(pairs.map(p=>(p[0]-a)**2)),vb=mean(pairs.map(p=>(p[1]-b)**2));
 const cov=mean(pairs.map(p=>(p[0]-a)*(p[1]-b)));
 return {n:pairs.length,meanA:a,meanB:b,varianceA:va,varianceB:vb,covariance:cov,correlation:va>1e-24&&vb>1e-24?Math.max(-1,Math.min(1,cov/Math.sqrt(va*vb))):null};
}
export function completeWindow(rows,window){
 const selected=[];
 for(let year=window[0];year<=window[1];year++){
  const row=rows.find(r=>r.year===year);if(!row||row.status!=='observed')return null;selected.push(row);
 }
 return {tuition:mean(selected.map(r=>r.centered[0])),housing:mean(selected.map(r=>r.centered[1]))};
}
export function annualSector(table,cpi,dictionaries,sector,{origin=2010}={}){
 const cohort=cohortAt(table,origin,sector,cpi,{sample:Number.MAX_SAFE_INTEGER});
 const schools=[...cohort.training.map(s=>({...s,kind:'known'})),...cohort.unknown.map(s=>({...s,kind:'unknown'}))];
 const annual=[];
 for(const school of schools)for(let year=2000;year<=2019;year++){
  const a=priceAt(table,school.unitid,year,sector,cpi),z=priceAt(table,school.unitid,year+1,sector,cpi);
  const status=a.status!=='observed'?a.status:z.status;
  annual.push({unitid:school.unitid,kind:school.kind,year,status,
   quality:levelQuality(table,dictionaries,school.unitid,sector,year,year+1),
   growth:status==='observed'?['tuition','housing'].map(k=>Math.log(z[k]/a[k])-Math.log(z.deflator/a.deflator)):null});
 }
 const output=[];
 for(const mode of QUALITY_MODES){
  // Common sector/year means are always estimated from origin-known training identities only.
  const common=new Map();
  for(let year=2000;year<=2019;year++){
   const xs=annual.filter(r=>r.kind==='known'&&r.year===year&&r.status==='observed'&&qualityAllowed(r.quality,mode));
   if(xs.length)common.set(year,[0,1].map(k=>mean(xs.map(r=>r.growth[k]))));
  }
  const centered=annual.map(r=>r.status==='observed'&&qualityAllowed(r.quality,mode)&&common.has(r.year)?
   {...r,centered:r.growth.map((v,k)=>v-common.get(r.year)[k])}:{...r,status:r.status==='observed'?'source-quality-or-common-unavailable':r.status});
  const byId=new Map(schools.map(s=>[s.unitid,[]]));for(const r of centered)byId.get(r.unitid).push(r);
  for(const kind of ['known','unknown']){
   const selected=schools.filter(s=>s.kind===kind),xs=centered.filter(r=>r.kind===kind),statuses={};
   for(const r of xs)statuses[r.status]=(statuses[r.status]||0)+1;
   const comparisons=[...WINDOWS,...GAPPED_WINDOWS].map(([a,b],index)=>{
    const first=[],last=[],paired=[];
    for(const s of selected){
     const wa=completeWindow(byId.get(s.unitid),a),wb=completeWindow(byId.get(s.unitid),b);
     if(wa)first.push(s.unitid);if(wb)last.push(s.unitid);if(wa&&wb)paired.push({unitid:s.unitid,a:wa,b:wb});
    }
    const screened=paired.filter(p=>!byId.get(p.unitid).some(r=>((r.year>=a[0]&&r.year<=a[1])||(r.year>=b[0]&&r.year<=b[1]))&&r.growth.some(v=>Math.abs(v)>.25)));
    return {first:a,second:b,design:index<WINDOWS.length?'adjacent-transitions':'gapped-price-observations',originInstitutions:selected.length,firstComplete:first.length,secondComplete:last.length,paired:paired.length,missingEither:selected.length-paired.length,
     pairedIds:paired.map(p=>p.unitid),largeChangeScreen:{maxAnnualRealLogChange:.25,retained:screened.length,removed:paired.length-screened.length,tuition:pairedStatistics(screened.map(p=>[p.a.tuition,p.b.tuition])),housing:pairedStatistics(screened.map(p=>[p.a.housing,p.b.housing]))},tuition:pairedStatistics(paired.map(p=>[p.a.tuition,p.b.tuition])),housing:pairedStatistics(paired.map(p=>[p.a.housing,p.b.housing])),
     tuitionHousingFirst:pairedStatistics(paired.map(p=>[p.a.tuition,p.a.housing])),tuitionHousingSecond:pairedStatistics(paired.map(p=>[p.b.tuition,p.b.housing]))};
   });
   output.push({sector,mode,kind,origin,originInstitutions:selected.length,annualStatuses:statuses,commonTrainingCounts:[...common.keys()].map(year=>({year,n:annual.filter(r=>r.kind==='known'&&r.year===year&&r.status==='observed'&&qualityAllowed(r.quality,mode)).length})),comparisons});
  }
 }
 return {sector,origin,cohortCounts:cohort.counts,originKnownIds:cohort.training.map(s=>s.unitid),originWithheldIds:cohort.unknown.map(s=>s.unitid),summaries:output};
}
