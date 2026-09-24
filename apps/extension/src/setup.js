import { runLegacyImport } from './legacy-runner.js';
const status=document.querySelector('#status'), start=document.querySelector('#import'), skip=document.querySelector('#skip');
let state, busy=false, failure='';
const store=async value=>{await chrome.storage.local.set({legacySetup:value});state=value;};
async function api(path,body) {
  let response;
  try {response=await fetch('http://127.0.0.1:3001/api'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});} catch {throw new Error('Start the local Recall API, then resume importing.');}
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save this batch.');return data;
}
function render() {
  const pending=state?.decision==='pending';
  start.hidden=false; skip.hidden=!pending;
  start.disabled=busy; skip.disabled=busy||!pending;
  // Once an import has started, keep its checkpoint instead of silently abandoning it.
  skip.hidden=!pending||Boolean(state?.snapshot);
  start.textContent=state?.snapshot?'Resume import':pending?'Import previously solved problems':'Reimport accepted problems';
  if(state?.decision==='complete')status.textContent='Import complete. Your previously solved problems are ready in Recall.';
  if(state?.decision==='skipped')status.textContent='Setup complete. New practice will be recorded through the LeetCode panel.';
}
async function sourceTab() {
  const tabs=await chrome.tabs.query({url:'https://leetcode.com/*'});
  if(!tabs.length)throw new Error('Open LeetCode in Chrome and sign in, then retry.');
  return tabs.find(tab=>tab.active)||tabs[0];
}
start.addEventListener('click',async()=>{
  if(busy)return;
  busy=true;failure='';render();status.textContent='Connecting to your signed-in LeetCode account…';
  try {
    await navigator.locks.request('recall-legacy-import',{ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Import is already running in another setup tab.');
    state=(await chrome.storage.local.get('legacySetup')).legacySetup;
    if(state?.decision!=='pending') {
      await chrome.storage.local.remove('retentionSetup');
      await store({installationId:crypto.randomUUID(),username:state.username,decision:'pending',offset:0});
    }
    const saved=await api('/imports/legacy/'+state.installationId);
    if(saved.completed){await store({installationId:state.installationId,username:saved.username,decision:'complete'});return;}
    const tab=await sourceTab();
    async function read(type,extra={}) {
      let result;try{result=await chrome.tabs.sendMessage(tab.id,{type,...extra});}catch{throw new Error('Refresh your LeetCode tab after reloading Recall, then resume.');}
      if(result?.error)throw new Error(result.error);
      if(!result?.data)throw new Error('LeetCode did not provide the expected data.');return result.data;
    }
    await runLegacyImport({state,scan:()=>read('SCAN_LEGACY_PROBLEMS'),topics:(slugs,username)=>read('READ_LEGACY_TOPICS',{slugs,username}),writeBatch:body=>api('/imports/legacy',body),saveState:store,onProgress:s=>{status.textContent=`${s.username}: imported ${s.offset} of ${s.snapshot.length} problems…`;}});
    });
  }catch(error){failure=error.message;}
  finally{busy=false;render();if(failure)status.textContent=failure;if(state?.decision==='complete')document.dispatchEvent(new Event('legacy-completed'));}
});
skip.addEventListener('click',async()=>{
  if(busy)return;
  try{await navigator.locks.request('recall-legacy-import',{ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Import is already running in another setup tab.');
    state=(await chrome.storage.local.get('legacySetup')).legacySetup;
    if(state?.decision!=='pending'||state.snapshot)return;
    await store({installationId:state.installationId,decision:'skipped'});
  });}catch(error){status.textContent=error.message;}finally{render();document.dispatchEvent(new Event('legacy-skipped'));}
});
try {state=await chrome.runtime.sendMessage({type:'LEGACY_SETUP_STATE'});if(state.error)throw new Error(state.error);status.textContent='Import accepted problems, or resume an interrupted import. Recent available dates are included automatically.';render();}
catch(error){status.textContent=error.message;}
