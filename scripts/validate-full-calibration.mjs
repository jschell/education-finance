import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { historicalInputs } from "./validation-inputs.mjs";
import { planFor, observedGross, correctionAt } from "./full-calibration-inputs.mjs";
import { compileCalibrated, calibrationFactory, canonical } from "../site/js/calibration.js";
import { runPath } from "../site/js/engine.js";
import { curveFactors } from "../site/js/cost-recalibration.js";
import { quantile } from "../site/js/random.js";
import { CANDIDATES, residualBundle, chooseNested, promotionGate, rawSequences,
  priceResiduals, costOnlyBills, reliabilityNearTargets } from "./full-calibration-helpers.mjs";
import { FACTORS, actualBillRows, parseCpi, scoreBills, summarizeCost,
  fundingSummary } from "./cost-followup-helpers.mjs";
const read = (p) => JSON.parse(readFileSync(p,"utf8"));
const hash = (x) => createHash("sha256").update(x).digest("hex");
const base = read("site/data/calibration-reviewed.json"), panel = read("site/data/ipeds-panel.json");
const aggregate = read("site/data/calibration.json"), fresh = read("data/cost-holdout-2024.json");
const sectors = Object.keys(panel.prices), trials = 400, innerTrials = 128, seed = 850213;
const cpi = parseCpi(readFileSync("data/raw/cpi.csv","utf8"));
const rawBundles = new Map();
function rawBundle(origin, model) {
  const key = origin+":"+model;
  if (!rawBundles.has(key))
    rawBundles.set(key,{...historicalInputs(base,origin),costModel:model,costCorrection:null,
      costUncertainty:null,costRecalibration:null});
  return rawBundles.get(key);
}
// Inner endpoint forecasts come from the very same factory used for outer bills.
const inner = [];
for (const sector of sectors) {
  const prices = panel.prices[sector];
  for (let at=10;at<prices.length;at++)
    for (const horizon of [2,5,10]) {
      if (at+horizon >= prices.length) continue;
      const level = prices[at], actual = prices[at+horizon];
      for (const model of CANDIDATES.slice(1)) {
        const b = rawBundle(level.year,model);
        const {p,st,sc} = planFor(level.year,horizon,level,sector);
        sc.years = 1;
        const {c} = compileCalibrated(p,st,sc,b), factory = calibrationFactory(c,b,{seed});
        const amounts = {tuition:[],housing:[]};
        for(let t=0;t<innerTrials;t++) {
          const row = factory.make(t).compiled.rows[c.enrollmentIndex];
          for(const key of ["tuition","housing"])
            amounts[key].push(row.costs[key]/row.valuationCosts[key]*level[key]);
        }
        const med = (key) => quantile(amounts[key].sort((a,b) => a-b),0.5);
        inner.push({model,sector,origin:level.year,target:actual.year,horizon,
          macroLast:b.economy.macroYears.at(-1).year,costLast:b.prices[sector].at(-1).year,
          tuition:Math.log(actual.tuition/med("tuition")),
          housing:Math.log(actual.housing/med("housing"))});
      }
    }
  console.log("Inner residuals completed",sector);
}
const fitCache = new Map();
function candidateBundle(origin,model) {
  const key = origin+":"+model;
  if (!fitCache.has(key)) fitCache.set(key,{...rawBundle(origin,model),
    costRecalibration:residualBundle(inner,origin,model,sectors)});
  return fitCache.get(key);
}
const outer = [];
for(let origin=2011;origin<=2020;origin++) {
  const production = historicalInputs(base,origin,correctionAt(origin));
  for(const wait of [0,4,8]) {
    if(origin+wait+3>2023) continue;
    for(const sector of sectors) {
      const prices = panel.prices[sector], level = prices.find((r) => r.year===origin);
      const {p,st,sc} = planFor(origin,wait,level,sector);
      const {c} = compileCalibrated(p,st,sc,production);
      const actual = runPath({...c,rows:actualBillRows(c,prices,cpi,origin)},()=>1,0,false).total;
      const models = {};
      for(const model of CANDIDATES) {
        const bundle = model==="production"?production:candidateBundle(origin,model);
        const {c:compiled} = compileCalibrated(p,st,sc,bundle);
        const factory = calibrationFactory(compiled,bundle,{seed}), costs=[];
        for(let t=0;t<trials;t++) {
          const x=factory.make(t);
          costs.push(runPath(x.compiled,(i)=>x.gross[i],0,false).total);
        }
        models[model] = scoreBills(costs,actual);
        models[model].width = (models[model].p90-models[model].p10)/actual;
      }
      outer.push({origin,wait,sector,lastBillYear:origin+wait+3,models});
    }
  }
  console.log("Outer origin completed",origin);
}
const selection = [...new Set(outer.map((r)=>r.origin))].map((origin)=>chooseNested(outer,origin));
const selectedRows=outer.map((r)=>({...r,models:{selected:r.models[selection.find((s)=>s.origin===r.origin).selected]}}));
const summaries=CANDIDATES.map((model)=>summarizeCost(outer,model));
const policy=summarizeCost(selectedRows,"selected");
const gate=promotionGate(summaries[0],policy);
const liveSelection=chooseNested(outer,2026);
const funding=[];
for(let origin=2011;origin<=2020;origin++) {
  const selected=selection.find((s)=>s.origin===origin).selected;
  const production=historicalInputs(base,origin,correctionAt(origin));
  for(const wait of [0,4,8]) {
    if(origin+wait+3>2023) continue;
    for(const sector of sectors)
      for(const profile of ["cash","cautious","balanced"]) {
        const prices=panel.prices[sector],level=prices.find((r)=>r.year===origin),annual=level.tuition+level.housing;
        const {p,st,sc}=planFor(origin,wait,level,sector,profile);
        const {c}=compileCalibrated(p,st,sc,production);
        const observed=actualBillRows(c,prices,cpi,origin),gross=observedGross(c,origin);
        const actuals=FACTORS.map((factor)=>Number(runPath({...c,rows:observed,opening:annual*4*factor},
          (i)=>gross[i],c.monthly,false).success));
        const counts={production:FACTORS.map(()=>0),selected:FACTORS.map(()=>0)};
        for(const name of selected==="production"?["production"]:["production","selected"]) {
          const bundle=name==="production"?production:candidateBundle(origin,selected);
          const {c:compiled}=compileCalibrated(p,st,sc,bundle),factory=calibrationFactory(compiled,bundle,{seed});
          for(let t=0;t<trials;t++) {
            const x=factory.make(t);
            FACTORS.forEach((factor,k)=>{ counts[name][k]+=Number(runPath({...x.compiled,opening:annual*4*factor},
              (i)=>x.gross[i],compiled.monthly,false).success); });
          }
        }
        if(selected==="production") counts.selected=[...counts.production];
        for(const name of ["production","selected"])
          FACTORS.forEach((factor,k)=>funding.push({policy:name,origin,wait,profile,sector,factor,
            lastBillYear:origin+wait+3,probability:counts[name][k]/trials,actual:actuals[k]}));
      }
  }
  console.log("Funding origin completed",origin);
}
// Comparable source check uses an identical cost-only forecast algorithm and windows.
const sourceComparison=[],longHorizon=[];
for(const [dataset,allPrices] of [["fixed",panel.prices],["aggregate",aggregate.prices]]) {
  const prices=Object.fromEntries(["public4","public2"].map((s)=>[s,allPrices[s]]));
  const residuals=priceResiduals(prices,{trials:innerTrials,seed});
  for(const [sector,levels] of Object.entries(prices)) {
    const records=residuals.filter((r)=>r.sector===sector);
    for(let origin=2011;origin<=2020;origin++)
      for(const wait of [0,4,8]) {
        if(origin+wait+3>levels.at(-1).year) continue;
        const actual=levels.filter((r)=>r.year>=origin+wait&&r.year<=origin+wait+3)
          .reduce((s,r)=>s+r.tuition+r.housing,0),models={};
        models.production=scoreBills(costOnlyBills(levels,origin,wait,"fixed",[],trials,seed),actual);
        for(const model of CANDIDATES.slice(1))
          models[model]=scoreBills(costOnlyBills(levels,origin,wait,model,records,trials,seed),actual);
        sourceComparison.push({dataset,sector,origin,wait,lastBillYear:origin+wait+3,models});
      }
    if(dataset==="aggregate")
      for(let at=10;at+21<levels.length;at++) {
        const origin=levels[at].year,actual=levels.slice(at+18,at+22).reduce((s,r)=>s+r.tuition+r.housing,0),models={};
        models.production=scoreBills(costOnlyBills(levels,origin,18,"fixed",[],trials,seed),actual);
        for(const model of CANDIDATES.slice(1))
          models[model]=scoreBills(costOnlyBills(levels,origin,18,model,records,trials,seed),actual);
        longHorizon.push({sector,origin,wait:18,lastBillYear:origin+21,models});
      }
  }
  console.log("Matched source completed",dataset);
}
const extension={id:"matched-price-only-2000-2024-v1",asOf:"2026-11-16",
  source:"data/cost-holdout-2024.json",sourceHash:hash(readFileSync("data/cost-holdout-2024.json")),
  series:Object.fromEntries(Object.entries(fresh.series).map(([sector,r])=>[sector,{
    training:r.training,actual:{year:2024,...r.actual,deflator:null},counts:r.counts}])),
  limitations:["Matched 2024 survivor membership is selected with future population knowledge.",
    "2024 prices are endpoint outcomes only: no pinned 2024 academic CPI or complete joint macro window is fabricated."]};
