import { MODEL,PRNG,ASSUMPTIONS } from './domain.js?v=0.2.2';
import { compile,runPath,logParameters,requiredContribution } from './engine.js?v=0.2.2';
export function random(seed) {
  let a=seed>>>0;
  return ()=>{ a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296; };
}
export function trialGrowth(c,seed,trial) {
  // Each trial is a separate reproducible stream; months consumed in calendar order.
  const rand=random((seed^Math.imul(trial+1,0x9e3779b9))>>>0);
  const params=c.rates.map(a=>logParameters(a.mean,a.volatility));
  let spare=null;
  return (i=0)=>{
    const {mu,sigma}=params[i];
    if(!sigma)return Math.exp(mu);
    let z;
    if(spare!==null){z=spare;spare=null;}
    else {const u=1-rand(),v=rand(),mag=Math.sqrt(-2*Math.log(u));z=mag*Math.cos(2*Math.PI*v);spare=mag*Math.sin(2*Math.PI*v);}
    return Math.exp(mu+sigma*z);
  };
}
export function quantile(sorted,p) {
  if(!sorted.length)return null;const at=(sorted.length-1)*p,low=Math.floor(at),w=at-low;
  if(w===0||low===sorted.length-1)return sorted[low];
  if(!Number.isFinite(sorted[low+1]))return Infinity;
  return sorted[low]*(1-w)+sorted[low+1]*w;
}
const sorted=x=>x.sort((a,b)=>a-b);
const percentiles=x=>{const s=sorted(x);return {p10:quantile(s,.1),p50:quantile(s,.5),p90:quantile(s,.9)};};
export function simulate(c,{seed=12345,trials=10000,threshold=.9,ceiling=10000}={},progress=()=>{}) {
  if(!Number.isInteger(trials)||trials<100||trials>50000||!Number.isInteger(seed)||seed<0||seed>4294967295||threshold<.5||threshold>.99||!Number.isFinite(ceiling)||ceiling<0||ceiling>1e6)throw Error('Invalid simulation settings.');
  const gaps=[],realGaps=[],ending=[],required=[],failed=[],enrollment=[];
  const sampleIndices=[...new Set([0,...c.rows.map((r,i)=>i).filter(i=>i%12===11),c.rows.length-1])];
  const samples=sampleIndices.map(()=>[]);let successes=0;
  for(let t=0;t<trials;t++) {
    const path=trialGrowth(c,seed,t);const gross=Float64Array.from(c.rows,(_,i)=>path(i));
    const r=runPath(c,i=>gross[i],c.monthly,'bands');
    if(r.success)successes++;else failed.push(r.shortfall);
    gaps.push(r.shortfall);realGaps.push(r.realShortfall);ending.push(r.ending);if(r.enrollmentBalance!==null)enrollment.push(r.enrollmentBalance);
    required.push(requiredContribution(c,i=>gross[i]));
    sampleIndices.forEach((i,j)=>samples[j].push(r.balances[i]));
    if(t%250===0)progress({stage:'simulation',done:t,total:trials});
  }
  // Order statistic, not interpolated quantile: enough paths must pass the threshold.
  sorted(required);const candidate=required[Math.ceil(threshold*trials)-1];
  let contribution=null;
  if(Number.isFinite(candidate)&&Math.ceil(candidate)<=ceiling)contribution=Math.ceil(candidate);
  // Expand the feasibility sample, then recheck the rounded contribution on every
  // path in that larger sample. No extra market assumptions enter the solver.
  let confirmation=null;
  if(contribution!==null) {
    const count=Math.min(50000,Math.max(20000,trials*2));
    for(let t=trials;t<count;t++) {
      const path=trialGrowth(c,seed,t);
      required.push(requiredContribution(c,i=>path(i)));
      if(t%500===0)progress({stage:'contribution refinement',done:t,total:count});
    }
    sorted(required);const refined=required[Math.ceil(threshold*count)-1];
    if(!Number.isFinite(refined)||Math.ceil(refined)>ceiling)contribution=null;
    else {
      contribution=Math.ceil(refined);let pass=0;
      for(let t=0;t<count;t++) {
        const path=trialGrowth(c,seed,t);
        const r=runPath(c,i=>path(i),contribution,false);if(r.success)pass++;
        if(t%500===0)progress({stage:'contribution verification',done:t,total:count});
      }
      confirmation={trials:count,probability:pass/count,meets:pass/count>=threshold};
    }
  }
  progress({stage:'complete',done:trials,total:trials});
  return {modelVersion:MODEL,prngVersion:PRNG,assumptionsVersion:ASSUMPTIONS,seed,trials,threshold,ceiling,
    probability:successes/trials,samplingSE:Math.sqrt((successes/trials)*(1-successes/trials)/trials),
    gap:percentiles(gaps),realGap:percentiles(realGaps),ending:percentiles(ending),enrollment:percentiles(enrollment),
    failedCount:failed.length,conditionalGap:percentiles(failed),cost:c.rows.reduce((v,r)=>v+r.total,0),
    bands:sampleIndices.map((i,j)=>({date:c.rows[i].date,...percentiles(samples[j])})),
    contribution,additional:contribution===null?null:Math.max(0,contribution-c.monthly),confirmation,
    infeasible:contribution===null,unfundablePaths:required.filter(x=>!Number.isFinite(x)).length,
    input: {opening:c.opening,monthly:c.monthly,assumptions:c.a} };
}
export function compareScenarios(plan,student,settings,progress=()=>{}) {
  return student.scenarios.map((scenario,i)=>{
    progress({stage:`Scenario ${i+1} of ${student.scenarios.length}`,done:i,total:student.scenarios.length});
    const c=compile(plan,student,scenario);
    return {id:scenario.id,name:scenario.name,snapshot:structuredClone(scenario),deterministic:runPath(c),
      simulation:simulate(c,settings,p=>progress({...p,scenario:scenario.name}))};
  });
}
