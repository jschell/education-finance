import { clone,validatePlan } from './domain.js?v=0.4.0';
import { compile,runPath } from './engine.js?v=0.4.0';
import { observations,referenceScenario,historicalPath,blockIndices,tuitionLogMean } from './history.js?v=0.4.0';
import { quantile } from './simulation.js?v=0.4.0';
import { periodLabel } from './history-config.js?v=0.4.0';
const range=values=>{values.sort((a,b)=>a-b);return {p10:quantile(values,.1),p50:quantile(values,.5),p90:quantile(values,.9)};};
export function capHouseholdContributions(compiled,limit){
  const horizon=Math.max(...compiled.map(c=>c.rows.length)),monthly=Array(horizon).fill(0);
  for(let i=0;i<horizon;i++){
    const requested=compiled.reduce((v,c)=>v+(c.rows[i]?.factor||0)*c.monthly,0),scale=limit===null||requested<=limit?1:limit/requested;
    for(const c of compiled)if(c.rows[i])c.rows[i]={...c.rows[i],factor:c.rows[i].factor*scale};
    monthly[i]=requested*scale;
  }
  return monthly;
}
export function assessHousehold(plan,data,settings,commonHistory,progress=()=>{}){
  validatePlan(plan);const selected=plan.students.map(st=>({student:st,scenario:st.scenarios.find(sc=>sc.id===plan.family.scenarios[st.id])||st.scenarios[0]}));
  const compiled=selected.map(({student,scenario})=>{const sc=clone(scenario);sc.history.period=commonHistory.period;sc.history.blockYears=commonHistory.blockYears;return compile(plan,student,referenceScenario(sc,data));});
  const contributionSchedule=capHouseholdContributions(compiled,plan.family.monthlyLimit),rows=observations(data,commonHistory.period),center=tuitionLogMean(rows),length=Math.max(...compiled.map(c=>c.rows.length));
  const missingBudgets=selected.filter(({scenario})=>!Object.values(scenario.costs).some(x=>x>0)).map(({student})=>student.alias);
  const annual=new Map(),gaps=[],costs=[],endings=[];let passed=0;
  const trials=settings.trials;
  for(let t=0;t<trials;t++){
    const indices=blockIndices(rows,length,compiled[0].valuationMonth,commonHistory.blockYears,settings.seed,t);let success=true,gap=0,cost=0,ending=0;const yearly=new Map();
    for(const c of compiled){
      const path=historicalPath(c,rows,indices,center),result=runPath(path.compiled,i=>path.gross[i],c.monthly,false);
      success&&=result.success;gap+=result.shortfall;cost+=result.total;ending+=result.ending;
      for(const row of path.compiled.rows){const y=yearly.get(row.year)||{cost:0,need:0,income:0,contributions:0};y.cost+=row.total;y.need+=row.need;y.income+=row.income;y.contributions+=c.monthly*row.factor;yearly.set(row.year,y);}
    }
    for(const [year,values] of yearly){if(!annual.has(year))annual.set(year,{cost:[],need:[],income:[],contributions:[]});for(const key of Object.keys(values))annual.get(year)[key].push(values[key]);}
    if(success)passed++;gaps.push(gap);costs.push(cost);endings.push(ending);
    if(t%250===0)progress({stage:'Household · shared economic paths',done:t,total:trials});
  }
  return {trials,seed:settings.seed,period:periodLabel(commonHistory.period),blockYears:commonHistory.blockYears,probability:missingBudgets.length?null:passed/trials,missingBudgets,
    gap:range(gaps),cost:range(costs),ending:range(endings),monthlyLimit:plan.family.monthlyLimit,peakMonthlyContribution:Math.max(...contributionSchedule),unallocatedPool:plan.sharedPool-plan.students.reduce((v,s)=>v+s.sharedAllocation,0),
    students:selected.map(({student,scenario})=>({id:student.id,alias:student.alias,scenario:scenario.name,coverage:scenario.coverage})),
    annual:[...annual].sort(([a],[b])=>a-b).map(([year,values])=>({year,...Object.fromEntries(Object.entries(values).map(([key,x])=>[key,range(x)]))}))};
}
