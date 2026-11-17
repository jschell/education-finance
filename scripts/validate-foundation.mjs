import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical,compileCalibrated,calibrationFactory} from '../site/js/calibration.js';
import {newPlan} from '../site/js/domain.js';
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
// Independently exercise the shipped factory, not just economyPath in isolation.
const p=newPlan(),st=p.students[0],sc=st.scenarios[0];
p.valuation='2026-09';st.enrollment='2036-09';sc.baseline=p.valuation;sc.path='Public in-state';sc.years=1;sc.costs.tuition=10000;
const {c}=compileCalibrated(p,st,sc,b);
c.history={...c.history,fee:0,allocations:[{date:p.valuation,stocks:1,bonds:0,cash:0,referenceRate:null}]};
const factory=calibrationFactory(c,b,{seed:426819}),factoryValues=[];
for(let trial=0;trial<20000;trial++){
 const path=factory.make(trial);let annualSum=0;
 for(let year=0;year<10;year++){let gross=1;for(let m=0;m<12;m++)gross*=path.gross[year*12+m];annualSum+=gross-1;}
 factoryValues.push(annualSum/10);
}
const factoryMean=factoryValues.reduce((a,b)=>a+b,0)/factoryValues.length;
const factorySE=Math.sqrt(factoryValues.reduce((v,x)=>v+(x-factoryMean)**2,0)/(factoryValues.length*(factoryValues.length-1)));
const liveFactoryEquity={case:b.macro.cases[1].id,asset:'100% equity, zero fees',paths:20000,yearsPerPath:10,seed:426819,target:b.macro.cases[1].anchors.stocks,mean:factoryMean,pathClusterSE:factorySE,tolerance:'4 path-cluster standard errors + 0.00025',passed:Math.abs(factoryMean-b.macro.cases[1].anchors.stocks)<=4*factorySE+.00025};
const gate=eligibleGate(old.outer.map(r=>({...r,models:{...r.models,policy:r.models[old.selection.find(s=>s.origin===r.origin).selected]}})),old.selection);
const sourceHashes=Object.fromEntries(['site/js/economy.js','site/js/calibration.js','scripts/build_foundation.mjs','scripts/overhaul-gate.mjs','scripts/validate-foundation.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const report={id:'foundation-process-check-v1',bundleHash:b.sha256,archiveRevision:b.foundation.archiveRevision,timing:b.timing,moments,liveFactoryEquity,legacyGateReassessment:gate,sourceHashes,
 status:'Process contracts checked; revised whole-plan forecast coverage not established. Archived reports describe model 9.'};
report.sha256=createHash('sha256').update(canonical(report)).digest('hex');writeFileSync('site/data/foundation-validation.json',JSON.stringify(report)+'\n');
if(!liveFactoryEquity.passed || !moments.every(m=>m.withinTolerance))throw Error('Equity moment matrix outside declared tolerance');
console.log(JSON.stringify({matrixCases:moments.length,allWithinTolerance:true,liveFactoryEquity,gate:gate.status,legacyGate:gate.preflight}));
