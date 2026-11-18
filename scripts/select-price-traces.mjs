import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseSchools,cohortAt} from './calibration/schools.mjs';
import {parseCpi} from './cost-followup-helpers.mjs';
import {canonical} from '../site/js/calibration.js';
import {selectEvents} from './price-trace/selection.mjs';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const audit=read('data/calibration-diagnostics/quality-persistence.json'),source=read('data/raw/ipeds/sources.json'),dict=read('data/ipeds-price-dictionaries.json');
assert.equal(hash(readFileSync('data/raw/ipeds/selected.csv.gz')),source.selectedSha256);
const table=parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString()),cpi=parseCpi(readFileSync('data/raw/cpi.csv','utf8')),
 dictionaries=Object.fromEntries(dict.years.map(d=>[d.year,d])),cohorts=Object.fromEntries(audit.persistence.map(r=>[r.sector,r.originKnownIds]));
for(const [sector,ids] of Object.entries(cohorts))assert.deepEqual(ids,cohortAt(table,2010,sector,cpi,{sample:Number.MAX_SAFE_INTEGER}).training.map(x=>x.unitid));
const events=selectEvents(table,cpi,dictionaries,cohorts),paths=['docs/calibration-price-trace-plan.md','docs/price-trace-execution.md','scripts/select-price-traces.mjs','scripts/price-trace/selection.mjs','scripts/calibration/schools.mjs','scripts/calibration/quality-persistence.mjs','data/calibration-diagnostics/quality-persistence.json','data/raw/ipeds/sources.json','data/raw/ipeds/selected.csv.gz','data/raw/cpi.csv','data/ipeds-price-dictionaries.json'];
const body={id:'price-trace-registry-v1',origin:2010,identityPool:'known/training only; withheld identities excluded',rule:'Top three absolute consecutive real log changes per sector/component, transitions 2000–2019; ties UNITID then year; preserve overlaps',
 sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),events,uniqueSchools:new Set(events.map(x=>x.unitid)).size,uniqueTransitions:new Set(events.map(x=>`${x.unitid}:${x.year}`)).size,
 archiveYears:[...new Set(events.flatMap(x=>[x.year,x.year+1,x.year+2,x.year+3]))].sort((a,b)=>a-b),
 limitations:['Post-results descriptive source investigation, not a price correction or a new economic evaluation.','Flags describe source processing, not the economic cause. Opposite-sign changes do not alone prove revision or error.','Residency sectors can share the same school/price event; overlaps are retained and are not independent events.']};
body.sha256=hash(canonical(body));writeFileSync('data/calibration-diagnostics/price-trace-registry.json',JSON.stringify(body,null,2)+'\n');
console.log(JSON.stringify({events:events.length,schools:body.uniqueSchools,archiveYears:body.archiveYears,selected:events.map(({id,realLogChange,oppositeSignNext})=>({id,realLogChange,oppositeSignNext}))}));
