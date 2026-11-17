import { summarizeCost } from './cost-followup-helpers.mjs';
// Frozen before corrected candidate scores. Case counts do not imply independence.
export const GATE = { improvement:0.05, minCompletedYears:3, minOrigins:3, waits:[0,4,8] };
export function eligibleGate(rows, selections, policy='policy') {
  const eligibleOrigins = new Set(selections.filter(s=>s.targetYears.length>=GATE.minCompletedYears).map(s=>s.origin));
  const eligible = rows.filter(r=>eligibleOrigins.has(r.origin));
  const support=GATE.waits.map(wait=>({wait,origins:[...new Set(eligible.filter(r=>r.wait===wait).map(r=>r.origin))]}));
  const production=summarizeCost(rows,'production');
  const oracleRows=rows.map(r=>({...r,models:{...r.models,oracle:{...r.models.production,score:eligibleOrigins.has(r.origin)?0:r.models.production.score}}}));
  const oracle=summarizeCost(oracleRows,'oracle');
  const preflight={baseline:production.score,required:production.score*(1-GATE.improvement),oracle:oracle.score,
    feasible:oracle.score<=production.score*(1-GATE.improvement),maxImprovement:1-oracle.score/production.score};
  const comparisons=support.map(s=>{
    const subset=eligible.filter(r=>r.wait===s.wait);
    if(s.origins.length<GATE.minOrigins)return {...s,status:'insufficient-evidence'};
    const a=summarizeCost(subset,'production'), b=summarizeCost(subset,policy);
    const checks={score:b.score<=a.score*(1-GATE.improvement),coverage:Math.abs(b.covered-.8)<Math.abs(a.covered-.8),bias:Math.abs(b.bias)<=Math.abs(a.bias)+.02};
    return {...s,status:Object.values(checks).every(Boolean)?'passed':'failed',baseline:a,candidate:b,checks};
  });
  return {rule:GATE,preflight,eligibleCases:eligible.length,totalCases:rows.length,comparisons,
    status:comparisons.some(s=>s.status==='insufficient-evidence')?'insufficient-evidence':comparisons.every(s=>s.status==='passed')?'passed':'failed',
    promoted:comparisons.every(s=>s.status==='passed')};
}
