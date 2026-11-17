// One coherent real-growth hierarchy. Candidate only; no production bundle enables it.
import { random } from './random.js?v=0.13.0';
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const pairMean=xs=>[0,1].map(k=>mean(xs.map(x=>x[k])));
const variance=xs=>{const m=mean(xs);return mean(xs.map(x=>(x-m)**2));};
const keyHash=text=>{let h=2166136261;for(const x of String(text))h=Math.imul(h^x.charCodeAt(0),16777619);return h>>>0;};
const pick=(xs,rand)=>xs[Math.floor(rand()*xs.length)];
export function fitHierarchy(records,origin) {
 const groups=new Map();
 for(const r of records){
  if(r.year>origin)continue;
  if(!['tuition','housing','deflator'].every(k=>Number.isFinite(r[k])&&r[k]>0))continue;
  if(!groups.has(r.unitid))groups.set(r.unitid,[]);groups.get(r.unitid).push(r);
 }
 const changes=[];
 for(const [unitid,rows]of groups){
  rows.sort((a,b)=>a.year-b.year);
  if(rows.some((r,i)=>i&&r.year===rows[i-1].year))throw Error('Duplicate institution-year.');
  const pairs=rows.slice(1).flatMap((r,i)=>r.year===rows[i].year+1?[{unitid,year:rows[i].year,values:['tuition','housing'].map(k=>Math.log(r[k]/rows[i][k])-Math.log(r.deflator/rows[i].deflator))}]:[]);
  if(pairs.length>=5)changes.push(...pairs);
 }
 const years=[...new Set(changes.map(r=>r.year))].sort((a,b)=>a-b);
 if(years.length<10)throw Error('Hierarchy requires ten training transitions.');
 const common=Object.fromEntries(years.map(y=>[y,pairMean(changes.filter(r=>r.year===y).map(r=>r.values))]));
 const center=pairMean(Object.values(common));
 const commonInnovations=years.map(year=>({year,values:common[year].map((v,k)=>v-center[k])}));
 const schools=[...new Set(changes.map(r=>r.unitid))].map(unitid=>{
  const rows=changes.filter(r=>r.unitid===unitid),values=rows.map(r=>r.values.map((v,k)=>v-common[r.year][k]));
  const effect=pairMean(values),innovations=values.map(v=>v.map((x,k)=>x-effect[k]));
  return {unitid,n:rows.length,effect,noise:[0,1].map(k=>variance(innovations.map(v=>v[k]))),innovations};
 });
 const effectCenter=pairMean(schools.map(s=>s.effect));
 const rawVariance=[0,1].map(k=>variance(schools.map(s=>s.effect[k])));
 const signal=rawVariance.map((v,k)=>Math.max(0,v-mean(schools.map(s=>s.noise[k]/s.n))));
 const populationEffects=schools.map(s=>s.effect.map((v,k)=>(v-effectCenter[k])*(rawVariance[k]>0?Math.sqrt(signal[k]/rawVariance[k]):0)));
 const known=Object.fromEntries(schools.map(s=>[s.unitid,{n:s.n,mean:s.effect.map((v,k)=>(v-effectCenter[k])*(signal[k]/(signal[k]+s.noise[k]/s.n)||0)),posteriorScale:signal.map((v,k)=>Math.sqrt((s.noise[k]/s.n)/(v+s.noise[k]/s.n)||0))}]));
 const innovations=schools.flatMap(s=>s.innovations);
 return {id:'paired-real-cost-hierarchy-v1',origin,lastTransition:years.at(-1),years,center,commonInnovations,signal,populationEffects,known,innovations,
  institutions:schools.length,observations:changes.length,status:'candidate; coverage not established'};
}
export function hierarchicalPath(fit,inflations,{seed,trial,schoolKey,unitid=null,sourceYears=[]}){
 if(!schoolKey)throw Error('Explicit school identity or unknown-school key is required.');
 const commonRand=random((seed^Math.imul(trial+1,0xa24baed5))>>>0);
 const schoolRand=random((seed^Math.imul(trial+1,0x9fb21c65)^keyHash(schoolKey))>>>0);
 const meanDraw=pick(fit.commonInnovations,commonRand).values.map(v=>v/Math.sqrt(fit.years.length));
 const population=pick(fit.populationEffects,schoolRand),known=fit.known[unitid];
 const effect=known?population.map((v,k)=>known.mean[k]+v*known.posteriorScale[k]):population;
 return inflations.map((inflation,i)=>{
  if(!(inflation>0))throw Error('Positive inflation gross required.');
  const fallback=pick(fit.commonInnovations,commonRand);
  const common=fit.commonInnovations.find(r=>r.year===sourceYears[i])||fallback;
  const individual=pick(fit.innovations,schoolRand);
  const growth=[0,1].map(k=>inflation*Math.exp(fit.center[k]+meanDraw[k]+common.values[k]+effect[k]+individual[k]));
  return {tuition:growth[0],housing:growth[1],inflation};
 });
}
