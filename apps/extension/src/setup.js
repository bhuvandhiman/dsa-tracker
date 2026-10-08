import { api, scopedStorage, connection } from './account-page.js';
import { runLegacyImport } from './legacy-runner.js';
import { connectLeetCode } from './leetcode-connection.js';
const status=document.querySelector('#status'), start=document.querySelector('#import'), skip=document.querySelector('#skip');
let state, busy=false, failure='';
let progressWrites=Promise.resolve();
const report=(phase,error='')=>{progressWrites=progressWrites.then(()=>scopedStorage.set({importProgress:{phase,error,updatedAt:Date.now()}})).catch(()=>{});return progressWrites;};
const store=async value=>{await scopedStorage.set({legacySetup:value});state=value;};

function render() {
  const pending=state?.decision==='pending';
  start.hidden=false; skip.hidden=!pending;
  start.disabled=busy||!state; skip.disabled=busy||!pending;
  // Once an import has started, keep its checkpoint instead of silently abandoning it.
  skip.hidden=!pending||Boolean(state?.snapshot);
  start.textContent=state?.snapshot?'Resume import':pending||!state?'Import previously solved problems':'Reimport accepted problems';
  if(state?.decision==='complete')status.textContent=`Accepted problems imported${state.username?' for '+state.username:''}${state.count!==undefined?' · '+state.count+' problems':''}. Your patterns are available. The recent-date check below completes the import.`;
  if(state?.decision==='skipped')status.textContent='Setup complete. New practice will be recorded through the LeetCode panel.';
}
start.addEventListener('click',async()=>{
  if(busy)return;
  busy=true;failure='';render();void report('scanning');status.textContent='Connecting to your signed-in LeetCode account…';
  try {
    await navigator.locks.request('recall-legacy-import',{ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Import is already running in another setup tab.');
    state=(await scopedStorage.get('legacySetup')).legacySetup;
    if(state?.decision!=='pending') {
      await scopedStorage.remove('retentionSetup');
      await store({installationId:crypto.randomUUID(),username:state?.username,decision:'pending',offset:0});
    }
    const saved=await api('/imports/legacy/'+state.installationId);
    if(saved.completed){await store({installationId:state.installationId,username:saved.username,decision:'complete'});return;}
    const read=await connectLeetCode(chrome,()=>{status.textContent='Reconnecting through a fresh LeetCode tab… Your existing editor stays open.';});
    await runLegacyImport({state,scan:()=>read('SCAN_LEGACY_PROBLEMS'),topics:(slugs,username)=>read('READ_LEGACY_TOPICS',{slugs,username}),writeBatch:body=>api('/imports/legacy',body),saveState:store,onPhase:s=>{void report(s.phase);status.textContent=s.phase==='scanning'?'Scanning accepted problems…':`${s.username}: ${s.phase==='metadata'?'Fetching topics and difficulty':'Saving batch'} · ${s.offset} of ${s.total} saved…`;},onProgress:s=>{status.textContent=`${s.username}: imported ${s.offset} of ${s.snapshot.length} problems… Latest batch: ${s.lastBatch?.added??0} added, ${s.lastBatch?.alreadyPresent??0} already present, ${s.lastBatch?.excluded??0} Database problems preserved outside DSA.`;}});
    });
  }catch(error){failure=error.message;await report('error',failure);}
  finally{busy=false;render();if(failure)status.textContent=failure;if(state?.decision==='complete'){await report('dates');document.dispatchEvent(new Event('legacy-completed'));}}
});
skip.addEventListener('click',async()=>{
  if(busy)return;
  try{await navigator.locks.request('recall-legacy-import',{ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Import is already running in another setup tab.');
    state=(await scopedStorage.get('legacySetup')).legacySetup;
    if(state?.decision!=='pending'||state.snapshot)return;
    await store({installationId:state.installationId,decision:'skipped'});
  });}catch(error){state=null;render();status.textContent=error.message;}finally{render();document.dispatchEvent(new Event('legacy-skipped'));}
});
function startRequested(){if(location.hash.startsWith('#start-import-')&&state&&!busy){if(state.decision!=='complete')start.click();else document.dispatchEvent(new Event('legacy-completed'));}}
window.addEventListener('hashchange',startRequested);
try {const account=await connection();state=await chrome.runtime.sendMessage({type:'LEGACY_SETUP_STATE',workspaceScope:account.scope});if(state.error)throw new Error(state.error);status.textContent='Import accepted problems, or resume an interrupted import. Recent available dates are included automatically.';render();startRequested();}
catch(error){state=null;render();status.textContent=error.message;}
