// Rebuild summaries from unchanged forecast quantiles/cases, without rerunning paths.
import {readFileSync}from 'node:fs';import {gunzipSync}from 'node:zlib';
import {buildCurrentReport}from './calibration/report.mjs';
import {parseSchools}from './calibration/schools.mjs';import {parseCpi}from './cost-followup-helpers.mjs';
const read=p=>JSON.parse(readFileSync(p)),old=read('site/data/current-calibration.json'),endpoints=read('data/calibration-cases/endpoint-errors.json');
const result=buildCurrentReport({base:read('site/data/calibration-foundation.json'),table:parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString()),cpi:parseCpi(readFileSync('data/raw/cpi.csv','utf8')),
 costCases:read('data/calibration-cases/school-costs.json'),fundingCases:read('data/calibration-cases/individual-funding.json'),householdCases:read('data/calibration-cases/household-funding.json'),endpointErrors:endpoints.records,endpointMissing:endpoints.unavailable,
 cohortAudit:old.cohortAudit,fitAudit:old.fitAudit,trials:old.trials,innerTrials:old.innerTrials,seed:old.seed});
console.log(JSON.stringify({hash:result.sha256,qualifications:result.qualifications}));
