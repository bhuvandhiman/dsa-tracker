import { randomUUID } from 'node:crypto';

// Bounded, best-effort operational collection. Never holds up a practice save.
// Hourly metrics are batched server-side; there is no browser polling.
export function createOwnerOperations(store,{onError=()=>{},maxPending=500}={}){
  const jobs=[],buckets=new Map(),observations=new Map();let running=null,scheduled=false,dropped=0,failures=0;
  function enqueue(work){
    if(jobs.length>=maxPending){dropped++;return false;}
    jobs.push(work);
    if(!scheduled){scheduled=true;setImmediate(()=>{scheduled=false;void drain();});}
    return true;
  }
  async function drain(){
    if(running)return running;
    running=(async()=>{while(jobs.length){try{await jobs.shift()();}catch{failures++;onError();}}})().finally(()=>{running=null;});
    return running;
  }
  const operations={
    dropped:()=>({dropped,failures,pending:jobs.length}),
    observe(user,{summary=false,active=false}={}){
      const existing=observations.get(user.id);
      if(existing){existing.user=user;existing.summary||=summary;existing.active||=active;return;}
      const observation={user,summary,active};observations.set(user.id,observation);
      const kept=enqueue(async()=>{observations.delete(user.id);await store.observe(observation.user);if(observation.active)await store.active(user.id);if(observation.summary)await store.summary(user.id);});
      if(!kept)observations.delete(user.id);
    },
    connected(user,version){enqueue(()=>store.connected(user,version));},
    outcome(user,path,status,result,requestId=randomUUID()){
      const operation=path==='/capture'?'capture':/^\/imports\/(legacy|recent)$/.test(path)?'import':null;
      if(operation&&(status>=400||operation==='capture'&&result?.created===true||operation==='import'&&result?.added>0)){
        enqueue(()=>store.diagnostic({eventId:requestId,userId:user.id,operation,outcome:status<400?'success':'failure',code:status<400?'CONFIRMED':status===429?'RATE_LIMIT':status>=500?'API_UNAVAILABLE':'REJECTED',source:'server'}));
      }
    },
    metric({route,method,status,total,auth,database}){
      if(!['GET','POST','PUT','DELETE','HEAD','OPTIONS'].includes(method))method='OTHER';
      const hour=new Date(Math.floor(Date.now()/3600000)*3600000).toISOString(),key=[hour,route,method,status].join('|');
      if(!buckets.has(key)&&buckets.size>=500){dropped++;return;}
      const row=buckets.get(key)||{hour,route,method,status,count:0,total:0,auth:0,database:0,slow:0,max:0};
      row.count++;row.total+=total;row.auth+=auth;row.database+=database;row.slow+=total>=10000?1:0;row.max=Math.max(row.max,total);buckets.set(key,row);
    },
    async flush({deadlineMs=1000}={}){
      let timer;
      try{await Promise.race([drain(),new Promise(resolve=>{timer=setTimeout(resolve,deadlineMs);})]);}finally{clearTimeout(timer);}
      const rows=[...buckets.values()];buckets.clear();
      if(rows.length)try{await store.saveMetrics(rows);}catch{failures++;onError();}
      await store.prune();
    },
  };
  return operations;
}
