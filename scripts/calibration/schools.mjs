import { historicalInputs } from '../validation-inputs.mjs';
export const SECTORS={public4:{raw:1,field:'CHG2AY3'},public4out:{raw:1,field:'CHG3AY3'},public2:{raw:4,field:'CHG2AY3'},public2out:{raw:4,field:'CHG3AY3'},private4:{raw:2,field:'CHG2AY3'}};
export const identityHash=id=>Math.imul(Number(id)^0x9e3779b9,0x85ebca6b)>>>0;
export function parseSchools(csv){
 const lines=csv.trim().split(/\r?\n/),headers=lines.shift().split(',');
 const out=new Map();
 for(const line of lines){
  const xs=line.split(',');if(xs.length!==headers.length)throw Error('Unexpected school CSV shape.');
  const r=Object.fromEntries(headers.map((h,i)=>[h,xs[i]])),unitid=+r.UNITID,year=+r.YEAR;
  if(!Number.isInteger(unitid)||!Number.isInteger(year))throw Error('Invalid school identity/year.');
  if(!out.has(unitid))out.set(unitid,new Map());
  if(out.get(unitid).has(year))throw Error('Duplicate school-year.');
  out.get(unitid).set(year,r);
 }
 return out;
}
export function priceAt(table,unitid,year,sector,cpi){
 const r=table.get(unitid)?.get(year),contract=SECTORS[sector];
 if(!r)return {status:'missing-school-row'};
 if(+r.SECTOR!==contract.raw)return {status:'changed-sector'};
 const tuition=+r[contract.field],housing=+r.CHG5AY3;
 if(!(tuition>0&&housing>0))return {status:'missing-positive-price'};
 const deflator=cpi.get(`${year}-08`);
 if(!(deflator>0))return {status:'missing-August-CPI'};
 return {status:'observed',unitid,year,tuition,housing,deflator,
  tuitionFlag:r['X'+contract.field]||'unavailable',housingFlag:r.XCHG5AY3||'unavailable'};
}
export function cohortAt(table,origin,sector,cpi,{sample=6,fitCap=200}={}){
 const eligible=[];let considered=0;
 for(const [unitid,years]of table){
  if(+years.get(origin)?.SECTOR!==SECTORS[sector].raw)continue;considered++;
  const rows=Array.from({length:origin-1999},(_,i)=>priceAt(table,unitid,2000+i,sector,cpi));
  if(rows.every(r=>r.status==='observed'))eligible.push({unitid,rows});
 }
 eligible.sort((a,b)=>identityHash(a.unitid)-identityHash(b.unitid)||a.unitid-b.unitid);
 const unknown=eligible.filter(s=>identityHash(s.unitid)%5===0);
 const training=eligible.filter(s=>identityHash(s.unitid)%5!==0);
 const fit=training.slice(0,fitCap),known=fit.slice(0,sample);
 return {origin,sector,training,fit,known,unknown:unknown.slice(0,sample),
  counts:{considered,eligible:eligible.length,training:training.length,hierarchyFit:fit.length,withheld:unknown.length,knownSample:known.length,unknownSample:Math.min(sample,unknown.length)}};
}
export function originBundle(base,origin,cohorts){
 const b=historicalInputs(base,origin),prices={};
 for(const [sector,cohort]of Object.entries(cohorts)){
  if(!cohort.training.length)throw Error('No training schools: '+sector);
  prices[sector]=Array.from({length:origin-1999},(_,i)=>({year:2000+i,
   tuition:Math.exp(cohort.training.reduce((v,s)=>v+Math.log(s.rows[i].tuition),0)/cohort.training.length),
   housing:Math.exp(cohort.training.reduce((v,s)=>v+Math.log(s.rows[i].housing),0)/cohort.training.length),
   deflator:cohort.training[0].rows[i].deflator}));
 }
 b.prices=prices;
 b.annual=b.annual.map(r=>({...r,inflation:prices.public4.find(p=>p.year===r.year+1).deflator/prices.public4.find(p=>p.year===r.year).deflator,
  sectors:Object.fromEntries(Object.entries(prices).map(([s,ps])=>{
   const a=ps.find(p=>p.year===r.year),z=ps.find(p=>p.year===r.year+1);
   return [s,{tuition:z.tuition/a.tuition,housing:z.housing/a.housing}];
  }))}));
 return b;
}
export function outcomeLevels(table,unitid,origin,last,sector,cpi){
 const rows=[];
 for(let year=origin;year<=last;year++){
  const p=priceAt(table,unitid,year,sector,cpi);
  if(p.status!=='observed')return {status:p.status,missingYear:year,levels:null};
  rows.push(p);
 }
 return {status:'observed',levels:rows};
}
