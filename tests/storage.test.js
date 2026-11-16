import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlan,newStudent} from '../site/js/domain.js';
import {saveRecovery,loadRecovery,markRecoverySaved,clearRecovery} from '../site/js/storage.js';
function memory(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
function fixture(){const plan=newPlan();plan.students.push(newStudent(plan.valuation));plan.students[1].alias='Synthetic second student';plan.students[1].scenarios[0].balance=54321;return {plan,selection:{studentId:plan.students[1].id,scenarioId:plan.students[1].scenarios[0].id}};}
test('synchronous recovery preserves multiple students, selected scenario and pending edits before async save',()=>{
 const store=memory(),{plan,selection}=fixture();saveRecovery(plan,selection,store);plan.students[1].scenarios[0].balance=0;
 const saved=loadRecovery(store);assert.equal(saved.plan.students.length,2);assert.equal(saved.plan.students[1].scenarios[0].balance,54321);assert.deepEqual(saved.selection,selection);assert.equal(saved.pending,true);
});
test('a completed old save cannot mark a newer recovery snapshot as saved',()=>{
 const store=memory(),{plan,selection}=fixture(),old=saveRecovery(plan,selection,store);plan.students[1].scenarios[0].balance=60000;const latest=saveRecovery(plan,selection,store);
 markRecoverySaved(old,store);assert.equal(loadRecovery(store).pending,true);assert.equal(loadRecovery(store).plan.students[1].scenarios[0].balance,60000);
 markRecoverySaved(latest,store);assert.equal(loadRecovery(store).pending,false);clearRecovery(store);assert.equal(loadRecovery(store),null);
});
test('recovery validates input, retains corrupted copies for diagnosis and handles stale selections',()=>{
 const store=memory(),{plan}=fixture();saveRecovery(plan,{studentId:'missing',scenarioId:'missing'},store);assert.equal(loadRecovery(store).selection.studentId,plan.students[0].id);
 const key='education-finance-recovery-v1';store.setItem(key,'bad json');assert.throws(()=>loadRecovery(store));assert.equal(store.getItem(key),'bad json');
 assert.throws(()=>saveRecovery({...plan,students:[]},{},store));assert.throws(()=>saveRecovery(plan,{},null));
});
