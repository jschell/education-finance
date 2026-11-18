import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {canonical} from '../site/js/calibration.js';
import {parseSchools,SECTORS} from './calibration/schools.mjs';
import {indexSnapshot,manifestContract,sourceAvailability,coherentTransition,revision,price,matchedChange} from './price-panel/views.mjs';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const manifest=read('data/research/ipeds-price-snapshots/manifest.json'),{sha256,...body}=manifest;
assert.equal(hash(canonical(body)),sha256);for(const [path,h]of Object.entries(manifest.sourceHashes))assert.equal(hash(readFileSync(path)),h,path);
const audit=read('data/calibration-diagnostics/quality-persistence.json'),cohorts=Object.fromEntries(audit.persistence.map(x=>[x.sector,x.originKnownIds])),
 ids=new Set(Object.values(cohorts).flat()),table=parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString()),snapshots=new Map();
let observations=0,checkedValues=0,checkedSectors=0,missingRows=0;
const statuses={};
for(const meta of manifest.snapshots){
 const archive=readFileSync(meta.shard);assert.equal(hash(archive),meta.shardSha256,meta.shard);const shard=JSON.parse(gunzipSync(archive));
 assert.equal(shard.observations.length,meta.observations);observations+=shard.observations.length;
 // Reconcile all original selected rows, not just the training audit cohort.
 const directory=new Map(shard.directories.map(row=>[row[0],row])),current=new Map();
 for(const row of shard.observations){statuses[row[6]]=(statuses[row[6]]||0)+1;if(['CHG2AY3','CHG3AY3','CHG5AY3'].includes(row[2]))current.set(`${row[0]}:${row[2]}`,row);}
 for(const [unitid,years]of table){const selected=years.get(meta.year);if(!selected)continue;
  assert.equal(directory.get(unitid)?.[3]??'',selected.SECTOR);checkedSectors++;
  for(const field of ['CHG2AY3','CHG3AY3','CHG5AY3']){
   const row=current.get(`${unitid}:${field}`);assert.ok(row);assert.equal(row[3]??'',selected[field]);assert.equal(row[4]??'Unavailable',selected['X'+field]);checkedValues++;
  }
 }
 snapshots.set(meta.year,indexSnapshot(meta,shard,ids));
}
const contract=manifestContract(manifest),groups=[];
function addStatus(counts,status){counts[status]=(counts[status]||0)+1;}
function summary(values){values.sort((a,b)=>a-b);const q=p=>values.length?values[Math.floor((values.length-1)*p)]:null;return {count:values.length,p10:q(.1),median:q(.5),p90:q(.9),mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};}
for(const sector of Object.keys(SECTORS))for(const component of ['tuition','housing']){
 const transitions={registered:0,statuses:{},matched:0,sameSourceLogChanges:[],stitchedLogChanges:[],differences:[]},lags=[1,2].map(lag=>({lag,registered:0,statuses:{},comparable:0,changed:0,originalFlags:{},changedLaterFlags:{},logRevisions:[]}));
 for(const unitid of cohorts[sector])for(let year=2000;year<=2022;year++){
  const same=coherentTransition(snapshots.get(year+1),unitid,sector,component,year),a=price(snapshots.get(year),unitid,sector,component,year),z=price(snapshots.get(year+1),unitid,sector,component,year+1),stitched=matchedChange(a,z);
  transitions.registered++;addStatus(transitions.statuses,same.status==='observed'?stitched.status:same.status);
  if(same.status==='observed'&&stitched.status==='observed'){
   transitions.matched++;transitions.sameSourceLogChanges.push(same.logChange);transitions.stitchedLogChanges.push(stitched.logChange);transitions.differences.push(same.logChange-stitched.logChange);
  }
 }
 for(const target of lags)for(const unitid of cohorts[sector])for(let year=2000;year<=2023;year++){
  target.registered++;const r=revision(snapshots,unitid,sector,component,year,target.lag);addStatus(target.statuses,r.status);
  if(r.status==='observed'){target.comparable++;addStatus(target.originalFlags,r.a.flagLabel||'unclassified');target.logRevisions.push(r.logChange);if(r.changed){target.changed++;addStatus(target.changedLaterFlags,r.z.flagLabel||'unclassified');}}
 }
 const {sameSourceLogChanges,stitchedLogChanges,differences,...counts}=transitions;
 groups.push({sector,component,trainingInstitutions:cohorts[sector].length,transitions:{...counts,sameSource:summary(sameSourceLogChanges),stitched:summary(stitchedLogChanges),difference:summary(differences),sameSourceExtreme25:sameSourceLogChanges.filter(x=>Math.abs(x)>.25).length,stitchedExtreme25:stitchedLogChanges.filter(x=>Math.abs(x)>.25).length},
  revisions:lags.map(({logRevisions,...counts})=>({...counts,logRevision:summary(logRevisions)}))});
}
const availability=[2011,2015,2020,2026].map(year=>({origin:`${year}-09-01`,strictEligible:manifest.snapshots.filter(s=>sourceAvailability(s,contract,{mode:'strict',origin:`${year}-09-01`})==='eligible-strict').length,proxyEligible:manifest.snapshots.filter(s=>sourceAvailability(s,contract,{mode:'collection-proxy',origin:`${year}-09-01`})==='eligible-proxy-only').length}));
const paths=['docs/revision-aware-panel-execution.md','scripts/audit_revision_price_panel.mjs','scripts/price-panel/views.mjs','data/research/ipeds-price-snapshots/manifest.json','data/raw/ipeds/selected.csv.gz','data/calibration-diagnostics/quality-persistence.json'];
const report={id:'revision-aware-price-panel-audit-v1',panelHash:manifest.sha256,sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),
 reconciliation:{observations,selectedCurrentValues:checkedValues,selectedDirectorySectors:checkedSectors,statuses},availability,groups,
 limitations:['Descriptive origin-2010 training cohort; excludes withheld identities, not a representative population or new economic holdout.','Residency sectors share institutions and housing observations. Counts are dependent and do not create macroeconomic decades.','Strict as-of views have no verified publication-vintage sources. Collection-year proxy support is not real historical availability.','Definition-text differences are marked incomparable; they do not establish an economic population change. Hidden gross/net basis changes can remain undetected.','No revised prices, economic forecasts or probability remapping are activated. Complete bill/funding evaluation and future calibration remain separate work.']};
report.sha256=hash(canonical(report));writeFileSync('data/calibration-diagnostics/revision-price-panel.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({reconciliation:report.reconciliation,availability,groups:groups.map(g=>({sector:g.sector,component:g.component,matched:g.transitions.matched,originalExtremes:g.transitions.stitchedExtreme25,sameSourceExtremes:g.transitions.sameSourceExtreme25,revisions:g.revisions.map(({lag,comparable,changed})=>({lag,comparable,changed}))}))}));
