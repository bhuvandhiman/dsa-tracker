import {connection} from './account-page.js';
import {importView} from './import-view.js';
const status=document.querySelector('#status'),start=document.querySelector('#import'),pause=document.querySelector('#pause'),progress=document.querySelector('#import-progress'),counts=document.querySelector('#import-count'),dashboard=document.querySelector('#view-patterns');
let scope=null,snapshot=null,busy=false,failure='',active=true,timer;
function render(){
  const view=importView(snapshot?.import);
  start.disabled=busy||view.running;start.textContent=scope?view.actionLabel:'Retry connection';
  pause.hidden=!view.running;pause.disabled=busy||view.pausing;pause.textContent=view.pausing?'Pausing…':'Pause import';
  dashboard.hidden=!view.complete;
  progress.hidden=!view.total;if(view.total){progress.max=view.total;progress.value=view.saved;}
  counts.textContent=Number.isInteger(view.total)?`${view.saved} / ${view.total} accepted problems saved`:'';
  status.textContent=failure||view.error||view.phaseText||view.summary;
  status.dataset.state=failure||view.error?'error':view.ready?'complete':'working';
  for(const item of document.querySelectorAll('[data-import-step]'))item.dataset.active=String((item.dataset.importStep==='prepare'&&['connecting','scanning'].includes(snapshot?.import.phase))||(item.dataset.importStep==='problems'&&['metadata','saving'].includes(snapshot?.import.phase))||(item.dataset.importStep==='dates'&&snapshot?.import.phase==='dates'));
}
async function request(action){
  if(!scope){const account=await connection();if(!account.connected)throw new Error('Open Recall to connect your account, then retry.');scope=account.scope;}
  const result=await chrome.runtime.sendMessage({type:'RECALL_IMPORT_ACTION',action,workspaceScope:scope});
  if(!result||result.error)throw new Error(result?.error||'Reload Recall and retry. Your progress is saved.');
  return result.data;
}
async function refresh(){snapshot=await request('STATUS');render();}
async function act(action){
  if(busy)return;busy=true;failure='';render();
  try{await request(action);await refresh();}catch(error){failure=error.message;}finally{busy=false;render();}
}
async function poll(){
  try{await refresh();failure='';}catch(error){failure=error.message;}finally{if(active){render();timer=setTimeout(poll,snapshot?.import.running?1000:5000);}}
}
start.addEventListener('click',()=>act('START_IMPORT'));
pause.addEventListener('click',()=>act('PAUSE_IMPORT'));
function requested(){if(location.hash.startsWith('#start-import-')&&scope&&!snapshot?.import.running&&!importView(snapshot?.import).ready)void act('START_IMPORT');}
window.addEventListener('hashchange',requested);
window.addEventListener('pagehide',()=>{active=false;clearTimeout(timer);});
try{await refresh();requested();}catch(error){failure=error.message;render();}
timer=setTimeout(poll,1000);
