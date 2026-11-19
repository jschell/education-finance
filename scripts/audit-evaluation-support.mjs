import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
import {loadPinnedSnapshots,buildMatchedGraphs} from './price-panel/observation-graph.mjs';
import {buildReviewedGraphs,REVIEW_HASH} from './price-panel/reviewed-graph.mjs';
import {parseCpi} from './cost-followup-helpers.mjs';
import {SECTORS} from './calibration/schools.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function generate(){
 const registry=JSON.parse(readFileSync('data/research/evaluation-metadata-review.json')),cpi=parseCpi(readFileSync('data/raw/cpi.csv','utf8')),groups=[];
 for(const year of [2011,2015,2020]){
  const origin=`${year}-09-01`,{snapshots,contract}=loadPinnedSnapshots({origin});
  for(const sector of Object.keys(SECTORS)){
   const args={snapshots,contract,origin,sector,cpi},original=buildMatchedGraphs(args),reviewed=buildReviewedGraphs({...args,registry});
   const summarize=r=>({cohort:r.cohort,statuses:r.statuses,graphs:Object.fromEntries(Object.entries(r.graphs).map(([policy,g])=>[policy,{sha256:hash(canonical(g)),observations:g.observations.length,edges:g.edges.length,transitions:g.support.academicTransitions,transitionCount:g.support.academicTransitions.length,withheldExcluded:r.cohort.withheldIds.every(id=>!g.observations.some(o=>o.unitid===id))}]))});
   groups.push({origin,sector,original:summarize(original),reviewed:summarize(reviewed)});
  }
 }
 const paths=['scripts/audit-evaluation-support.mjs','scripts/price-panel/reviewed-graph.mjs','scripts/price-panel/observation-graph.mjs','scripts/price-panel/views.mjs','data/research/evaluation-metadata-review.json','data/research/ipeds-price-snapshots/manifest.json','data/raw/cpi.csv'];
 return {id:'evaluation-source-support-v1',sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),reviewHash:REVIEW_HASH,approvedDefinitionPairs:registry.entries.filter(e=>e.definitionConceptDecision==='approved').length,approvedGraphBridges:0,approvedNamePairs:0,groups,definitionReview:'partial-pass',populationContinuity:'unsupported',strictOriginalVintage:'unsupported',historicalEligibility:{state:'unsupported',reasons:['Institution-specific reporting-population continuity is not independently certified.','Strict original-publication-vintage support is unavailable.'],proxyOnly:true},historicalFits:0,productionActivated:false};
}
const out=JSON.stringify(generate(),null,2)+'\n',path='data/calibration-diagnostics/evaluation-source-support.json';
if(process.argv.includes('--verify')){if(readFileSync(path,'utf8')!==out)throw Error('Evaluation support differs');}else writeFileSync(path,out);
console.log(JSON.stringify({groups:15,approvedDefinitions:6,approvedNames:0,historical:'unsupported'}));
