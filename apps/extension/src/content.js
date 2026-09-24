const recorder = DsaCapture.start(document, window, chrome.runtime);
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (['SCAN_LEGACY_PROBLEMS','READ_LEGACY_TOPICS','READ_RECENT_SUBMISSIONS'].includes(message?.type)) {
    if (_sender.id!==chrome.runtime.id||_sender.url!==chrome.runtime.getURL('setup.html')) {sendResponse({error:'Invalid setup sender'});return;}
    const task=message.type==='SCAN_LEGACY_PROBLEMS'?DsaLegacy.scan():message.type==='READ_RECENT_SUBMISSIONS'?DsaLegacy.recent():DsaLegacy.topics(message.slugs,message.username);
    task.then(data=>sendResponse({data}),error=>sendResponse({error:error.message}));return true;
  }
  const adapter = DsaAdapters.find(item => item.getProblem(location.href));
  if (message?.type === 'GET_CURRENT_PROBLEM') sendResponse({ status: 'content-script-ready', problem: adapter?.getDetails(document,location.href) || null });
  if (message?.type === 'SHOW_RECORDER') { recorder.open().then(() => sendResponse({ opened: Boolean(adapter) })); return true; }
});
