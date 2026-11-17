import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {newPlan} from '../site/js/domain.js';
import {compileCalibrated,calibrationFactory,canonical} from '../site/js/calibration.js';
import {simulateHistorical} from '../site/js/history.js';
import {targetReserve} from '../site/js/binomial-reserve.js';
const read=p=>JSON.parse(readFileSync(p));
const b=read('site/data/calibration-foundation.json'),h=read('site/data/history.json'),results=[];
for(const wait of [1,8,16])for(const seed of [1,2,3,4]){
 const p=newPlan(),st=p.students[0],sc=st.scenarios[0];p.valuation='2026-09';st.enrollment=`${2026+wait}-09`;sc.baseline=p.valuation;sc.path='Public in-state';sc.years=4;
 sc.costs={tuition:12000,housing:9000,books:500,transport:500,other:0};
 Object.assign(st.funding,{balance:wait===1?60000:30000,monthly:300,contributionStart:p.valuation,contributionEnd:`${2026+wait}-08`});
 const {c}=compileCalibrated(p,st,sc,b),settings={seed,trials:100,threshold:.9,ceiling:50000};
 const r=simulateHistorical(c,h,settings,()=>{},true,calibrationFactory(c,b,settings));
 results.push({wait,seed,contribution:r.contribution,confirmation:r.confirmation,affordableBudget:r.affordableBudget});
 console.log(JSON.stringify({wait,seed,contribution:r.contribution,confirmed:r.confirmation?.meets}));
}
const report={id:'planning-consistency-v1',bundleHash:b.sha256,reserve:[.8,.9,.95,.99].map(target=>({target,...targetReserve(target)})),results,confirmed:results.filter(r=>r.confirmation?.meets).length,
 sourceHashes:Object.fromEntries(['site/js/engine.js','site/js/history.js','site/js/household.js','site/js/planning-decisions.js','site/js/binomial-reserve.js','site/js/savings-target.js','site/js/planning-stress.js','scripts/validate-planning.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),
 limitations:'Twelve seeds across three synthetic horizons check numerical consistency, not future economic accuracy. Budget capacity is a screen, not an independently verified target. Household policy keeps base allocation proportions; it is not an optimal reallocation solver.'};
report.sha256=createHash('sha256').update(canonical(report)).digest('hex');writeFileSync('site/data/planning-validation.json',JSON.stringify(report)+'\n');
if(report.confirmed<10)throw Error('Fewer than 10/12 independent checks confirmed; investigate before release.');
