import { recallAccount } from './account-worker.js';
import { openRecallWebsite } from './connection-flow.js';
import { recallRuntime } from './runtime-config.js';
// First-run state is per installation. Uninstalling clears Chrome extension storage.
const initializing=new Map();
async function setupState(expected) {
  const scope=await recallAccount.assertScope(expected),key=recallAccount.key(scope,'legacySetup');
  if(!initializing.has(key))initializing.set(key,(async()=>{
    const old=(await chrome.storage.local.get(key))[key];
    if(!old)await chrome.storage.local.set({[key]:{installationId:crypto.randomUUID(),decision:'pending',offset:0}});
    return {...(await chrome.storage.local.get(key))[key],workspaceScope:scope};
  })());
  try{return await initializing.get(key);}finally{initializing.delete(key);}
}
chrome.runtime.onInstalled.addListener(async details=>{
  if(details.reason==='install')await openRecallWebsite(chrome,recallRuntime.websiteOrigin);
});
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=='LEGACY_SETUP_STATE') return;
  if(sender.id!==chrome.runtime.id||![chrome.runtime.getURL('setup.html'),chrome.runtime.getURL('popup.html')].includes(sender.url?.split('#')[0])) {sendResponse({error:'Invalid setup sender'});return;}
  setupState(message.workspaceScope).then(sendResponse,error=>sendResponse({error:error.message}));return true;
});
