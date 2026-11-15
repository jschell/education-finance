import { PROFILES } from './history-config.js?v=0.2.0';
import { annualRows,compile,runPath } from './engine.js?v=0.2.0';
export const money=x=>x===null?'—':Number.isFinite(x)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x):'Not attainable';
const pct=x=>`${(x*100).toLocaleString('en-US',{maximumFractionDigits:1})}%`;
export function el(tag,text='',className='') { const node=document.createElement(tag);if(text!==null)node.textContent=text;if(className)node.className=className;return node; }
export function table(caption,headers,rows) {
  const wrap=el('div','','table-wrap'),t=el('table'),cap=el('caption',caption),thead=el('thead'),tr=el('tr');
  headers.forEach(h=>{const th=el('th',h);th.scope='col';tr.append(th);});thead.append(tr);t.append(cap,thead);
  const body=el('tbody');rows.forEach(row=>{const tr=el('tr');row.forEach((v,i)=>{const cell=el(i===0?'th':'td',String(v));if(i===0)cell.scope='row';tr.append(cell);});body.append(tr);});t.append(body);wrap.append(t);return wrap;
}
function section(title,tag) { const s=el('section','','result-section'),heading=el('div','','result-title');heading.append(el('h2',title));if(tag)heading.append(el('span',tag,'tag'));s.append(heading);return s; }
function stats(items) {const group=el('div','','stats');for(const [label,value,note] of items){const n=el('div','','stat');n.append(el('span',label),el('strong',value));if(note)n.append(el('span',note));group.append(n);}return group;}
function callout(text,warning=false) {return el('p',text,`callout${warning?' warning':''}`);}
function chart(bands) {
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 620 240');svg.classList.add('chart');svg.setAttribute('role','img');
  const title=document.createElementNS(ns,'title');title.textContent='Savings balance range: 10th to 90th percentile with median. Values are also in the following table.';svg.append(title);
  const max=Math.max(1,...bands.map(x=>x.p90)),x=i=>65+i/Math.max(1,bands.length-1)*535,y=v=>185-v/max*155;
  const add=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;svg.append(n);};
  for(const frac of [0,.5,1]){const yy=y(max*frac);add('line',{x1:65,y1:yy,x2:600,y2:yy,stroke:'#dce5dd'});add('text',{x:57,y:yy+4,'text-anchor':'end'},money(max*frac));}
  const points=[...bands.map((b,i)=>`${x(i)},${y(b.p90)}`),...bands.map((b,i)=>`${x(i)},${y(b.p10)}`).reverse()].join(' ');
  add('polygon',{points,fill:'#d9e9df'});add('polyline',{points:bands.map((b,i)=>`${x(i)},${y(b.p50)}`).join(' '),fill:'none',stroke:'#397e68','stroke-width':3});
  const ticks=[...new Set([0,Math.floor((bands.length-1)/2),bands.length-1])];for(const i of ticks)add('text',{x:x(i),y:215,'text-anchor':i===0?'start':i===bands.length-1?'end':'middle'},bands[i].date);
  return svg;
}
export function deterministicView(plan,student,scenario,result) {
  const c=compile(plan,student,scenario),only=runPath(compile(plan,student,scenario,'savings')),withC=runPath(compile(plan,student,scenario,'contributions'));
  const s=section(`${student.alias} · ${scenario.name}`,'Fixed-rate reference');
  s.append(el('p',`${scenario.path} · ${scenario.living} · enrollment ${student.enrollment} · ${student.years} attendance years`,'hint'));
  if(!result.total)s.append(callout('Savings growth only: add annual college costs to assess the funding gap.'));
  if(scenario.stress)s.append(callout('Stress case: includes a one-time 25% market loss before enrollment (or at valuation if already enrolled).',true));
  const firstYear=c.rows.filter((r,i)=>i>=Math.max(0,c.enrollmentIndex)&&i<c.enrollmentIndex+12).reduce((v,r)=>v+r.total,0);
  s.append(stats([
    ['Savings at university entry',money(result.enrollmentBalance),result.enrollmentBalance===null?'Already enrolled at valuation':'Before the entry month’s growth and bills'],
    ['First attendance year',money(firstYear),c.enrollmentIndex<0?'Remaining costs only':'Projected tuition + all other costs'],
    ['Unfunded covered expenses',result.total?money(result.shortfall):'—',result.total?(result.success?'All covered bills paid':'Includes timing shortfalls'):'Add annual costs to assess the gap']
  ]));
  const years=Math.max(0,c.enrollmentIndex)/12;
  s.append(callout(`Savings and costs grow separately over ${years.toFixed(1)} years to entry. Current savings alone reach ${money(only.enrollmentBalance)} at entry. Total remaining attendance cost: ${money(result.total)} (${money(c.rows.reduce((v,r)=>v+r.total/r.discount,0))} in ${plan.valuation} purchasing power).`));
  s.append(table('How funding changes the gap',['Funding included','Unpaid covered bills','Funds left after college'],[
    ['Current savings only',money(only.shortfall),money(only.ending)],['Savings + contributions & gifts',money(withC.shortfall),money(withC.ending)],['All planned funding + income',money(result.shortfall),money(result.ending)]
  ]));
  s.append(el('p',`Coverage goal: ${scenario.coverage==='tuition'?'tuition and fees':scenario.coverage==='percent'?pct(scenario.share)+' of net full cost':'full attendance cost'}, after grants. Covered obligation: ${money(result.obligation)} (${result.obligation?((result.obligation-result.shortfall)/result.obligation*100).toFixed(0):'100'}% funded in this projection). Grants applied: ${money(result.grants)}. Unused income is not deposited. ${result.firstShortfall?'First shortfall: '+result.firstShortfall+'.':'No missed covered payment in this projection.'}`,'hint'));
  s.append(table('Calendar-year cash flow · all planned funding',['Year','Total costs','Grants','Covered goal','Income used','Deposits','Withdrawals','Unpaid','Ending funds'],annualRows(result).map(r=>[r.year,...['total','grant','obligation','income','contribution','withdrawal','shortfall','balance'].map(k=>money(r[k]))])));
  s.append(el('p','Tuition: half at entry and half five months later. Other costs: nine monthly payments per attendance year. Contributions arrive at month-end, after growth and before bills. Growth continues during attendance.','hint'));
  const assumptions=el('details');assumptions.append(el('summary','Assumptions used in this projection'));
  const a=scenario.assumptions;
  assumptions.append(table('Annual nominal assumptions',['Stage / item','Compound annual growth'],[
    ['Early saving',pct(a.returnRate)],
    [`Final ${a.transitionYears} years`,pct(a.lateReturn)],
    ['During attendance',pct(a.attendanceReturn)],
    ['Tuition cost growth',pct(a.tuitionGrowth)],['Other cost growth',pct(a.livingGrowth)],['General inflation',pct(a.inflation)]
  ]));assumptions.append(el('p',`Costs: ${scenario.source} · checked ${scenario.sourceDate} · baseline ${scenario.baseline}. Return assumptions: ${scenario.assumptionsStatus}, as of ${scenario.assumptionsDate}. No recommended investment allocation or aid eligibility is inferred.`,'hint'));s.append(assumptions);
  return s;
}
export function simulationView(sim) {
  const s=section('Funding outlook',`${sim.trials.toLocaleString()} historical paths`);
  s.append(stats([
    ['Simulated funding success',sim.cost?pct(sim.probability):'—',sim.cost?'Every covered bill paid when due':'Add a college budget to assess funding'],
    ['Median funding gap',money(sim.gap.p50),'Unpaid covered expenses'],
    ['Higher funding gap',money(sim.gap.p90),'90th percentile · adverse outcome']
  ]));
  s.append(el('p',`${sim.period} observations · ${sim.blockYears}-year blocks · ${PROFILES[sim.profile].name}. ${sim.costMode==='historical'?'Investment returns, tuition growth, and living-cost inflation vary together.':'Investment returns vary; expense-growth rates are fixed.'}`,'hint'));
  s.append(table('Range of possible outcomes · nominal dollars',['Outcome','10th percentile','Median','90th percentile'],[
    ['Savings at university entry',money(sim.enrollment.p10),money(sim.enrollment.p50),money(sim.enrollment.p90)],
    ['Total college expenses',money(sim.costRange.p10),money(sim.costRange.p50),money(sim.costRange.p90)],
    ['Tuition & fees',money(sim.tuitionRange.p10),money(sim.tuitionRange.p50),money(sim.tuitionRange.p90)],
    ['Funding gap',money(sim.gap.p10),money(sim.gap.p50),money(sim.gap.p90)],
    ['Funds left after college',money(sim.ending.p10),money(sim.ending.p50),money(sim.ending.p90)]
  ]));
  s.append(el('p','Each funding gap is calculated from that path’s expenses and available funds together. A higher expense or gap is adverse; higher savings are favorable. Percentiles describe ranges, not minimum or maximum outcomes.','hint'));
  s.append(el('h3','Savings through the plan'),chart(sim.bands));
  const legend=el('div','','legend');legend.append(el('span','10th–90th percentile'),el('span','Median'));s.append(legend);
  const solver=el('div','','callout');solver.append(el('strong',`Monthly savings for ${pct(sim.threshold)} simulated funding success`));
  if(!sim.cost)solver.append(el('p','Enter annual college costs to estimate a savings target.'));
  else if(sim.infeasible)solver.append(el('p',`Not attainable within ${money(sim.ceiling)}/month and the entered contribution dates. Adjust the schedule, available funding, or coverage goal.`));
  else {
    solver.append(el('p',`${money(sim.contribution)}/month total base contribution (${money(sim.additional)} above the current plan), using your contribution dates and annual increase.`));
    const check=sim.confirmation;
    solver.append(el('p',`Independent seeded check: ${pct(check.probability)} across ${check.trials.toLocaleString()} paths. ${check.meets?'The selected threshold was met in this check.':'This check fell below the threshold; consider a larger contribution or more trials.'}`));
  }
  s.append(solver);
  const details=el('details');details.append(el('summary','More outcome detail'));
  details.append(table('In valuation-month purchasing power',['Outcome','10th percentile','Median','90th percentile'],[
    ['College expenses',money(sim.realCostRange.p10),money(sim.realCostRange.p50),money(sim.realCostRange.p90)],
    ['Funding gap',money(sim.realGap.p10),money(sim.realGap.p50),money(sim.realGap.p90)],
    ['Gap among unsuccessful paths',money(sim.conditionalGap.p10),money(sim.conditionalGap.p50),money(sim.conditionalGap.p90)]
  ]));
  details.append(table('End-of-month savings ranges',['Date','10th percentile','Median','90th percentile'],sim.bands.map(b=>[b.date,money(b.p10),money(b.p50),money(b.p90)])));
  details.append(el('p',`${sim.failedCount.toLocaleString()} paths missed a covered payment. Pointwise bands do not represent one possible trajectory. Seed ${sim.seed}; ${sim.prngVersion}. Sampling standard error ${(sim.samplingSE*100).toFixed(1)} percentage points describes simulation noise only.`,'hint'));s.append(details);return s;
}
export function historyContextView(result) {
  const {simulation:sim,historicalReplay:replay,sensitivity,dataset}=result;
  const s=section('Historical comparisons','Included in this calculation');
  const rows=[['Sampled blocks · '+sim.period,sim.trials.toLocaleString(),sim.cost?pct(sim.probability):'—',money(sim.gap.p50),money(sim.gap.p90)],
    ['Sampled blocks · '+sensitivity.period,sensitivity.trials.toLocaleString(),sim.cost?pct(sensitivity.probability):'—',money(sensitivity.gap.p50),money(sensitivity.gap.p90)]];
  if(replay.windows)rows.push(['Actual consecutive periods · '+replay.period,String(replay.windows),sim.cost?pct(replay.passRate):'—',money(replay.gap.p50),money(replay.gap.p90)]);
  s.append(table('Sensitivity to the history used',['Historical basis','Paths / periods','Funded','Median gap','90th gap'],rows));
  if(replay.windows)s.append(el('p',`The actual-period comparison applies your plan to ${replay.windows} complete historical windows. The largest nominal gap was ${money(replay.worstGap)}, starting ${replay.worstStart} and ending ${replay.worstEnd}. Overlapping historical windows are not independent future probabilities.`,'hint'));
  else s.append(el('p','No complete actual historical window fits this plan’s length and selected period. Block sampling remains available.','hint'));
  s.append(el('p','The secondary sampled comparison uses 1,000 paths to show sensitivity to the chosen historical period; its sampling variation is larger than the main run.','hint'));
  const info=el('details');info.append(el('summary','Historical data & assumptions'));
  info.append(el('p',`${dataset.observations} matched monthly observations, ${dataset.start} through ${dataset.end}. Snapshot ${dataset.id}, prepared ${dataset.asOf}. Profile rebalances monthly; annual fee ${pct(sim.fee)}.`));
  info.append(table('Stocks / bonds / cash allocation',['Stage','Stocks','Bonds','Cash'],PROFILES[sim.profile].stages.map((w,i)=>[['Early saving','Final saving years','During university'][i],...w.map(pct)])));
  for(const source of dataset.sources){const p=el('p'),a=el('a',source.name);a.href=source.url;p.append(a,el('span',' · '+source.transform));info.append(p);}
  for(const note of dataset.notes)info.append(el('p',note,'hint'));
  info.append(el('p',`Observation checksum: ${dataset.hash}`,'hash-note'));
  s.append(info);return s;
}

export function comparisonView(results) {
  const s=section('Scenario comparison','Same random draws');
  s.append(table('Same student · independently assessed alternatives',['Scenario','Median cost','Reference gap','Simulated success','Median gap','90th gap','Monthly at target'],results.map(r=>[r.name,money(r.simulation.cost),money(r.deterministic.shortfall),r.simulation.cost?pct(r.simulation.probability):'—',money(r.simulation.gap.p50),money(r.simulation.gap.p90),money(r.simulation.contribution)])));
  s.append(el('p','These are alternatives for one student. Do not add their costs or interpret individual probabilities as family-wide success. Each scenario retains its own coverage goal and return assumptions.','hint'));return s;
}
export function csvText(rows) {
  return rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
}
