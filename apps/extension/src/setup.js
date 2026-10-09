import { api, scopedStorage, connection } from './account-page.js';
import { runImportSession } from './import-session.js';
import { connectLeetCode } from './leetcode-connection.js';
import { requestError, retryImportRequest } from './import-request.js';
const status=document.querySelector('#status'),start=document.querySelector('#import'),pause=document.querySelector('#pause'),progress=document.querySelector('#import-progress'),counts=document.querySelector('#import-count'),dashboard=document.querySelector('#view-patterns');
let state=null,recent=null,busy=false,pauseRequested=false,phase='connecting',failure='',ready=false,writes=Promise.resolve();
function report(value,error=''){
  phase=value;
  writes=writes.then(()=>scopedStorage.set({importProgress:{phase,error,updatedAt:Date.now()}})).catch(()=>{});
  return writes;
}
function check(){if(pauseRequested)throw requestError('Import paused. Resume whenever you are ready.',{code:'PAUSED'});}
async function loadState(){const stored=await scopedStorage.get(['legacySetup','retentionSetup']);state=stored.legacySetup;recent=stored.retentionSetup;}
function render(){
  const complete=state?.decision==='complete',done=complete&&recent?.complete;
  start.disabled=busy;pause.hidden=!busy;pause.disabled=pauseRequested;
  start.textContent=busy?'Importing…':!ready?'Retry connection':done?'Check for new solves':complete?'Retry recent dates':state?.snapshot?'Resume import':'Import my solves';
  dashboard.hidden=!complete;
  const total=state?.count??state?.snapshot?.length,saved=state?.count??state?.offset??0;
  progress.hidden=!Number.isInteger(total)||total===0;
  if(!progress.hidden){progress.max=total;progress.value=saved;}
  counts.textContent=Number.isInteger(total)?saved+' / '+total+' accepted problems saved':'';
  if(!busy&&!failure)status.textContent=done?'Import finished. Your patterns are ready.':complete?'Your solves are ready. Finish the recent-date check to include available practice dates.':state?.snapshot?'Your checkpoint is saved. Resume to continue from here.':'Bring your accepted LeetCode problems into Recall. Recent available dates are included automatically.';
  status.dataset.state=failure?'error':done?'complete':'working';
  for(const item of document.querySelectorAll('[data-import-step]'))item.dataset.active=String((item.dataset.importStep==='prepare'&&['connecting','scanning'].includes(phase))||(item.dataset.importStep==='problems'&&['metadata','saving'].includes(phase))||(item.dataset.importStep==='dates'&&phase==='dates'));
}
async function initialize(){
  const account=await retryImportRequest(()=>connection(),{check,onRetry:({attempt,error})=>{status.textContent=error.message+' Retrying connection ('+attempt+'/2)…';}});
  if(!account.connected)throw new Error('Open Recall to connect your account, then retry here.');
  const setup=await chrome.runtime.sendMessage({type:'LEGACY_SETUP_STATE',workspaceScope:account.scope});if(setup?.error)throw new Error(setup.error);
  if(!setup?.installationId)throw new Error('Extension setup did not respond. Reload this page and retry.');
  await loadState();ready=true;
}
async function begin(newRun=false){
  if(busy)return;busy=true;pauseRequested=false;failure='';render();status.textContent='Checking Recall connection…';
  let ownsLock=false,heartbeat;
  try{
    if(!ready)await initialize();
    await navigator.locks.request('recall-legacy-import',{ifAvailable:true},async lock=>{
      if(!lock)throw new Error('An import is running in another Recall tab. Return to that tab to follow its progress.');
      ownsLock=true;await report('connecting');
      heartbeat=setInterval(()=>{void report(phase);},10000);
      let reader;
      const read=async(type,extra)=>{check();reader??=await connectLeetCode(chrome,()=>{status.textContent='Reconnecting to LeetCode. Your problem editor stays open.';});return retryImportRequest(()=>reader(type,extra),{check,onRetry:({attempt,error})=>{status.textContent=error.message+' Retrying ('+attempt+'/2)…';}});};
      const request=(path,body)=>api(path,body,{check,onRetry:({attempt,error})=>{status.textContent=error.message+' Retrying ('+attempt+'/2)…';}});
      await runImportSession({storage:scopedStorage,api:request,read,newRun,check,phase:value=>{
        if(value.phase!=='complete')check();void report(value.phase);render();
        status.textContent=({connecting:'Checking the saved import…',scanning:'Verifying your LeetCode account and accepted problems…',metadata:'Reading problem topics and difficulty…',saving:'Saving problems to your Recall workspace…',dates:'Checking available recent practice dates…',complete:'Import finished. Your patterns are ready.'})[value.phase];
        if(value.total!==undefined){progress.hidden=!value.total;progress.max=value.total||1;progress.value=value.saved??value.offset??0;counts.textContent=(value.saved??value.offset??0)+' / '+value.total+' accepted problems saved';}
      }});
    });
  }catch(error){failure=error.message;status.textContent=failure;if(ownsLock)await report(error.code==='PAUSED'?'paused':'error',error.code==='PAUSED'?'':failure);}
  finally{
    clearInterval(heartbeat);busy=false;
    try{await loadState();}catch{/* Keep the last known checkpoint visible. */}
    render();if(failure)status.textContent=failure;
  }
}
start.addEventListener('click',()=>begin(state?.decision==='complete'&&recent?.complete===true));
pause.addEventListener('click',()=>{pauseRequested=true;pause.disabled=true;status.textContent='Pausing after the current step. Keep this tab open until the checkpoint is saved.';});
function requested(){if(location.hash.startsWith('#start-import-')&&ready&&!(state?.decision==='complete'&&recent?.complete))void begin();}
window.addEventListener('hashchange',requested);
try{await initialize();render();requested();}catch(error){failure=error.message;status.textContent=failure;render();}
