// Descriptive post-results audit. No fitting, resampling or production changes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {parseSchools,SECTORS} from './calibration/schools.mjs';
import {canonical} from '../site/js/calibration.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=p=>JSON.parse(readFileSync(p));
const report=read('site/data/current-calibration.json');
for(const [path,expected] of Object.entries({...report.sourceHashes,...report.caseHashes}))
 assert.equal(hash(readFileSync(path)),expected,path);
const all=read('data/calibration-cases/school-costs.json').filter(r=>r.model==='baseline');
const table=parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString());
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
function decomposition(rows,category){
 const errors=rows.map(r=>{const m=category==='total'?r:r[category];
  assert.ok(m.actual>0&&m.p50>0);return {origin:r.origin,sector:r.sector,error:Math.log(m.actual/m.p50)};});
 const groups=new Map();for(const r of errors){const key=r.origin+':'+r.sector;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r.error);}
 const cells=[...groups].map(([key,xs])=>{const center=mean(xs);return {origin:+key.split(':')[0],mse:mean(xs.map(x=>x*x)),cellMeanSquared:center*center,withinCell:mean(xs.map(x=>(x-center)**2))};});
 // Equal sector cells within origin, then equal origins, as in the main report.
 const origins=[...new Set(cells.map(c=>c.origin))];
 const avg=key=>mean(origins.map(origin=>mean(cells.filter(c=>c.origin===origin).map(c=>c[key]))));
 const mse=avg('mse'),cellMeanSquared=avg('cellMeanSquared'),withinCell=avg('withinCell');
 assert.ok(Math.abs(mse-cellMeanSquared-withinCell)<1e-12,'Exact log-error decomposition');
 return {category,mse,cellMeanSquared,withinCell,withinCellShare:mse?withinCell/mse:null};
}
const summaries=[];
for(const kind of ['known','unknown'])for(const wait of [0,4,8]){
 const requested=all.filter(r=>r.kind===kind&&r.wait===wait),rows=requested.filter(r=>r.status==='observed');
 const flags={};for(const r of rows){
  const field=SECTORS[r.sector].field;
  // Count case/year/component entries, not independent observations. Do not interpret raw flag codes.
  for(let year=r.origin;year<=r.lastBillYear;year++){
   const raw=table.get(r.unitid).get(year);
   for(const [component,column]of [['tuition','X'+field],['housing','XCHG5AY3']]){
    const code=raw[column]||'unavailable',key=component+':'+code;flags[key]=(flags[key]||0)+1;
   }
  }
 }
 summaries.push({kind,wait,requested:requested.length,observed:rows.length,unavailable:requested.length-rows.length,
  origins:[...new Set(rows.map(r=>r.origin))].sort(),institutions:new Set(rows.map(r=>r.unitid)).size,
  decomposition:['total','tuition','housing'].map(category=>decomposition(rows,category)),rawFlagCounts:flags});
}
const sources=['scripts/audit-calibration-dispersion.mjs','scripts/calibration/schools.mjs','site/data/current-calibration.json','data/calibration-cases/school-costs.json','data/raw/ipeds/selected.csv.gz'];
const body={id:'current-baseline-log-error-dispersion-audit-v1',currentReportHash:report.sha256,
 sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),summaries,
 method:'Log(actual/forecast median) errors; exact MSE = squared origin-sector cell mean + within-cell variance. Equal sectors within origin, then equal origins. All observed retrospective starts; no tuning or candidate scoring.',
 limitations:['Within-cell variation describes sampled school forecast errors; it does not estimate a persistent school-effect variance or prove which generative component is missing.','Overlapping years, reused identities and residency sectors remain dependent; case/flag counts are not independent observations.','Raw supplied flag codes are counted without interpreting them as imputed or observed; year-specific source dictionaries must establish their meaning before exclusions.','No forecast, production assumption, calibration curve or qualification threshold is changed.']};
const output='data/calibration-diagnostics/dispersion.json';mkdirSync('data/calibration-diagnostics',{recursive:true});
writeFileSync(output,JSON.stringify({...body,sha256:hash(canonical(body))})+'\n');
console.log(JSON.stringify(summaries.map(s=>({kind:s.kind,wait:s.wait,totalWithinShare:s.decomposition[0].withinCellShare}))));