const extensionRows=[];
for(const [sector,r] of Object.entries(extension.series)) {
  const records=priceResiduals({[sector]:r.training},{trials:innerTrials,seed});
  for(const horizon of [1,2,5,10]) {
    const origin=2024-horizon,training=r.training.filter((p)=>p.year<=origin);
    if(training.length<11) continue;
    const models={};
    for(const model of CANDIDATES) {
      const rawModel=model==="production"?"fixed":model;
      const sequences=rawSequences(training,rawModel,horizon,trials,seed);
      const fit=model==="production"?null:residualBundle(records,origin,model,[sector]).sectors[sector];
      const values=sequences.map((p,trial)=> {
        const f=curveFactors(fit,horizon,seed,trial),level=training.at(-1);
        return level.tuition*p[horizon].tuition*f.tuition+level.housing*p[horizon].housing*f.housing;
      });
      models[model]=scoreBills(values,r.actual.tuition+r.actual.housing);
    }
    extensionRows.push({origin,wait:horizon,sector,lastBillYear:2024,models});
  }
}
const inputPaths=["docs/full-calibration-protocol.md","site/data/calibration-reviewed.json",
  "site/data/ipeds-panel.json","site/data/calibration.json","data/cost-holdout-2024.json","data/raw/cpi.csv",
  "site/js/cost-recalibration.js","site/js/calibration.js","scripts/full-calibration-helpers.mjs",
  "scripts/full-calibration-inputs.mjs","scripts/validate-full-calibration.mjs"];
