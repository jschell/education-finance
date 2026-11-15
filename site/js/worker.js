import { validatePlan } from './domain.js';
import { compile,runPath } from './engine.js';
import { simulate,compareScenarios } from './simulation.js';
self.onmessage=({data})=>{
  const {runId,plan,studentId,scenarioId,settings,action}=data;
  try {
    validatePlan(plan);const st=plan.students.find(s=>s.id===studentId);if(!st)throw Error('Student not found.');
    const progress=p=>self.postMessage({runId,type:'progress',...p});
    let result;
    if(action==='compare')result=compareScenarios(plan,st,settings,progress);
    else {
      const s=st.scenarios.find(x=>x.id===scenarioId);if(!s)throw Error('Scenario not found.');
      const c=compile(plan,st,s);result={simulation:simulate(c,settings,progress),snapshot:structuredClone(s),deterministic:runPath(c)};
    }
    self.postMessage({runId,type:'result',result});
  } catch(error) { self.postMessage({runId,type:'error',message:error.message}); }
};
