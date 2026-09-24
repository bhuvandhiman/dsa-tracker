import './legacy-setup.js';
import './adapters/leetcode.js';

const pendingKey = url => `recall-pending:${url}`;
const active = new Map();
function identity(message, sender) {
  const source = DsaAdapters[0].getProblem(sender.url);
  const problem = DsaAdapters[0].getProblem(message.problem?.url);
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || !Number.isInteger(sender.tab?.id) || !source || source.url !== problem?.url) throw new Error('Open a LeetCode problem and refresh its page.');
  return problem;
}
async function save(message, problem) {
  const payload = message.payload;
  if (!payload || payload.url !== problem.url || typeof payload.requestId !== 'string') throw new Error('Invalid recording. Refresh the LeetCode page.');
  const key = pendingKey(problem.url);
  const stored = (await chrome.storage.local.get(key))[key];
  if (stored && JSON.stringify(stored) !== JSON.stringify(payload)) throw new Error('An unfinished recording exists. Refresh the page to retry that recording first.');
  // Persist before writing; API failures and worker restarts retain the same request ID.
  await chrome.storage.local.set({ [key]: payload });
  let response;
  try {
    response = await fetch('http://127.0.0.1:3001/api/capture', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), credentials: 'omit', redirect: 'error',
    });
  } catch { throw new Error('Could not reach Recall. Start the local API and use Retry save. Your recording is kept.'); }
  const data = await response.json();
  if (!response.ok) {
    if ([400,404,413,415].includes(response.status)) {
      await chrome.storage.local.remove(key);
      return { saved: false, editable: true, error: data.error || 'Please check the recording.' };
    }
    throw new Error(data.error || 'Could not confirm the save. Retry with the same choices.');
  }
  if (data.attempt?.id !== payload.requestId) throw new Error('Save was not confirmed. Retry with the same choices.');
  await chrome.storage.local.remove(key);
  return { saved: true };
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING') { sendResponse({ status: 'worker-ready', version: chrome.runtime.getManifest().version }); return; }
  if (!['SAVE_CAPTURE','GET_PENDING_CAPTURE','GET_PRACTICE_CONTEXT'].includes(message?.type)) return;
  let problem;
  try { problem = identity(message,sender); } catch (error) { sendResponse({ saved: false, error: error.message }); return; }
  const run = async () => {
    if (message.type === 'GET_PRACTICE_CONTEXT') {
      const response=await fetch('http://127.0.0.1:3001/api/practice-context',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:problem.url,title:message.problem.title,topics:message.topics}),signal:AbortSignal.timeout(10000)});
      const data=await response.json();if(!response.ok)throw new Error(data.error);return data;
    }
    if (message.type === 'GET_PENDING_CAPTURE') return { pending: (await chrome.storage.local.get(pendingKey(problem.url)))[pendingKey(problem.url)] || null };
    // Serialize same-problem messages even when two LeetCode tabs save concurrently.
    const previous = active.get(problem.url) || Promise.resolve();
    const next = previous.catch(() => {}).then(() => save(message,problem));
    active.set(problem.url,next);
    try { return await next; } finally { if (active.get(problem.url) === next) active.delete(problem.url); }
  };
  run().then(sendResponse, error => sendResponse({ saved: false, error: error.message || 'Could not save. Try again.' }));
  return true;
});
