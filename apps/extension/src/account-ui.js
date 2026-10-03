import { connection } from './account-page.js';
const status=document.querySelector('#recall-account-status'),form=document.querySelector('#recall-signin'),signOut=document.querySelector('#recall-signout');
const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Retry connection';retry.hidden=true;status.after(retry);retry.addEventListener('click',()=>location.reload());
async function render(){
  try{const state=await connection();form.hidden=state.mode==='local'||state.connected;signOut.hidden=state.mode==='local'||!state.connected;status.textContent=state.mode==='local'?'Using your existing local workspace.':state.connected?`Connected to Recall as ${state.email}`:'Sign in with the same email and password you use on the Recall website.';}
  catch(error){status.textContent=error.message;form.hidden=true;signOut.hidden=true;retry.hidden=false;}
}
form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button'),password=document.querySelector('#recall-password');button.disabled=true;status.textContent='Signing into Recall…';
  try{const result=await chrome.runtime.sendMessage({type:'RECALL_SIGN_IN',email:document.querySelector('#recall-email').value.trim(),password:password.value});if(result.error)throw new Error(result.error);password.value='';location.reload();}
  catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
signOut.addEventListener('click',async()=>{signOut.disabled=true;try{const result=await chrome.runtime.sendMessage({type:'RECALL_SIGN_OUT'});if(result.error)throw new Error(result.error);location.reload();}catch(error){status.textContent=error.message;signOut.disabled=false;}});
void render();
