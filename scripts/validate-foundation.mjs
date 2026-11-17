import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
import {economyPath,fitEconomy} from '../site/js/economy.js';
import {eligibleGate} from './overhaul-gate.mjs';
const read=p=>JSON.parse(readFileSync(p));
const b=read('site/data/calibration-foundation.json'),old=read('site/data/full-calibration.json');
const years=b.economy.macroYears,fit=fitEconomy(years,b.economy.fitting),moments=[];
for(const c of b.macro.cases)for(const blockYears of [1,3,5])for(const conditioned of [false,true])for(const uncertainty of [false,true]){
 const trials=2000,length=10,values=[];
 for(let trial=0;trial<trials;trial++){
  const path=economyPath(years,fit,{...b.economy.initial,inflation:b.macro.cases[1].anchors.inflation},c.anchors,
   {seed:928173,trial,blockYears,conditioned,uncertainty,length,equityCentering:b.equityCentering,selectionAnchors:b.macro.cases[1].anchors});
  values.push(path.reduce((v,y)=>v+y.months.reduce((g,m)=>g*(1+m[0]),1)-1,0)/length);
 }
 const mean=values.reduce((a,b)=>a+b,0)/trials,se=Math.sqrt(values.reduce((v,x)=>v+(x-mean)**2,0)/(trials*(trials-1)));
 moments.push({case:c.id,blockYears,conditioned,uncertainty,trials,yearsPerPath:length,target:c.anchors.stocks,mean,pathClusterSE:se,withinTolerance:Math.abs(mean-c.anchors.stocks)<=5*se+.001});
}
const gate=eligibleGate(old.outer.map(r=>({...r,models:{...r.models,policy:r.models[old.selection.find(s=>s.origin===r.origin).selected]}})),old.selection);
const sourceHashes=Object.fromEntries(['site/js/economy.js','site/js/calibration.js','scripts/build_foundation.mjs','scripts/overhaul-gate.mjs','scripts/validate-foundation.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const report={id:'foundation-process-check-v1',bundleHash:b.sha256,archiveRevision:b.foundation.archiveRevision,timing:b.timing,moments,legacyGateReassessment:gate,sourceHashes,
 status:'Process contracts checked; revised whole-plan forecast coverage not established. Archived reports describe model 9.'};
report.sha256=createHash('sha256').update(canonical(report)).digest('hex');writeFileSync('site/data/foundation-validation.json',JSON.stringify(report)+'\n');
if(!moments.every(m=>m.withinTolerance))throw Error('Equity moment matrix outside declared tolerance');
console.log(JSON.stringify({matrixCases:moments.length,allWithinTolerance:true,gate:gate.status,legacyGate:gate.preflight}));
