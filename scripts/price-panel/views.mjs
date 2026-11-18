// Pure research views. No economic fitting and no filesystem/browser access.
import {SECTORS} from '../calibration/schools.mjs';
export function indexSnapshot(meta,body,ids=null){
 if(body.year!==meta.year||body.schema!==1)throw Error('Snapshot schema/year mismatch.');
 const directories=new Map(),rows=new Map(),seen=new Set();
 for(const raw of body.directories){const row=Object.fromEntries(body.directoryColumns.map((k,i)=>[k,raw[i]]));if(directories.has(row.unitid))throw Error('Duplicate directory institution.');directories.set(row.unitid,row);}
 for(const raw of body.observations){
  const row=Object.fromEntries(body.observationColumns.map((k,i)=>[k,raw[i]])),key=`${row.unitid}:${row.field}`;
  if(seen.has(key))throw Error('Duplicate source observation.');seen.add(key);
  if(!ids||ids.has(row.unitid))rows.set(key,row);
 }
 return {meta,directories,rows};
}
export function manifestContract(manifest){
 return {panelHash:manifest.sha256,sources:new Map(manifest.snapshots.map(s=>[s.year,structuredClone(s)]))};
}
export function sourceAvailability(meta,contract,{mode='descriptive',origin=null}={}){
 const expected=contract.sources.get(meta.year);
 if(!expected||JSON.stringify(meta)!==JSON.stringify(expected)||Object.entries(meta.sources).length!==2)return 'source-outside-pinned-manifest';
 if(mode==='descriptive')return 'eligible';
 if(!['strict','collection-proxy'].includes(mode))throw Error('Unknown availability mode.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(origin||'')||!Number.isFinite(Date.parse(origin))||new Date(origin).toISOString().slice(0,10)!==origin)throw Error('A valid origin date is required.');
 if(mode==='collection-proxy')return meta.year<Number(origin.slice(0,4))?'eligible-proxy-only':'collection-not-before-origin';
 for(const source of Object.values(expected.sources)){
  const date=source.publicationDate,e=source.availabilityEvidence;
  if(source.originalVintageVerified!==true||!date||!e||!/^https:\/\//.test(e.url||'')||!/^[a-f0-9]{64}$/.test(e.sha256||''))return 'original-availability-unverified';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return 'original-availability-unverified';
  if(date>origin)return 'published-after-origin';
 }
 return 'eligible-strict';
}
export function selectSnapshots(snapshots,contract,options){
 return [...snapshots.values()].filter(s=>sourceAvailability(s.meta,contract,options).startsWith('eligible')).sort((a,b)=>a.meta.year-b.meta.year);
}
export function price(snapshot,unitid,sector,component,academicYear){
 if(!snapshot)return {status:'missing-source-snapshot',academicYear,unitid};
 const prefix=(component==='housing'?'CHG5AY':SECTORS[sector].field.replace(/\d+$/,'')),
  fields=Object.entries(snapshot.meta.fields).filter(([f,d])=>f.startsWith(prefix)&&d.academicYear===academicYear),
  directory=snapshot.directories.get(unitid),base={academicYear,unitid,collectionYear:snapshot.meta.year,directory};
 if(fields.length!==1)return {...base,status:fields.length?'ambiguous-definition':'academic-year-definition-unavailable'};
 const [field,definition]=fields[0],row=snapshot.rows.get(`${unitid}:${field}`),result={...base,field,definition,row};
 if(!row)return {...result,status:'missing-observation'};
 if(row.status!=='observed')return {...result,status:row.status};
 if(!directory)return {...result,status:'missing-directory'};
 if(Number(directory.sector)!==SECTORS[sector].raw)return {...result,status:'changed-sector'};
 return {...result,status:'observed',value:row.value,flag:row.flag,flagLabel:definition.codes[row.flag]||null,basisUnreviewed:definition.basis.includes('unreviewed')};
}
export function matchedChange(a,z){
 if(a.status!=='observed'||z.status!=='observed')return {status:a.status!=='observed'?a.status:z.status};
 if(a.definition.basis!==z.definition.basis)return {status:'basis-change'};
 if(a.definition.semanticSignature!==z.definition.semanticSignature)return {status:'definition-text-change'};
 if(['sector','control','level'].some(k=>a.directory[k]!==z.directory[k]))return {status:'directory-population-change'};
 return {status:'observed',logChange:Math.log(z.value/a.value),changed:a.value!==z.value,unreviewedBasis:a.basisUnreviewed||z.basisUnreviewed};
}
export function coherentTransition(snapshot,unitid,sector,component,year){
 const a=price(snapshot,unitid,sector,component,year),z=price(snapshot,unitid,sector,component,year+1);
 return {...matchedChange(a,z),a,z};
}
export function revision(snapshots,unitid,sector,component,year,lag){
 if(![1,2].includes(lag))throw Error('Revision lag must be one or two.');
 const a=price(snapshots.get(year),unitid,sector,component,year),z=price(snapshots.get(year+lag),unitid,sector,component,year);
 return {...matchedChange(a,z),a,z};
}

export function asOfPrice(snapshots,contract,options,unitid,sector,component,academicYear){
 const eligible=selectSnapshots(snapshots,contract,options).reverse(),attempts=[];
 for(const snapshot of eligible){const p=price(snapshot,unitid,sector,component,academicYear);attempts.push({collectionYear:snapshot.meta.year,status:p.status});if(p.status==='observed')return {...p,availabilityMode:options.mode,panelHash:contract.panelHash};}
 return {status:'no-eligible-price',availabilityMode:options.mode,panelHash:contract.panelHash,attempts};
}
