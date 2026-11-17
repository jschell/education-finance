import { runPath } from './engine.js?v=0.13.0';
import { resolveScenario } from './domain.js?v=0.13.0';
import { DECISION_VERSION, decisionView, decisionFactory, summarizeDecisions } from './decision-scenarios.js?v=0.15.0';
const cents = x => Math.round((x + Number.EPSILON)*100);
// Largest-remainder allocation conserves cents; plan order breaks ties.
export function proportionalCents(total, weights) {
  const sum = weights.reduce((a,b)=>a+b,0);
  if (!sum) return weights.map(()=>0);
  const raw = weights.map(w=>total*w/sum), out = raw.map(Math.floor);
  const order = raw.map((v,j)=>({j,remainder:v-out[j]})).sort((a,b)=>b.remainder-a.remainder || a.j-b.j);
  const left = total-out.reduce((a,b)=>a+b,0);
  for (let k=0;k<left;k++) out[order[k].j]++;
  return out;
}
// The priority rule reads reference future bills and realized data through month i only.
// Future gifts/returns are deliberately ignored when estimating the next unfunded bill.
export function allocateDeposits(reference, paths, limit, policy = 'fixed') {
  if (!['fixed','dated-priority'].includes(policy)) throw Error('Unknown deposit policy.');
  if (reference.length !== paths.length || !reference.length) throw Error('Mismatched household paths.');
  const length = Math.max(...reference.map(c=>c.rows.length)), n = reference.length,
    balances = reference.map(c=>c.opening), schedule = [], allocations = reference.map(c=>Array(c.rows.length).fill(0));
  let bindingMonths = 0;
  for (let i=0;i<length;i++) {
    const requests = reference.map(c=>c.rows[i] ? cents(c.monthly*c.rows[i].factor) : 0),
      requested = requests.reduce((a,b)=>a+b,0), available = limit === null ? requested : Math.min(requested,Math.floor(limit*100+1e-7));
    if (available < requested) bindingMonths++;
    for (let j=0;j<n;j++) if (paths[j].compiled.rows[i]) {
      const c = paths[j].compiled;
      balances[j] = balances[j]*paths[j].gross[i]*(c.stress && i===c.crashIndex?.75:1) + c.rows[i].gift;
    }
    let assigned = proportionalCents(available,requests);
    if (policy === 'dated-priority') {
      assigned = Array(n).fill(0);
      const eligible = reference.map(c=>!!c.rows[i] && c.rows[i].factor>0);
      let remaining = available;
      // Each award closes one predicted dated deficit or exhausts this month's budget.
      while (remaining > 0) {
        let best = null;
        for (let j=0;j<n;j++) if (eligible[j]) {
          let reserve = balances[j]+assigned[j]/100;
          for (let k=i;k<reference[j].rows.length;k++) {
            reserve -= k === i ? paths[j].compiled.rows[k].need : reference[j].rows[k].need;
            if (reserve < -1e-7) {
              if (!best || k<best.k || (k===best.k && j<best.j)) best={j,k,amount:Math.ceil((-reserve-1e-9)*100)};
              break;
            }
          }
        }
        if (!best) {
          const weights=requests.some(x=>x>0)?requests:eligible.map(x=>x?1:0);
          const rest=proportionalCents(remaining,weights);
          for(let j=0;j<n;j++) assigned[j]+=rest[j];
          remaining=0;
        } else {
          const amount=Math.min(remaining,Math.max(1,best.amount));
          assigned[best.j]+=amount; remaining-=amount;
        }
      }
    }
    if (assigned.reduce((a,b)=>a+b,0)!==available) throw Error('Household budget was not conserved.');
    for(let j=0;j<n;j++) if(paths[j].compiled.rows[i]) {
      allocations[j][i]=assigned[j]/100;
      balances[j]=Math.max(0,balances[j]+assigned[j]/100-paths[j].compiled.rows[i].need);
    }
    schedule.push({date:reference.find(c=>c.rows[i]).rows[i].date,amount:available/100,allocations:assigned.map(x=>x/100)});
  }
  const results=paths.map(({compiled:c,gross},j)=>runPath({...c,monthly:1,rows:c.rows.map((r,i)=>({...r,factor:allocations[j][i]}))},i=>gross[i],1,false));
  const first=results.map(r=>r.firstUnpaid).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
  return { success:results.every(r=>r.success),shortfall:results.reduce((v,r)=>v+r.shortfall,0),firstUnpaid:first,
    deposits:schedule.reduce((v,r)=>v+r.amount,0),ending:results.reduce((v,r)=>v+r.ending,0),
    peak:Math.max(...schedule.map(r=>r.amount)),bindingMonths,schedule,students:results };
}
export function assessDepositPolicies(plan,data,settings,commonHistory,bundle=null) {
  const selected=plan.students.map(student=>({student,scenario:student.scenarios.find(sc=>sc.id===plan.family.scenarios[student.id])||student.scenarios[0]}));
  const reference=selected.map(({student,scenario})=>{
    const view=resolveScenario(student,scenario);view.history.period=commonHistory.period;view.history.blockYears=commonHistory.blockYears;
    return decisionView(plan,student,view,data,bundle);
  });
  const length=Math.max(...reference.map(c=>c.rows.length)),factories=reference.map(c=>decisionFactory(c,data,settings,bundle,length)),
    trials=Math.min(settings.trials,256),outputs={fixed:[], 'dated-priority':[]};
  for(let t=0;t<trials;t++) {
    const paths=factories.map(f=>f.make(t));
    for(const policy of Object.keys(outputs)) outputs[policy].push(allocateDeposits(reference,paths,plan.family.monthlyLimit,policy));
  }
  return {version:DECISION_VERSION,trials,seed:settings.seed,scope:bundle?'Central economic assumptions':'Historical replay',
    policies:Object.entries(outputs).map(([id,results])=>({id,label:id==='fixed'?'Entered proportional deposits':'Dated-bill priority',...summarizeDecisions(results),peak:results[0].peak,bindingMonths:results[0].bindingMonths,
      referenceSchedule:allocateDeposits(reference,reference.map(c=>({compiled:c,gross:c.rows.map((_,i)=>(1+c.rates[i].returnRate)**(1/12))})),plan.family.monthlyLimit,id).schedule})),
    missingBudgets:selected.filter(({scenario})=>!Object.values(scenario.costs).some(x=>x>0)).map(({student})=>student.alias)};
}
