import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { canonical } from '../site/js/calibration.js';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const base=read('site/data/calibration-reviewed.json');
const cpi=new Map(readFileSync('data/raw/cpi.csv','utf8').trim().split(/\r?\n/).slice(1).map(line=>{const [date,value]=line.split(',');const [m,,y]=date.split('/');return [`${y}-${+m}`, +value];}));
const b=structuredClone(base);
b.id='us-foundation-calibration-2026-11-16-v6';
b.equityCentering='conditional-block-v1';
b.timing={marketYear:'September y through August y+1',costTransition:'August price level y to August price level y+1',realPrices:'August CPI endpoints',publication:'Revised historical prices; publication vintages unavailable. Not a real-time vintage backtest.'};
for(const prices of Object.values(b.prices))for(const p of prices){const v=cpi.get(`${p.year}-8`);if(!(v>0))throw Error('Missing August CPI '+p.year);p.deflator=v/cpi.get('2023-8');}
b.annual=Array.from({length:23},(_,i)=>{
 const year=2000+i,macro=b.economy.macroYears.find(r=>r.year===year);
 const sectors=Object.fromEntries(Object.entries(b.prices).map(([s,prices])=>{const a=prices.find(r=>r.year===year),z=prices.find(r=>r.year===year+1);return [s,{tuition:z.tuition/a.tuition,housing:z.housing/a.housing}];}));
 return {year,months:macro.months,inflation:cpi.get(`${year+1}-8`)/cpi.get(`${year}-8`),sectors};
});
// Residuals fitted to the old misaligned transition cannot carry into this model.
b.costCorrection=null;b.costUncertainty=null;delete b.costRecalibration;
b.foundation={parentHash:base.sha256,archiveRevision:'d0d536ca74103ef29853db1db340f47db5e182a9',status:'Corrected process; future coverage unestablished',cpiHash:createHash('sha256').update(readFileSync('data/raw/cpi.csv')).digest('hex')};
b.notes=[...b.notes,'Model 10 corrects conditional equity means and aligns September–August market and cost transitions. Prior validation reports are archived evidence, not validation of these changes. Old cost-error corrections are disabled pending comparable refitting.'];
delete b.sha256;b.sha256=createHash('sha256').update(canonical(b)).digest('hex');
writeFileSync('site/data/calibration-foundation.json',JSON.stringify(b)+'\n');console.log({id:b.id,hash:b.sha256});
