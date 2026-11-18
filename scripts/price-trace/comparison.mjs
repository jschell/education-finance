const number=raw=>raw!==undefined&&raw!==null&&String(raw).trim()!==''&&Number.isFinite(Number(raw))?Number(raw):null;
export function snapshotPrice(snapshot,event,academicYear){
 const prefix=event.levels[0].field.replace(/AY\d+$/,''),matches=Object.entries(snapshot.fields).filter(([field,d])=>field.startsWith(prefix+'AY')&&d.academicYear===academicYear),
  archive=snapshot.archives.find(a=>a.kind==='prices'),directory=snapshot.archives.find(a=>a.kind==='directory'),row=archive?.rows.find(r=>r.unitid===event.unitid),dir=directory?.rows.find(r=>r.unitid===event.unitid);
 const result={snapshotYear:snapshot.year,academicYear,directorySector:number(dir?.fields.SECTOR),institution:dir?.fields.INSTNM||null,
  archive:archive?{file:archive.file,url:archive.url,member:archive.member,sha256:archive.sha256,pinnedSha256:archive.pinnedSha256,matchesPinned:archive.matchesPinned,csvRecord:row?.csvRecord??null}:null,
  dictionary:snapshot.dictionary};
 if(matches.length!==1)return {...result,status:matches.length?'ambiguous-academic-year-definition':'academic-year-definition-unavailable'};
 const [field,definition]=matches[0],raw=row?.fields[field],value=number(raw),flag=row?.fields[definition.flag]??null;
 return {...result,field,title:definition.title,definition:definition.descriptionExcerpt,raw:raw??null,value,flag,flagLabel:definition.codes[flag]||null,
  status:!row?'missing-source-row':value===null||value<0?'source-price-unavailable':'observed'};
}
export function compareEvent(event,sources){
 const endpoints=event.levels.map(original=>{
  const snapshots=[original.year,original.year+1,original.year+2].map(year=>{
   const snapshot=sources.snapshots.find(s=>s.year===year);
   return snapshot?snapshotPrice(snapshot,event,original.year):{snapshotYear:year,academicYear:original.year,status:'source-snapshot-unavailable'};
  });
  const current=snapshots[0],later=snapshots.slice(1),observed=later.filter(r=>r.status==='observed'),changed=observed.filter(r=>r.value!==original.value);
  return {academicYear:original.year,originalValue:original.value,originalFlag:original.flag,currentMatchesSelected:current.status==='observed'?current.value===original.value&&current.flag===original.flag:null,
   snapshots,availableLater:observed.length,changedLater:changed.length,
   classification:changed.length?'retrospective-value-changed':observed.length?'unchanged-in-available-snapshots':'no-comparable-later-snapshot'};
 });
 const revisions=endpoints.some(r=>r.changedLater>0),sectorChanged=endpoints.some(e=>e.snapshots.some(s=>s.directorySector!=null&&s.directorySector!==event.levels[0].rawSector)),
  missing=endpoints.reduce((v,e)=>v+e.snapshots.filter(s=>s.status!=='observed').length,0);
 return {id:event.id,unitid:event.unitid,sector:event.sector,component:event.component,year:event.year,
  institution:endpoints.flatMap(e=>e.snapshots).find(s=>s.institution)?.institution||null,
  realLogChange:event.realLogChange,originalLevels:event.levels.map(r=>r.value),oppositeSignNext:event.oppositeSignNext,
  classification:revisions?'retrospective-value-changed':missing?'incomplete-comparison':'unchanged-in-all-four-later-comparisons',
  directorySectorChanged:sectorChanged,missingComparisons:missing,endpoints,cause:'unresolved',causeEvidence:[]};
}
