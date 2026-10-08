import { recallAccount, trustedPage } from './account-worker.js';
import './legacy-setup.js';
import './adapters/leetcode.js';
import { recallRuntime } from './runtime-config.js';

const pendingKey = (url,scope) => recallAccount.key(scope,`recall-pending:${url}`);
const draftKey = (url,scope) => recallAccount.key(scope,`recall-draft:${url}`);
const queueKey = (url,scope) => recallAccount.key(scope,`recall-queue:${url}`);
const active = new Map();
function identity(message, sender) {
  const source = DsaAdapters[0].getProblem(sender.url);
  const problem = DsaAdapters[0].getProblem(message.problem?.url);
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || !Number.isInteger(sender.tab?.id) || !source || source.url !== problem?.url) throw new Error('Open a LeetCode problem and refresh its page.');
  return problem;
}
async function save(message, problem, scope) {
  const payload = message.payload;
  if (!payload || payload.url !== problem.url || typeof payload.requestId !== 'string') throw new Error('Invalid recording. Refresh the LeetCode page.');
  const key = pendingKey(problem.url,scope);
  const stored = (await chrome.storage.local.get(key))[key];
  if (stored && JSON.stringify(stored) !== JSON.stringify(payload)) throw new Error('An unfinished recording exists. Refresh the page to retry that recording first.');
  // Persist before writing; API failures and worker restarts retain the same request ID.
  await chrome.storage.local.set({ [key]: payload });
  const response = await recallAccount.request('/capture', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), credentials: 'omit', redirect: 'error',
    },scope);
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
  await chrome.storage.local.remove(draftKey(problem.url,scope));
  return { saved: true, practiceUnit:data.attempt.practiceUnit, websiteOrigin:recallRuntime.websiteOrigin };
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING') { sendResponse({ status: 'worker-ready', version: chrome.runtime.getManifest().version }); return; }
  if (message?.type === 'LIST_RECORDINGS') {
    if (!trustedPage(sender) || sender.url?.split('#')[0] !== chrome.runtime.getURL('setup.html')) { sendResponse({error:'Invalid settings sender'}); return; }
    (async()=>{const scope=await recallAccount.scope(),prefix=scope==='local'?'':`recall-user:${scope}:`,data=await chrome.storage.local.get(null);return {records:Object.entries(data).filter(([key])=>key.startsWith(prefix)&&/^recall-(pending|draft|queue|conflict):/.test(key.slice(prefix.length))).map(([key,value])=>{key=key.slice(prefix.length);return {kind:key.split(':')[0].replace('recall-',''),url:key.startsWith('recall-conflict:')?value.url:key.slice(key.indexOf(':')+1),value};})};})().then(sendResponse,error=>sendResponse({error:error.message}));
    return true;
  }
  if (!['SAVE_CAPTURE','GET_PENDING_CAPTURE','GET_PRACTICE_CONTEXT','SAVE_EDITABLE_DRAFT','QUEUE_CAPTURE','SHIFT_CAPTURE','RECONCILE_CAPTURE','RELEASE_CONFLICT'].includes(message?.type)) return;
  let problem;
  try { problem = identity(message,sender); } catch (error) { sendResponse({ saved: false, error: error.message }); return; }
  const run = async () => {
    const scope=await recallAccount.scope();
    if(message.type!=='GET_PENDING_CAPTURE'&&message.workspaceScope!==scope&&(scope!=='local'||message.workspaceScope!==undefined))throw new Error('Recall account changed. Refresh LeetCode before continuing.');
    if (message.type === 'GET_PRACTICE_CONTEXT') {
      const response=await recallAccount.request('/practice-context',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:problem.url,title:message.problem.title,topics:message.topics}),signal:AbortSignal.timeout(10000),credentials:'omit',redirect:'error'},scope);
      const data=await response.json();if(!response.ok)throw new Error(data.error);return data;
    }
    if (message.type === 'GET_PENDING_CAPTURE') {
      const read = async key => (await chrome.storage.local.get(key))[key];
      return {workspaceScope:scope,pending:await read(pendingKey(problem.url,scope))||null,draft:await read(draftKey(problem.url,scope))||null,queue:await read(queueKey(problem.url,scope))||[]};
    }
    // Serialize same-problem messages even when two LeetCode tabs save concurrently.
    const previous = active.get(pendingKey(problem.url,scope)) || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      await recallAccount.assertScope(scope);
      if (message.type === 'SAVE_EDITABLE_DRAFT') {
        if (!message.draft || JSON.stringify(message.draft).length > 16000) throw new Error('Draft is too large.');
        await chrome.storage.local.set({[draftKey(problem.url,scope)]:message.draft}); return {kept:true};
      }
      if (['QUEUE_CAPTURE','SHIFT_CAPTURE'].includes(message.type)) {
        const key=queueKey(problem.url,scope), queue=(await chrome.storage.local.get(key))[key]||[];
        if(!Array.isArray(queue))throw new Error('Stored submission queue is invalid. Open Recall Settings to inspect saved recordings.');
        if (message.type === 'QUEUE_CAPTURE') {
          const evidence=message.evidence;
          if (!evidence || evidence.captureSource!=='accepted' || typeof evidence.eventId!=='string'||!evidence.eventId||evidence.eventId.length>100||JSON.stringify(evidence).length>16000||!Number.isFinite(Date.parse(evidence.attemptedAt))) throw new Error('Invalid submission evidence.');
          if (!queue.some(item=>item.eventId===evidence.eventId)) {if(queue.length>=100)throw new Error('Finish your queued recordings before adding more. Your existing queue is kept.');queue.push(evidence);}
        } else if(queue.length){
          const draft=draftKey(problem.url,scope);
          if((await chrome.storage.local.get(draft))[draft])throw new Error('An editable recording is already open. Save or reopen it before taking the next queued submission.');
          // Persist the next event before removing it from the queue. A tab
          // closed during panel creation must not lose the accepted evidence.
          const evidence=queue.shift();await chrome.storage.local.set({[draft]:{...evidence,url:problem.url},[key]:queue});
        }
        if (queue.length) await chrome.storage.local.set({[key]:queue}); else await chrome.storage.local.remove(key);
        return {queue};
      }
      if (['RECONCILE_CAPTURE','RELEASE_CONFLICT'].includes(message.type)) {
        const key=pendingKey(problem.url,scope),payload=(await chrome.storage.local.get(key))[key];
        if (!payload) return {status:'missing'};
        const response=await recallAccount.request('/capture/reconcile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000),credentials:'omit',redirect:'error'},scope);
        const data=await response.json(); if(!response.ok)throw new Error(data.error||'Could not reconcile.');
        if(message.type==='RELEASE_CONFLICT'){
          if(!['conflict','removed'].includes(data.status))throw new Error('The save remains uncertain. Retry or check its status first.');
          await chrome.storage.local.set({[recallAccount.key(scope,'recall-conflict:'+payload.requestId)]:payload});
          await chrome.storage.local.remove(key);return {released:true};
        }
        if(data.status==='saved'){await chrome.storage.local.remove(key);await chrome.storage.local.remove(draftKey(problem.url,scope));}
        return data;
      }
      return save(message,problem,scope);
    });
    active.set(pendingKey(problem.url,scope),next);
    try { return await next; } finally { if (active.get(pendingKey(problem.url,scope)) === next) active.delete(pendingKey(problem.url,scope)); }
  };
  run().then(sendResponse, error => sendResponse({ saved: false, error: error.message || 'Could not save. Try again.' }));
  return true;
});
