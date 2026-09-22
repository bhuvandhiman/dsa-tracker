chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_CURRENT_PROBLEM') return;
  // Read the URL on demand, including after LeetCode navigates without reloading.
  const problem = DsaAdapters.map((adapter) => adapter.getProblem(location.href)).find(Boolean) || null;
  sendResponse({ status: 'content-script-ready', problem });
});
