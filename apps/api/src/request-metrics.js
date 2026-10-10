import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { metricRoute } from './owner-policy.js';

const context=new AsyncLocalStorage();
export async function timedStage(stage,work){
  const current=context.getStore();if(!current)return work();
  const active=current.active[stage]||{depth:0,start:0};current.active[stage]=active;
  if(active.depth++===0)active.start=performance.now();
  // Measure elapsed stage time, rather than double-counting overlapping queries.
  try{return await work();}finally{if(--active.depth===0)current[stage]=(current[stage]||0)+performance.now()-active.start;}
}
export function measurePool(pool){
  return {
    get totalCount(){return pool.totalCount;},get idleCount(){return pool.idleCount;},get waitingCount(){return pool.waitingCount;},
    query:(...args)=>timedStage('database',()=>pool.query(...args)),
    async connect(){const client=await timedStage('database',()=>pool.connect());return {query:(...args)=>timedStage('database',()=>client.query(...args)),release:(...args)=>client.release(...args)};},
  };
}
export function metricsMiddleware(operations){
  return (request,response,next)=>{
    const route=metricRoute(request.path);if(!route)return next();
    const started=performance.now(),measurement={auth:0,database:0,active:{}};
    const requestId=randomUUID();response.set('X-Recall-Request-ID',requestId);
    let done=false;
    const finish=()=>{
      if(done)return;done=true;
      const total=performance.now()-started;
      for(const stage of ['auth','database'])if(measurement.active[stage]?.depth)measurement[stage]+=performance.now()-measurement.active[stage].start;
      operations.metric({route,method:request.method,status:response.writableFinished?response.statusCode:499,total,auth:measurement.auth,database:measurement.database,requestId});
    };
    response.once('finish',finish);response.once('close',finish);
    context.run(measurement,next);
  };
}
