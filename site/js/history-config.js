export const DATASET_ID='us-joint-monthly-1978-2024-v1';
export const HISTORY_PRNG='mulberry32-calendar-block-1';
export const HISTORY_DEFAULTS={profile:'balanced',period:'full',blockYears:3,costMode:'historical',reference:'historical',fee:0};
export const PROFILES={
  balanced:{name:'Balanced to conservative',stages:[[.6,.3,.1],[.3,.4,.3],[.1,.3,.6]]},
  growth:{name:'Stock-heavy to conservative',stages:[[.8,.15,.05],[.5,.35,.15],[.2,.3,.5]]},
  cautious:{name:'Conservative',stages:[[.3,.4,.3],[.15,.35,.5],[0,.2,.8]]},
  cash:{name:'Cash only',stages:[[0,0,1],[0,0,1],[0,0,1]]}
};
export const periodLabel=period=>period==='recent'?'2000–2024':'1978–2024';
