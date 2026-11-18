import {SECTORS,priceAt} from '../calibration/schools.mjs';
import {classifyFlag} from '../calibration/quality-persistence.mjs';
export function transition(table,cpi,dictionaries,unitid,sector,component,year){
 const field=component==='tuition'?SECTORS[sector].field:'CHG5AY3';
 const levels=[year,year+1].map(y=>{
  const price=priceAt(table,unitid,y,sector,cpi),raw=table.get(unitid)?.get(y),flag=raw?.['X'+field]||null;
  return {year:y,status:price.status,value:price.status==='observed'?price[component]:null,augustCpi:price.status==='observed'?price.deflator:null,
   field,flag,quality:flag?classifyFlag(dictionaries,y,field,flag):'unclassified',dictionaryTitle:dictionaries[y]?.fields[field]?.title||null,rawSector:raw?Number(raw.SECTOR):null};
 });
 return {year,interval:[year,year+1],levels,status:levels.find(x=>x.status!=='observed')?.status||'observed',
  realLogChange:levels.every(x=>x.status==='observed')?Math.log(levels[1].value/levels[0].value)-Math.log(levels[1].augustCpi/levels[0].augustCpi):null};
}
export function selectEvents(table,cpi,dictionaries,cohorts,{start=2000,end=2019,retain=3}={}){
 const events=[];
 for(const sector of Object.keys(SECTORS))for(const component of ['tuition','housing']){
  const candidates=[];
  for(const unitid of cohorts[sector])for(let year=start;year<=end;year++){
   const event=transition(table,cpi,dictionaries,unitid,sector,component,year);
   if(event.status==='observed')candidates.push({...event,unitid,sector,component});
  }
  candidates.sort((a,b)=>Math.abs(b.realLogChange)-Math.abs(a.realLogChange)||a.unitid-b.unitid||a.year-b.year);
  for(const [index,event] of candidates.slice(0,retain).entries()){
   const previous=transition(table,cpi,dictionaries,event.unitid,sector,component,event.year-1),next=transition(table,cpi,dictionaries,event.unitid,sector,component,event.year+1);
   events.push({...event,id:`${sector}:${component}:${event.unitid}:${event.year}`,rank:index+1,candidates:candidates.length,
    previous,next,oppositeSignNext:next.status==='observed'?event.realLogChange*next.realLogChange<0:null});
  }
 }
 return events;
}
