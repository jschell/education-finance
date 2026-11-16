const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
export function gaugeColor(probability,target){
  const p=Math.max(0,Math.min(1,probability));
  if(!(target>0&&target<1))throw Error('Gauge target must be between zero and one.');
  // Absolute milestones: yellow by 45%, light green at 60%, dark green at goal.
  // The UI offers 80/90/95% targets; smaller programmatic targets compress stops.
  const yellow=Math.min(.45,target*.75),lightGreen=Math.min(.6,target*.9);
  const stops=[[0,'#8c3029'],[yellow*.55,'#d77a32'],[yellow,'#edc84b'],[lightGreen,'#a8cf8c'],[target,'#195e50'],[1,'#12493e']];
  if(p===1)return stops.at(-1)[1];
  const i=stops.findIndex(([x])=>x>p),[lo,a]=stops[i-1],[hi,b]=stops[i];
  return mix(a,b,(p-lo)/(hi-lo));
}
