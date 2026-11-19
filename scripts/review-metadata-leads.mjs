// Review leads from the pinned audit. This produces no equivalence or graph changes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
import {auditMetadata} from './audit-metadata-continuity.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function generate(){
 const prior=JSON.parse(readFileSync('data/calibration-diagnostics/metadata-continuity.json'));
 if(canonical(prior)!==canonical(auditMetadata()))throw Error('Pinned metadata audit differs');
 const manifest=JSON.parse(readFileSync('data/research/ipeds-price-snapshots/manifest.json'));
 const sources=new Map(manifest.snapshots.map(s=>[s.year,s]));
 const names=prior.groups.filter(g=>g.caseOrSpacingNameCandidate>0).sort((a,b)=>b.caseOrSpacingNameCandidate-a.caseOrSpacingNameCandidate||a.year-b.year||a.sector.localeCompare(b.sector)||a.component.localeCompare(b.component));
 const definitions=prior.definitionChanges.map(d=>{
  const a=sources.get(d.fromCollection),z=sources.get(d.toCollection);
  const fields=(snapshot,definition)=>Object.entries(snapshot.fields).filter(([,f])=>canonical(f)===canonical(definition)).map(([field])=>field);
  const keys=new Set([...Object.keys(d.from.codes),...Object.keys(d.to.codes)]),changedCodes=[...keys].sort().filter(k=>d.from.codes[k]!==d.to.codes[k]).map(k=>({code:k,from:d.from.codes[k]??null,to:d.to.codes[k]??null}));
  const title=x=>x.replace(/\b(?:19|20)\d{2}(?:-(?:\d{4}|\d{2}))?\b/g,'YEAR').replace(/\s+/g,' ').trim().toUpperCase();
  return {...d,fromFields:fields(a,d.from),toFields:fields(z,d.to),fromDictionary:a.dictionary,toDictionary:z.dictionary,
   normalizedTitlesEqual:title(d.from.title)===title(d.to.title),stableConcept:['component','residency','living','basis'].every(k=>d.from[k]===d.to[k]),changedCodes};
 }).sort((a,b)=>b.observedPairs-a.observedPairs||a.fromCollection-b.fromCollection||a.sector.localeCompare(b.sector)||a.component.localeCompare(b.component)||a.kind.localeCompare(b.kind));
 const inputs=['scripts/review-metadata-leads.mjs','scripts/audit-metadata-continuity.mjs','data/calibration-diagnostics/metadata-continuity.json','data/research/ipeds-price-snapshots/manifest.json','data/research/reviewed-metadata-equivalences.json'];
 return {id:'metadata-lead-review-v1',panelHash:prior.panelHash,sourceHashes:Object.fromEntries(inputs.map(p=>[p,hash(readFileSync(p))])),caseOrSpacingGroups:names,caseOrSpacingExamples:prior.caseOrSpacingExamples,definitionGroups:definitions,reviewedEquivalences:0,bridgedEdges:0,historicalFits:0,
  limitations:['Unitid and normalized text are review leads, not independent confirmation of institutional or economic continuity.','Definitions include gross/net-unreviewed basis and changed flag vocabularies; exact raw dictionary sources are linked and hashed.','Counts overlap across residency sectors, housing, transition/revision kinds and years; they do not measure independent schools or recovered history.','No prospective publication-vintage evidence was established; no graph or forecast is changed.']};
}
if(process.argv[1]?.endsWith('review-metadata-leads.mjs')){
 const report=generate(),path='data/calibration-diagnostics/metadata-lead-review.json',out=JSON.stringify(report,null,2)+'\n';
 if(process.argv.includes('--verify')){if(readFileSync(path,'utf8')!==out)throw Error('Metadata lead review differs');}else writeFileSync(path,out);
 console.log(JSON.stringify({nameGroups:report.caseOrSpacingGroups.length,definitionGroups:report.definitionGroups.length,reviewedEquivalences:0,bridgedEdges:0}));
}
