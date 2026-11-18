import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {canonical} from '../../site/js/calibration.js';
import {identityHash} from '../calibration/schools.mjs';
import {indexSnapshot,manifestContract,selectSnapshots,price,matchedChange} from './views.mjs';
export const PINNED_PANEL_HASH='291960aa59ec12ecf9f00105d5bf49ef22cabc27013b94de7beca4da5b9c913a';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function loadPinnedSnapshots({origin,expectedHash=PINNED_PANEL_HASH,manifestPath='data/research/ipeds-price-snapshots/manifest.json'}){
 const manifest=JSON.parse(readFileSync(manifestPath)),{sha256,...body}=manifest;
 if(sha256!==expectedHash||hash(canonical(body))!==expectedHash)throw Error('Panel version mismatch.');
 const contract=manifestContract(manifest),eligible=selectSnapshots(new Map(manifest.snapshots.map(meta=>[meta.year,{meta}])),contract,{mode:'collection-proxy',origin}),snapshots=new Map();
 for(const {meta}of eligible){
  for(const dictionary of [meta.dictionary,meta.supplement].filter(Boolean))if(hash(readFileSync(dictionary.path))!==dictionary.sha256)throw Error('Dictionary bytes changed.');
  const bytes=readFileSync(meta.shard);if(hash(bytes)!==meta.shardSha256)throw Error('Shard bytes changed.');
  snapshots.set(meta.year,indexSnapshot(meta,JSON.parse(gunzipSync(bytes))));
 }
 return {snapshots,contract};
}
const identity=p=>JSON.stringify([p.directory?.name,p.directory?.sector,p.directory?.control,p.directory?.level]);
function paired(snapshot,unitid,sector,year){return ['tuition','housing'].map(component=>price(snapshot,unitid,sector,component,year));}
function comparison(pairs){
 for(const [a,z]of pairs){const c=matchedChange(a,z);if(c.status!=='observed')return c.status;if(identity(a)!==identity(z))return 'directory-identity-change';}
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
export function buildMatchedGraphs({snapshots,contract,origin,sector,cpi,fitCap=200,sample=6}){
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
   let status=comparison(a.map((p,k)=>[p,z[k]]).concat(r.map((p,k)=>[p,z[k]]),a.map((p,k)=>[p,r[k]])));
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
