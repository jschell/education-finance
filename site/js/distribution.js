// Dollar bands are summaries of the actual paths, never a prescribed bell curve.
const niceStep=value=>{const power=10**Math.floor(Math.log10(Math.max(.01,value)));return [1,2,5,10].find(n=>n*power>=value)*power;};
export function outcomeDistribution(values,{fundedCount=null,total=values.length,bands=7}={}) {
  if(!Number.isInteger(bands)||bands<1||bands>20)throw Error('Invalid number of outcome bands.');
  if(!Number.isInteger(total)||total<0||values.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid outcome samples.');
  if(fundedCount===null&&total!==values.length)throw Error('Outcome counts do not reconcile.');
  if(fundedCount!==null&&(!Number.isInteger(fundedCount)||fundedCount<0||fundedCount+values.length!==total))throw Error('Outcome counts do not reconcile.');
  const result=[];
  if(fundedCount!==null)result.push({kind:'funded',count:fundedCount,probability:total?fundedCount/total:0});
  if(!values.length)return {total,bins:result};
  const min=values.reduce((a,b)=>Math.min(a,b),Infinity),max=values.reduce((a,b)=>Math.max(a,b),0);
  if(min===max){result.push({kind:'point',lower:min,upper:max,count:values.length,probability:values.length/total});return {total,bins:result};}
  const start=fundedCount!==null?0:Math.floor(min/niceStep((max-min)/bands))*niceStep((max-min)/bands);
  const step=niceStep((max-start)/bands),count=Math.max(1,Math.ceil((max-start)/step));
  const bins=Array.from({length:count},(_,i)=>({kind:'range',lower:start+i*step,upper:start+(i+1)*step,count:0,probability:0,last:i===count-1}));
  for(const value of values)bins[Math.min(count-1,Math.max(0,Math.floor((value-start)/step)))].count++;
  for(const bin of bins)if(bin.count){bin.probability=bin.count/total;result.push(bin);}
  return {total,bins:result};
}
