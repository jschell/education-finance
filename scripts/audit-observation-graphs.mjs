// Support/extraction audit only: no likelihood, estimator or forecast imports.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
import {parseCpi} from './cost-followup-helpers.mjs';
import {SECTORS} from './calibration/schools.mjs';
import {loadPinnedSnapshots,buildMatchedGraphs,PINNED_PANEL_HASH} from './price-panel/observation-graph.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),cpi=parseCpi(readFileSync('data/raw/cpi.csv','utf8')),groups=[];
for(const year of [2011,2015,2020]){
 const origin=`${year}-09-01`,{snapshots,contract}=loadPinnedSnapshots({origin});
 for(const sector of Object.keys(SECTORS)){
  const result=buildMatchedGraphs({snapshots,contract,origin,sector,cpi});
  const graphs=Object.fromEntries(Object.entries(result.graphs).map(([policy,g])=>[policy,{sha256:hash(canonical(g)),observations:g.observations.length,edges:g.edges.length,
   academicTransitions:g.support.academicTransitions,collectionYears:[...new Set(g.observations.map(x=>x.collectionYear))].sort((a,b)=>a-b)}]));
  groups.push({origin,sector,cohort:result.cohort,statuses:result.statuses,graphs});
  console.log(JSON.stringify({origin,sector,fitSchools:result.cohort.fitIds.length,edges:graphs.stitched.edges}));
 }
}
const paths=['docs/revision-cost-estimator-execution.md','scripts/audit-observation-graphs.mjs','scripts/price-panel/observation-graph.mjs','scripts/price-panel/views.mjs','scripts/calibration/schools.mjs','data/research/ipeds-price-snapshots/manifest.json','data/raw/cpi.csv'];
const report={id:'matched-source-observation-graph-support-v1',panelHash:PINNED_PANEL_HASH,availability:'collection-year proxy, not an actual vintage backtest',
 sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),groups,historicalFits:0,
 limitations:['Three example origins audit graph support; these are not cost/funding scores or a full historical comparison.',
 'Matching, positivity, stable-name/population exclusions and longest-segment selection are conservative and change sample composition.',
 'Withheld identities are named for evaluation support only and never appear in fitting graphs. Residency sectors share institutions and housing observations.',
 'Definition text agreement cannot detect undocumented gross/net changes or establish a true economic representation.',
 'Strict original-publication-vintage support remains unavailable. More source representations do not add independent macroeconomic years.']};
report.sha256=hash(canonical(report));const output=JSON.stringify(report,null,2)+'\n',path='data/calibration-diagnostics/observation-graph-support.json';
if(process.argv.includes('--verify')){if(readFileSync(path,'utf8')!==output)throw Error('Observation-graph support artifact differs.');}else writeFileSync(path,output);
