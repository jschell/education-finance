import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {canonical} from '../site/js/calibration.js';
import {compareEvent} from './price-trace/comparison.mjs';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const registry=read('data/calibration-diagnostics/price-trace-registry.json'),sources=read('data/calibration-diagnostics/price-trace-sources.json');
assert.equal(sources.registryHash,registry.sha256);assert.equal(hash(readFileSync('scripts/extract_price_trace_sources.py')),sources.extractorSha256);
const manifest=read('data/raw/ipeds/sources.json');
for(const snapshot of sources.snapshots){
 assert.equal(hash(readFileSync(snapshot.dictionary.path)),snapshot.dictionary.sha256);
 if(snapshot.supplement)assert.equal(hash(readFileSync(snapshot.supplement.path)),snapshot.supplement.sha256);
 for(const archive of snapshot.archives){const original=manifest.files.find(s=>s.year===snapshot.year&&s.kind===archive.kind);assert.equal(archive.pinnedSha256,original.sha256);assert.equal(archive.matchesPinned,archive.sha256===original.sha256);}
}
const context=read('data/calibration-diagnostics/price-trace-context.json');
const events=registry.events.map(e=>({...compareEvent(e,sources),causeEvidence:context.annotations.filter(a=>a.event===e.id)}));
for(const annotation of context.annotations){assert.ok(events.some(e=>e.id===annotation.event));for(const id of annotation.evidence)assert.ok(context.documents.some(d=>d.id===id));}
for(const event of events)for(const e of event.endpoints)assert.equal(e.currentMatchesSelected,true,event.id+': original excerpt mismatch');
const paths=['docs/calibration-price-trace-plan.md','docs/price-trace-execution.md','scripts/select-price-traces.mjs','scripts/price-trace/selection.mjs','scripts/extract_price_trace_sources.py','scripts/price-trace/comparison.mjs','scripts/compare-price-traces.mjs','scripts/price-trace/capture_evidence.py','data/calibration-diagnostics/price-trace-context.json','data/calibration-diagnostics/price-trace-registry.json','data/calibration-diagnostics/price-trace-sources.json','data/raw/ipeds/sources.json','data/ipeds-price-dictionaries.json'];
const body={id:'price-trace-comparison-v1',registryHash:registry.sha256,sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),events,
 summary:{sectorComponentEvents:events.length,uniqueSchools:new Set(events.map(e=>e.unitid)).size,uniqueSchoolTransitions:new Set(events.map(e=>`${e.unitid}:${e.year}`)).size,
  archiveSnapshots:sources.snapshots.length,archives:sources.snapshots.reduce((n,s)=>n+s.archives.length,0),archiveHashMismatches:sources.snapshots.flatMap(s=>s.archives).filter(a=>!a.matchesPinned).length,
  comparisons:events.reduce((n,e)=>n+e.endpoints.reduce((v,x)=>v+x.snapshots.length,0),0),laterComparisons:events.reduce((n,e)=>n+e.endpoints.reduce((v,x)=>v+x.availableLater,0),0),
  changedLaterComparisons:events.reduce((n,e)=>n+e.endpoints.reduce((v,x)=>v+x.changedLater,0),0),
  classifications:Object.fromEntries([...new Set(events.map(e=>e.classification))].sort().map(k=>[k,events.filter(e=>e.classification===k).length])),revisedUniqueSchoolComponentTransitions:new Set(events.filter(e=>e.classification==='retrospective-value-changed').map(e=>`${e.unitid}:${e.component}:${e.year}`)).size,originalFlagCounts:Object.fromEntries([...new Set(events.flatMap(e=>e.endpoints.map(x=>x.originalFlag)))].map(flag=>[flag,events.flatMap(e=>e.endpoints).filter(x=>x.originalFlag===flag).length])),changedLaterFlagLabels:Object.fromEntries([...new Set(events.flatMap(e=>e.endpoints.flatMap(x=>x.snapshots.filter(s=>s.status==='observed'&&s.snapshotYear>x.academicYear&&s.value!==x.originalValue).map(s=>s.flagLabel))))].map(label=>[label,events.flatMap(e=>e.endpoints.flatMap(x=>x.snapshots.filter(s=>s.status==='observed'&&s.snapshotYear>x.academicYear&&s.value!==x.originalValue))).filter(s=>s.flagLabel===label).length])),directorySectorChanges:events.filter(e=>e.directorySectorChanged).length},
 limitations:['A retrospective source difference establishes inconsistent annual-file representations of the same academic-year price, not which representation is economically true.','An unchanged value in later files does not establish a real policy change. Causes stay unresolved until independent official institutional evidence supports them.','Events were selected for extremeness from training identities; their revision rates cannot estimate population error prevalence.','Residency-sector overlaps and both endpoints duplicate evidence; counts are not independent observations.','No prices are repaired, no forecasts fitted and no financial defaults or promotion gates changed.']};
body.sha256=hash(canonical(body));writeFileSync('data/calibration-diagnostics/price-trace-comparison.json',JSON.stringify(body,null,2)+'\n');
console.log(JSON.stringify(body.summary));
for(const e of events)console.log(JSON.stringify({id:e.id,name:e.institution,original:e.originalLevels,classification:e.classification,values:e.endpoints.map(x=>x.snapshots.map(s=>s.value??s.status)),sectorChanged:e.directorySectorChanged}));
