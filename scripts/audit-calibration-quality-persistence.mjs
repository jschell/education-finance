import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseSchools,SECTORS} from './calibration/schools.mjs';
import {parseCpi} from './cost-followup-helpers.mjs';
import {caseSensitivity,annualSector} from './calibration/quality-persistence.mjs';
import {canonical} from '../site/js/calibration.js';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const report=read('site/data/current-calibration.json'),dictionary=read('data/ipeds-price-dictionaries.json');
for(const [path,expected] of Object.entries({...report.sourceHashes,...report.caseHashes}))assert.equal(hash(readFileSync(path)),expected,path);
assert.equal(hash(readFileSync('scripts/prepare_ipeds_dictionaries.py')),dictionary.extractorSha256);
assert.equal(dictionary.years.length,24);
for(const d of dictionary.years){
 assert.equal(hash(readFileSync(d.path)),d.sha256,d.path);
 if(d.supplement)assert.equal(hash(readFileSync(d.supplement.path)),d.supplement.sha256);
 for(const field of ['CHG2AY3','CHG3AY3','CHG5AY3']){
  assert.equal(d.fields[field].flag,'X'+field);
  assert.equal(d.fields[field].codes.R,'Reported');assert.equal(d.fields[field].codes.C,'Analyst corrected reported value');
 }
}
const dictionaries=Object.fromEntries(dictionary.years.map(d=>[d.year,d]));
const table=parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString()),cpi=parseCpi(readFileSync('data/raw/cpi.csv','utf8'));
const sensitivity=caseSensitivity(read('data/calibration-cases/school-costs.json'),table,dictionaries);
const persistence=Object.keys(SECTORS).map(sector=>{const r=annualSector(table,cpi,dictionaries,sector);console.log('Completed persistence sector',sector);return r;});
const sources=['docs/calibration-quality-persistence-plan.md','scripts/audit-calibration-quality-persistence.mjs','scripts/calibration/quality-persistence.mjs','scripts/calibration/schools.mjs','scripts/calibration/statistics.mjs','scripts/cost-followup-helpers.mjs','scripts/prepare_ipeds_dictionaries.py','data/ipeds-price-dictionaries.json','data/raw/ipeds/selected.csv.gz','data/raw/cpi.csv','data/calibration-cases/school-costs.json','site/data/current-calibration.json'];
const body={id:'source-quality-disjoint-growth-audit-v1',currentReportHash:report.sha256,dictionaryCoverage:{years:dictionary.years.map(d=>d.year),fields:3,supplementYears:dictionary.years.filter(d=>d.supplement).map(d=>d.year)},
 sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),sensitivity,persistence,
 limitations:['Descriptive post-results diagnosis; no new forecast, candidate scoring, tuning or production activation.','Reported-only subset results change sample composition and are not estimates of the causal effect of imputation. Corrected reported values remain distinct from directly reported values.','Origin-2010 cohorts exclude schools already missing/reclassified before origin; future attrition is retained in status and complete-window counts. Revised source vintages are not original publication vintages.','Sector centering uses origin-known training identities only. Withheld identities affect diagnostics, never common means.','Disjoint transition windows share boundary price levels; measurement revisions can induce cross-window dependence. Covariance/correlation does not uniquely identify persistent latent school effects.','Schools, residency sectors and overlapping outcome cases share economic years. Institution counts do not create independent macro histories; no confidence or promotion guarantee is assigned.']};
body.sha256=hash(canonical(body));mkdirSync('data/calibration-diagnostics',{recursive:true});
writeFileSync('data/calibration-diagnostics/quality-persistence.json',JSON.stringify(body)+'\n');
console.log(JSON.stringify({groups:sensitivity.length,persistenceSectors:persistence.length,sha256:body.sha256}));
