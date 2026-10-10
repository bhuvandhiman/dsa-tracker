import {runImportSession} from './import-session.js';
import {connectLeetCode} from './leetcode-connection.js';
import {requestError,readRecallResponse,retryImportRequest} from './import-request.js';

// Website and extension controls share one job and the same durable checkpoints.
export function createImportController({account,chromeApi,locks=navigator.locks,runSession=runImportSession,connect=connectLeetCode,retry=retryImportRequest,now=Date.now,interval=setInterval,clear=clearInterval,onChanged=()=>{}}){
  const jobs=new Map();
  function storage(scope){return {
    async get(names){await account.localScope(scope);const list=Array.isArray(names)?names:[names],values=await chromeApi.storage.local.get(list.map(name=>account.key(scope,name)));await account.localScope(scope);return Object.fromEntries(list.map(name=>[name,values[account.key(scope,name)]]));},
    async set(values){await account.assertScope(scope);await chromeApi.storage.local.set(Object.fromEntries(Object.entries(values).map(([name,value])=>[account.key(scope,name),value])));},
  };}
  async function start(owner){
    const scope=await account.assertScope(owner);
    if(jobs.has(scope))return {started:true,alreadyRunning:true};
    let accept,reject;
    const acknowledged=new Promise((resolve,fail)=>{accept=resolve;reject=fail;});
    const job={paused:false,phase:'connecting',writes:Promise.resolve(),ownsLock:false,changed:false};
    jobs.set(scope,job);
    const store=storage(scope),check=()=>{if(job.paused)throw requestError('Import paused. Your progress is saved.',{code:'PAUSED'});};
    const report=(phase,error='',message='')=>{
      job.phase=phase;
      const value={phase,error,message,updatedAt:now()};
      job.writes=job.writes.catch(()=>{}).then(()=>store.set({importProgress:value}));
      return job.writes;
    };
    const onRetry=({attempt,error})=>{void report(job.phase,'',`${error.message} Retrying (${attempt}/2)…`).catch(()=>{});};
    job.completion=(async()=>{
      let heartbeat;
      try{
        await locks.request('recall-legacy-import',{ifAvailable:true},async lock=>{
          if(!lock)throw new Error('An import is already running. Its progress will appear here.');
          job.ownsLock=true;
          await report('connecting');
          job.acknowledged=true;accept({started:true});
          // Storage activity keeps the worker available for this user-started job.
          // Every acknowledged batch remains recoverable after a worker restart.
          heartbeat=interval(()=>{void report(job.phase).catch(()=>{});},10000);
          const saved=await store.get(['legacySetup','retentionSetup']);
          let reader;
          const read=async(type,extra)=>{check();await account.assertScope(scope);reader??=await connect(chromeApi);return retry(()=>reader(type,extra),{check,onRetry});};
          const api=(path,body)=>retry(async()=>{check();const response=await account.request(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})},scope);const result=await readRecallResponse(response);if(body?.problems?.length||body?.submissions?.length)job.changed=true;await account.assertScope(scope);return result;},{check,onRetry});
          await runSession({storage:store,api,read,check,newRun:saved.legacySetup?.decision==='complete'&&saved.retentionSetup?.complete===true,phase:({phase})=>{if(phase!=='complete')check();void report(phase).catch(()=>{});}});
          await report('complete');
        });
      }catch(error){
        if(!job.acknowledged)reject(error);
        if(job.ownsLock)await report(error.code==='PAUSED'?'paused':'error',error.code==='PAUSED'?'':error.message).catch(()=>{});
      }finally{
        clear(heartbeat);
        await job.writes.catch(()=>{});
        if(jobs.get(scope)===job)jobs.delete(scope);
        if(job.changed)await Promise.resolve().then(()=>onChanged(scope)).catch(()=>{});
      }
    })();
    return acknowledged;
  }
  return {start,async pause(owner){const scope=await account.assertScope(owner),job=jobs.get(scope);if(job)job.paused=true;return {pausing:Boolean(job)};},running:scope=>jobs.has(scope),pausing:scope=>jobs.get(scope)?.paused===true,wait:scope=>jobs.get(scope)?.completion||Promise.resolve()};
}
