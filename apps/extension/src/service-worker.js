import './legacy-setup.js';
import './adapters/leetcode.js';

const pendingKey = url => `recall-pending:${url}`;
const draftKey = url => `recall-draft:${url}`;
const queueKey = url => `recall-queue:${url}`;
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
  await chrome.storage.local.remove(draftKey(problem.url));
  return { saved: true };
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING') { sendResponse({ status: 'worker-ready', version: chrome.runtime.getManifest().version }); return; }
  if (message?.type === 'LIST_RECORDINGS') {
    if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('setup.html')) { sendResponse({error:'Invalid settings sender'}); return; }
    chrome.storage.local.get(null).then(data => sendResponse({records:Object.entries(data).filter(([key])=>/^recall-(pending|draft|queue|conflict):/.test(key)).map(([key,value])=>({kind:key.split(':')[0].replace('recall-',''),url:key.startsWith('recall-conflict:')?value.url:key.slice(key.indexOf(':')+1),value}))}),()=>sendResponse({error:'Could not read local recordings.'}));
    return true;
  }
  if (!['SAVE_CAPTURE','GET_PENDING_CAPTURE','GET_PRACTICE_CONTEXT','SAVE_EDITABLE_DRAFT','QUEUE_CAPTURE','SHIFT_CAPTURE','RECONCILE_CAPTURE','RELEASE_CONFLICT'].includes(message?.type)) return;
  let problem;
  try { problem = identity(message,sender); } catch (error) { sendResponse({ saved: false, error: error.message }); return; }
  const run = async () => {
    if (message.type === 'GET_PRACTICE_CONTEXT') {
      const response=await fetch('http://127.0.0.1:3001/api/practice-context',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:problem.url,title:message.problem.title,topics:message.topics}),signal:AbortSignal.timeout(10000),credentials:'omit',redirect:'error'});
      const data=await response.json();if(!response.ok)throw new Error(data.error);return data;
    }
    if (message.type === 'GET_PENDING_CAPTURE') {
      const read = async key => (await chrome.storage.local.get(key))[key];
      return {pending:await read(pendingKey(problem.url))||null,draft:await read(draftKey(problem.url))||null,queue:await read(queueKey(problem.url))||[]};
    }
    // Serialize same-problem messages even when two LeetCode tabs save concurrently.
    const previous = active.get(problem.url) || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (message.type === 'SAVE_EDITABLE_DRAFT') {
        if (!message.draft || JSON.stringify(message.draft).length > 16000) throw new Error('Draft is too large.');
        await chrome.storage.local.set({[draftKey(problem.url)]:message.draft}); return {kept:true};
      }
      if (['QUEUE_CAPTURE','SHIFT_CAPTURE'].includes(message.type)) {
        const key=queueKey(problem.url), queue=(await chrome.storage.local.get(key))[key]||[];
        if (message.type === 'QUEUE_CAPTURE') {
          const evidence=message.evidence;
          if (!evidence || evidence.captureSource!=='accepted' || !Number.isFinite(Date.parse(evidence.attemptedAt))) throw new Error('Invalid submission evidence.');
          if (!queue.some(item=>item.eventId===evidence.eventId)) queue.push(evidence);
        } else queue.shift();
        if (queue.length) await chrome.storage.local.set({[key]:queue}); else await chrome.storage.local.remove(key);
        return {queue};
      }
      if (['RECONCILE_CAPTURE','RELEASE_CONFLICT'].includes(message.type)) {
        const key=pendingKey(problem.url),payload=(await chrome.storage.local.get(key))[key];
        if (!payload) return {status:'missing'};
        const response=await fetch('http://127.0.0.1:3001/api/capture/reconcile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000),credentials:'omit',redirect:'error'});
        const data=await response.json(); if(!response.ok)throw new Error(data.error||'Could not reconcile.');
        if(message.type==='RELEASE_CONFLICT'){
          if(!['conflict','removed'].includes(data.status))throw new Error('The save remains uncertain. Retry or check its status first.');
          await chrome.storage.local.set({['recall-conflict:'+payload.requestId]:payload});
          await chrome.storage.local.remove(key);return {released:true};
        }
        if(data.status==='saved'){await chrome.storage.local.remove(key);await chrome.storage.local.remove(draftKey(problem.url));}
        return data;
      }
      return save(message,problem);
    });
    active.set(problem.url,next);
    try { return await next; } finally { if (active.get(problem.url) === next) active.delete(problem.url); }
  };
  run().then(sendResponse, error => sendResponse({ saved: false, error: error.message || 'Could not save. Try again.' }));
  return true;
});
