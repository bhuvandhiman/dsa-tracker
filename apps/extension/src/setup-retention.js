const button=document.querySelector('#initialize-retention'),status=document.querySelector('#retention-status');
let busy=false;
async function api(path,body) {
  let response;
  try {response=await fetch('http://127.0.0.1:3001/api'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new Error('Start Recall locally, then retry recent dates.');}
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Recent dates could not be imported.');return data;
}
async function render() {
  const stored=await chrome.storage.local.get(['legacySetup','retentionSetup']);
  button.hidden=stored.legacySetup?.decision!=='complete'||stored.retentionSetup?.complete===true;
  button.disabled=busy;
  if(stored.retentionSetup?.complete)status.textContent='Available recent dates imported. Other patterns stay unassessed until you record practice.';
}
async function initialize() {
  if(busy)return;busy=true;button.disabled=true;status.textContent='Reading available recent accepted submissions…';
  try {await navigator.locks.request('recall-legacy-import',{ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Initialization is already running in another tab.');
    const stored=await chrome.storage.local.get(['legacySetup','retentionSetup']);
    const setup=stored.legacySetup;
    if(!setup||setup.decision==='pending')throw new Error('Finish or skip legacy setup first.');
    if(stored.retentionSetup?.complete)return;
    const saved=await api('/imports/recent/'+setup.installationId);
    if(saved.completed){await chrome.storage.local.set({retentionSetup:{complete:true}});return;}
    const tabs=await chrome.tabs.query({url:'https://leetcode.com/*'}),tab=tabs.find(t=>t.active)||tabs[0];
    if(!tab)throw new Error('Open a signed-in LeetCode tab first.');
    async function read(type,extra={}) {
      let result;try{result=await chrome.tabs.sendMessage(tab.id,{type,...extra});}catch{throw new Error('Refresh LeetCode after reloading the extension, then retry.');}
      if(result?.error)throw new Error(result.error);if(!result?.data)throw new Error('LeetCode did not return recent dates.');return result.data;
    }
    const recent=await read('READ_RECENT_SUBMISSIONS');
    if(setup.username&&setup.username!==recent.username)throw new Error('Use the same LeetCode account as the legacy import.');
    let snapshot=stored.retentionSetup?.snapshot;
    if(snapshot&&snapshot.username!==recent.username)throw new Error('Sign back into '+snapshot.username+' to resume.');
    if(!snapshot) {
      const slugs=[...new Set(recent.submissions.map(s=>s.slug))],metadata=[];
      for(let i=0;i<slugs.length;i+=10)metadata.push(...await read('READ_LEGACY_TOPICS',{slugs:slugs.slice(i,i+10),username:recent.username}));
      snapshot={runId:setup.installationId,username:recent.username,submissions:recent.submissions.map(s=>{
        const problem=metadata.find(p=>new URL(p.url).pathname.split('/')[2]===s.slug);
        if(!problem)throw new Error('Problem metadata was incomplete. Retry initialization.');
        return {...problem,submissionId:s.submissionId,submittedAt:s.submittedAt};
      })};
      await chrome.storage.local.set({retentionSetup:{snapshot}});
    }
    await api('/imports/recent',snapshot);
    await chrome.storage.local.set({retentionSetup:{complete:true}});
  });}catch(error){status.textContent=error.message+' Your existing history is unchanged; retry when ready.';}
  finally{busy=false;await render();}
}
button.addEventListener('click',initialize);
document.addEventListener('legacy-completed',initialize);
document.addEventListener('legacy-skipped',render);
render().then(async()=>{const stored=await chrome.storage.local.get(['legacySetup','retentionSetup']);if(stored.legacySetup?.decision==='complete'&&!stored.retentionSetup?.complete)await initialize();}).catch(error=>{status.textContent=error.message;});
