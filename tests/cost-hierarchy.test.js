import test from 'node:test';import assert from 'node:assert/strict';
import {fitHierarchy,hierarchicalPath}from '../site/js/cost-hierarchy.js';
const records=[];
for(let s=0;s<20;s++)for(let i=0;i<21;i++)records.push({unitid:100+s,year:2000+i,tuition:10000*Math.exp((.02+(s-10)*.003)*i),housing:8000*Math.exp((.01+(s-10)*.001)*i),deflator:Math.exp(.02*i)});
test('known-process hierarchy identifies persistent school variation and excludes future data',()=>{
 const fit=fitHierarchy(records,2015);
 assert.ok(fit.signal[0]>.0001);assert.ok(fit.known[119].mean[0]>fit.known[100].mean[0]);
 assert.deepEqual(fitHierarchy(records.map(r=>r.year>2015?{...r,tuition:r.tuition*100}:r),2015),fit);
 assert.ok(fit.years.every(y=>y<2015));assert.throws(()=>fitHierarchy(records,2005),/ten training/);
});
test('known school shares persistent and annual effects across students and keeps common prefixes',()=>{
 const fit=fitHierarchy(records,2020),options={seed:88,trial:22,schoolKey:'unitid:104',unitid:104};
 const a=hierarchicalPath(fit,Array(10).fill(1.03),options),b=hierarchicalPath(fit,Array(4).fill(1.03),options);
 assert.deepEqual(a.slice(0,4),b);assert.deepEqual(a,hierarchicalPath(fit,Array(10).fill(1.03),options));
 const zero=hierarchicalPath(fit,Array(10).fill(1),options);
 a.forEach((r,i)=>assert.ok(Math.abs(r.tuition/zero[i].tuition-1.03)<1e-12));
 const unknown=hierarchicalPath(fit,Array(10).fill(1.03),{...options,unitid:null,schoolKey:'unknown:other'});
 assert.notDeepEqual(unknown,a);assert.ok(unknown.every(r=>r.tuition>0&&r.housing>0));
 assert.throws(()=>hierarchicalPath(fit,[1.03],{seed:1,trial:0}),/school identity/);
});
import {readFileSync}from 'node:fs';
import {createHash}from 'node:crypto';
import {newPlan}from '../site/js/domain.js';
import {compileCalibrated,calibrationFactory,canonical}from '../site/js/calibration.js';
test('candidate factory shares explicit school identity and rejects stacked corrections',()=>{
 const base=JSON.parse(readFileSync('site/data/calibration-foundation.json'));
 const p=newPlan(),st=p.students[0],sc=st.scenarios[0];p.valuation='2026-09';st.enrollment='2028-09';sc.baseline=p.valuation;sc.path='Public in-state';sc.costs.tuition=10000;sc.costs.housing=8000;
 const fit=fitHierarchy(records,2020),bundle={...base,costHierarchy:{id:fit.id,sectors:{public4:fit}}};
 const {c}=compileCalibrated(p,st,sc,bundle);c.costSchoolKey='unitid:104';c.costUnitid=104;
 const a=calibrationFactory(c,bundle,{seed:55}).make(10);
 const b=calibrationFactory({...c},bundle,{seed:55}).make(10);
 assert.deepEqual(a,b);
 const standard=calibrationFactory(c,base,{seed:55}).make(10);assert.deepEqual(a.gross,standard.gross);
 assert.notDeepEqual(a.compiled.rows.map(r=>r.total),standard.compiled.rows.map(r=>r.total));
 assert.throws(()=>calibrationFactory(c,{...bundle,costUncertainty:{}},{seed:55}),/cannot stack/);
});
test('official legacy data keep field definitions, missing flags and population break explicit',()=>{
 const audit=JSON.parse(readFileSync('data/legacy-ipeds-audit.json'));
 assert.equal(createHash('sha256').update(readFileSync(audit.selectedFile)).digest('hex'),audit.selectedSha256);
 assert.equal(audit.archives.length,20);assert.equal(audit.counts.length,10);
 assert.match(audit.fieldContract['1999'],/first-time first-year/);
 assert.match(audit.fieldContract.housing,/Unavailable/);
 assert.ok(audit.bridgeAudit.every(r=>r.exactMatches<r.n));
 assert.match(audit.status,/Not active/);
});
test('coherent evaluation preserves all folds, origin cutoffs and an explicit non-promotion',()=>{
 const r=JSON.parse(readFileSync('site/data/hierarchy-validation.json')),{sha256,...body}=r;
 assert.equal(createHash('sha256').update(canonical(body)).digest('hex'),sha256);
 for(const [p,h]of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),h);
 assert.equal(r.outer.length,90);assert.equal(r.promoted,false);
 assert.equal(r.gate.status,'insufficient-evidence');
 assert.ok(r.outer.every(x=>x.macroLast<x.origin&&x.costLast<=x.origin));
 assert.ok(r.fits.every(f=>f.sectors.every(s=>s.lastTransition<f.origin)));
});
