const settings=document.querySelector('#settings');
settings.addEventListener('click',async()=>{
  settings.disabled=true;
  try{
    const url=chrome.runtime.getURL('setup.html'),tabs=await chrome.tabs.query({});
    const existing=tabs.find(tab=>tab.url?.split('#')[0]===url);
    if(existing)await chrome.tabs.update(existing.id,{active:true});else await chrome.tabs.create({url});
    window.close();
  }catch{settings.disabled=false;document.querySelector('#launch-status').textContent='Could not open import controls. Reload Recall and try again.';}
});
