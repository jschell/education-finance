import {compileCalibrated,calibrationFactory,canonical}from '../../site/js/calibration.js';
import {newPlan,MODEL}from '../../site/js/domain.js';
import {quantile}from '../../site/js/random.js';
import {createHash}from 'node:crypto';
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
const paths={public4:'Public in-state',public4out:'Public out-of-state',public2:'Community in-state',public2out:'Community out-of-state',private4:'Private nonprofit'};
export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function createSnapshot({bundle,asOf,sourceCommit,sourceHashes,production=true}){
 if(!validDate(asOf)||asOf<bundle.asOf)throw Error('Snapshot date must be valid and no earlier than bundle assumptions.');
 if(!/^[0-9a-f]{40}$/.test(sourceCommit||''))throw Error('A source commit is required.');
 const {sha256,...body}=bundle;if(hash(body)!==sha256)throw Error('Bundle checksum mismatch.');
 const seed=850213,trials=1000,forecasts=[],definitions={};
 for(const [sector,path]of Object.entries(paths)){
  const definition={sector,panelHash:bundle.panel.hash,residency:sector.endsWith('out')?'out-of-state':'in-state',housing:'on-campus room and board',population:'published first-time first-year academic-year prices',membership:'same fixed panel and component membership as the forecast bundle',baselineAcademicYear:+asOf.slice(0,4)};
  const definitionId=hash(definition);definitions[sector]={...definition,definitionId};
  for(const horizon of [1,2,5,10,18]){
   const p=newPlan(),st=p.students[0],sc=st.scenarios[0],targetYear=+asOf.slice(0,4)+horizon;
   p.valuation=asOf.slice(0,7);st.enrollment=`${targetYear}-${asOf.slice(5,7)}`;sc.baseline=p.valuation;sc.sourceDate=p.valuation;sc.path=path;sc.years=1;
   sc.costs={tuition:10000,housing:10000,books:0,transport:0,other:0};
   Object.assign(st.funding,{balance:0,monthly:0,grant:0,income:0,gifts:[],contributionStart:p.valuation,contributionEnd:p.valuation});
   const {c}=compileCalibrated(p,st,sc,bundle),factory=calibrationFactory(c,bundle,{seed}),values=[];
   for(let trial=0;trial<trials;trial++){
    const r=factory.make(trial).compiled.rows[c.enrollmentIndex];
    values.push(10000*r.costs.tuition/r.valuationCosts.tuition+10000*r.costs.housing/r.valuationCosts.housing);
   }
   values.sort((a,b)=>a-b);forecasts.push({sector,definitionId,horizon,targetMonth:st.enrollment,targetAcademicYear:targetYear,p10:quantile(values,.1),p50:quantile(values,.5),p90:quantile(values,.9),outcome:null});
  }
 }
 const result={id:'prospective-current-cost-'+asOf,asOf,sourceCommit,modelVersion:MODEL,bundleId:bundle.id,bundleHash:bundle.sha256,production,
  seed,trials,syntheticBudget:{tuition:10000,housing:10000,currency:'USD',baselineMonth:asOf.slice(0,7)},definitions,sourceHashes,
  trainingCostLast:Math.max(...Object.values(bundle.prices).map(ps=>ps.at(-1).year)),trainingMacroLast:bundle.economy.macroYears.at(-1).year,forecasts,
  limitations:['Synthetic normalized sector-price forecasts, not school-specific forecasts or funding probabilities.','Comparable observed baseline and target index levels are both required. Missing or unreached outcomes remain unscored.','Current SPF anchors and extrapolated long horizons are assumptions, not established calibrated probabilities.']};
 return {...result,sha256:hash(result)};
}
export function validateObservation(snapshot,observation,asOf){
 const {sha256,...snapshotBody}=snapshot;if(hash(snapshotBody)!==sha256)throw Error("Snapshot checksum mismatch.");
 if(!validDate(asOf)||asOf<snapshot.asOf)throw Error('Invalid scoring date.');
 const d=snapshot.definitions[observation.sector];
 if(!d||observation.definitionId!==d.definitionId||observation.bundleHash!==snapshot.bundleHash)throw Error('Observation definition or bundle mismatch.');
 if(!Number.isInteger(observation.academicYear)||observation.academicYear>d.baselineAcademicYear+18||observation.academicYear<d.baselineAcademicYear||observation.academicYear>+asOf.slice(0,4))throw Error('Future or unsupported outcome year.');
 if(!validDate(observation.publishedAt)||observation.publishedAt>asOf)throw Error('Future or missing publication date.');
 if(![observation.tuitionIndex,observation.housingIndex].every(x=>Number.isFinite(x)&&x>0))throw Error('Observed price indices must be positive.');
 if(!/^https:\/\//.test(observation.sourceUrl||'')||!/^[a-f0-9]{64}$/.test(observation.sourceSha256||'')||!/^data\/forecast-outcomes\/sources\/[a-zA-Z0-9_.-]+$/.test(observation.sourceFile||''))throw Error('Source URL, file and digest are required.');
 if(observation.definitionVerified!==true)throw Error('Comparable definitions require explicit source review.');
 return observation;
}
export function scoreSnapshot(snapshot,observations,asOf){
 const {sha256,...body}=snapshot;if(hash(body)!==sha256)throw Error('Snapshot checksum mismatch.');
 const map=new Map();for(const r of observations){validateObservation(snapshot,r,asOf);const key=`${r.sector}:${r.academicYear}`;if(map.has(key))throw Error('Duplicate observed sector/year.');map.set(key,r);}
 if(!validDate(asOf)||asOf<snapshot.asOf)throw Error('Invalid scoring date.');
 const rows=snapshot.forecasts.map(f=>{
  if(f.targetMonth>asOf.slice(0,7))return {sector:f.sector,horizon:f.horizon,targetMonth:f.targetMonth,status:'unreached-target',actual:null};
  const initial=map.get(`${f.sector}:${snapshot.definitions[f.sector].baselineAcademicYear}`),target=map.get(`${f.sector}:${f.targetAcademicYear}`);
  if(!initial||!target)return {sector:f.sector,horizon:f.horizon,targetMonth:f.targetMonth,status:!initial?'missing-baseline':'missing-target',actual:null};
  const actual=snapshot.syntheticBudget.tuition*target.tuitionIndex/initial.tuitionIndex+snapshot.syntheticBudget.housing*target.housingIndex/initial.housingIndex;
  const intervalScore=f.p90-f.p10+10*Math.max(0,f.p10-actual)+10*Math.max(0,actual-f.p90);
  return {sector:f.sector,horizon:f.horizon,targetMonth:f.targetMonth,status:'observed',actual,covered:actual>=f.p10&&actual<=f.p90,intervalScore,normalizedScore:intervalScore/actual,sources:[initial.sourceUrl,target.sourceUrl]};
 });
 const observed=rows.filter(r=>r.status==='observed');
 return {snapshotHash:snapshot.sha256,bundleHash:snapshot.bundleHash,modelVersion:snapshot.modelVersion,asOf,forecasts:rows.length,observed:observed.length,pending:rows.length-observed.length,
  coverage:observed.length?observed.filter(r=>r.covered).length/observed.length:null,rows,limitation:'Counts of related sector/horizon prices are not independent outcomes. This does not calibrate funding success.'};
}
