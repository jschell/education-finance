import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {metadataDifference} from '../scripts/audit-metadata-continuity.mjs';
test('metadata audit separates unreviewed name and definition exclusions without bridging',()=>{
 const a={status:'observed',value:10,definition:{basis:'published',semanticSignature:'first'},directory:{name:'COLLEGE',sector:1,control:1,level:1}};
 const z=structuredClone(a);z.directory.name='College';assert.deepEqual(metadataDifference(a,z),{definitionStatus:'observed',nameChanged:true,stablePopulation:true,basisEqual:true,sameMeaningSignature:true});
 z.definition.semanticSignature='second';assert.equal(metadataDifference(a,z).definitionStatus,'definition-text-change');
 assert.equal(metadataDifference({...a,status:'missing'},z),null);
 const report=JSON.parse(fs.readFileSync('data/calibration-diagnostics/metadata-continuity.json')),registry=JSON.parse(fs.readFileSync('data/research/reviewed-metadata-equivalences.json'));
 assert.equal(report.groups.length,230);assert.equal(report.bridgedEdges,0);assert.deepEqual(registry.equivalences,[]);
 assert.ok(report.groups.some(g=>g.nameOnlyCandidate>0));assert.ok(report.definitionChanges.length>0);
});
