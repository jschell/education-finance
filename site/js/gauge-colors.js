const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
export function gaugeColor(probability,target){
  const p=Math.max(0,Math.min(1,probability));
  if(!(target>0&&target<1))throw Error('Gauge target must be between zero and one.');
  // Yellow immediately below the target; green is reserved for meeting it.
  if(p>=target)return mix('#378562','#174f3b',(p-target)/(1-target));
  const stops=[[0,'#8c3029'],[.35,'#bf4937'],[.7,'#df922e'],[.9,'#edc84b'],[1,'#eedb70']],relative=p/target;
  const i=stops.findIndex(([x])=>x>relative),[lo,a]=stops[i-1],[hi,b]=stops[i];
  return mix(a,b,(relative-lo)/(hi-lo));
}
export function gaugeSegments(target){
  const edges=[...new Set([...Array.from({length:121},(_,i)=>i/120),target])].sort((a,b)=>a-b);
  return edges.slice(0,-1).map((start,i)=>({start,end:edges[i+1],color:gaugeColor((start+edges[i+1])/2,target)}));
}
