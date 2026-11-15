import { MODEL,PRNG,ASSUMPTIONS,clone,id,newPlan,newStudent,defaultScenario,duplicateStudent,validatePlan,exportPlan,parseImport,currentMonth,monthText,month,assumptionKeys } from './domain.js';
import { compile,runPath,annualRows } from './engine.js';
import { savePlan,loadPlan,clearPlan } from './storage.js';
import { el,money,table,deterministicView,simulationView,comparisonView,csvText } from './render.js';
const $=s=>document.querySelector(s),form=$('#planner');
let plan=newPlan(),studentId=plan.students[0].id,scenarioId=plan.students[0].scenarios[0].id;
let revision=0,dirty=false,worker=null,runId=0,lastResult=null,pendingImport=null,assumptionEdited=false,refreshTimer=null;
const student=()=>plan.students.find(s=>s.id===studentId),scenario=()=>student().scenarios.find(s=>s.id===scenarioId);
const message=(text,error=false)=>{ $('#message').textContent=text;$('#message').classList.toggle('error',error); };
function cancel(show=false) { if(worker){worker.terminate();worker=null;runId++;if(show)message('Simulation cancelled. Inputs are unchanged.');}$('#run-status').hidden=true; }
function calculationStatus(text,error=false) {
  let status=$('#calculation-status');
  // Tolerate an older cached HTML shell during an asset update.
  if(!status){status=el('p','','calculation-status');status.id='calculation-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');$('.run-controls').before(status);}
  status.textContent=text;status.classList.toggle('error',error);
  if(lastResult&&!$('#results-content').hidden){
    const link=el('a',error?'View previous results':'View results');link.href='#results-content';
    status.append(' ',link);
  }
}
function clearRefresh() { clearTimeout(refreshTimer);refreshTimer=null; }
function invalidate() {
  clearRefresh();cancel();
  // Keep the last complete result visible; never replace it with an empty panel.
  const target=$('#results-content');
  if(lastResult&&!target.hidden) {
    target.dataset.stale='true';
    if(!target.querySelector('.stale-notice'))target.prepend(el('p','Inputs changed. These results are from the previous assessment.','callout warning stale-notice'));
    target.querySelectorAll('.actions button').forEach(button=>{button.disabled=true;});
  }
}
function changed() {
  revision++;dirty=true;$('#save-state').textContent='Unsaved changes';invalidate();message('');
  calculationStatus('Updating projection…');
}
function scheduleProjection() {
  clearRefresh();
  refreshTimer=setTimeout(()=>{
    refreshTimer=null;
    try { commit({normalize:false,report:false});showProjection(); }
    catch(error) { calculationStatus(`${error.message}${lastResult?' Previous results remain visible.':''}`,true); }
  },300);
}
function inputValue(node,fallback) {
  if(node.type==='checkbox')return node.checked;
  if(node.value.trim()==='')return fallback;
  if(node.type==='number')return node.valueAsNumber/(node.hasAttribute('data-percent')?100:1);
  return node.value;
}
function reportValidity(report=true) {
  const invalid=[...form.querySelectorAll('input,select')].find(x=>!x.checkValidity());
  if(invalid){if(!report)return false;let n=invalid.parentElement;while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}invalid.reportValidity();return false;}return true;
}
function commit({normalize=true,report=true}={}) {
  if(normalize)clearRefresh();
  if(!reportValidity(report))throw Error('Complete the highlighted input before continuing.');
  const candidate=clone(plan),st=candidate.students.find(x=>x.id===studentId),sc=st.scenarios.find(x=>x.id===scenarioId);
  for(const n of form.querySelectorAll('[data-student]'))st[n.dataset.student]=inputValue(n,st[n.dataset.student]);
  for(const n of form.querySelectorAll('[data-scenario]'))sc[n.dataset.scenario]=inputValue(n,sc[n.dataset.scenario]);
  for(const n of form.querySelectorAll('[data-cost]'))sc.costs[n.dataset.cost]=inputValue(n,0);
  for(const n of form.querySelectorAll('[data-assumption]'))sc.assumptions[n.dataset.assumption]=inputValue(n,sc.assumptions[n.dataset.assumption]);
  for(const key of ['balance','monthly','grant','income','stepUp']) { const node=form.querySelector(`[data-scenario=${key}]`); if(node.value.trim()==='')sc[key]=0; }
  for(const key of ['sharedAllocation']) { const node=form.querySelector(`[data-student=${key}]`); if(node.value.trim()==='')st[key]=0; }
  sc.gifts=[...$('#gifts').querySelectorAll('.gift-row')].map(row=>({date:row.querySelector('[data-date]').value,amount:row.querySelector('[data-amount]').valueAsNumber}));
  candidate.valuation=inputValue($('#valuation'),plan.valuation);candidate.sharedPool=inputValue($('#shared-pool'),0);
  if(st.enrollment!==student().enrollment) {
    const oldEnd=monthText(Math.max(month(plan.valuation),month(student().enrollment)-1));
    const newEnd=monthText(Math.max(month(candidate.valuation),month(st.enrollment)-1));
    for(const path of st.scenarios)if(path.contributionEnd===oldEnd)path.contributionEnd=newEnd;
    form.querySelector('[data-scenario=contributionEnd]').value=sc.contributionEnd;
  }
  if(assumptionEdited){sc.assumptionsStatus='user-defined';sc.assumptionsDate=currentMonth();}
  validatePlan(candidate);plan=candidate;assumptionEdited=false;updateAllocation();
  if(normalize) {
  for(const n of form.querySelectorAll('[data-student]'))fill(n,st[n.dataset.student]);
  for(const n of form.querySelectorAll('[data-scenario]'))fill(n,sc[n.dataset.scenario]);
  for(const n of form.querySelectorAll('[data-cost]'))fill(n,sc.costs[n.dataset.cost]);
  for(const n of form.querySelectorAll('[data-assumption]'))fill(n,sc.assumptions[n.dataset.assumption]);
  $('#valuation').value=plan.valuation;$('#shared-pool').value=plan.sharedPool;
  }
  updateDefaultsSummary(st,sc);
  const studentOption=[...$('#student-select').options].find(x=>x.value===studentId);if(studentOption)studentOption.textContent=st.alias;
  const scenarioOption=[...$('#scenario-select').options].find(x=>x.value===scenarioId);if(scenarioOption)scenarioOption.textContent=sc.name;
  if(normalize&&$('#results-content').dataset.stale==='true')showProjection();
  return plan;
}
function option(select,value,label) { const op=el('option',label);op.value=value;select.append(op); }
function fill(node,value) {if(node.type==='checkbox')node.checked=value;else {if(node.tagName==='SELECT'&&![...node.options].some(o=>o.value===value))option(node,value,value);node.value=node.hasAttribute('data-percent')?Number((value*100).toFixed(8)):value;}}
function giftRow(g={date:plan.valuation,amount:0}) {
  const row=el('div','','gift-row'),date=el('label','Gift month'),amount=el('label','Amount ($)'),di=el('input'),ai=el('input'),remove=el('button','Remove');
  di.type='month';di.required=true;di.dataset.date='';di.value=g.date;ai.type='number';ai.min='0';ai.max='100000000';ai.step='.01';ai.required=true;ai.dataset.amount='';ai.value=g.amount;date.append(di);amount.append(ai);remove.type='button';
  remove.addEventListener('click',()=>{row.remove();changed();scheduleProjection();});row.append(date,amount,remove);return row;
}
function updateDefaultsSummary(st,sc) {
  const a=sc.assumptions,pct=x=>`${(x*100).toLocaleString('en-US',{maximumFractionDigits:1})}%`;
  $('#defaults-summary').textContent=`${st.years} years of attendance · savings growth ${pct(a.returnRate)} early / ${pct(a.lateReturn)} near entry / ${pct(a.attendanceReturn)} during college · tuition growth ${pct(a.tuitionGrowth)} · other cost growth ${pct(a.livingGrowth)}. Edit below.`;
}
function updateAllocation() {
  const allocated=plan.students.reduce((v,s)=>v+s.sharedAllocation,0);$('#allocation-note').textContent=`Pool assigned across students: ${money(allocated)} of ${money(plan.sharedPool)}. This student's share is reused across their alternative scenarios and counted once across students.`;
}
function renderForm() {
  const st=student(),sc=scenario();
  $('#student-select').replaceChildren();plan.students.forEach(s=>option($('#student-select'),s.id,s.alias));$('#student-select').value=studentId;
  $('#scenario-select').replaceChildren();st.scenarios.forEach(s=>option($('#scenario-select'),s.id,s.name));$('#scenario-select').value=scenarioId;
  form.querySelectorAll('[data-student]').forEach(n=>fill(n,st[n.dataset.student]));
  form.querySelectorAll('[data-scenario]').forEach(n=>fill(n,sc[n.dataset.scenario]));
  form.querySelectorAll('[data-cost]').forEach(n=>fill(n,sc.costs[n.dataset.cost]));
  form.querySelectorAll('[data-assumption]').forEach(n=>fill(n,sc.assumptions[n.dataset.assumption]));
  $('#valuation').value=plan.valuation;$('#shared-pool').value=plan.sharedPool;$('#gifts').replaceChildren(...sc.gifts.map(giftRow));
  $('#assumption-status').textContent=`Assumptions updated ${sc.assumptionsDate}.`;
  updateDefaultsSummary(st,sc);
  const share=form.querySelector('[data-scenario=share]');share.disabled=sc.coverage!=='percent';
  $('#delete-student').disabled=plan.students.length===1;$('#delete-scenario').disabled=st.scenarios.length===1;updateAllocation();assumptionEdited=false;
  try {showProjection();}catch(error){calculationStatus(error.message,true);}
}
async function guard(action){try{await action();}catch(e){message(e.message||String(e),true);calculationStatus(e.message||String(e),true);}}
function confirmAction(title,body) {
  return new Promise(resolve=>{const d=$('#confirm-dialog');$('#dialog-title').textContent=title;$('#dialog-body').textContent=body;
    const finish=v=>{d.close();$('#dialog-yes').onclick=null;$('#dialog-no').onclick=null;d.oncancel=null;resolve(v);};
    $('#dialog-yes').onclick=()=>finish(true);$('#dialog-no').onclick=()=>finish(false);d.oncancel=e=>{e.preventDefault();finish(false);};d.showModal();$('#dialog-no').focus();});
}
function download(name,text,type) {
  const url=URL.createObjectURL(new Blob([text],{type})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resultActions() {
  const actions=el('div','','actions'),report=el('button','Export assessment JSON'),csv=el('button','Export yearly CSV'),print=el('button','Print report');
  report.onclick=()=>download('education-finance-assessment.json',JSON.stringify(lastResult,null,2),'application/json');
  csv.onclick=()=>{
    const assessedStudent=lastResult.plan.students.find(s=>s.id===lastResult.studentId),assessedScenario=assessedStudent.scenarios.find(s=>s.id===lastResult.scenarioId);
    const all=lastResult.comparisons||[{name:assessedScenario.name,deterministic:lastResult.deterministic}];
    const rows=[['Student','Scenario','Valuation','Year','Total costs','Grants','Covered obligation','Income used','Contributions and gifts','Savings withdrawals','Unpaid obligation','Ending savings']];
    for(const r of all)for(const y of annualRows(r.deterministic))rows.push([assessedStudent.alias,r.name,lastResult.plan.valuation,y.year,...['total','grant','obligation','income','contribution','withdrawal','shortfall','balance'].map(k=>y[k].toFixed(2))]);
    download('education-finance-yearly.csv',csvText(rows),'text/csv');};print.onclick=()=>window.print();actions.append(report,csv,print);return actions;
}
function showProjection() {
  const c=compile(plan,student(),scenario()),det=runPath(c);
  lastResult={modelVersion:MODEL,prngVersion:PRNG,assumptionsVersion:ASSUMPTIONS,generatedAt:new Date().toISOString(),plan:clone(plan),studentId,scenarioId,deterministic:det};
  const target=$('#results-content');delete target.dataset.stale;target.replaceChildren(deterministicView(plan,student(),scenario(),det),resultActions());target.hidden=false;$('#empty-results').hidden=true;
  calculationStatus('Projection updated. Run Monte Carlo for outcome ranges.');
}
function settings() {
  if($('#seed').value==='')$('#seed').value='12345';
  if($('#ceiling').value==='')$('#ceiling').value='10000';
  for(const selector of ['#seed','#ceiling'])if(!$(selector).reportValidity())throw Error('Review simulation settings.');
  return {seed:$('#seed').valueAsNumber,trials:Number($('#trials').value),threshold:Number($('#threshold').value),ceiling:$('#ceiling').valueAsNumber};
}
function startSimulation(action='single') {
  commit();const config=settings();
  cancel();showProjection();message('');calculationStatus('Running Monte Carlo…');const thisRun=++runId,snapshot=clone(plan);$('#run-status').hidden=false;$('#progress-text').textContent='Starting simulation…';$('#progress').value=0;$('#run-status').scrollIntoView({block:'start',behavior:'smooth'});
  worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
    if(data.runId!==runId)return;
    if(data.type==='progress'){ $('#progress').value=data.done/Math.max(1,data.total);$('#progress-text').textContent=`${data.scenario?data.scenario+' · ':''}${data.stage} · ${Math.round(data.done/Math.max(1,data.total)*100)}%`; }
    else if(data.type==='error'){cancel();message(data.message,true);calculationStatus(data.message,true);}
    else if(data.type==='result') {
      cancel();const target=$('#results-content');
      lastResult={...lastResult,plan:snapshot,settings:config};
      if(action==='compare'){lastResult.comparisons=data.result;target.replaceChildren(comparisonView(data.result),deterministicView(plan,student(),scenario(),lastResult.deterministic));const selected=data.result.find(r=>r.id===scenarioId);if(selected)target.append(simulationView(selected.simulation));}
      else {lastResult.simulation=data.result.simulation;target.replaceChildren(deterministicView(plan,student(),scenario(),data.result.deterministic),simulationView(data.result.simulation));}
      target.append(resultActions());calculationStatus('Assessment complete. Projection and simulated outcomes are shown below.');message('');
    }
  };
  worker.onerror=e=>{cancel();calculationStatus(`Simulation could not complete: ${e.message}. The projection remains visible.`,true);};
  worker.postMessage({runId:thisRun,plan:snapshot,studentId,scenarioId,settings:config,action});
}
form.addEventListener('input',e=>{changed();if(e.target.dataset.assumption!==undefined||e.target.dataset.scenario==='stress'){assumptionEdited=true;}scheduleProjection();});
form.addEventListener('change',e=>{if(e.target.tagName==='SELECT'||e.target.type==='month'||e.target.type==='checkbox'){changed();scheduleProjection();}if(e.target.dataset.scenario==='coverage')form.querySelector('[data-scenario=share]').disabled=e.target.value!=='percent';});
form.addEventListener('submit',e=>{e.preventDefault();guard(()=>{commit();showProjection();$('#results-content').scrollIntoView({block:'start',behavior:'smooth'});message('');});});
$('#simulate').onclick=()=>guard(()=>startSimulation());$('#compare').onclick=()=>guard(()=>startSimulation('compare'));$('#cancel').onclick=()=>{cancel(true);calculationStatus('Simulation cancelled. The projection remains visible.');};
$('#add-gift').onclick=()=>{if($('#gifts').children.length>=24)return message('A scenario allows up to 24 gifts.',true);$('#gifts').append(giftRow());changed();scheduleProjection();};
$('#student-select').onchange=()=>guard(()=>{const selected=$('#student-select').value;try{commit();studentId=selected;scenarioId=student().scenarios[0].id;invalidate();renderForm();message('Student selected.');}catch(e){$('#student-select').value=studentId;throw e;}});
$('#scenario-select').onchange=()=>guard(()=>{const selected=$('#scenario-select').value;try{commit();scenarioId=selected;invalidate();renderForm();message('Scenario selected.');}catch(e){$('#scenario-select').value=scenarioId;throw e;}});
$('#add-student').onclick=()=>guard(()=>{commit();if(plan.students.length>=30)throw Error('Maximum 30 students.');const st=newStudent(plan.valuation);st.alias=`Student ${plan.students.length+1}`;st.scenarios[0].assumptions=clone(plan.defaults);st.scenarios[0].assumptionsStatus='user-defined';const candidate=clone(plan);candidate.students.push(st);validatePlan(candidate);plan=candidate;studentId=st.id;scenarioId=st.scenarios[0].id;changed();renderForm();});
$('#copy-student').onclick=()=>guard(()=>{commit();if(plan.students.length>=30)throw Error('Maximum 30 students.');const st=duplicateStudent(student());const candidate=clone(plan);candidate.students.push(st);validatePlan(candidate);plan=candidate;studentId=st.id;scenarioId=st.scenarios[0].id;changed();renderForm();message('Student duplicated. Shared allocation reset to zero to prevent double counting.');});
$('#delete-student').onclick=()=>guard(async()=>{if(plan.students.length<2)return;if(!await confirmAction('Delete this student?',`Remove ${student().alias} and all their scenarios from this workspace? Save locally afterward to update stored data.`))return;plan.students=plan.students.filter(s=>s.id!==studentId);studentId=plan.students[0].id;scenarioId=student().scenarios[0].id;changed();renderForm();});
function addScenario(copy=false) {
  commit();const st=student();if(st.scenarios.length>=20)throw Error('Maximum 20 scenarios per student.');
  const s=copy?clone(scenario()):defaultScenario(plan.valuation,st.enrollment);s.id=id();s.name=copy?`${s.name.slice(0,85)} copy`:`Path ${st.scenarios.length+1}`;
  if(!copy){s.assumptions=clone(plan.defaults);s.assumptionsStatus='user-defined';}
  const candidate=clone(plan);candidate.students.find(x=>x.id===studentId).scenarios.push(s);validatePlan(candidate);plan=candidate;scenarioId=s.id;changed();renderForm();
}
$('#add-scenario').onclick=()=>guard(()=>addScenario());$('#copy-scenario').onclick=()=>guard(()=>addScenario(true));
$('#delete-scenario').onclick=()=>guard(async()=>{if(student().scenarios.length<2)return;if(!await confirmAction('Delete this scenario?',`Remove ${scenario().name} from this workspace?`))return;student().scenarios=student().scenarios.filter(s=>s.id!==scenarioId);scenarioId=student().scenarios[0].id;changed();renderForm();});
$('#set-defaults').onclick=()=>guard(()=>{commit();plan.defaults=clone(scenario().assumptions);changed();showProjection();message('Family defaults updated. Existing scenarios retain their values. Save locally to keep these defaults.');});
$('#apply-defaults').onclick=()=>guard(()=>{commit();scenario().assumptions=clone(plan.defaults);scenario().assumptionsStatus='user-defined';scenario().assumptionsDate=currentMonth();changed();renderForm();message('Family defaults copied into this scenario. Review before simulating.');});
$('#save').onclick=()=>guard(async()=>{commit();const snapshot=clone(plan);const signature=JSON.stringify(snapshot),savedRevision=revision;await savePlan(snapshot);if(revision===savedRevision&&JSON.stringify(plan)===signature){dirty=false;$('#save-state').textContent='Saved in this browser';}message('Plan saved locally. Export a backup for portability.');});
$('#export').onclick=()=>guard(()=>{commit();download('education-finance-plan.json',exportPlan(plan),'application/json');message('Plan exported. The JSON contains financial inputs; store it privately.');});
$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=()=>guard(async()=>{const file=$('#import-file').files[0];$('#import-file').value='';if(!file)return;if(file.size>2_000_000)throw Error('Import file must be under 2 MB.');pendingImport=parseImport(await file.text());$('#import-preview').textContent=`${pendingImport.students.length} students · ${pendingImport.students.reduce((n,s)=>n+s.scenarios.length,0)} scenarios · valuation ${pendingImport.valuation}. Students: ${pendingImport.students.map(s=>s.alias).join(', ')}.`;$('#import-dialog').showModal();$('#import-cancel').focus();});
$('#import-cancel').onclick=()=>{pendingImport=null;$('#import-dialog').close();};$('#import-dialog').oncancel=()=>{pendingImport=null;};
$('#import-confirm').onclick=()=>guard(()=>{if(!pendingImport)return;plan=pendingImport;pendingImport=null;studentId=plan.students[0].id;scenarioId=student().scenarios[0].id;$('#import-dialog').close();changed();renderForm();message('Imported into this workspace. Review, then Save locally to persist.');});
$('#delete-local').onclick=()=>guard(async()=>{if(!await confirmAction('Delete all local data?','This deletes the stored plan and resets the current workspace. Export first if you need a backup. Other open tabs may still hold their own in-memory copy.'))return;await clearPlan();plan=newPlan();studentId=plan.students[0].id;scenarioId=student().scenarios[0].id;dirty=false;invalidate();renderForm();$('#save-state').textContent='Not saved locally';message('Stored plan deleted; workspace reset.');});
$('#example').onclick=()=>guard(async()=>{
  if(dirty&&!await confirmAction('Replace workspace with example?','Your stored plan will remain unchanged. Unsaved changes in this tab will be replaced.'))return;
  plan=newPlan();const st=plan.students[0],s=st.scenarios[0];st.alias='Fictional student';s.name='Illustrative in-state';s.path='Public in-state';s.costs={tuition:14000,housing:16000,books:1200,transport:2000,other:1500};s.balance=25000;s.monthly=0;s.costConfirmed=true;s.source='Fictional example, not a school quote or national benchmark';s.acknowledged=false;
  studentId=st.id;scenarioId=s.id;changed();renderForm();showProjection();message('Example loaded. Replace the sample figures with your own.');
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
renderForm();
try { const stored=await loadPlan();if(stored&&!dirty){plan=stored;studentId=plan.students[0].id;scenarioId=student().scenarios[0].id;$('#save-state').textContent='Loaded from this browser';message('');renderForm();} }
catch(e){message(`Could not load local data: ${e.message}. Import a backup or continue; exporting remains available.`,true);}
