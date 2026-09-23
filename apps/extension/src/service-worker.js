import './adapters/leetcode.js';
import './recorder.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING') {
    sendResponse({ status: 'worker-ready', version: chrome.runtime.getManifest().version });
    return;
  }
  if (message?.type !== 'OPEN_RECORDER') return;
  try {
    const source = DsaAdapters.map((adapter) => adapter.getProblem(sender.url)).find(Boolean);
    const problem = DsaAdapters.map((adapter) => adapter.getProblem(message.problem?.url)).find(Boolean);
    if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || !Number.isInteger(sender.tab?.id) || !source || source.url !== problem?.url) throw new Error('Invalid sender');
    const url = DsaRecorder.buildUrl(message.problem, { title: message.problem.title, attemptedAt: message.attemptedAt });
    chrome.tabs.create({ url }).then(() => sendResponse({ opened: true }), () => sendResponse({ opened: false }));
    return true;
  } catch { sendResponse({ opened: false }); }
});
