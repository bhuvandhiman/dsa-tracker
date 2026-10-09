import { runLegacyImport } from './legacy-runner.js';
import { requestError } from './import-request.js';

function confirmed(result){
  if(!result||typeof result.completed!=='boolean')throw requestError('Recall did not confirm this import step. Resume to retry without losing your checkpoint.',{code:'RESPONSE',retryable:true});
  return result;
}

export async function importRecentDates({setup,storage,api,read,phase=()=>{},check=()=>{}}){
  let recent=(await storage.get('retentionSetup')).retentionSetup;
  if(recent?.complete)return recent;
  phase({phase:'dates'});check();
  const saved=confirmed(await api('/imports/recent/'+setup.installationId));
  if(saved.username&&setup.username&&saved.username!==setup.username)throw new Error('This import belongs to a different LeetCode account. Your checkpoint is kept.');
  if(saved.completed){
    recent={complete:true,username:saved.username||setup.username,...(recent?.snapshot?{count:recent.snapshot.submissions.length}:{})};
    await storage.set({retentionSetup:recent});return recent;
  }
  check();let snapshot=recent?.snapshot;
  // A failed recent import is atomic on the server. After checking completion,
  // rebuild a damaged local snapshot using verified provider data and the same ID.
  if(snapshot&&(snapshot.runId!==setup.installationId||snapshot.username!==setup.username||!Array.isArray(snapshot.submissions)||snapshot.submissions.length>20||snapshot.submissions.some(row=>!row||typeof row.url!=='string'||!/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/.test(row.url)||typeof row.submissionId!=='string'||!row.submissionId||!Number.isFinite(Date.parse(row.submittedAt)))))snapshot=null;
  if(snapshot){
    const account=await read('READ_IMPORT_ACCOUNT');
    if(account.username!==snapshot.username)throw new Error('Use the same LeetCode account as the legacy import.');
  }else{
    const found=await read('READ_RECENT_SUBMISSIONS');
    if(setup.username&&found.username!==setup.username)throw new Error('Use the same LeetCode account as the legacy import.');
    if(!Array.isArray(found.submissions)||found.submissions.length>20)throw new Error('LeetCode did not return a complete recent-date list. Retry recent dates.');
    const slugs=[...new Set(found.submissions.map(row=>row.slug))],metadata=[];
    for(let i=0;i<slugs.length;i+=10){check();metadata.push(...await read('READ_LEGACY_TOPICS',{slugs:slugs.slice(i,i+10),username:found.username}));}
    snapshot={runId:setup.installationId,username:found.username,submissions:found.submissions.map(row=>{
      const problem=metadata.find(item=>item.url===`https://leetcode.com/problems/${row.slug}/`);
      if(!problem)throw new Error('Problem metadata was incomplete. Retry recent dates.');
      return {...problem,submissionId:row.submissionId,submittedAt:row.submittedAt};
    })};
    await storage.set({retentionSetup:{snapshot}});
  }
  check();const result=confirmed(await api('/imports/recent',snapshot));
  if(!result.completed)throw new Error('Recent dates were not confirmed. Retry this step.');
  recent={complete:true,username:snapshot.username,count:snapshot.submissions.length,completedAt:new Date().toISOString()};
  await storage.set({retentionSetup:recent});return recent;
}

// One controller owns both phases. Call under the shared import lock.
export async function runImportSession({storage,api,read,phase=()=>{},check=()=>{},newRun=false,uuid=()=>crypto.randomUUID()}){
  let setup=(await storage.get('legacySetup')).legacySetup;
  if(!setup||setup.decision==='skipped'||newRun){
    if(newRun&&setup?.decision==='pending')throw new Error('Resume the current import before starting another.');
    setup={installationId:uuid(),decision:'pending',offset:0,...(setup?.username?{username:setup.username}:{})};
    await storage.set({legacySetup:setup,retentionSetup:{runId:setup.installationId}});
  }
  if(setup.decision==='pending'){
    phase({phase:'connecting'});check();
    const saved=confirmed(await api('/imports/legacy/'+setup.installationId));
    if(saved.username&&setup.username&&saved.username!==setup.username)throw new Error('This import belongs to a different LeetCode account. Your checkpoint is kept.');
    if(saved.completed){
      setup={installationId:setup.installationId,username:saved.username||setup.username,decision:'complete',...(Array.isArray(setup.snapshot)?{count:setup.snapshot.length}:{})};
      await storage.set({legacySetup:setup});
    }else{
      setup=await runLegacyImport({state:setup,scan:()=>read('SCAN_LEGACY_PROBLEMS'),verifyAccount:()=>read('READ_IMPORT_ACCOUNT'),topics:(slugs,username)=>read('READ_LEGACY_TOPICS',{slugs,username}),writeBatch:async body=>{check();return confirmed(await api('/imports/legacy',body));},saveState:async value=>{await storage.set({legacySetup:value});setup=value;},onPhase:value=>{check();phase(value);},onProgress:value=>phase({phase:'saving',saved:value.offset,total:value.snapshot.length})});
    }
  }
  if(setup.decision!=='complete')throw new Error('Import checkpoint is invalid. Your saved data has been kept.');
  const recent=await importRecentDates({setup,storage,api,read,phase,check});
  phase({phase:'complete'});return {setup,recent};
}
