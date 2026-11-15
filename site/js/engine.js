import { month, monthText, categories } from './domain.js';
const cents = x => Math.round((x+Number.EPSILON)*100)/100;
export function compile(plan, student, scenario, mode='all') {
  if(!scenario.costConfirmed)throw Error('Confirm the annual cost budget before calculating.');
  const start=month(plan.valuation), entry=month(student.enrollment), end=entry+(student.years-1)*12+8;
  const length=end-start+1;
  if(length<1||length>600)throw Error('Projection must contain 1–600 remaining months.');
  const a=scenario.assumptions, base=month(scenario.baseline), cs=month(scenario.contributionStart), ce=month(scenario.contributionEnd);
  const rows=[];
  for(let t=start;t<=end;t++) {
    const elapsed=t-entry, year=Math.floor(elapsed/12), within=((elapsed%12)+12)%12;
    const attending=elapsed>=0&&year<student.years&&within<9;
    const costs=Object.fromEntries(categories.map(k=>[k,0]));
    if(attending) for(const k of categories) {
      const weight=k==='tuition'?(within===0||within===5?.5:0):1/9;
      const growth=k==='tuition'?a.tuitionGrowth:a.livingGrowth;
      costs[k]=cents(scenario.costs[k]*weight*(1+growth)**((t-base)/12));
    }
    const total=cents(Object.values(costs).reduce((v,x)=>v+x,0));
    // Grants spread across the same tuition-payment months, tuition first, then other costs.
    const grantOffer=attending&&year<scenario.grantYears&&(within===0||within===5)?scenario.grant/2:0;
    const grant=cents(Math.min(total,grantOffer));
    const tuitionGrant=Math.min(costs.tuition,grant);
    const net=cents(total-grant);
    const obligation=cents(scenario.coverage==='tuition'?Math.max(0,costs.tuition-tuitionGrant):net*(scenario.coverage==='percent'?scenario.share:1));
    const income=mode==='all'&&attending?cents(Math.min(obligation,scenario.income/9)):0;
    const factor=mode!=='savings'&&t>=cs&&t<=ce?(1+scenario.stepUp)**Math.floor((t-cs)/12):0;
    const gift=mode!=='savings'?scenario.gifts.filter(g=>month(g.date)===t).reduce((sum,g)=>sum+g.amount,0):0;
    rows.push({date:monthText(t),year:Math.floor(t/12),costs,total,grant,net,obligation,income,need:cents(obligation-income),factor,gift,discount:(1+a.inflation)**((t-start)/12),attending});
  }
  return { rows, opening:scenario.balance+student.sharedAllocation, monthly:scenario.monthly, a,
    rates: rows.map((_,i)=> { const t=start+i; return t>=entry? {returnRate:a.attendanceReturn,mean:a.attendanceMean,volatility:a.attendanceVolatility}: t>=entry-a.transitionYears*12? {returnRate:a.lateReturn,mean:a.lateMean,volatility:a.lateVolatility}: a; }),
    enrollmentIndex:entry-start, crashIndex:Math.max(0,entry-start-1), stress:scenario.stress };
}
export function logParameters(mean,volatility) {
  const sigma2=Math.log1p(volatility**2/(1+mean)**2);
  return {mu:(Math.log1p(mean)-sigma2/2)/12,sigma:Math.sqrt(sigma2/12)};
}
export function deterministicGrowth(compiled,i=0) { return (1+compiled.rates[i].returnRate)**(1/12); }
export function runPath(c, growth=i=>deterministicGrowth(c,i), monthly=c.monthly, detail=true) {
  let balance=c.opening,shortfall=0,realShortfall=0,total=0,net=0,obligation=0,grants=0,income=0,deposits=0,withdrawals=0;
  let firstShortfall=null,enrollmentBalance=null; const ledger=[];const balances=[];
  for(let i=0;i<c.rows.length;i++) {
    const r=c.rows[i];const opening=balance;
    if(i===c.enrollmentIndex)enrollmentBalance=opening;
    const gross=growth(i)*(c.stress&&i===c.crashIndex?.75:1);
    balance*=gross;const earned=balance-opening;
    const contribution=monthly*r.factor+r.gift; balance+=contribution;
    const draw=Math.min(balance,r.need);balance=Math.max(0,balance-draw);
    const unpaid=Math.max(0,r.need-draw);
    shortfall+=unpaid;realShortfall+=unpaid/r.discount;total+=r.total;net+=r.net;obligation+=r.obligation;grants+=r.grant;income+=r.income;deposits+=contribution;withdrawals+=draw;
    if(unpaid>.01&&!firstShortfall)firstShortfall=r.date;
    if(detail)balances.push(balance);
    if(detail===true)ledger.push({...r,opening,earned,contribution,withdrawal:draw,shortfall:unpaid,balance});
  }
  const success=firstShortfall===null;
  return {success,shortfall,realShortfall,total,net,obligation,grants,income,deposits,withdrawals,ending:balance,enrollmentBalance,firstShortfall,ledger,balances};
}
export function annualRows(result) {
  const groups=new Map();
  for(const r of result.ledger) {
    if(!groups.has(r.year))groups.set(r.year,{year:r.year,total:0,grant:0,obligation:0,income:0,contribution:0,withdrawal:0,shortfall:0,balance:0});
    const g=groups.get(r.year);for(const k of ['total','grant','obligation','income','contribution','withdrawal','shortfall'])g[k]+=r[k];g.balance=r.balance;
  }
  return [...groups.values()];
}
// Lowest base monthly contribution that avoids ANY missed payment on this path.
// Discounted cash-flow feasibility is monotone because all gross returns are positive.
export function requiredContribution(c,growth) {
  let fixed=c.opening, sensitivity=0,required=0;
  for(let i=0;i<c.rows.length;i++) {
    const r=c.rows[i],g=growth(i)*(c.stress&&i===c.crashIndex?.75:1);
    fixed=fixed*g+r.gift-r.need;sensitivity=sensitivity*g+r.factor;
    if(fixed<-.01) {
      if(sensitivity===0)return Infinity;
      required=Math.max(required,(-fixed)/sensitivity);
    }
  }
  return Math.max(0,required);
}
