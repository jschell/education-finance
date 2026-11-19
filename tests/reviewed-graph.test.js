import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateRegistry,REVIEW_HASH,buildReviewedGraphs} from '../scripts/price-panel/reviewed-graph.mjs';
const registry=JSON.parse(fs.readFileSync('data/research/evaluation-metadata-review.json'));
test('reviewed view pins exact approval evidence and rejects edits',()=>{
 assert.equal(registry.sha256,REVIEW_HASH);assert.doesNotThrow(()=>validateRegistry(registry));
 const modified=structuredClone(registry);modified.entries[0].toCollection=2008;assert.throws(()=>validateRegistry(modified));assert.throws(()=>validateRegistry({}));
 const names=structuredClone(registry);names.nameReview.decision='approved';assert.throws(()=>validateRegistry(names));
 assert.equal(registry.entries.filter(e=>e.decision==='approved').length,0);assert.equal(registry.nameReview.decision,'unresolved');
 assert.equal(registry.entries.filter(e=>e.definitionConceptDecision==='approved').length,6);
 assert.ok(registry.entries.every(e=>!e.bridgeApproved&&e.populationContinuity==='unsupported'));
 const support=JSON.parse(fs.readFileSync('data/calibration-diagnostics/evaluation-source-support.json'));
 assert.equal(support.reviewHash,REVIEW_HASH);assert.equal(registry.nameReview.institutionReviews.length,9);assert.ok(registry.nameReview.institutionReviews.every(e=>e.decision==='unresolved'));
 assert.equal(support.approvedGraphBridges,0);assert.equal(support.groups.length,15);
 for(const g of support.groups)assert.deepEqual(g.reviewed,g.original);
 assert.equal(support.historicalEligibility.state,'unsupported');
});