const report={id:"full-calibration-v1",asOf:"2026-11-16",trials,innerTrials,seed,
  inputHashes:Object.fromEntries(inputPaths.map((p)=>[p,hash(readFileSync(p))])),
  inner,outer,summaries,policy,selection,liveSelection,gate,
  liveModel:gate.passed?liveSelection.selected:"production",
  liveFit:gate.passed&&liveSelection.selected!=="production"?
    residualBundle(inner,2023,liveSelection.selected,sectors):null,
  funding:Object.fromEntries(["production","selected"].map((name)=> {
    const rows=funding.filter((r)=>r.policy===name);
    return [name,{summary:fundingSummary(rows),nearTargets:reliabilityNearTargets(rows)}];
  })),
  fundingCases:funding,
  sourceComparison:{rows:sourceComparison,summaries:["fixed","aggregate"].flatMap((dataset)=>
    CANDIDATES.map((model)=>({dataset,...summarizeCost(sourceComparison.filter((r)=>r.dataset===dataset),model)})))},
  longHorizon:{rows:longHorizon,summaries:CANDIDATES.map((m)=>summarizeCost(longHorizon,m)),
    distinctOrigins:new Set(longHorizon.map((r)=>r.origin)).size,nonoverlappingCompleteWindows:1},
  extension:{endpointRows:extensionRows,summaries:CANDIDATES.map((m)=>summarizeCost(extensionRows,m)),
    independentNewTargetYears:1},
  limitations:["All inspected periods are consumed retrospective evidence; this is not prospective calibration.",
    "Nested cost-model selection does not validate inherited macro policy, current survey anchors or revised surviving-school membership.",
    "Most long-wait origins precede sufficient completed selection outcomes; fallback to production is deliberate and limits the gate's information.",
    "Asymmetric empirical errors can duplicate uncertainty already in raw paths; scores, not nominal coverage alone, determine promotion.",
    "Beyond the last supported correction horizon, annual log extrapolation is an assumption; sectors and overlapping starts are not independent.",
    "2024 extends price endpoints only. No pre-2000 fixed-school or full newborn whole-plan history was created."]};
report.sha256=hash(canonical(report));
writeFileSync("site/data/full-calibration.json",JSON.stringify(report)+"\n");
writeFileSync("data/comparable-prices-through-2024.json",JSON.stringify(extension)+"\n");
const table=(rows)=>"| Model | Bill score | Coverage | Bias |\n| --- | ---: | ---: | ---: |\n"+
  rows.map((r)=>`| ${r.model} | ${r.score.toFixed(3)} | ${(100*r.covered).toFixed(1)}% | ${(100*r.bias).toFixed(1)}% |`).join("\n");
