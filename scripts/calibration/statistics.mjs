import {random,quantile}from '../../site/js/random.js';
export const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
export function equalOriginMean(rows,key){
 const originGroups=new Map();
 for(const r of rows){if(!originGroups.has(r.origin))originGroups.set(r.origin,new Map());
  const sectors=originGroups.get(r.origin);if(!sectors.has(r.sector))sectors.set(r.sector,[]);sectors.get(r.sector).push(r[key]);}
 return mean([...originGroups.values()].map(ss=>mean([...ss.values()].map(mean))));
}
export function nonoverlap(rows){
 const windows=[];
 for(const r of [...rows].sort((a,b)=>a.origin-b.origin||a.lastBillYear-b.lastBillYear))
  if(!windows.length||r.origin>windows.at(-1)[1])windows.push([r.origin,r.lastBillYear]);
 return windows;
}
export function originBootstrap(rows,key){
 const origins=[...new Set(rows.map(r=>r.origin))].sort((a,b)=>a-b);
 if(origins.length<3)return null;
 const values=origins.map(origin=>equalOriginMean(rows.filter(r=>r.origin===origin),key));
 const rand=random(461809),samples=[];
 for(let b=0;b<1000;b++){let v=0;for(let j=0;j<values.length;j++)v+=values[Math.floor(rand()*values.length)];samples.push(v/values.length);}
 samples.sort((a,b)=>a-b);return {low:quantile(samples,.025),high:quantile(samples,.975),resamples:1000,unit:'origin',limitation:'Overlapping starts remain dependent; descriptive cluster interval, not a calibration guarantee.'};
}
export function reliability(rows){
 const cuts=[0,.2,.4,.6,.8,.9,.95,1];
 return cuts.slice(1).map((high,i)=>{
  const low=cuts[i],xs=rows.filter(r=>r.probability>=low&&(high===1?r.probability<=high:r.probability<high));
  const origins=[...new Set(xs.map(r=>r.origin))];
  return {low,high,cases:xs.length,origins:origins.length,predicted:equalOriginMean(xs,'probability'),observed:equalOriginMean(xs,'actual'),status:origins.length<3?'thin-support':'descriptive'};
 });
}
export function fundingSummary(rows){
 const scored=rows.filter(r=>r.status==='observed').map(r=>{
  const earlier=rows.filter(x=>x.status==='observed'&&x.kind===r.kind&&x.wait===r.wait&&x.profile===r.profile&&x.lastBillYear<r.origin);
  const baseRate=earlier.length?equalOriginMean(earlier,'actual'):.5;
  return {...r,brier:(r.probability-r.actual)**2,baseBrier:(baseRate-r.actual)**2};
 });
 return {cases:rows.length,observed:scored.length,unavailable:rows.length-scored.length,origins:new Set(scored.map(r=>r.origin)).size,nonoverlappingWindows:nonoverlap(scored),
  brier:equalOriginMean(scored,'brier'),baseBrier:equalOriginMean(scored,'baseBrier'),coinFlipBrier:.25,clusterInterval:originBootstrap(scored,'brier'),reliability:reliability(scored)};
}
export function qualify(rows,model,kind,wait){
 const xs=rows.filter(r=>r.status==='observed'&&r.split==='final'&&r.kind===kind&&r.wait===wait&&r.model===model);
 const base=rows.filter(r=>r.status==='observed'&&r.split==='final'&&r.kind===kind&&r.wait===wait&&r.model==='baseline');
 const origins=new Set(xs.map(r=>r.origin));
 const key=r=>[r.origin,r.sector,r.unitid,r.wait,r.kind].join(':');
 const keys=new Set(base.map(key));
 if(base.length!==xs.length||xs.some(r=>!keys.has(key(r))))return {model,kind,wait,status:'insufficient-evidence',reason:'Unmatched baseline cases',origins:origins.size};
 if(origins.size<3||!xs.length||xs.some(r=>model==='residual'&&!r.residualSupported))return {model,kind,wait,status:'insufficient-evidence',origins:origins.size};
 const a=equalOriginMean(base,'score'),b=equalOriginMean(xs,'score');
 if(!(a>0))return {model,kind,wait,status:'insufficient-evidence',reason:'No positive baseline score',origins:origins.size};
 const checks={score:b<=a*.95,coverage:Math.abs(equalOriginMean(xs,'covered')-.8)<=Math.abs(equalOriginMean(base,'covered')-.8),bias:Math.abs(equalOriginMean(xs,'bias'))<=Math.abs(equalOriginMean(base,'bias'))+.02,
  sectors:[...new Set(xs.map(r=>r.sector))].every(s=>equalOriginMean(xs.filter(r=>r.sector===s),'score')<=equalOriginMean(base.filter(r=>r.sector===s),'score')*1.1)};
 return {model,kind,wait,status:Object.values(checks).every(Boolean)?'passed':'failed',origins:origins.size,baselineScore:a,candidateScore:b,oracleScore:0,oracleFeasible:true,checks};
}
