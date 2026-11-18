// Synthetic cash-only experiment bridge. Uses the production financial functions.
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
import {newPlan} from '../site/js/domain.js';
import {compile,runPath,repriceRow,requiredContribution} from '../site/js/engine.js';
import {allocateDeposits} from '../site/js/deposit-policy.js';
const budgets=[[10000,8000],[12000,9000]],templates=new Map();
export function cashTemplate(wait,student=0,balanceFactor=1){
 const key=[wait,student,balanceFactor].join(':');if(templates.has(key))return templates.get(key);
 const p=newPlan();p.valuation='2030-09';const st=p.students[0],sc=st.scenarios[0],annual=budgets[student].reduce((a,b)=>a+b,0);
 st.enrollment=`${2030+wait}-09`;
 Object.assign(st.funding,{balance:4*annual*balanceFactor,monthly:wait?annual*.005:0,contributionStart:p.valuation,contributionEnd:wait?`${2030+wait}-08`:p.valuation,stepUp:0,gifts:[],grant:0,income:0});
 for(const k of Object.keys(st.funding.assumptions))st.funding.assumptions[k]=0;
 sc.baseline=p.valuation;sc.costs={tuition:budgets[student][0],housing:budgets[student][1],books:0,transport:0,other:0};
 for(const k of Object.keys(sc.assumptions))sc.assumptions[k]=0;
 const c=compile(p,st,sc);
 // The production compiler includes the valuation month when start=end.
 // This experiment explicitly allows no pre-entry deposits at wait zero.
 if(wait===0)c.rows=c.rows.map(r=>({...r,factor:0}));
 templates.set(key,c);return c;
}
export function cashPath(logChanges,wait,student=0,balanceFactor=1){
 if(!Array.isArray(logChanges)||logChanges.length<wait+4||logChanges.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))throw Error('Invalid synthetic cost path');
 const c=cashTemplate(wait,student,balanceFactor);
 return {...c,rows:c.rows.map((r,i)=>{const f=logChanges[Math.floor(i/12)];return repriceRow(r,Math.exp(f[0]),Math.exp(f[1]),1);})};
}
export function evaluateCashPaths(paths){
 return paths.map(pair=>{
  if(!Array.isArray(pair)||pair.length!==2)throw Error('Paired school paths required');
  return [0,4,8].map(wait=>{
   const individual=[.9,1,1.1].map(factor=>{
    const c=cashPath(pair[0],wait,0,factor),r=runPath(c,()=>1,c.monthly,false),required=requiredContribution(c,()=>1);
    return {balanceFactor:factor,total:r.total,unpaid:r.shortfall,failed:!r.success,required:Number.isFinite(required)?required:null,impossible:!Number.isFinite(required),depositMonths:c.rows.filter(r=>r.factor>0&&c.monthly>0).length};
   });
   const cs=[cashPath(pair[0],wait,0),cashPath(pair[1],wait+2,1)],paths=cs.map(c=>({compiled:c,gross:c.rows.map(()=>1)}));
   const cap=.00375*budgets.flat().reduce((a,b)=>a+b,0),house=allocateDeposits(cs,paths,cap,'fixed');
   return {wait,individual,household:{failed:!house.success,unpaid:house.shortfall,bindingMonths:house.bindingMonths,peak:house.peak,deposits:house.deposits}};
  });
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 for await(const line of createInterface({input:process.stdin})){
  try{process.stdout.write(JSON.stringify({results:evaluateCashPaths(JSON.parse(line).paths)})+'\n');}
  catch(error){process.stdout.write(JSON.stringify({error:error.message})+'\n');process.exitCode=1;}
 }
}
