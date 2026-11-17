import { random,quantile } from '../../site/js/random.js';
import { repriceRow } from '../../site/js/engine.js';
const median=xs=>quantile([...xs].sort((a,b)=>a-b),.5);
export function fitSchoolCurve(records,{origin,sector,kind}){
 const knots=[];
 for(const horizon of [2,5,10]){
  const byYear=new Map();
  for(const r of records){
   if(r.sector!==sector||r.kind!=='known'||r.horizon!==horizon||r.target>origin)continue;
   if(r.target-r.origin!==horizon||!Number.isFinite(r.tuition)||!Number.isFinite(r.housing))throw Error('Invalid school residual provenance.');
   if(!byYear.has(r.target))byYear.set(r.target,[]);byYear.get(r.target).push(r);
  }
  const years=[...byYear.keys()].sort((a,b)=>a-b);if(years.length<3)continue;
  const groups=years.map(year=>({year,errors:byYear.get(year).map(({tuition,housing,unitid})=>({tuition,housing,unitid}))}));
  const center=Object.fromEntries(['tuition','housing'].map(k=>[k,median(groups.map(g=>median(g.errors.map(r=>r[k]))))]));
  const weight=years.length/(years.length+10);
  knots.push({horizon,targetYears:years,count:years.length,groups,center,biasWeight:weight,spreadWeight:years.length>=5?Math.sqrt(weight):0});
 }
 return {id:'school-year-paired-errors-v1',origin,sector,kind,trainingKind:'known-training-identities-only',knots};
}
export function schoolFactors(fit,elapsed,seed,trial){
 if(!Number.isFinite(elapsed)||elapsed<0)throw Error('Invalid elapsed years.');
 if(!elapsed||!fit.knots.length)return {tuition:1,housing:1};
 const rand=random((seed^Math.imul(trial+1,0x6c8e9cf5)^0x4a39b70d)>>>0),u=rand(),v=rand();
 const error=(knot,key)=>{
  const group=knot.groups[Math.min(knot.groups.length-1,Math.floor(u*knot.groups.length))];
  const r=group.errors[Math.min(group.errors.length-1,Math.floor(v*group.errors.length))];
  return knot.center[key]*knot.biasWeight+(r[key]-knot.center[key])*knot.spreadWeight;
 };
 const points=[{horizon:0},...fit.knots];let hi=points.findIndex(p=>p.horizon>=elapsed);
 const beyond=hi<0;if(beyond)hi=points.length-1;
 const a=beyond?points[0]:points[hi-1],z=points[hi];
 return Object.fromEntries(['tuition','housing'].map(k=>{
  const x=a.horizon?error(a,k):0,y=error(z,k);
  return [k,Math.exp(x+(y-x)*(elapsed-a.horizon)/(z.horizon-a.horizon))];
 }));
}
export function correctedPath(path,fit,seed,trial){
 let factors={tuition:1,housing:1};const c=path.compiled;
 const rows=c.rows.map((r,i)=>{
  if(i===0||(i>=c.enrollmentIndex&&(i-c.enrollmentIndex)%12===0))factors=schoolFactors(fit,i/12,seed,trial);
  return repriceRow({...r,valuationCosts:r.costs},factors.tuition,factors.housing,r.discount,1);
 });
 return {...path,compiled:{...c,rows}};
}
