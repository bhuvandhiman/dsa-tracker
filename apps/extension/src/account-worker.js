import { createAccountClient } from './account-client.js';
import { recallRuntime } from './runtime-config.js';
import { connectionAction, openRecallWebsite } from './connection-flow.js';
import { readRecallResponse } from './import-request.js';
import { createImportController } from './import-controller.js';
import { notifyPracticeChanged } from './practice-notifications.js';
export const recallAccount=createAccountClient(chrome);
const importer=createImportController({account:recallAccount,chromeApi:chrome,onChanged:scope=>notifyPracticeChanged(chrome,scope)});
const stateNames=['legacySetup','retentionSetup','importProgress'];
export function trustedPage(sender){return sender.id===chrome.runtime.id&&['setup.html','popup.html'].some(page=>sender.url?.split('#')[0]===chrome.runtime.getURL(page));}
export function trustedWebsite(sender){
  if(sender.id!==chrome.runtime.id||sender.frameId!==0||!Number.isInteger(sender.tab?.id))return false;
  try{return new URL(sender.url).origin===recallRuntime.websiteOrigin;}catch{return false;}
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message?.type==='RECALL_WEBSITE_ACTION'){
    if(!trustedWebsite(sender)){respond({error:'Connect from the configured Recall website.'});return;}
    if(!['STATUS','OPEN_IMPORT','START_IMPORT','PAUSE_IMPORT','CHECK_LEETCODE'].includes(message.action)||typeof message.owner!=='string'){respond({error:'Sign into Recall to connect.'});return;}
    connectionAction({action:message.action,owner:message.owner,account:recallAccount,chromeApi:chrome,importer}).then(data=>respond({data}),error=>respond({error:error.message}));return true;
  }
  if(message?.type==='RECALL_IMPORT_ACTION'){
    if(!trustedPage(sender)||!['STATUS','START_IMPORT','PAUSE_IMPORT'].includes(message.action)){respond({error:'Open Recall to manage imports.'});return;}
    connectionAction({action:message.action,owner:message.workspaceScope,account:recallAccount,chromeApi:chrome,importer}).then(data=>respond({data}),error=>respond({error:error.message}));return true;
  }
  if(message?.type==='RECALL_WEBSITE_SESSION'){
    if(!trustedWebsite(sender)){respond({error:'Connect from the configured Recall website.'});return;}
    const operation=message.accessToken===null?recallAccount.disconnectWebsite(message.owner):recallAccount.connectWebsite(message.accessToken,message.owner);
    operation.then(respond,error=>respond({error:error.message||'Website connection failed.'}));return true;
  }
  if(!['RECALL_ACCOUNT_STATUS','RECALL_OPEN_WEBSITE','RECALL_SIGN_IN','RECALL_SIGN_OUT','RECALL_API','RECALL_STATE_GET','RECALL_STATE_SET','RECALL_STATE_REMOVE'].includes(message?.type))return;
  if(!trustedPage(sender)){respond({error:'Open Recall extension Settings to manage your account.'});return;}
  const run=async()=>{
    if(message.type==='RECALL_ACCOUNT_STATUS')return recallAccount.status();
    if(message.type==='RECALL_OPEN_WEBSITE')return openRecallWebsite(chrome,recallRuntime.websiteOrigin);
    if(message.type==='RECALL_SIGN_IN')return recallAccount.signIn(message.email,message.password);
    if(message.type==='RECALL_SIGN_OUT'){await recallAccount.signOut();return {signedOut:true};}
    const localMessage=['RECALL_STATE_GET','RECALL_STATE_SET','RECALL_STATE_REMOVE'].includes(message.type);
    const scope=await (localMessage?recallAccount.localScope(message.workspaceScope):recallAccount.assertScope(message.workspaceScope));
    if(message.type==='RECALL_API'){
      if(!/^\/(ready|imports\/(legacy|recent)(\/[a-f0-9-]{36})?)$/.test(message.path||'')||!['GET','POST'].includes(message.method))throw new Error('Invalid extension request.');
      const response=await recallAccount.request(message.path,{method:message.method,headers:{'Content-Type':'application/json'},...(message.body!==undefined?{body:JSON.stringify(message.body)}:{})},scope),data=await readRecallResponse(response);
      await recallAccount.localScope(scope);return {data};
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
  run().then(respond,error=>respond({error:error.message||'Recall account connection failed.',code:error.code,status:error.status,retryable:error.retryable===true,retryAfter:error.retryAfter||0}));return true;
});