const md=`# Full calibration results

Protocol frozen before scoring. All years below were already inspected; results are retrospective. Report hash: \`${report.sha256}\`.

## Independently recalibrated production-ledger models

Each model fits its own earlier price errors. Corrections are paired asymmetric cumulative log-price curves, applied before bills are repriced. Bias and spread use the frozen shrinkage rule.

${table(summaries)}

## Nested selected policy

${table([summaries[0],policy])}

Promotion gate: **${gate.passed?"passed":"failed"}**. Checks: \`${JSON.stringify(gate.checks)}\`.
Live rule chooses **${liveSelection.selected}** from completed earlier bills; retained production decision: **${report.liveModel}**. These are comparative gates, not a certification of 80% coverage or 90% funding probability.

Selections by origin: ${selection.map((r)=>r.origin+": "+r.selected+" ("+r.targetYears.length+" completed years)").join("; ")}.
Thin early evidence forces production fallback; the eight-year waits have only two distinct start years. More institutions and funding cases do not fix that limitation.

## Funding reliability near target

Each policy has ${funding.length/2} synthetic cases across five funding levels and three profiles. Counts share historical shocks.

| Policy | Probability bin | Cases | Distinct origins | Mean forecast | Observed funded |
| --- | --- | ---: | ---: | ---: | ---: |
${Object.entries(report.funding).flatMap(([name,r])=>r.nearTargets.map((b)=>`| ${name} | ${b.low}–${b.high} | ${b.cases} | ${b.origins} | ${b.predicted===null?"Unavailable":b.predicted.toFixed(3)} | ${b.observed===null?"Unavailable":b.observed.toFixed(3)} |`)).join("\n")}

Brier scores, expanding completed-outcome base-rate scores and broader reliability bins are in the JSON. No probability remapping is fitted to these correlated synthetic cases.

## Matched source and period comparison

The same cost-only annual-block algorithm is fitted separately to fixed-panel and aggregate public prices on identical 2011–2020 origins and 0/4/8-year waits. It isolates source/algorithm differences from the old comparison of different horizons and eras.

${["fixed","aggregate"].map((dataset)=>"### "+dataset+"\n\n"+table(report.sourceComparison.summaries.filter((r)=>r.dataset===dataset))).join("\n\n")}

This common cost-only process uses historical training inflation, not the joint production state process. Differences from production-ledger scores can reflect macro anchoring as well as source composition. Neither source is relabeled as the other.

## Older aggregate newborn-horizon costs

${table(report.longHorizon.summaries)}

${report.longHorizon.distinctOrigins} overlapping origins, two related public sectors and one nonoverlapping 22-year complete window. This is cost-only evidence, not whole-plan newborn funding calibration.

## Comparable price extension through 2024

Pinned matched-school prices extend the endpoint checks by one target year. Training is recomputed on the same surviving component membership. The 2024 endpoint has no invented CPI deflator and never enters a fabricated full joint outcome.

${table(report.extension.summaries)}

Only one new target-year shock is added, and it was already inspected in earlier work. Source hashes, component membership counts and all 1/2/5/10-year endpoint forecasts are retained in the JSON and \`data/comparable-prices-through-2024.json\`.

## Remaining findings

The selected policy's gate and every failed comparison remain visible. Sparse long horizons, source vintages, inherited macro choices and survey anchors limit future probability claims. Source and evaluator hashes, every inner fit, outer bill score, chronological choice and funding case are retained. Immutable synthetic prospective snapshots start a separate future record; they do not validate present forecasts immediately.

[Protocol](full-calibration-protocol.md) · [JSON](../site/data/full-calibration.json) · [Current model](model.md)
`;
writeFileSync("docs/full-calibration-results.md",md);
console.log(JSON.stringify({summaries,policy,gate,liveSelection,liveModel:report.liveModel}));
if(process.env.EMIT_RECOVERY_FILES==="1")
  for(const path of ["site/data/full-calibration.json","data/comparable-prices-through-2024.json","docs/full-calibration-results.md"]) {
    const content=readFileSync(path,"utf8");
    for(let offset=0;offset<content.length;offset+=10000)
      console.log("CALIBRATION_CHUNK "+JSON.stringify({path,offset,content:content.slice(offset,offset+10000)}));
  }
