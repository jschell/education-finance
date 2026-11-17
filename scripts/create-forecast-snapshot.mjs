import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { compileCalibrated, calibrationFactory, canonical } from "../site/js/calibration.js";
import { MODEL } from "../site/js/domain.js";
import { quantile } from "../site/js/random.js";
import { planFor } from "./full-calibration-inputs.mjs";
const args = process.argv.slice(2);
const value = (name) => { const at=args.indexOf(name); return at<0?null:args[at+1]; };
const asOf=value("--as-of"), output=value("--output"), bundlePath=value("--bundle")||"site/data/calibration-reviewed.json";
if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf||"") || !output || !Number.isFinite(Date.parse(asOf)))
  throw Error("Use --as-of YYYY-MM-DD --output NEW_FILE.json [--bundle PATH]");
const b=JSON.parse(readFileSync(bundlePath,"utf8")),sha=(x)=>createHash("sha256").update(x).digest("hex");
const forecasts=[];
for(const horizon of [1,2,5,10,18]) {
  const year=Number(asOf.slice(0,4)),month=asOf.slice(5,7);
  const {p,st,sc}=planFor(year,horizon,{tuition:10000,housing:10000},"public4");
  p.valuation=asOf.slice(0,7); sc.baseline=p.valuation;sc.sourceDate=p.valuation;
  st.enrollment=`${year+horizon}-${month}`; sc.years=1;
  Object.assign(st.funding,{monthly:0,grant:0,contributionStart:p.valuation,contributionEnd:p.valuation});
  const {c}=compileCalibrated(p,st,sc,b),f=calibrationFactory(c,b,{seed:850213}),out=[];
  for(let t=0;t<1000;t++) {
    const r=f.make(t).compiled.rows[c.enrollmentIndex];
    out.push(r.costs.tuition/r.valuationCosts.tuition*10000+
      r.costs.housing/r.valuationCosts.housing*10000);
  }
  out.sort((a,b)=>a-b);
  forecasts.push({horizon,targetMonth:st.enrollment,p10:quantile(out,0.1),p50:quantile(out,0.5),p90:quantile(out,0.9),
    outcome:null,status:"Future synthetic normalized-budget cost forecast; not an observed-school prediction"});
}
const sourcePaths=readdirSync("site/js").filter((p)=>p.endsWith(".js")).sort().map((p)=>"site/js/"+p);
const body={id:"prospective-synthetic-cost-"+asOf,asOf,modelVersion:MODEL,bundleId:b.id,bundleHash:b.sha256,
  trainingCostLast:Math.max(...Object.values(b.prices).map((p)=>p.at(-1).year)),
  trainingMacroLast:b.economy.macroYears.at(-1).year,seed:850213,trials:1000,
  syntheticBudget:{tuition:10000,housing:10000,currency:"USD",baselineMonth:asOf.slice(0,7)},
  sourceHashes:Object.fromEntries([...sourcePaths,bundlePath,"docs/full-calibration-protocol.md"].map((p)=>[p,sha(readFileSync(p))])),
  forecasts,limitations:["Current forward anchors are assumptions; this snapshot begins evidence collection but validates no future outcome.",
    "Synthetic normalized budgets contain no real family data. Targets are future dates; null outcomes must not be counted as successes."]};
body.sha256=sha(canonical(body));
writeFileSync(output,JSON.stringify(body)+"\n",{flag:"wx"});
console.log("SNAPSHOT_FILE "+JSON.stringify({path:output,content:JSON.stringify(body)+"\n"}));
