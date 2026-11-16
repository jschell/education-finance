import { allocationAt } from './planning.js?v=0.3.0';
import { outcomeDistribution } from './distribution.js?v=0.3.0';
import { MODEL,clone } from './domain.js?v=0.3.0';
import { compile,runPath,repriceRow,requiredContribution } from './engine.js?v=0.3.0';
import { random,quantile } from './simulation.js?v=0.3.0';
import { DATASET_ID,HISTORY_PRNG,PROFILES,periodLabel } from './history-config.js?v=0.3.0';
const sort=x=>x.sort((a,b)=>a-b);
const percentiles=x=>{sort(x);return {p10:quantile(x,.1),p50:quantile(x,.5),p90:quantile(x,.9)};};
export function validateHistory(data) {
  if(data.id!==DATASET_ID||data.observations?.length!==564||data.start!=='1978-01'||data.end!=='2024-12'||data.columns.join(',')!=='month,stocks,bonds,cash,inflation,tuition')throw Error('The historical data snapshot is incomplete or unsupported.');
  let previous=null;
  for(const row of data.observations){
    if(!Array.isArray(row)||row.length!==6||!/^\d{4}-(0[1-9]|1[0-2])$/.test(row[0])||row.slice(1).some(x=>!Number.isFinite(x)||x<=-1||x>2))throw Error('Invalid historical observation.');
    const [y,m]=row[0].split('-').map(Number),n=y*12+m;if(previous!==null&&n!==previous+1)throw Error('Historical months are not consecutive.');previous=n;
  }
  return data;
}
export async function verifyHistory(data) {
  validateHistory(data);
  const canonical=data.observations.map(row=>row[0]+','+row.slice(1).map(v=>v.toFixed(10)).join(',')).join('\n');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
  const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==data.observationsSha256)throw Error('Historical data checksum mismatch. Reload before calculating.');
  return data;
}
export function observations(data,period='full') {return data.observations.filter(row=>period!=='recent'||row[0]>='2000-01');}
function stage(c,i) {return i>=c.enrollmentIndex?2:i>=c.enrollmentIndex-c.a.transitionYears*12?1:0;}
export function portfolioGross(row,weights,fee=0) { return (1+row[1]*weights[0]+row[2]*weights[1]+row[3]*weights[2])*(1-fee)**(1/12); }
export function referenceScenario(scenario,data) {
  const s=clone(scenario);for(const entry of s.history.allocations)entry.referenceRate=null;if(s.history.reference==='manual')return s;
  const rows=observations(data,s.history.period),stages=PROFILES[s.history.profile].stages;
  const annual=fn=>Math.expm1(rows.reduce((v,row)=>v+Math.log(fn(row)),0)/rows.length*12);
  const rates=stages.map(w=>annual(row=>portfolioGross(row,w,s.history.fee)));
  s.assumptions.returnRate=rates[0];s.assumptions.lateReturn=rates[1];s.assumptions.attendanceReturn=rates[2];
  if(s.history.costMode==='historical'){s.assumptions.tuitionGrowth=annual(row=>1+row[5]);s.assumptions.livingGrowth=annual(row=>1+row[4]);s.assumptions.inflation=s.assumptions.livingGrowth;}
  for(const entry of s.history.allocations)entry.referenceRate=annual(row=>portfolioGross(row,[entry.stocks,entry.bonds,entry.cash],s.history.fee));
  s.assumptionsStatus='user-defined';s.assumptionsDate=data.asOf.slice(0,7);return s;
}
export function blockIndices(rows,length,startMonth,blockYears,seed,trial) {
  const block=blockYears*12;
  const starts=rows.map((r,i)=>i).filter(i=>Number(rows[i][0].slice(5))-1===startMonth&&i+block<=rows.length);
  if(!starts.length)throw Error('Not enough history for the selected block length.');
  const rand=random((seed^Math.imul(trial+1,0x9e3779b9))>>>0),indices=[];
  while(indices.length<length){const first=starts[Math.floor(rand()*starts.length)];for(let i=0;i<block&&indices.length<length;i++)indices.push(first+i);}
  return indices;
}
export function historicalPath(c,rows,indices) {
  const stages=PROFILES[c.history.profile].stages,gross=new Float64Array(c.rows.length),priced=[];
  let tuition=1,living=1,discount=1;
  for(let i=0;i<c.rows.length;i++){
    const observation=rows[indices[i]];const allocation=allocationAt(c.rows[i].date,c.history.allocations),weights=allocation?[allocation.stocks,allocation.bonds,allocation.cash]:stages[stage(c,i)];gross[i]=portfolioGross(observation,weights,c.history.fee);
    priced.push(c.history.costMode==='historical'?repriceRow(c.rows[i],tuition,living,discount):c.rows[i]);
    tuition*=1+observation[5];living*=1+observation[4];discount*=1+observation[4];
  }
  return {compiled:{...c,rows:priced},gross};
}
function replay(c,data) {
  const rows=observations(data,c.history.period),starts=rows.map((_,i)=>i).filter(i=>Number(rows[i][0].slice(5))-1===c.valuationMonth&&i+c.rows.length<=rows.length);
  const results=starts.map(first=>{const indices=Array.from({length:c.rows.length},(_,i)=>first+i),path=historicalPath(c,rows,indices),result=runPath(path.compiled,i=>path.gross[i],c.monthly,false);return {...result,start:rows[first][0],end:rows[first+c.rows.length-1][0]};});
  if(!results.length)return {windows:0,period:periodLabel(c.history.period)};
  const worst=results.reduce((a,b)=>a.shortfall>b.shortfall?a:b);
  return {windows:results.length,period:periodLabel(c.history.period),passRate:results.filter(r=>r.success).length/results.length,
    gap:percentiles(results.map(r=>r.shortfall)),costRange:percentiles(results.map(r=>r.total)),worstStart:worst.start,worstEnd:worst.end,worstGap:worst.shortfall};
}
export function simulateHistorical(c,data,settings={},progress=()=>{},solve=true) {
  const {seed=12345,trials=10000,threshold=.9,ceiling=10000}=settings;
  if(!Number.isInteger(trials)||trials<100||trials>50000||!Number.isInteger(seed)||seed<0||seed>4294967295||threshold<.5||threshold>.99||ceiling<0||!Number.isFinite(ceiling))throw Error('Invalid assessment settings.');
  const rows=observations(data,c.history.period),requirements=[],gaps=[],realGaps=[],costs=[],realCosts=[],tuitionCosts=[],ending=[],enrollment=[],failed=[];
  const dates=[...new Set([0,...c.rows.map((r,i)=>i).filter(i=>i%12===11),c.rows.length-1])],samples=dates.map(()=>[]);let successes=0;
  const make=t=>historicalPath(c,rows,blockIndices(rows,c.rows.length,c.valuationMonth,c.history.blockYears,seed,t));
  for(let t=0;t<trials;t++){
    const path=make(t),r=runPath(path.compiled,i=>path.gross[i],c.monthly,'bands');
    if(r.success)successes++;else failed.push(r.shortfall);
    gaps.push(r.shortfall);realGaps.push(r.realShortfall);costs.push(r.total);realCosts.push(r.realTotal);tuitionCosts.push(r.tuitionTotal);ending.push(r.ending);if(r.enrollmentBalance!==null)enrollment.push(r.enrollmentBalance);
    dates.forEach((i,j)=>samples[j].push(r.balances[i]));
    if(solve)requirements.push(requiredContribution(path.compiled,i=>path.gross[i]));
    if(t%250===0)progress({stage:'Historical outcome paths',done:t,total:trials});
  }
  let contribution=null,confirmation=null;
  if(solve){
    const count=Math.min(50000,Math.max(20000,trials*2));
    for(let t=trials;t<count;t++){const path=make(t);requirements.push(requiredContribution(path.compiled,i=>path.gross[i]));if(t%500===0)progress({stage:'Monthly savings target',done:t,total:count});}
    sort(requirements);const target=requirements[Math.ceil(threshold*count)-1];
    if(Number.isFinite(target)&&Math.ceil(target)<=ceiling){
      contribution=Math.ceil(target);const passes=requirements.filter(x=>x<=contribution).length;
      // Verify actual capped-balance ledgers on a separate seeded set; do not fit to it.
      const verify=1000;let passed=0;
      for(let t=0;t<verify;t++){
        const path=historicalPath(c,rows,blockIndices(rows,c.rows.length,c.valuationMonth,c.history.blockYears,seed^0x51ed270b,t));
        if(runPath(path.compiled,i=>path.gross[i],contribution,false).success)passed++;
      }
      confirmation={trials:verify,probability:passed/verify,meets:passed/verify>=threshold,calibrationTrials:count,calibrationProbability:passes/count};
    }
  }
  return {modelVersion:MODEL,prngVersion:HISTORY_PRNG,assumptionsVersion:DATASET_ID,seed,trials,threshold,ceiling,
    distributions:{gap:outcomeDistribution(failed,{fundedCount:successes,total:trials,bands:6}),enrollment:outcomeDistribution(enrollment),cost:outcomeDistribution(costs)},
    method:'Calendar-aligned joint historical block bootstrap',period:periodLabel(c.history.period),blockYears:c.history.blockYears,profile:c.history.profile,allocations:clone(c.history.allocations),costMode:c.history.costMode,fee:c.history.fee,
    probability:successes/trials,samplingSE:Math.sqrt(successes/trials*(1-successes/trials)/trials),gap:percentiles(gaps),realGap:percentiles(realGaps),costRange:percentiles(costs),realCostRange:percentiles(realCosts),tuitionRange:percentiles(tuitionCosts),
    ending:percentiles(ending),enrollment:percentiles(enrollment),failedCount:failed.length,conditionalGap:percentiles(failed),cost:quantile(sort([...costs]),.5),
    bands:dates.map((i,j)=>({date:c.rows[i].date,...percentiles(samples[j])})),contribution,additional:contribution===null?null:Math.max(0,contribution-c.monthly),confirmation,infeasible:solve&&contribution===null};
}
export function assessHistorical(plan,student,scenario,data,settings,progress=()=>{}) {
  validateHistory(data);const reference=referenceScenario(scenario,data),c=compile(plan,student,reference);
  const simulation=simulateHistorical(c,data,settings,progress);
  progress({stage:'Actual historical periods',done:0,total:1});const historicalReplay=replay(c,data);
  const alternate=scenario.history.period==='recent'?'full':'recent';
  const alternateScenario=clone(scenario);alternateScenario.history.period=alternate;
  const alternateReference=referenceScenario(alternateScenario,data);
  const sensitivity=simulateHistorical(compile(plan,student,alternateReference),data,{...settings,trials:1000},p=>progress({...p,stage:'Historical-period comparison'}),false);
  return {simulation,historicalReplay,sensitivity,deterministic:runPath(c),referenceScenario:reference,snapshot:clone(scenario),
    dataset:{id:data.id,hash:data.observationsSha256,start:data.start,end:data.end,asOf:data.asOf,observations:data.observations.length,sources:data.sources,notes:data.notes}};
}
