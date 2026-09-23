chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_CURRENT_PROBLEM') return;
  const adapter = DsaAdapters.find((item) => item.getProblem(location.href));
  sendResponse({ status: 'content-script-ready', problem: adapter?.getDetails(document, location.href) || null });
});
DsaCapture.start(document, window, chrome.runtime);
