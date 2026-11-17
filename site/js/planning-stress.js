import {repriceRow}from './engine.js?v=0.13.0';
export const PLANNING_STRESSES=[['housing','Housing / food +20%'],['aid','Remaining grants removed'],['market','One 25% portfolio loss before entry']];
export function stressCompiled(c,type){
 if(type==='market')return {...c,stress:true};
 if(!['housing','aid'].includes(type))throw Error('Unknown planning stress.');
 return {...c,rows:c.rows.map(r=>repriceRow({...r,valuationCosts:r.costs,grantOffer:type==='aid'?0:r.grantOffer},1,type==='housing'?1.2:1,r.discount,1))};
}
