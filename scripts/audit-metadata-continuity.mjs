// Audit metadata exclusions only. No estimator, likelihood, forecast or price repair.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
import {loadPinnedSnapshots,PINNED_PANEL_HASH} from './price-panel/observation-graph.mjs';
import {price,matchedChange} from './price-panel/views.mjs';
import {SECTORS} from './calibration/schools.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function metadataDifference(a,z){
 if(a.status!=='observed'||z.status!=='observed')return null;
 const definition=matchedChange(a,z),stablePopulation=['sector','control','level'].every(k=>a.directory[k]===z.directory[k]);
 const nameChanged=a.directory.name!==z.directory.name;
 return {definitionStatus:definition.status,nameChanged,stablePopulation,basisEqual:a.definition.basis===z.definition.basis,
  sameMeaningSignature:a.definition.semanticSignature===z.definition.semanticSignature};
}
export function auditMetadata(){
 const {snapshots}=loadPinnedSnapshots({origin:'2024-09-01'}),groups=[],definitions=new Map(),examples=[],caseExamples=[];
 for(const [sector]of Object.entries(SECTORS))for(let year=2000;year<2023;year++)for(const component of ['tuition','housing']){
  const first=snapshots.get(year),next=snapshots.get(year+1);if(!first||!next)continue;
  const counts={observedPairs:0,nameChange:0,definitionTextChange:0,basisChange:0,populationChange:0,nameOnlyCandidate:0,caseOrSpacingNameCandidate:0,stableConceptDefinitionCandidate:0,flagVocabularyChanged:0};
  for(const id of [...first.directories.keys()].sort((a,b)=>a-b)){
   // Both cross-file transition and revision edges can split a matched segment.
   for(const kind of ['transition','revision']){
    const a=price(first,id,sector,component,year),z=price(next,id,sector,component,year+(kind==='transition'?1:0)),d=metadataDifference(a,z);
    if(!d)continue;counts.observedPairs++;
    if(d.nameChanged)counts.nameChange++;
    if(d.definitionStatus==='definition-text-change')counts.definitionTextChange++;
    if(!d.basisEqual)counts.basisChange++;
    if(!d.stablePopulation)counts.populationChange++;
    if(d.nameChanged&&d.definitionStatus==='observed'&&d.stablePopulation){
     counts.nameOnlyCandidate++;
     if(a.directory.name.toUpperCase().replace(/\s+/g,' ').trim()===z.directory.name.toUpperCase().replace(/\s+/g,' ').trim()){
      counts.caseOrSpacingNameCandidate++;
      if(caseExamples.filter(x=>x.sector===sector&&x.component===component).length<3)caseExamples.push({unitid:id,sector,component,year,kind,from:a.directory.name,to:z.directory.name});
     }
    }
    if(d.definitionStatus==='definition-text-change'){
     const title=x=>x.replace(/\b(?:19|20)\d{2}(?:-(?:\d{4}|\d{2}))?\b/g,'YEAR').replace(/\s+/g,' ').trim().toUpperCase();
     const stable=['component','residency','living','basis'].every(k=>a.definition[k]===z.definition[k])&&title(a.definition.title)===title(z.definition.title);
     if(stable)counts.stableConceptDefinitionCandidate++;
     if(canonical(a.definition.codes)!==canonical(z.definition.codes))counts.flagVocabularyChanged++;
    }
    if(d.nameChanged&&examples.filter(x=>x.sector===sector&&x.component===component).length<6)examples.push({unitid:id,sector,component,year,kind,from:a.directory.name,to:z.directory.name,...d});
    if(d.definitionStatus==='definition-text-change'){
     const pair={sector,component,fromCollection:year,toCollection:year+1,kind,from:a.definition,to:z.definition};const key=canonical(pair);
     if(!definitions.has(key))definitions.set(key,{...pair,observedPairs:0});definitions.get(key).observedPairs++;
    }
   }
  }
  groups.push({sector,year,component,...counts});
 }
 const registry=JSON.parse(readFileSync('data/research/reviewed-metadata-equivalences.json','utf8'));
 if(registry.equivalences.length)throw Error('This audit has no implemented equivalence-bridge policy. Review a separate protocol first.');
 const sources=['scripts/audit-metadata-continuity.mjs','scripts/price-panel/observation-graph.mjs','scripts/price-panel/views.mjs','scripts/calibration/schools.mjs','data/research/ipeds-price-snapshots/manifest.json','data/research/reviewed-metadata-equivalences.json'];
 return {id:'metadata-continuity-audit-v1',panelHash:PINNED_PANEL_HASH,sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),groups,definitionChanges:[...definitions.values()],nameExamples:examples,caseOrSpacingExamples:caseExamples,reviewedEquivalences:0,bridgedEdges:0,historicalFits:0,
  limitations:['Counts are edge/component/sector occurrences, not independent schools; housing/residency sectors overlap.', 'Name-only candidates are review leads, not proof of institutional continuity; no price or graph is repaired.', 'Definition text changes require independent semantic evidence; dictionary equality alone cannot establish economic comparability.', 'Collection-year proxy only; strict historical availability remains unsupported.']};
}
if(process.argv[1]?.endsWith('audit-metadata-continuity.mjs')){
 const report=auditMetadata(),out=JSON.stringify(report,null,2)+'\n',path='data/calibration-diagnostics/metadata-continuity.json';
 if(process.argv.includes('--verify')){if(readFileSync(path,'utf8')!==out)throw Error('Metadata audit differs');}else writeFileSync(path,out);
 console.log(JSON.stringify({groups:report.groups.length,definitionPairs:report.definitionChanges.length,examples:report.nameExamples.length,bridgedEdges:0}));
}
