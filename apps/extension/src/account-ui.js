import { connection } from './account-page.js';
const status=document.querySelector('#recall-account-status'),connect=document.querySelector('#recall-connect');
const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Retry connection';retry.hidden=true;status.after(retry);retry.addEventListener('click',()=>location.reload());
let connected=false,scope=null,loaded=false;
async function render(){
  try{const state=await connection();connected=state.connected;scope=state.scope;loaded=true;connect.hidden=state.mode==='local';connect.textContent=connected?'Open Recall':'Connect through Recall';status.textContent=state.mode==='local'?'Using your existing local workspace.':connected?`Connected to Recall as ${state.email}`:'Sign in on the Recall website. Your extension connects automatically.';}
  catch(error){status.textContent=error.message;connect.hidden=true;retry.hidden=false;}
}
connect.addEventListener('click',async()=>{
  connect.disabled=true;
  try{const result=await chrome.runtime.sendMessage({type:'RECALL_OPEN_WEBSITE'});if(result.error)throw new Error(result.error);if(!connected)status.textContent='Finish signing in on the Recall website, then return here.';}
  catch(error){status.textContent=error.message;}finally{connect.disabled=false;}
});
chrome.storage.onChanged.addListener((changes,area)=>{
  const change=changes['recall-account-session'];if(area!=='session'||!change||!loaded)return;
  // Routine token renewal must not interrupt imports or in-progress settings.
  if((change.newValue?.user?.id||null)!==scope||!connected)location.reload();
});
void render();
