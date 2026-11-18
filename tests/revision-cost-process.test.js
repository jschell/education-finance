import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateConditionalProcess as simulate,representLatentLevels as represent,guardTrainingRepresentations as guard,stitchedGrowthMoments,restrictedMomentDecomposition,TEMPORARY_DECAY} from '../scripts/calibration/revision-cost-process.mjs';
import {manifestContract,indexSnapshot,coherentTransition,revisionTrajectory} from '../scripts/price-panel/views.mjs';
const near=(a,b,t=1e-11)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const base={years:[2010,2011,2012],schoolKeys:['synthetic-a','synthetic-b']};
const state=(p,t,key='synthetic-a')=>p.years[t].schools[key];
const hash='a'.repeat(64);

test('conditional process replays exactly, preserves paired drift and keeps shocks shared by identity',()=>{
 const input={...base,beta:[0.02,0.01],shared:{2011:[0.1,-0.1]},permanent:{'synthetic-a:2011':[0.2,0.3]}};
 const p=simulate(input);assert.deepEqual(p,simulate(input));assert.deepEqual(input.permanent['synthetic-a:2011'],[0.2,0.3]);
 const extended=simulate({...input,years:[...input.years,2013],shared:{...input.shared,2013:[0.8,0.8]}});assert.deepEqual(extended.years.slice(0,3),p.years);
 near(state(p,2).logLevel[0],0.36);near(state(p,2,'synthetic-b').logLevel[0],0.16);
 near(state(p,2).logLevel[1],0.23);near(state(p,2,'synthetic-b').logLevel[1],-0.07);
 for(const row of p.years)for(const s of Object.values(row.schools))assert.ok(s.level.every(x=>x>0));
 const noShock=simulate({...base,beta:[0.02,0.01]});near(state(noShock,2).level[0],Math.exp(0.06));
 assert.throws(()=>simulate({...base,schoolKeys:['a','a']}),/Unique/);
 assert.throws(()=>simulate({...base,years:[2010,2012]}),/Consecutive/);
 assert.throws(()=>simulate({...base,beta:[NaN,0]}),/Invalid paired/);
});

test('permanent jumps stay at a new level; temporary deviations decay instead of becoming annual growth',()=>{
 const permanent=simulate({...base,permanent:{'synthetic-a:2010':[0.3,-0.2]}}),temporary=simulate({...base,temporary:{'synthetic-a:2010':[0.3,-0.2]}});
 for(let i=0;i<3;i++){
  near(state(permanent,i).logLevel[0],0.3);near(state(permanent,i).logLevel[1],-0.2);
  near(state(temporary,i).logLevel[0],0.3*TEMPORARY_DECAY**i);
  near(state(temporary,i).logLevel[1],-0.2*TEMPORARY_DECAY**i);
  near(state(permanent,i,'synthetic-b').logLevel[0],0);
 }
});

test('reporting reversals change the actual panel views while latent economic levels remain constant',()=>{
 const process=simulate(base),requests=[
  {sourceHash:hash,member:'ic2010.csv',collectionYear:2010,academicYear:2010,schoolKey:'synthetic-a',field:'CHG2AY3',error:[Math.log(2),0]},
  {sourceHash:hash,member:'ic2011.csv',collectionYear:2011,academicYear:2010,schoolKey:'synthetic-a',field:'CHG2AY2',error:[Math.log(3),0]},
  {sourceHash:hash,member:'ic2011.csv',collectionYear:2011,academicYear:2011,schoolKey:'synthetic-a',field:'CHG2AY3'},
  {sourceHash:hash,member:'ic2012.csv',collectionYear:2012,academicYear:2010,schoolKey:'synthetic-a',field:'CHG2AY1',error:[Math.log(2),0]}
 ];
 const obs=represent(process,requests),snaps=new Map();
 for(const year of [2010,2011,2012]){
  const rows=obs.filter(o=>o.collectionYear===year),fields=Object.fromEntries(rows.map(o=>[o.field,{academicYear:o.academicYear,semanticSignature:'synthetic-published-price',basis:'published; unreviewed',codes:{R:'Reported'}}]));
  const meta={year,fields},body={schema:1,year,directoryColumns:['unitid','sector','control','level'],directories:[[1,'1','1','1']],observationColumns:['unitid','field','value','status','flag'],observations:rows.map(o=>[1,o.field,o.level[0],'observed','R'])};
  snaps.set(year,indexSnapshot(meta,body));
 }
 const trajectory=revisionTrajectory(snaps,1,'public4','tuition',2010);
 assert.equal(trajectory.reversed,true);assert.equal(trajectory.reversalType,'exact-return');
 near(coherentTransition(snaps.get(2011),1,'public4','tuition',2010).logChange,Math.log(1/3));
 near(Math.log(obs[2].level[0]/obs[0].level[0]),Math.log(1/2));
 for(const y of process.years)near(y.schools['synthetic-a'].level[0],1);
 const again=represent(process,[requests[0]])[0];assert.deepEqual(again,obs[0]);
 assert.throws(()=>represent(process,[requests[0],requests[0]]),/Duplicate/);
 assert.throws(()=>represent(process,[{...requests[0],schoolKey:'absent'}]),/Unknown latent/);
});

function trainingFixture(){
 const make=year=>({year,sources:{prices:{sha256:hash,member:`ic${year}.csv`},directory:{sha256:'b'.repeat(64)}},fields:{CHG2AY3:{academicYear:year},CHG2AY2:{academicYear:year-1}}});
 const contract=manifestContract({sha256:'synthetic-panel-v1',snapshots:[2010,2011,2012].map(make)});
 const row=(collectionYear,unitid=1,field='CHG2AY3')=>({collectionYear,unitid,sourceHash:hash,member:`ic${collectionYear}.csv`,field,academicYear:collectionYear-(field==='CHG2AY2'?1:0),value:100});
 return {contract,row,options:{origin:'2012-09-01',trainingIds:new Set([1]),contract}};
}

