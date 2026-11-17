// Pure monotone budget screen. Scale every entered category; keep aid/income fixed.
const cents=x=>Math.round((x+Number.EPSILON)*100)/100;
export function budgetPaid(c,growth,scale) {
 let balance=c.opening;
 for(let i=0;i<c.rows.length;i++){
  const r=c.rows[i],costs=Object.values(r.costs).map(x=>cents(x*scale));
  const total=cents(costs.reduce((a,b)=>a+b,0)),grant=Math.min(total,r.grantOffer);
  const obligation=cents(r.coverage==='tuition'?Math.max(0,cents(r.costs.tuition*scale)-Math.min(cents(r.costs.tuition*scale),grant)):(total-grant)*(r.coverage==='percent'?r.share:1));
  const need=cents(Math.max(0,obligation-r.incomeAllowance));
  balance=balance*growth(i)*(c.stress&&i===c.crashIndex?.75:1)+c.monthly*r.factor+r.gift-need;
  if(balance < -1e-7)return false;
 }
 return true;
}
export function budgetCapacity(c,growth) {
 if(!c.rows.some(r=>r.total>0&&(r.coverage!=="percent"||r.share>0)))return Infinity;
 let low=0,high=1;
 while(high<1024&&budgetPaid(c,growth,high)){low=high;high*=2;}
 if(high===1024&&budgetPaid(c,growth,high))return Infinity;
 for(let i=0;i<32;i++){const mid=(low+high)/2;if(budgetPaid(c,growth,mid))low=mid;else high=mid;}
 return low;
}
// Independent student requirements share trials. A fixed base allocation makes a
// household total feasible only if it meets EVERY student's path requirement.
export function householdRequirement(compiled,requirements) {
 const total=compiled.reduce((v,c)=>v+c.monthly,0);
 const weights=compiled.map(c=>total>0?c.monthly/total:1/compiled.length);
 return Math.max(0,...requirements.map((r,j)=>weights[j]>0?r/weights[j]:r===0?0:Infinity));
}
export function householdDepositSchedule(compiled,totalMonthly,amounts=null) {
 const basis=compiled.reduce((v,c)=>v+c.monthly,0);
 const weights=compiled.map(c=>basis>0?c.monthly/basis:1/compiled.length);
 const length=Math.max(...compiled.map(c=>c.rows.length));
 return Array.from({length},(_,i)=>({date:compiled.find(c=>c.rows[i]).rows[i].date,
  amount:compiled.reduce((v,c,j)=>v+(c.rows[i]?.factor||0)*(amounts?amounts[j]:weights[j]*totalMonthly),0)}));
}
