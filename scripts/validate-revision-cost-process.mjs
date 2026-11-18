// Reproducible synthetic mechanism evidence; never reads or fits school prices.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {canonical} from '../site/js/calibration.js';
import {REVISION_COST_METHOD,simulateConditionalProcess as simulate,representLatentLevels as represent,stitchedGrowthMoments,restrictedMomentDecomposition} from './calibration/revision-cost-process.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const base={years:[2010,2011,2012],schoolKeys:['synthetic-a','synthetic-b']};
const summary=p=>p.years.map(y=>({year:y.year,shared:y.shared,schools:Object.fromEntries(Object.entries(y.schools).map(([k,s])=>[k,{logLevel:s.logLevel,level:s.level}]))}));
const cases={
 driftOnly:summary(simulate({...base,beta:[0.02,0.01]})),
 sharedShock:summary(simulate({...base,shared:{2011:[0.1,-0.05]}})),
 permanentJump:summary(simulate({...base,permanent:{'synthetic-a:2010':[0.3,0.2]}})),
 temporaryDeviation:summary(simulate({...base,temporary:{'synthetic-a:2010':[0.3,0.2]}}))
};
const parameters={permanentVariance:0.04,temporaryVariance:0.09,measurementVariance:0.01},moments=stitchedGrowthMoments(parameters),idealInverse=restrictedMomentDecomposition(moments);
const ambiguous=[{permanentVariance:0.04,temporaryVariance:0.08,measurementVariance:0.02},{permanentVariance:0.06,temporaryVariance:0.04,measurementVariance:0.03}].map(parameters=>({parameters,moments:stitchedGrowthMoments(parameters)}));
assert.ok(Math.abs(ambiguous[0].moments.lag0-ambiguous[1].moments.lag0)<1e-12);
assert.ok(Math.abs(ambiguous[0].moments.lag1-ambiguous[1].moments.lag1)<1e-12);
const requests=base.years.map(year=>({sourceHash:'a'.repeat(64),member:`synthetic-${year}.csv`,collectionYear:year,academicYear:year,schoolKey:'synthetic-a',field:'paired-synthetic-price'}));
const genuine=represent(simulate({...base,permanent:{'synthetic-a:2010':[0.3,0.2]}}),requests),biased=represent(simulate(base),requests.map(r=>({...r,error:[0.3,0.2]})));
assert.deepEqual(genuine.map(x=>x.level),biased.map(x=>x.level));
const sources=['docs/revision-aware-cost-candidate-protocol.md','scripts/calibration/revision-cost-process.mjs','scripts/validate-revision-cost-process.mjs','tests/revision-cost-process.test.js'];
const report={id:'revision-cost-known-process-v1',method:REVISION_COST_METHOD,kind:'synthetic supplied-parameter mechanism evidence; no historical fit or score',
 sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),cases,
 idealStationaryStitchedMoments:{parameters,moments,idealInverse},
 identificationFailures:{shortLagAmbiguity:ambiguous,systematicReportingBias:{genuineLatentJumpObserved:genuine.map(x=>x.level),noLatentJumpBiasedObserved:biased.map(x=>x.level),observationallyIdentical:true}},
 limitations:['Conditional supplied innovations and ideal moment inversion are not a fitted estimator or empirical parameter-recovery experiment.',
 'Fixed temporary decay 0.5 and independent centered source errors are restrictive working assumptions, not verified facts.',
 'The stitched-growth formula is not valid for arbitrary source-coherent observation graphs.',
 'A systematic reporting shift can exactly mimic a genuine level shift; real source revisions do not identify economic truth.',
 'Historical observation-graph adaptation, bounded estimation, parameter recovery, misspecification experiments and matched cost/funding evaluation remain to implement.',
 'Strict historical original-vintage support remains unavailable; any subsequent collection-year proxy is not an actual vintage backtest.',
 'App, active foundation, original observations/reports and prospective forecasts remain unchanged.']};
report.sha256=hash(canonical(report));
const text=JSON.stringify(report,null,2)+'\n',path='data/calibration-diagnostics/revision-cost-process.json';
if(process.argv.includes('--verify'))assert.equal(readFileSync(path,'utf8'),text,'Synthetic mechanism artifact differs.');else writeFileSync(path,text);
console.log(JSON.stringify({method:report.method,syntheticCases:Object.keys(cases),observationalEquivalence:true,historicalFits:0,historicalScores:0,sha256:report.sha256}));
