// Alternative support view derived from the frozen observation graph, preserving it unchanged.
import {createHash} from 'node:crypto';
import {identityHash} from '../calibration/schools.mjs';
import {selectSnapshots,price,matchedChange} from './views.mjs';
import {PINNED_PANEL_HASH} from './observation-graph.mjs';
function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v!==null&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
export const REVIEW_HASH='eb3fa77f5c464850af88010ffe26a082ea61b940efb92d92921ca0bd525bca8b';
export function validateRegistry(registry){
 const {sha256,...body}=registry||{};if(sha256!==REVIEW_HASH||createHash('sha256').update(stable(body)).digest('hex')!==REVIEW_HASH)throw Error('Review identity differs');
 if(!registry||registry.id!=='evaluation-metadata-review-v1'||registry.panelHash!==PINNED_PANEL_HASH||!Array.isArray(registry.entries))throw Error('Unrecognized review registry');
 if(registry.nameReview?.decision!=='unresolved')throw Error('This view authorizes no name bridges');
 for(const e of registry.entries)if(e.decision==='approved'&&(e.type!=='definition-only'||!e.cohortDefinitionEqual||!e.flagVocabularyEqual||!/^[a-f0-9]{64}$/.test(e.fromFullTextSha256)||!/^[a-f0-9]{64}$/.test(e.toFullTextSha256)||!e.independentInstrumentEvidence?.url?.startsWith('https://nces.ed.gov/')))throw Error('Incomplete approval evidence');
}
function approvedDefinition(a,z,status,registry){
 if(status!=='definition-text-change'||a.status!=='observed'||z.status!=='observed')return false;
 if(['sector','control','level'].some(k=>a.directory[k]!==z.directory[k])||a.directory.name!==z.directory.name)return false;
 return registry.entries.some(e=>e.decision==='approved'&&e.bridgeApproved===true&&e.populationContinuity==='pass'&&e.fromCollection===a.collectionYear&&e.toCollection===z.collectionYear&&e.fromField===a.field&&e.toField===z.field&&e.fromAcademicYear===a.academicYear&&e.toAcademicYear===z.academicYear&&e.fromSignature===a.definition.semanticSignature&&e.toSignature===z.definition.semanticSignature);
}
const identity=p=>JSON.stringify([p.directory?.name,p.directory?.sector,p.directory?.control,p.directory?.level]);
function paired(snapshot,unitid,sector,year){return ['tuition','housing'].map(component=>price(snapshot,unitid,sector,component,year));}
function comparison(pairs,registry){
 for(const [a,z]of pairs){const c=matchedChange(a,z);if(c.status!=='observed'&&!approvedDefinition(a,z,c.status,registry))return c.status;if(identity(a)!==identity(z))return 'directory-identity-change';}
 return 'observed';
}
function record(pair,cpi){
 const [tuition,housing]=pair,deflator=cpi.get(`${tuition.academicYear}-08`);
 if(!(deflator>0))return null;
 const component=p=>({field:p.field,sourceHash:p.source.sha256,member:p.source.member,csvRecord:p.row.csvRecord,flag:p.flag,flagLabel:p.flagLabel,definition:p.definition});
 return {key:JSON.stringify([tuition.source.sha256,tuition.source.member,tuition.collectionYear,tuition.unitid,tuition.field,housing.field]),
  unitid:tuition.unitid,academicYear:tuition.academicYear,collectionYear:tuition.collectionYear,
  logValues:[Math.log(tuition.value/deflator),Math.log(housing.value/deflator)],nominal:[tuition.value,housing.value],deflator,
  components:[component(tuition),component(housing)],directory:tuition.directory};
}
export function buildReviewedGraphs({snapshots,contract,origin,sector,cpi,fitCap=200,sample=6,registry}){
 validateRegistry(registry);
 if(!Number.isInteger(fitCap)||fitCap<1||fitCap>200||!Number.isInteger(sample)||sample<0||sample>6)throw Error('Invalid cohort limits.');
 const eligible=selectSnapshots(snapshots,contract,{mode:'collection-proxy',origin}),available=new Map(eligible.map(s=>[s.meta.year,s])),
  ids=[...new Set(eligible.flatMap(s=>[...s.directories.keys()]))].sort((a,b)=>identityHash(a)-identityHash(b)||a-b),counts={},candidates=[];
 const addStatus=status=>counts[status]=(counts[status]||0)+1;
 const minYear=Math.min(...available.keys()),maxYear=Math.max(...available.keys());
 for(const unitid of ids){
  const runs=[];let run=[];
  const finish=()=>{if(run.length)runs.push(run);run=[];};
  for(let year=minYear;year<maxYear;year++){
   const a=paired(available.get(year),unitid,sector,year),z=paired(available.get(year+1),unitid,sector,year+1),r=paired(available.get(year+1),unitid,sector,year);
   for(const p of [...a,...z,...r])if(p.status==='observed')p.source=available.get(p.collectionYear).meta.sources.prices;
   let status=comparison(a.map((p,k)=>[p,z[k]]).concat(r.map((p,k)=>[p,z[k]]),a.map((p,k)=>[p,r[k]])),registry);
   if(status==='observed'&&(!cpi.has(`${year}-08`)||!cpi.has(`${year+1}-08`)||!(cpi.get(`${year}-08`)>0&&cpi.get(`${year+1}-08`)>0)))status='missing-August-CPI';
   // Exclude reserved identities before values can enter a fitting/common pool.
   addStatus((identityHash(unitid)%5===0?'withheld:':'training:')+status);
   if(status!=='observed'){finish();continue;}
   if(run.length&&identity(a[0])!==identity(run.at(-1).stitched[1][0]))finish();
   run.push({year,stitched:[a,z],coherent:[r,z]});
  }
  finish();runs.sort((a,b)=>b.length-a.length||b[0].year-a[0].year);
  const best=runs[0];if(best?.length>=3)candidates.push({unitid,edges:best,discardedTransitions:runs.slice(1).reduce((s,r)=>s+r.length,0)});
 }
 const training=candidates.filter(s=>identityHash(s.unitid)%5!==0),withheld=candidates.filter(s=>identityHash(s.unitid)%5===0),fit=training.slice(0,fitCap),graphs={};
 for(const policy of ['stitched','coherent']){
  const observations=new Map(),edges=[];
  for(const school of fit)for(const edge of school.edges){
   const endpoints=edge[policy].map(pair=>record(pair,cpi));
   for(const r of endpoints){const old=observations.get(r.key);if(old&&JSON.stringify(old)!==JSON.stringify(r))throw Error('Conflicting graph endpoint.');observations.set(r.key,r);}
   edges.push({unitid:school.unitid,year:edge.year,keys:endpoints.map(r=>r.key)});
  }
  graphs[policy]={schema:1,policy,panelHash:contract.panelHash,origin,sector,availability:'collection-year proxy, not an actual vintage backtest',
   observations:[...observations.values()].sort((a,b)=>a.unitid-b.unitid||a.academicYear-b.academicYear||a.collectionYear-b.collectionYear),edges,
   support:{trainingIds:fit.map(s=>s.unitid),academicTransitions:[...new Set(edges.map(e=>e.year))].sort((a,b)=>a-b)}};
 }
 return {graphs,cohort:{trainingEligible:training.length,withheldEligible:withheld.length,fitIds:fit.map(s=>s.unitid),knownIds:fit.slice(0,sample).map(s=>s.unitid),withheldIds:withheld.slice(0,sample).map(s=>s.unitid),
  discardedMatchedTransitions:fit.reduce((n,s)=>n+s.discardedTransitions,0),excludedByCap:Math.max(0,training.length-fit.length)},statuses:counts};
}
