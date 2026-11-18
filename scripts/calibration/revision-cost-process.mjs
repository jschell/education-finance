// Conditional research process only. No historical fitter, RNG or production hook.
import {sourceAvailability} from '../price-panel/views.mjs';
import {identityHash} from './schools.mjs';
export const REVISION_COST_METHOD='revision-cost-process-1.0.0';
export const TEMPORARY_DECAY=0.5;
const pair=(x,label)=>{
 if(!Array.isArray(x)||x.length!==2||!x.every(Number.isFinite))throw Error(`Invalid paired ${label}.`);
 return [...x];
};
const zero=()=>[0,0];
const add=(...xs)=>[0,1].map(k=>xs.reduce((a,x)=>a+x[k],0));
const scale=(x,n)=>x.map(v=>v*n);
const supplied=(table,key)=>pair(table?.[key]??zero(),key);

export function simulateConditionalProcess({years,schoolKeys,beta=[0,0],initialShared=[0,0],initialSchools={},shared={},permanent={},temporary={}}){
 pair(beta,'drift');pair(initialShared,'initial shared level');
 if(!years.length||!years.every((y,i)=>Number.isInteger(y)&&(!i||y===years[i-1]+1)))throw Error('Consecutive years required.');
 if(!schoolKeys.length||new Set(schoolKeys).size!==schoolKeys.length||!schoolKeys.every(k=>typeof k==='string'&&k.length))throw Error('Unique school keys required.');
 let common=[...initialShared];const schools=new Map(schoolKeys.map(key=>[key,{
  level:pair(initialSchools[key]?.level??zero(),'initial school level'),
  deviation:pair(initialSchools[key]?.deviation??zero(),'initial deviation')
 }])),result=[];
 for(const year of years){
  common=add(common,beta,supplied(shared,year));const states=Object.create(null);
  for(const key of schoolKeys){
   const state=schools.get(key),shockKey=`${key}:${year}`;
   state.level=add(state.level,supplied(permanent,shockKey));
   state.deviation=add(scale(state.deviation,TEMPORARY_DECAY),supplied(temporary,shockKey));
   const logLevel=add(common,state.level,state.deviation),level=logLevel.map(Math.exp);
   if(!level.every(x=>Number.isFinite(x)&&x>0))throw Error('Nonfinite or underflowed price.');
   states[key]={permanent:[...state.level],temporary:[...state.deviation],logLevel,level};
  }
  result.push({year,shared:[...common],schools:states});
 }
 return {method:REVISION_COST_METHOD,years:result};
}

export function representLatentLevels(process,requests){
 const states=new Map(process.years.map(x=>[x.year,x])),seen=new Set();
 return requests.map(r=>{
  const {sourceHash,member,collectionYear,academicYear,schoolKey,field}=r;
  if(!/^[a-f0-9]{64}$/.test(sourceHash||'')||typeof member!=='string'||!member||!Number.isInteger(collectionYear)||typeof field!=='string'||!field)throw Error('Invalid source identity.');
  const key=JSON.stringify([sourceHash,member,collectionYear,academicYear,schoolKey,field]);
  if(seen.has(key))throw Error('Duplicate source representation.');seen.add(key);
  const state=states.get(academicYear)?.schools[schoolKey];if(!state)throw Error('Unknown latent school/year.');
  const logLevel=add(state.logLevel,pair(r.error??zero(),'source error')),level=logLevel.map(Math.exp);
  if(!level.every(x=>Number.isFinite(x)&&x>0))throw Error('Invalid represented price.');
  return {...r,key,logLevel,level};
 });
}

// Input rows must already be extracted/hashed by the panel loader. This guard
// verifies normalized identity, definition, cutoff and training membership;
// it is not the full historical observation-graph adapter.
export function guardTrainingRepresentations(rows,{origin,trainingIds,contract}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(origin||'')||!Number.isFinite(Date.parse(origin))||new Date(origin).toISOString().slice(0,10)!==origin)throw Error('Valid origin required.');
 const selected=[],rejected=[],seen=new Set();
 for(const row of rows){
  const meta=contract.sources.get(row.collectionYear),prefix=/^(CHG[235]AY)\d+$/.exec(row.field)?.[1];let reason;
  if(!Number.isInteger(row.unitid)||row.unitid<=0||identityHash(row.unitid)%5===0||!trainingIds.has(row.unitid))reason='withheld-or-outside-training';
  else if(!meta||sourceAvailability(meta,contract,{mode:'collection-proxy',origin})!=='eligible-proxy-only')reason='collection-not-before-origin';
  else if(row.sourceHash!==meta.sources.prices.sha256||row.member!==meta.sources.prices.member)reason='source-outside-pinned-manifest';
  else if(!Number.isInteger(row.academicYear)||!prefix||meta.fields[row.field]?.academicYear!==row.academicYear||Object.entries(meta.fields).filter(([field,d])=>field.startsWith(prefix)&&d.academicYear===row.academicYear).length!==1)reason='definition-unavailable';
  else if(row.academicYear>=Number(origin.slice(0,4)))reason='academic-year-not-before-origin';
  else if(!Number.isFinite(row.value)||row.value<=0)reason='missing-positive-price';
  if(reason){rejected.push({row,reason});continue;}
  const key=JSON.stringify([row.sourceHash,row.member,row.collectionYear,row.unitid,row.field]);
  if(seen.has(key))throw Error('Duplicate training observation.');seen.add(key);selected.push({...row});
 }
 selected.sort((a,b)=>a.collectionYear-b.collectionYear||a.unitid-b.unitid||a.field.localeCompare(b.field));
 return {selected,rejected,panelHash:contract.panelHash,availability:'collection-year proxy, not an actual vintage backtest',
  academicYears:[...new Set(selected.map(x=>x.academicYear))].sort((a,b)=>a-b)};
}

export function stitchedGrowthMoments({permanentVariance:q,temporaryVariance:v,measurementVariance:r}){
 if(![q,v,r].every(x=>Number.isFinite(x)&&x>=0))throw Error('Nonnegative finite variances required.');
 const p=TEMPORARY_DECAY;
 return {lag0:q+2*v*(1-p)+2*r,lag1:-v*(1-p)**2-r,lag2:-v*(1-p)**2*p};
}

export function restrictedMomentDecomposition({lag0,lag1,lag2}){
 if(![lag0,lag1,lag2].every(Number.isFinite))throw Error('Finite moments required.');
 const p=TEMPORARY_DECAY,v=-lag2/((1-p)**2*p),r=-lag1-v*(1-p)**2,q=lag0-2*v*(1-p)-2*r;
 const parameters={permanentVariance:q,temporaryVariance:v,measurementVariance:r};
 // Algebraic ideal-process diagnostic only; never clip incompatible moments.
 return {status:Object.values(parameters).every(x=>x>=-1e-12)?'compatible-ideal-moments':'incompatible-moments',parameters,
  limitation:'Fixed decay and independent stationary errors assumed; no empirical identification or fitted uncertainty.'};
}
