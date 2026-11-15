export const MODEL = 'college-funding-1.0.0';
export const SCHEMA = 1;
export const PRNG = 'mulberry32-boxmuller-1';
export const ASSUMPTIONS = 'user-defined-1';
export const categories = ['tuition', 'housing', 'books', 'transport', 'other'];
export const assumptionKeys = ['returnRate', 'mean', 'volatility', 'tuitionGrowth', 'livingGrowth', 'inflation', 'lateReturn', 'lateMean', 'lateVolatility', 'attendanceReturn', 'attendanceMean', 'attendanceVolatility', 'transitionYears'];
export const id = () => crypto.randomUUID();
export function month(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw Error('Use a valid month in YYYY-MM format.');
  const [y, m] = value.split('-').map(Number);
  if (y < 2000 || y > 2100) throw Error('Dates must be between 2000 and 2100.');
  return y * 12 + m - 1;
}
export function monthText(value) { return `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, '0')}`; }
export function currentMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
export const clone = x => structuredClone(x);
export function defaultScenario(valuation = currentMonth(), enrollment = `${Number(valuation.slice(0,4))+8}-08`) {
  return {
    id: id(), name: 'Path 1', path: 'Custom path', living: 'On campus', baseline: valuation,
    costs: { tuition: 0, housing: 0, books: 0, transport: 0, other: 0 },
    // Legacy flags are retained only for version-1 backup compatibility; no UI gates.
    costConfirmed: false, source: 'User estimate', sourceDate: valuation,
    balance: 0, monthly: 0, contributionStart: valuation, contributionEnd: monthText(Math.max(month(valuation),month(enrollment)-1)), stepUp: 0,
    gifts: [], grant: 0, grantYears: 4, income: 0, coverage: 'full', share: 1,
    assumptions: { returnRate: .05, mean: .05, volatility: .10, tuitionGrowth: .04, livingGrowth: .03, inflation: .025, lateReturn: .03, lateMean: .03, lateVolatility: .05, attendanceReturn: .02, attendanceMean: .02, attendanceVolatility: .02, transitionYears: 3 },
    assumptionsDate: valuation, assumptionsStatus: 'illustrative', stress: false, acknowledged: false
  };
}
export function newStudent(valuation) {
  const enrollment = `${Number(valuation.slice(0,4))+8}-08`;
  return { id: id(), alias: 'Student', enrollment, years: 4, sharedAllocation: 0, scenarios: [defaultScenario(valuation,enrollment)] };
}
export function newPlan() {
  const valuation = currentMonth(); const student = newStudent(valuation);
  return { schemaVersion: SCHEMA, modelVersion: MODEL, currency: 'USD', valuation, sharedPool: 0,
    defaults: clone(student.scenarios[0].assumptions), students: [student] };
}
function object(x, keys, label) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw Error(`${label} must be an object.`);
  const unknown = Object.keys(x).filter(k => !keys.includes(k));
  if (unknown.length) throw Error(`${label} contains unsupported fields: ${unknown.join(', ')}.`);
  for (const key of keys) if (!(key in x)) throw Error(`${label}: missing ${key}.`);
}
function text(x, max, label) { if(typeof x!=='string' || !x.trim() || x.length>max) throw Error(`${label} must contain 1–${max} characters.`); }
function number(x, min, max, label, integer=false) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x<min || x>max || (integer && !Number.isInteger(x))) throw Error(`${label} must be ${integer?'a whole number ':''}between ${min} and ${max}.`);
}
function array(x,max,label) { if(!Array.isArray(x)||x.length>max) throw Error(`${label} allows at most ${max} items.`); }
export function validateAssumptions(a) {
  object(a,assumptionKeys,'Assumptions');
  for (const k of ['returnRate','mean','lateReturn','lateMean','attendanceReturn','attendanceMean']) number(a[k],-.5,.25,k);
  for(const k of ['volatility','lateVolatility','attendanceVolatility'])number(a[k],0,.6,k);
  number(a.transitionYears,0,10,'Final saving stage length',true);
  for(const k of ['tuitionGrowth','livingGrowth','inflation']) number(a[k],-.05,.15,k);
}
export function validatePlan(plan) {
  object(plan,['schemaVersion','modelVersion','currency','valuation','sharedPool','defaults','students'],'Plan');
  if(plan.schemaVersion!==SCHEMA||plan.modelVersion!==MODEL||plan.currency!=='USD') throw Error('Unsupported schema, model version, or currency.');
  const now=month(plan.valuation); number(plan.sharedPool,0,1e8,'Shared pool'); validateAssumptions(plan.defaults);
  array(plan.students,30,'Students'); if(!plan.students.length) throw Error('Keep at least one student.');
  const ids = new Set(); let allocated=0,totalScenarios=0;
  const unique = x => { text(x,100,'ID'); if(ids.has(x))throw Error('Duplicate IDs in plan.'); ids.add(x); };
  for(const st of plan.students) {
    object(st,['id','alias','enrollment','years','sharedAllocation','scenarios'],'Student'); unique(st.id);text(st.alias,100,'Student alias');
    const enrollment=month(st.enrollment); number(st.years,1,8,'Attendance years',true);
    if(enrollment-now>40*12 || enrollment+st.years*12<=now) throw Error('Choose an enrollment within 40 years, with remaining attendance.');
    number(st.sharedAllocation,0,1e8,'Shared allocation'); allocated+=st.sharedAllocation;
    array(st.scenarios,20,'Scenarios'); if(!st.scenarios.length)throw Error('Each student needs a scenario.'); totalScenarios+=st.scenarios.length;
    for(const s of st.scenarios) {
      object(s,['id','name','path','living','baseline','costs','source','sourceDate','costConfirmed','balance','monthly','contributionStart','contributionEnd','stepUp','gifts','grant','grantYears','income','coverage','share','assumptions','assumptionsDate','assumptionsStatus','stress','acknowledged'],'Scenario');
      unique(s.id); text(s.name,100,'Scenario name'); text(s.path,150,'Education path');text(s.living,100,'Living arrangement');text(s.source,500,'Cost source');
      if(month(s.baseline)>now || now-month(s.baseline)>40*12)throw Error('Cost baseline must be within 40 years before the valuation month.');
      month(s.sourceDate);month(s.assumptionsDate);
      if(!['illustrative','user-defined'].includes(s.assumptionsStatus))throw Error('Unknown assumption status.');
      object(s.costs,categories,'Annual costs');for(const k of categories)number(s.costs[k],0,1e6,`${k} cost`);
      for(const k of ['balance','monthly','grant','income'])number(s[k],0,k==='balance'?1e8:1e6,k);
      const start=month(s.contributionStart),end=month(s.contributionEnd);
      if(start<now||end<start||end>enrollment+st.years*12)throw Error('Contribution dates must start on/after valuation and end on/after start, within the projection.');
      number(s.stepUp,0,.2,'Contribution annual increase');number(s.grantYears,0,8,'Grant years',true);number(s.share,0,1,'Coverage fraction');
      if(!['full','tuition','percent'].includes(s.coverage))throw Error('Unknown coverage goal.');
      if(typeof s.costConfirmed!=='boolean'||typeof s.stress!=='boolean'||typeof s.acknowledged!=='boolean')throw Error('Invalid checkbox value.');
      array(s.gifts,24,'Gifts'); for(const g of s.gifts) {object(g,['date','amount'],'Gift');if(month(g.date)<now||month(g.date)>enrollment+st.years*12-4)throw Error('Gift date must be within the remaining projection.');number(g.amount,0,1e8,'Gift');}
      validateAssumptions(s.assumptions);
    }
  }
  if(totalScenarios>100)throw Error('A plan allows at most 100 scenarios.');
  if(allocated>plan.sharedPool+.001)throw Error('Student allocations exceed the shared pool. Reduce allocations or increase the pool.');
  return plan;
}
export function parseImport(textValue) {
  if(typeof textValue!=='string'||textValue.length>2_000_000)throw Error('Import must be a JSON file under 2 MB.');
  const raw=JSON.parse(textValue);
  object(raw,['format','exportedAt','plan'],'Export');
  if(raw.format!=='education-finance-1')throw Error('Unsupported export format.');
  if(typeof raw.exportedAt!=='string'||!Number.isFinite(Date.parse(raw.exportedAt)))throw Error('Invalid export date.');
  return clone(validatePlan(raw.plan));
}
export function exportPlan(plan) { validatePlan(plan); return JSON.stringify({format:'education-finance-1',exportedAt:new Date().toISOString(),plan},null,2); }
export function duplicateStudent(st) { const x=clone(st); x.id=id(); x.alias=`${x.alias.slice(0,85)} copy`; x.sharedAllocation=0; for(const s of x.scenarios)s.id=id();return x; }
