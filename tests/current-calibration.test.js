import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync}from 'node:fs';
import {parseSchools,cohortAt,originBundle,identityHash,outcomeLevels}from '../scripts/calibration/schools.mjs';
import {fitSchoolCurve,schoolFactors,correctedPath}from '../scripts/calibration/residuals.mjs';
import {equalOriginMean,nonoverlap,reliability,fundingSummary,qualify}from '../scripts/calibration/statistics.mjs';
import {hash,scoreSnapshot,validateObservation}from '../scripts/calibration/prospective.mjs';
import {newPlan}from '../site/js/domain.js';
import {compile,runPath}from '../site/js/engine.js';
const read=p=>JSON.parse(readFileSync(p));
function schoolFixture(){
 let csv='YEAR,UNITID,SECTOR,CHG2AY3,CHG3AY3,CHG5AY3,XCHG2AY3,XCHG3AY3,XCHG5AY3\n';
 const cpi=new Map();for(let year=2000;year<=2015;year++){cpi.set(`${year}-08`,100+year-2000);for(let id=100;id<130;id++)csv+=`${year},${id},1,${10000+id+year},${15000+id+year},${8000+year},R,R,R\n`;}
 return {table:parseSchools(csv),cpi};
}
test('school cohorts and fit pools use no future membership or withheld school history',()=>{
 const {table,cpi}=schoolFixture(),cohort=cohortAt(table,2011,'public4',cpi),before=structuredClone(cohort);
 for(const years of table.values())for(const [year,r]of years)if(year>2011){r.CHG2AY3='';r.SECTOR='9';}
 assert.deepEqual(cohortAt(table,2011,'public4',cpi),before);
 assert.ok(cohort.unknown.every(s=>identityHash(s.unitid)%5===0));assert.ok(cohort.fit.every(s=>identityHash(s.unitid)%5!==0));
 const b=read('site/data/calibration-foundation.json');
 const cohorts=Object.fromEntries(['public4','public4out','public2','public2out','private4'].map(s=>[s,{...cohort,sector:s}]));
 const first=originBundle(b,2011,cohorts);
 for(const s of cohort.unknown)for(const r of s.rows)if(r.year<2011)table.get(s.unitid).get(r.year).CHG2AY3='999999';
 const rebuilt=cohortAt(table,2011,'public4',cpi);
 const second=originBundle(b,2011,Object.fromEntries(Object.keys(cohorts).map(s=>[s,{...rebuilt,sector:s}])));
 assert.deepEqual(first,second);
 assert.ok(first.annual.every(r=>r.year<2011));assert.ok(first.economy.macroYears.every(r=>r.year<2011));
 const id=cohort.known[0].unitid;assert.notEqual(outcomeLevels(table,id,2011,2013,'public4',cpi).status,'observed');
 assert.equal(cohortAt(table,2011,'public4',cpi).known.some(s=>s.unitid===id),true);
});
const residualRows=()=>Array.from({length:6},(_,j)=>Array.from({length:6},(_,i)=>({origin:2008+j,target:2010+j,horizon:2,sector:'public4',kind:'known',unitid:100+i,tuition:-.1+j*.01+i*.005,housing:-.02+j*.005+i*.001}))).flat();
test('school residual fitting clusters years, excludes future/kind records and keeps paired academic corrections',()=>{
 const rows=residualRows(),options={origin:2014,sector:'public4',kind:'known'},fit=fitSchoolCurve(rows,options);
 assert.equal(fit.knots[0].count,5);
 assert.deepEqual(fitSchoolCurve([...rows,{...rows[0],kind:'unknown',tuition:99},{...rows[0],target:2030,origin:2028,tuition:99}],options),fit);
 assert.equal(fitSchoolCurve(rows,{...options,origin:2011}).knots.length,0);
 const transferred=fitSchoolCurve([...rows,...rows.map(r=>({...r,kind:'unknown',tuition:99,housing:99}))],{...options,kind:'unknown'});
 assert.deepEqual(transferred.knots,fit.knots);
 assert.ok(transferred.knots.every(k=>k.groups.every(g=>g.errors.every(r=>r.tuition<1))));
 assert.deepEqual(schoolFactors(fit,0,1,1),{tuition:1,housing:1});
 const a=schoolFactors(fit,1,1,1),b=schoolFactors(fit,2,1,1);assert.ok(Math.abs(a.tuition*a.tuition-b.tuition)<1e-12);
 const p=newPlan(),st=p.students[0],sc=st.scenarios[0];p.valuation='2026-09';sc.baseline=p.valuation;st.enrollment='2028-09';sc.costs.tuition=10000;sc.costs.housing=8000;
 const c=compile(p,st,sc),path={compiled:c,gross:Float64Array.from(c.rows,()=>1)};
 const adjusted=correctedPath(path,fit,1,1);
 assert.equal(adjusted.gross,path.gross);assert.notEqual(runPath(adjusted.compiled,()=>1).total,runPath(c,()=>1).total);
});
test('statistics retain temporal support, equal-origin weighting and honest unavailable gates',()=>{
 const rows=[{origin:2000,sector:'a',v:0},...Array.from({length:100},()=>({origin:2001,sector:'a',v:1}))];assert.equal(equalOriginMean(rows,'v'),.5);
 assert.equal(reliability(Array.from({length:1000},()=>({origin:2010,sector:'a',probability:.9,actual:1})))[5].status,'thin-support');
 assert.equal(fundingSummary([{origin:2010,sector:'a',kind:'known',profile:'cash',wait:0,lastBillYear:2013,status:'missing',probability:.9,actual:null}]).brier,null);
 assert.deepEqual(nonoverlap([{origin:2010,lastBillYear:2013},{origin:2011,lastBillYear:2014},{origin:2014,lastBillYear:2017}]),[[2010,2013],[2014,2017]]);
 assert.equal(qualify([],'residual','known',8).status,'insufficient-evidence');
});
function snapshotFixture(){
 const d={definitionId:'definition-1',baselineAcademicYear:2026};
 const body={asOf:'2026-11-16',modelVersion:'test',bundleHash:'bundle',syntheticBudget:{tuition:10000,housing:10000},definitions:{public4:d},forecasts:[{sector:'public4',horizon:1,targetMonth:'2027-11',targetAcademicYear:2027,p10:19000,p50:21000,p90:23000}]};
 return {...body,sha256:hash(body)};
}
function observation(year){return {sector:'public4',academicYear:year,definitionId:'definition-1',bundleHash:'bundle',tuitionIndex:year===2026?100:110,housingIndex:year===2026?100:105,publishedAt:`${year}-11-01`,sourceUrl:'https://example.org/synthetic-unit-test',sourceFile:'data/forecast-outcomes/sources/synthetic-unit-test.csv',sourceSha256:'a'.repeat(64),definitionVerified:true};}
test('prospective scoring requires reached, source-backed comparable baseline and target observations',()=>{
 const s=snapshotFixture(),pending=scoreSnapshot(s,[],'2026-11-16');assert.equal(pending.observed,0);assert.equal(pending.coverage,null);assert.equal(pending.pending,1);
 assert.equal(scoreSnapshot(s,[observation(2026)],'2027-12-01').rows[0].status,'missing-target');
 const r=scoreSnapshot(s,[observation(2026),observation(2027)],'2027-12-01');assert.equal(r.observed,1);assert.equal(r.rows[0].actual,21500);assert.equal(r.coverage,1);
 assert.throws(()=>validateObservation(s,observation(2027),'2026-11-16'),/Future/);
 assert.throws(()=>validateObservation(s,{...observation(2026),definitionId:'wrong'},'2027-12-01'),/mismatch/);
 assert.throws(()=>validateObservation(s,{...observation(2026),tuitionIndex:0},'2027-12-01'),/positive/);
 assert.throws(()=>validateObservation(s,{...observation(2026),sourceFile:'../secret'},'2027-12-01'),/Source/);
 assert.throws(()=>scoreSnapshot(s,[observation(2026),observation(2026)],'2027-12-01'),/Duplicate/);
 assert.throws(()=>scoreSnapshot({...s,bundleHash:'tampered'},[],'2027-12-01'),/checksum/);
});
test('reserved qualification uses matched cases and cannot manufacture horizon support',()=>{
 const rows=[];for(const origin of [2017,2018,2019])for(const model of ['baseline','residual'])rows.push({origin,unitid:100,sector:'public4',kind:'known',wait:0,split:'final',status:'observed',model,score:model==='baseline'?1:.8,bias:0,covered:.8,residualSupported:true});
 assert.equal(qualify(rows,'residual','known',0).status,'passed');
 assert.equal(qualify(rows.map(r=>r.model==='residual'?{...r,residualSupported:false}:r),'residual','known',0).status,'insufficient-evidence');
 assert.equal(qualify(rows.filter(r=>!(r.model==='baseline'&&r.origin===2019)),'residual','known',0).reason,'Unmatched baseline cases');
});
import {originScore}from '../scripts/calibration/report.mjs';
test('proper interval comparisons normalize by a known budget rather than realized outcome',()=>{
 const a=originScore({p10:80,p50:100,p90:120,actual:200},100);
 assert.equal(a.rawIntervalScore,840);assert.equal(a.score,8.4);assert.equal(a.normalizer,100);
 const b=originScore({p10:80,p50:100,p90:120,actual:100},100);assert.equal(b.score,.4);assert.equal(b.normalizer,a.normalizer);
 assert.throws(()=>originScore(a,0),/positive/);
});
import {createHash}from 'node:crypto';
import {MODEL}from '../site/js/domain.js';
test('current report and case files verify sources, school isolation and exact score accounting',()=>{
 const r=read('site/data/current-calibration.json'),{sha256,...body}=r;
 assert.equal(hash(body),sha256);assert.equal(r.modelVersion,MODEL);
 for(const [p,h]of Object.entries({...r.sourceHashes,...r.caseHashes}))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),h,p);
 assert.equal(r.activated,false);assert.equal(r.unsupportedHorizons[0].wait,18);
 for(const c of r.cohortAudit){
  assert.ok(c.hierarchyTrainingIds.every(id=>identityHash(id)%5!==0));assert.ok(c.unknownIds.every(id=>identityHash(id)%5===0));
  assert.ok(c.knownIds.every(id=>c.hierarchyTrainingIds.includes(id)));
 }
 for(const f of r.fitAudit)for(const k of f.knots){assert.equal(k.count,k.targetYears.length);assert.ok(k.targetYears.every(y=>y<=f.origin));assert.ok(k.trainingIds.every(id=>identityHash(id)%5!==0));}
 const costs=read('data/calibration-cases/school-costs.json');
 for(const c of costs.filter(r=>r.status==='observed')){
  assert.ok(c.macroLast<c.origin&&c.costLast<=c.origin);
  assert.equal(c.score,(c.p90-c.p10+10*Math.max(0,c.p10-c.actual)+10*Math.max(0,c.actual-c.p90))/c.normalizer);
  assert.ok(c.pit>=0&&c.pit<=1);assert.equal(c.covered+c.below+c.above,1);
  if(c.model==='residual'&&c.residualSupported){const f=r.fitAudit.find(f=>f.origin===c.origin&&f.kind===c.kind&&f.sector===c.sector);assert.ok(f.knots.at(-1).horizon>=c.wait+3);}
 }
});
test('saved funding cases preserve missingness, monotonic funding and binding joint caps',()=>{
 const rows=read('data/calibration-cases/individual-funding.json'),groups=new Map();
 for(const r of rows){
  if(r.status==='observed'){assert.ok(r.actual===0||r.actual===1);assert.equal(r.actual===1,r.firstUnpaid===null);}
  else assert.equal(r.actual,null);
  if(r.probability===null)continue;
  const key=[r.origin,r.wait,r.sector,r.kind,r.unitid,r.profile].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);
 }
 for(const xs of groups.values()){xs.sort((a,b)=>a.factor-b.factor);for(let j=1;j<xs.length;j++){assert.ok(xs[j].probability>=xs[j-1].probability);if(xs[j].actual!==null)assert.ok(xs[j].actual>=xs[j-1].actual);}}
 const households=read('data/calibration-cases/household-funding.json');let caps=0;
 for(const r of households.filter(r=>r.capped&&r.status==='observed')){
  const b=households.find(x=>!x.capped&&x.origin===r.origin&&x.wait===r.wait&&x.factor===r.factor&&x.configuration===r.configuration);
  assert.ok(r.probability<=b.probability);assert.ok(r.actual<=b.actual);assert.ok(r.peak<=r.monthlyLimit+1e-7);assert.equal(r.capBinds,r.uncappedPeak>r.monthlyLimit);if(r.capBinds)caps++;
 }
 assert.ok(caps>0);assert.ok(households.filter(r=>r.wait===8).every(r=>r.actual===null));
});
