import { planFor } from '../full-calibration-inputs.mjs';
import { compileCalibrated } from '../../site/js/calibration.js';
import { treasuryGross,billGross } from '../../site/js/economy.js';
import { PROFILES } from '../../site/js/history-config.js';
import { allocationAt } from '../../site/js/planning.js';
export function schoolPlan(origin,wait,level,sector,profile='balanced'){
 const x=planFor(origin,wait,level,sector,profile),annual=level.tuition+level.housing;
 x.sc.schoolGrant=level.tuition*.05;x.sc.schoolGrantYears=2;
 Object.assign(x.st.funding,{stepUp:.02,income:annual*.05,gifts:[{date:`${origin+1}-09`,amount:annual*.25}]});
 return x;
}
export function compileSchool(plan,bundle,{kind,unitid}){
 const {c}=compileCalibrated(plan.p,plan.st,plan.sc,bundle);
 c.costSchoolKey=kind==='known'?`unitid:${unitid}`:`unknown:${unitid}`;
 c.costUnitid=kind==='known'?unitid:null;
 return c;
}
export function observedGross(c,origin,base){
 return Float64Array.from(c.rows,(_,i)=>{
  const y=base.economy.macroYears.find(y=>y.year===origin+Math.floor(i/12));
  if(!y)throw Error('Incomplete observed macro year.');
  const m=i%12,stage=i>=c.enrollmentIndex?2:i>=c.enrollmentIndex-c.a.transitionYears*12?1:0;
  const custom=allocationAt(c.rows[i].date,c.history.allocations),w=custom?[custom.stocks,custom.bonds,custom.cash]:PROFILES[c.history.profile].stages[stage];
  return (1+w[0]*y.months[m][0]+w[1]*(treasuryGross(y.rates[m][0],y.rates[m][1])-1)+w[2]*(billGross(y.rates[m][2])-1))*(1-c.history.fee)**(1/12);
 });
}
