chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PING') sendResponse({ status: 'worker-ready', version: chrome.runtime.getManifest().version });
});