test('training guard rejects future collections, withheld identities, changed sources and ambiguous definitions',()=>{
 const {row,options}=trainingFixture(),past=[row(2010),row(2011)],future=[row(2012),row(2011,2),{...row(2011),sourceHash:'c'.repeat(64)},{...row(2011),academicYear:null}];
 const a=guard(past,options),b=guard([...past,...future],options);assert.deepEqual(a.selected,b.selected);
 assert.deepEqual(b.rejected.map(r=>r.reason),['collection-not-before-origin','withheld-or-outside-training','source-outside-pinned-manifest','definition-unavailable']);
 assert.equal(b.panelHash,'synthetic-panel-v1');assert.match(b.availability,/not an actual vintage backtest/);
 assert.throws(()=>guard([past[0],past[0]],options),/Duplicate training/);
 const revised=guard([row(2010),row(2011,1,'CHG2AY2')],options);
 assert.equal(revised.selected.length,2);assert.deepEqual(revised.academicYears,[2010]);
 const reserved=guard([row(2011,7)],{...options,trainingIds:new Set([1,7])});assert.equal(reserved.rejected[0].reason,'withheld-or-outside-training');
 const ambiguous=trainingFixture();ambiguous.contract.sources.get(2011).fields.CHG2AY1={academicYear:2011};
 assert.equal(guard([ambiguous.row(2011)],ambiguous.options).rejected[0].reason,'definition-unavailable');
 assert.throws(()=>guard([],{...options,origin:'2011-02-31'}),/Valid origin/);
});

test('analytic growth covariances agree with exact independent sign enumeration through the process',()=>{
 const q=0.04,v=0.09,r=0.01,p=TEMPORARY_DECAY,expected=stitchedGrowthMoments({permanentVariance:q,temporaryVariance:v,measurementVariance:r});
 const products=[0,0,0],means=[0,0,0],count=2**11;
 for(let mask=0;mask<count;mask++){
  const sign=k=>(mask>>k&1)?1:-1,d=sign(0)*Math.sqrt(v),permanent={},temporary={};
  for(let t=0;t<3;t++){permanent[`s:${t}`]=[sign(1+t)*Math.sqrt(q),0];temporary[`s:${t}`]=[sign(4+t)*Math.sqrt(v*(1-p*p)),0];}
  const process=simulate({years:[0,1,2],schoolKeys:['s'],initialSchools:{s:{deviation:[d,0]}},permanent,temporary});
  let previous=d+sign(7)*Math.sqrt(r);const growth=[];
  for(let t=0;t<3;t++){const observed=state(process,t,'s').logLevel[0]+sign(8+t)*Math.sqrt(r);growth.push(observed-previous);previous=observed;}
  for(let k=0;k<3;k++){products[k]+=growth[0]*growth[k]/count;means[k]+=growth[k]/count;}
 }
 for(let k=0;k<3;k++){near(means[k],0);near(products[k],expected[`lag${k}`]);}
 const recovered=restrictedMomentDecomposition(expected);assert.equal(recovered.status,'compatible-ideal-moments');
 near(recovered.parameters.permanentVariance,q);near(recovered.parameters.temporaryVariance,v);near(recovered.parameters.measurementVariance,r);
 assert.equal(restrictedMomentDecomposition({lag0:0,lag1:1,lag2:0}).status,'incompatible-moments');
});

test('short-lag moments do not identify variance components; common reporting shifts can mimic genuine jumps',()=>{
 const a=stitchedGrowthMoments({permanentVariance:0.04,temporaryVariance:0.08,measurementVariance:0.02}),b=stitchedGrowthMoments({permanentVariance:0.06,temporaryVariance:0.04,measurementVariance:0.03});
 near(a.lag0,b.lag0);near(a.lag1,b.lag1);assert.notEqual(a.lag2,b.lag2);
 const latentJump=simulate({...base,permanent:{'synthetic-a:2010':[0.3,0.2]}}),noJump=simulate(base);
 const requests=[2010,2011,2012].map(year=>({sourceHash:hash,member:`ic${year}.csv`,collectionYear:year,academicYear:year,schoolKey:'synthetic-a',field:'paired-synthetic-price'}));
 const genuine=represent(latentJump,requests),reporting=represent(noJump,requests.map(x=>({...x,error:[0.3,0.2]})));
 assert.deepEqual(genuine.map(x=>x.level),reporting.map(x=>x.level));
 assert.notDeepEqual(latentJump.years.map(x=>x.schools['synthetic-a'].level),noJump.years.map(x=>x.schools['synthetic-a'].level));
});

test('synthetic mechanism artifact pins protocol/code/tests and cannot be mistaken for fitted economic evidence',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto'),{canonical}=await import('../site/js/calibration.js');
 const report=JSON.parse(readFileSync('data/calibration-diagnostics/revision-cost-process.json')),{sha256,...body}=report,hash=x=>createHash('sha256').update(x).digest('hex');
 assert.equal(hash(canonical(body)),sha256);
 for(const [path,h]of Object.entries(report.sourceHashes))assert.equal(hash(readFileSync(path)),h,path);
 assert.match(report.kind,/no historical fit or score/);assert.equal(report.identificationFailures.systematicReportingBias.observationallyIdentical,true);
 assert.deepEqual(report.identificationFailures.systematicReportingBias.genuineLatentJumpObserved,report.identificationFailures.systematicReportingBias.noLatentJumpBiasedObserved);
});
