import test from 'node:test';
import assert from 'node:assert/strict';
import {indexSnapshot,manifestContract,sourceAvailability,asOfPrice,coherentTransition,revision} from '../scripts/price-panel/views.mjs';
const source=(year)=>({sha256:String(year).padEnd(64,'a'),publicationDate:null,originalVintageVerified:false,availabilityEvidence:null});
function fixture(year,value=100){
 const meta={year,sources:{prices:source(year),directory:source(year+100)},fields:{CHG2AY3:{academicYear:year,semanticSignature:'same',basis:'published-charge; unreviewed',codes:{R:'Reported'}},CHG2AY2:{academicYear:year-1,semanticSignature:'same',basis:'published-charge; unreviewed',codes:{R:'Reported'}}}};
 const body={year,schema:1,directoryColumns:['unitid','csvRecord','name','sector','control','level'],observationColumns:['unitid','csvRecord','field','raw','flag','value','status'],directories:[[1,2,'Synthetic school','1','1','1']],observations:[[1,2,'CHG2AY3',String(value),'R',value,'observed'],[1,2,'CHG2AY2','100','R',100,'observed']]};
 return {meta,body,snapshot:indexSnapshot(meta,body)};
}
test('strict availability needs independently supported price AND directory vintages',()=>{
 const f=fixture(2010),contract=manifestContract({sha256:'version',snapshots:[f.meta]}),options={mode:'strict',origin:'2011-09-01'};
 assert.equal(sourceAvailability(f.meta,contract,options),'original-availability-unverified');
 for(const s of Object.values(f.meta.sources))Object.assign(s,{publicationDate:'2011-08-01',originalVintageVerified:true,availabilityEvidence:{url:'https://example.org/synthetic-proof',sha256:'a'.repeat(64)}});
 assert.equal(sourceAvailability(f.meta,contract,options),'source-outside-pinned-manifest');
 const supported=manifestContract({sha256:'new-version',snapshots:[f.meta]});assert.equal(sourceAvailability(f.meta,supported,options),'eligible-strict');
 assert.equal(sourceAvailability(f.meta,supported,{...options,origin:'2011-07-01'}),'published-after-origin');
 f.meta.sources.directory.originalVintageVerified=false;
 assert.equal(sourceAvailability(f.meta,manifestContract({sha256:'v3',snapshots:[f.meta]}),options),'original-availability-unverified');
});
test('proxy cutoff, pinned bytes and later retrospective values cannot leak into an earlier reconstruction',()=>{
 const first=fixture(2010),later=fixture(2011,200);later.body.observations[1][3]='999';later.body.observations[1][5]=999;later.snapshot=indexSnapshot(later.meta,later.body);
 const manifest={sha256:'version',snapshots:[first.meta,later.meta]},contract=manifestContract(manifest),snapshots=new Map([[2010,first.snapshot],[2011,later.snapshot]]),options={mode:'collection-proxy',origin:'2011-09-01'};
 const p=asOfPrice(snapshots,contract,options,1,'public4','tuition',2010);assert.equal(p.value,100);assert.equal(p.collectionYear,2010);
 assert.equal(asOfPrice(new Map([[2010,first.snapshot]]),contract,options,1,'public4','tuition',2010).value,p.value);
 assert.equal(asOfPrice(snapshots,contract,{mode:'strict',origin:'2026-09-01'},1,'public4','tuition',2010).status,'no-eligible-price');
 const changed=structuredClone(first.meta);changed.sources.prices.sha256='b'.repeat(64);assert.equal(sourceAvailability(changed,contract,options),'source-outside-pinned-manifest');
 assert.throws(()=>sourceAvailability(first.meta,contract,{mode:'strict',origin:'2011-02-31'}));
});
test('same-file transitions differ from stitched prices; revisions retain changed Reported values',()=>{
 const a=fixture(2010),b=fixture(2011,200);b.body.observations[1][3]='150';b.body.observations[1][5]=150;b.snapshot=indexSnapshot(b.meta,b.body);
 assert.equal(coherentTransition(b.snapshot,1,'public4','tuition',2010).logChange,Math.log(200/150));
 assert.equal(revision(new Map([[2010,a.snapshot],[2011,b.snapshot]]),1,'public4','tuition',2010,1).changed,true);
 b.meta.fields.CHG2AY2.basis='explicit net price';assert.equal(coherentTransition(b.snapshot,1,'public4','tuition',2010).status,'basis-change');
 b.meta.fields.CHG2AY2.basis=b.meta.fields.CHG2AY3.basis;b.meta.fields.CHG2AY2.semanticSignature='different';assert.equal(coherentTransition(b.snapshot,1,'public4','tuition',2010).status,'definition-text-change');
});
test('ambiguous definitions, missing fields, missing rows, population changes and duplicates remain explicit',()=>{
 const f=fixture(2011);f.meta.fields.CHG2AY1={...f.meta.fields.CHG2AY2};assert.equal(coherentTransition(f.snapshot,1,'public4','tuition',2010).status,'ambiguous-definition');delete f.meta.fields.CHG2AY1;
 f.body.observations[1][6]='missing-source-row';assert.equal(coherentTransition(indexSnapshot(f.meta,f.body),1,'public4','tuition',2010).status,'missing-source-row');
 f.body.observations[1][6]='missing-field';assert.equal(coherentTransition(indexSnapshot(f.meta,f.body),1,'public4','tuition',2010).status,'missing-field');
 f.body.observations[1][6]='observed';f.body.directories[0][3]='4';assert.equal(coherentTransition(indexSnapshot(f.meta,f.body),1,'public4','tuition',2010).status,'changed-sector');
 f.body.observations.push([...f.body.observations[0]]);assert.throws(()=>indexSnapshot(f.meta,f.body),/Duplicate/);
});
test('research manifest, compressed shards and descriptive audit remain source-identified and separate from production',async()=>{
 const fs=await import('node:fs'),{createHash}=await import('node:crypto'),{canonical}=await import('../site/js/calibration.js');
 const read=p=>JSON.parse(fs.readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex'),manifest=read('data/research/ipeds-price-snapshots/manifest.json'),report=read('data/calibration-diagnostics/revision-price-panel.json');
 for(const artifact of [manifest,report]){const {sha256,...body}=artifact;assert.equal(hash(canonical(body)),sha256);for(const [path,h] of Object.entries(artifact.sourceHashes))assert.equal(hash(fs.readFileSync(path)),h,path);}
 assert.equal(manifest.snapshots.length,24);assert.equal(report.panelHash,manifest.sha256);
 for(const snapshot of manifest.snapshots){assert.equal(hash(fs.readFileSync(snapshot.shard)),snapshot.shardSha256);assert.ok(Object.values(snapshot.sources).every(s=>s.matchesPinned&&s.originalVintageVerified===false&&s.publicationDate===null));}
 assert.equal(report.reconciliation.observations,manifest.snapshots.reduce((v,s)=>v+s.observations,0));
 assert.equal(report.reconciliation.selectedCurrentValues,3*report.reconciliation.selectedDirectorySectors);
 assert.ok(report.availability.every(r=>r.strictEligible===0));assert.ok(report.groups.every(g=>g.transitions.matched===g.transitions.sameSource.count&&g.transitions.matched===g.transitions.stitched.count));
 assert.equal(hash(fs.readFileSync('data/raw/ipeds/selected.csv.gz')),read('data/raw/ipeds/sources.json').selectedSha256);
});
