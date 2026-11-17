// Target-specific one-sided tolerance rank. Offline reference: scipy.stats.binom.
import { samplingInterval } from './probability.js?v=0.13.0';
const Z=1.6448536269514722;
const cache=new Map();
// Mode-centered recurrence avoids underflow at n=50,000 and extreme targets.
export function binomialCDF(k,n,p) {
 if(!Number.isInteger(n)||n<1||!Number.isFinite(p)||p<0||p>1)throw Error('Invalid binomial parameters.');
 if(k<0)return 0;if(k>=n)return 1;
 if(p===0)return 1;if(p===1)return 0;
 const mode=Math.floor((n+1)*p);
 let total=1,below=mode<=k?1:0,term=1;
 for(let j=mode;j>0;j--){term*=j/(n-j+1)*(1-p)/p;total+=term;if(j-1<=k)below+=term;if(term<1e-17*total&&j-1<k)break;}
 term=1;
 for(let j=mode;j<n;j++){term*=(n-j)/(j+1)*p/(1-p);total+=term;if(j+1<=k)below+=term;if(term<1e-17*total&&j+1>k)break;}
 return Math.max(0,Math.min(1,below/total));
}
export function targetReserve(target,fitTrials=20000,verifyTrials=5000) {
 if(!(target>=.5&&target<=.99)||!Number.isInteger(fitTrials)||fitTrials<1||!Number.isInteger(verifyTrials)||verifyTrials<1)throw Error('Invalid savings reserve settings.');
 const key=[target,fitTrials,verifyTrials].join(':');if(cache.has(key))return cache.get(key);
 let low=0,high=verifyTrials+1;
 while(low<high){const mid=Math.floor((low+high)/2);if(mid<=verifyTrials&&samplingInterval(mid/verifyTrials,verifyTrials,Z).low<target)low=mid+1;else high=mid;}
 const criticalPasses=low;
 if(criticalPasses>verifyTrials)return {available:false,rank:null,fitProbability:1,criticalPasses};
 let a=target,z=1;
 for(let i=0;i<55;i++){const p=(a+z)/2;if(binomialCDF(criticalPasses-1,verifyTrials,p)>.025)a=p;else z=p;}
 const populationProbability=z;
 // P(F(X_(rank)) >= q) >= .975; ties and rounding upwards are conservative.
 low=0;high=fitTrials;
 while(low<high){const mid=Math.floor((low+high)/2);if(binomialCDF(mid,fitTrials,populationProbability)<.975)low=mid+1;else high=mid;}
 const rank=low+1,available=rank<=fitTrials;
 const result={available,rank:available?rank:null,fitProbability:available?rank/fitTrials:1,populationProbability,criticalPasses,
  fitFailure:.025,verificationPowerFailure:.025,rule:'target-binomial-tolerance-v1'};
 cache.set(key,result);return result;
}
