import test from 'node:test';
import assert from 'node:assert/strict';
import {manifestContract,indexSnapshot} from '../scripts/price-panel/views.mjs';
import {buildMatchedGraphs,loadPinnedSnapshots} from '../scripts/price-panel/observation-graph.mjs';
function fixture(endYear=2007,originYear=2007){
 const snapshots=new Map(),metas=[];
 for(let year=2000;year<=endYear;year++){
  const fields={};for(const [prefix,component]of [['CHG2AY','tuition'],['CHG5AY','housing']])for(const [suffix,lag]of [[3,0],[2,1]])fields[prefix+suffix]={academicYear:year-lag,semanticSignature:component,basis:'published; unreviewed',codes:{R:'Reported'}};
  const source={sha256:String(year).padEnd(64,'a'),member:`ic${year}.csv`},meta={year,fields,sources:{prices:source,directory:{...source,member:`hd${year}.csv`}}};metas.push(meta);
  const observations=[1,2,7].flatMap(unitid=>Object.keys(fields).map(field=>[unitid,2,field,'100','R',100+year-2000+(field.endsWith('2')?10:0),'observed']));
  const body={schema:1,year,directoryColumns:['unitid','csvRecord','name','sector','control','level'],directories:[1,2,7].map(id=>[id,2,`Synthetic ${id}`,'1','1','1']),observationColumns:['unitid','csvRecord','field','raw','flag','value','status'],observations};snapshots.set(year,indexSnapshot(meta,body));
 }
 return {snapshots,contract:manifestContract({sha256:'synthetic-panel',snapshots:metas}),origin:`${originYear}-09-01`,sector:'public4',cpi:new Map(Array.from({length:endYear-1998},(_,i)=>[`${1999+i}-08`,100]))};
}
test('matched graphs retain actual source endpoints, matched support and unique observations',()=>{
 const f=fixture(),r=buildMatchedGraphs(f),a=r.graphs.stitched,z=r.graphs.coherent;
 assert.deepEqual(r.cohort.fitIds.sort(),[1,2]);assert.deepEqual(r.cohort.withheldIds,[7]);
 assert.deepEqual(a.edges.map(x=>[x.unitid,x.year]),z.edges.map(x=>[x.unitid,x.year]));
 assert.equal(a.observations.length,14);assert.equal(z.observations.length,24);
 for(const graph of [a,z]){assert.equal(new Set(graph.observations.map(r=>r.key)).size,graph.observations.length);assert.ok(graph.observations.every(x=>x.unitid!==7&&x.collectionYear<2007));}
 for(const edge of z.edges){const endpoints=edge.keys.map(key=>z.observations.find(r=>r.key===key));assert.equal(endpoints[0].collectionYear,endpoints[1].collectionYear);assert.notEqual(endpoints[0].academicYear,endpoints[1].academicYear);}
 assert.equal(a.support.academicTransitions.length,6);assert.equal(z.support.academicTransitions.length,6);
});
test('future collections and withheld values do not change training graph, pools or selection',()=>{
 const f=fixture(),before=buildMatchedGraphs(f);
 for(const s of f.snapshots.values())for(const r of s.rows.values())if(r.unitid===7||s.meta.year>=2007)r.value=1000000;
 const after=buildMatchedGraphs(f);assert.deepEqual(after.graphs,before.graphs);assert.deepEqual(after.cohort.fitIds,before.cohort.fitIds);
 const future=f.snapshots.get(2007);f.snapshots.delete(2007);assert.deepEqual(buildMatchedGraphs(f).graphs,before.graphs);f.snapshots.set(2007,future);
});
test('definition, missing fields, identity and CPI breaks cannot be silently bridged',()=>{
 for(const mutation of [
  f=>f.snapshots.get(2003).meta.fields.CHG2AY3.semanticSignature='net-price-basis',
  f=>f.snapshots.get(2003).rows.get('1:CHG5AY3').status='missing-field',
  f=>f.snapshots.get(2003).directories.get(1).name='Different identity',
  f=>f.cpi.delete('2003-08')]){
  const f=fixture();mutation(f);const r=buildMatchedGraphs(f);
  assert.ok(Object.keys(r.statuses).some(k=>!k.endsWith('observed')));
  const schoolEdges=r.graphs.stitched.edges.filter(e=>e.unitid===1);assert.equal(schoolEdges.length,0);assert.ok(!r.cohort.fitIds.includes(1));
 }
});
test('longest segment ties prefer latest complete matched support without bridging the identity break',()=>{
 const f=fixture(2009,2009);f.snapshots.get(2004).directories.get(1).name='Changed name';
 const r=buildMatchedGraphs(f),years=r.graphs.stitched.edges.filter(e=>e.unitid===1).map(e=>e.year);
 assert.deepEqual(years,[2005,2006,2007]);assert.ok(r.cohort.discardedMatchedTransitions>=3);
});
test('wrong panel version is rejected before accessing shards',()=>{
 assert.throws(()=>loadPinnedSnapshots({origin:'2015-09-01',expectedHash:'wrong'}),/Panel version mismatch/);
});
