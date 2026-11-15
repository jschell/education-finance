import { validatePlan } from './domain.js?v=0.2.0';
import { assessHistorical,verifyHistory } from './history.js?v=0.2.0';
let dataPromise;
function data(){return dataPromise??=fetch(new URL('../data/history.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Historical data could not be loaded. Reload and retry.');return r.json();}).then(verifyHistory);}
self.onmessage=async({data:input})=>{
  const {runId,studentId,scenarioId,settings,action}=input;
  try {
    const plan=validatePlan(input.plan),dataset=await data();
    const st=plan.students.find(s=>s.id===studentId);if(!st)throw Error('Student not found.');
    const progress=p=>self.postMessage({runId,type:'progress',...p});
    let result;
    if(action==='compare'){
      result=st.scenarios.map((scenario,i)=>{
        progress({stage:`Scenario ${i+1} of ${st.scenarios.length}`,done:i,total:st.scenarios.length});
        return {id:scenario.id,name:scenario.name,...assessHistorical(plan,st,scenario,dataset,settings,p=>progress({...p,scenario:scenario.name}))};
      });
    }else{
      const scenario=st.scenarios.find(s=>s.id===scenarioId);if(!scenario)throw Error('Scenario not found.');
      result=assessHistorical(plan,st,scenario,dataset,settings,progress);
    }
    self.postMessage({runId,type:'result',result});
  }catch(error){self.postMessage({runId,type:'error',message:error.message});}
};
