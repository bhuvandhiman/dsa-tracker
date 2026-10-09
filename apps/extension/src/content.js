const recorder = DsaCapture.start(document, window, chrome.runtime);
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if(message?.type==='GET_ACCOUNT_STATUS'){
    const worker=!_sender.tab&&(_sender.url===undefined||_sender.url===chrome.runtime.getURL('src/service-worker.js'));
    if(_sender.id!==chrome.runtime.id||!worker&&_sender.url!==chrome.runtime.getURL('popup.html')){sendResponse({error:'Invalid account-status sender'});return;}
    DsaLegacy.account().then(username=>sendResponse({username}),error=>sendResponse({error:error.message}));return true;
  }
  if (['SCAN_LEGACY_PROBLEMS','READ_LEGACY_TOPICS','READ_RECENT_SUBMISSIONS','READ_IMPORT_ACCOUNT'].includes(message?.type)) {
    if (_sender.id!==chrome.runtime.id||_sender.url?.split('#')[0]!==chrome.runtime.getURL('setup.html')) {sendResponse({error:'Invalid setup sender'});return;}
    const task=message.type==='READ_IMPORT_ACCOUNT'?DsaLegacy.account().then(username=>({username})):message.type==='SCAN_LEGACY_PROBLEMS'?DsaLegacy.scan():message.type==='READ_RECENT_SUBMISSIONS'?DsaLegacy.recent():DsaLegacy.topics(message.slugs,message.username);
    task.then(data=>sendResponse({data}),error=>sendResponse({error:error.message,code:error.code,retryable:error.retryable===true,retryAfter:error.retryAfter||0}));return true;
  }
  const adapter = DsaAdapters.find(item => item.getProblem(location.href));
  if (message?.type === 'GET_CURRENT_PROBLEM') sendResponse({ status: 'content-script-ready', problem: adapter?.getDetails(document,location.href) || null });
  if (message?.type === 'SHOW_RECORDER') { recorder.open().then(() => sendResponse({ opened: Boolean(adapter) }),error=>sendResponse({opened:false,error:error.message||'Refresh your LeetCode tab and retry.'})); return true; }
});
