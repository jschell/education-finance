import { validatePlan,clone } from './domain.js?v=0.3.0';
const DB='education-finance',KEY='workspace';
function database() {
  return new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(Error('Local storage unavailable. Export your plan to keep a backup.'));return;}
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('plans');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(Error('Storage is blocked by another tab. Close other planner tabs and retry.'));
  });
}
export async function savePlan(plan) {
  plan=validatePlan(plan);const db=await database();
  try {await new Promise((resolve,reject)=>{const tx=db.transaction('plans','readwrite');tx.objectStore('plans').put(clone(plan),KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Save was interrupted.'));});}
  finally{db.close();}
}
export async function loadPlan() {
  const db=await database();
  try {return await new Promise((resolve,reject)=>{const tx=db.transaction('plans','readonly'),req=tx.objectStore('plans').get(KEY);req.onsuccess=()=>{try{resolve(req.result?validatePlan(req.result):null);}catch(e){reject(e);}};req.onerror=()=>reject(req.error);});}
  finally{db.close();}
}
export async function clearPlan() {
  const db=await database();
  try {await new Promise((resolve,reject)=>{const tx=db.transaction('plans','readwrite');tx.objectStore('plans').delete(KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Delete was interrupted.'));});}
  finally{db.close();}
}

const RECOVERY_KEY='education-finance-recovery-v1';
// A synchronous recovery copy protects edits when mobile reload interrupts IndexedDB.
export function saveRecovery(plan,selection,storage=globalThis.localStorage) {
  if(!storage)throw Error('Recovery storage unavailable.');
  const record={format:'education-finance-recovery-1',plan:clone(validatePlan(plan)),selection:{...selection},pending:true};
  const token=JSON.stringify(record);storage.setItem(RECOVERY_KEY,token);return token;
}
export function loadRecovery(storage=globalThis.localStorage) {
  if(!storage)return null;const text=storage.getItem(RECOVERY_KEY);if(!text)return null;
  const record=JSON.parse(text);
  if(record.format!=='education-finance-recovery-1'||typeof record.pending!=='boolean')throw Error('Unsupported recovery copy.');
  record.plan=validatePlan(record.plan);
  const student=record.plan.students.find(s=>s.id===record.selection?.studentId)||record.plan.students[0];
  const scenario=student.scenarios.find(s=>s.id===record.selection?.scenarioId)||student.scenarios[0];
  record.selection={studentId:student.id,scenarioId:scenario.id};return record;
}
export function markRecoverySaved(token,storage=globalThis.localStorage) {
  if(storage?.getItem(RECOVERY_KEY)!==token)return;
  const record=JSON.parse(token);record.pending=false;storage.setItem(RECOVERY_KEY,JSON.stringify(record));
}
export function clearRecovery(storage=globalThis.localStorage) {storage?.removeItem(RECOVERY_KEY);}
