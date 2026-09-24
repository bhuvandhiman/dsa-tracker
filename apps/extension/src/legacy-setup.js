// First-run state is per installation. Uninstalling clears Chrome extension storage.
let initialized;
async function setupState() {
  initialized ||= (async()=>{
    const old=(await chrome.storage.local.get('legacySetup')).legacySetup;
    if(!old) await chrome.storage.local.set({legacySetup:{installationId:crypto.randomUUID(),decision:'pending',offset:0}});
  })();
  await initialized;
  return (await chrome.storage.local.get('legacySetup')).legacySetup;
}
chrome.runtime.onInstalled.addListener(async details=>{
  const state=await setupState();
  if(details.reason==='install'&&state.decision==='pending') await chrome.tabs.create({url:chrome.runtime.getURL('setup.html')});
});
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=='LEGACY_SETUP_STATE') return;
  if(sender.id!==chrome.runtime.id||![chrome.runtime.getURL('setup.html'),chrome.runtime.getURL('popup.html')].includes(sender.url)) {sendResponse({error:'Invalid setup sender'});return;}
  setupState().then(sendResponse,()=>sendResponse({error:'Could not read setup state.'}));return true;
});
