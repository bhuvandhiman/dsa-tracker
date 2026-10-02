import { createAccountClient } from './account-client.js';
export const recallAccount=createAccountClient(chrome);
const stateNames=['legacySetup','retentionSetup'];
export function trustedPage(sender){return sender.id===chrome.runtime.id&&['setup.html','popup.html'].some(page=>sender.url===chrome.runtime.getURL(page));}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(!['RECALL_ACCOUNT_STATUS','RECALL_SIGN_IN','RECALL_SIGN_OUT','RECALL_API','RECALL_STATE_GET','RECALL_STATE_SET','RECALL_STATE_REMOVE'].includes(message?.type))return;
  if(!trustedPage(sender)){respond({error:'Open Recall extension Settings to manage your account.'});return;}
  const run=async()=>{
    if(message.type==='RECALL_ACCOUNT_STATUS')return recallAccount.status();
    if(message.type==='RECALL_SIGN_IN')return recallAccount.signIn(message.email,message.password);
    if(message.type==='RECALL_SIGN_OUT'){await recallAccount.signOut();return {signedOut:true};}
    const scope=await recallAccount.assertScope(message.workspaceScope);
    if(message.type==='RECALL_API'){
      if(!/^\/(ready|imports\/(legacy|recent)(\/[a-f0-9-]{36})?)$/.test(message.path||'')||!['GET','POST'].includes(message.method))throw new Error('Invalid extension request.');
      const response=await recallAccount.request(message.path,{method:message.method,headers:{'Content-Type':'application/json'},...(message.body!==undefined?{body:JSON.stringify(message.body)}:{})},scope),data=await response.json();
      if(!response.ok)throw new Error(data.error||'Recall could not complete the request.');return {data};
    }
    const names=message.type==='RECALL_STATE_SET'?Object.keys(message.values||{}):message.names;
    if(!Array.isArray(names)||names.some(name=>!stateNames.includes(name)))throw new Error('Invalid extension state.');
    if(message.type==='RECALL_STATE_GET'){
      const result=await chrome.storage.local.get(names.map(name=>recallAccount.key(scope,name)));return {data:Object.fromEntries(names.map(name=>[name,result[recallAccount.key(scope,name)]]))};
    }
    if(message.type==='RECALL_STATE_SET')await chrome.storage.local.set(Object.fromEntries(names.map(name=>[recallAccount.key(scope,name),message.values[name]])));
    else await chrome.storage.local.remove(names.map(name=>recallAccount.key(scope,name)));
    return {kept:true};
  };
  run().then(respond,error=>respond({error:error.message||'Recall account connection failed.'}));return true;
});
