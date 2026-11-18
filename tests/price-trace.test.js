import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../site/js/calibration.js';
import {selectEvents,transition} from '../scripts/price-trace/selection.mjs';
import {snapshotPrice,compareEvent} from '../scripts/price-trace/comparison.mjs';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(){
 const table=new Map(),cpi=new Map(),dictionaries={};
 for(const id of [11,12,13,14,99]){const rows=new Map();table.set(id,rows);
  for(let year=2000;year<=2004;year++)rows.set(year,{SECTOR:String(id===12?4:id===13?2:1),CHG2AY3:String((id===99?100:1)*100*2**(year-2000)),CHG3AY3:String(200*2**(year-2000)),CHG5AY3:'500',XCHG2AY3:'R',XCHG3AY3:'R',XCHG5AY3:'R'});
 }
 for(let y=2000;y<=2004;y++){cpi.set(`${y}-08`,100);dictionaries[y]={fields:Object.fromEntries(['CHG2AY3','CHG3AY3','CHG5AY3'].map(f=>[f,{codes:{R:'Reported'},title:`Annual charges ${y}-${y+1}`}]))};}
 const cohorts={public4:[14,11],public4out:[14,11],public2:[12],public2out:[12],private4:[13]};
 return {table,cpi,dictionaries,cohorts};
}
test('selection excludes nontraining identities, uses deterministic ties and preserves residency overlaps',()=>{
 const x=fixture(),events=selectEvents(x.table,x.cpi,x.dictionaries,x.cohorts,{end:2003,retain:1});
 assert.equal(events.length,10);assert.ok(events.every(e=>e.unitid!==99));assert.equal(events.find(e=>e.sector==='public4'&&e.component==='tuition').unitid,11);
 assert.equal(events.find(e=>e.sector==='public4'&&e.component==='tuition').year,2000);
 assert.equal(events.find(e=>e.sector==='public4'&&e.component==='tuition').previous.status,'missing-school-row');
 assert.equal(events.find(e=>e.sector==='public4'&&e.component==='housing').unitid,11);
 x.table.get(11).get(2001).SECTOR='4';assert.equal(transition(x.table,x.cpi,x.dictionaries,11,'public4','tuition',2000).status,'changed-sector');
});
function snapshot(year,academicYear,value,flag='R'){
 return {year,dictionary:{path:'synthetic'},fields:{CHG2AY1:{academicYear,title:`Synthetic ${academicYear}-${academicYear+1}`,flag:'XCHG2AY1',codes:{R:'Reported'}}},archives:[
  {kind:'prices',file:`synthetic${year}`,rows:[{unitid:11,csvRecord:2,fields:{CHG2AY1:String(value),XCHG2AY1:flag}}]},
  {kind:'directory',rows:[{unitid:11,fields:{SECTOR:'1',INSTNM:'Synthetic college'}}]}]};
}
test('snapshot comparison uses dictionary academic years and detects revisions with Reported flags',()=>{
 const event={id:'test',unitid:11,year:2005,sector:'public4',component:'tuition',levels:[{year:2005,field:'CHG2AY3',value:100,flag:'R',rawSector:1},{year:2006,field:'CHG2AY3',value:200,flag:'R',rawSector:1}]},s=snapshot(2006,2005,150);
 assert.equal(snapshotPrice(s,event,2005).value,150);assert.equal(snapshotPrice(s,event,2006).status,'academic-year-definition-unavailable');
 const sources={snapshots:[snapshot(2005,2005,100),s,snapshot(2007,2005,150),snapshot(2008,2006,200)]};
 const result=compareEvent(event,sources);assert.equal(result.classification,'retrospective-value-changed');assert.equal(result.endpoints[0].changedLater,2);assert.equal(result.cause,'unresolved');
 assert.equal(compareEvent(event,{snapshots:[]}).directorySectorChanged,false);
 const missing=snapshot(2006,null,150);assert.equal(snapshotPrice(missing,event,2005).status,'academic-year-definition-unavailable');
});
test('frozen trace registry and comparison retain all events, source identities and unsupported causes',()=>{
 const registry=read('data/calibration-diagnostics/price-trace-registry.json'),report=read('data/calibration-diagnostics/price-trace-comparison.json'),sources=read('data/calibration-diagnostics/price-trace-sources.json');
 for(const artifact of [registry,report]){const {sha256,...body}=artifact;assert.equal(hash(canonical(body)),sha256);for(const [p,expected] of Object.entries(artifact.sourceHashes))assert.equal(hash(readFileSync(p)),expected,p);}
 assert.equal(registry.events.length,30);assert.equal(report.events.length,30);assert.equal(sources.registryHash,registry.sha256);
 const quality=read('data/calibration-diagnostics/quality-persistence.json');for(const event of registry.events)assert.ok(quality.persistence.find(p=>p.sector===event.sector).originKnownIds.includes(event.unitid));
 assert.equal(report.summary.comparisons,180);assert.equal(report.summary.laterComparisons,120);assert.equal(report.summary.archiveHashMismatches,0);
 for(const event of report.events){assert.equal(event.cause,'unresolved');for(const endpoint of event.endpoints){assert.equal(endpoint.currentMatchesSelected,true);assert.equal(endpoint.snapshots.length,3);}}
 assert.equal(report.summary.changedLaterComparisons,report.events.reduce((v,e)=>v+e.endpoints.reduce((n,x)=>n+x.changedLater,0),0));
});
