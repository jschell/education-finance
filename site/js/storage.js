import { validatePlan,clone } from './domain.js?v=0.2.1';
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
  validatePlan(plan);const db=await database();
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
