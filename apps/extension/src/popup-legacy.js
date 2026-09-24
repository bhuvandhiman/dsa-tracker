const setupButton=document.querySelector('#legacy-setup');
chrome.runtime.sendMessage({type:'LEGACY_SETUP_STATE'}).then(state=>{setupButton.hidden=state?.decision!=='pending';}).catch(()=>{});
setupButton.addEventListener('click',async()=>{
  setupButton.disabled=true;
  try {await chrome.tabs.create({url:chrome.runtime.getURL('setup.html')});window.close();}
  catch {setupButton.disabled=false;}
});

document.querySelector('#settings').addEventListener('click',async()=>{await chrome.tabs.create({url:chrome.runtime.getURL('setup.html')});window.close();});
