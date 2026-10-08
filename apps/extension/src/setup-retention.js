import { api, scopedStorage, connection } from './account-page.js';
import { connectLeetCode } from './leetcode-connection.js';
const button=document.querySelector('#initialize-retention'),status=document.querySelector('#retention-status');
let busy=false;
const report=(phase,error='')=>scopedStorage.set({importProgress:{phase,error,updatedAt:Date.now()}}).catch(()=>{});

async function render() {
  const stored=await scopedStorage.get(['legacySetup','retentionSetup']);
  button.hidden=!stored.legacySetup||stored.legacySetup.decision==='pending'||stored.retentionSetup?.complete===true;
  button.disabled=busy;
  if(stored.retentionSetup?.complete)status.textContent=`Recent dates imported${stored.retentionSetup.username?' for '+stored.retentionSetup.username:''}${stored.retentionSetup.count!==undefined?' · '+stored.retentionSetup.count+' submissions':''}${stored.retentionSetup.completedAt?' · '+new Date(stored.retentionSetup.completedAt).toLocaleString():''}. Other patterns stay unassessed until you record practice.`;
}
async function initialize() {
  if(busy)return;busy=true;button.disabled=true;status.textContent='Reading available recent accepted submissions…';await report('dates');
  try {await navigator.locks.request('recall-legacy-import',{ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Initialization is already running in another tab.');
    const stored=await scopedStorage.get(['legacySetup','retentionSetup']);
    const setup=stored.legacySetup;
    if(!setup||setup.decision==='pending')throw new Error('Finish or skip legacy setup first.');
    if(stored.retentionSetup?.complete)return;
    const saved=await api('/imports/recent/'+setup.installationId);
    if(saved.completed){await scopedStorage.set({retentionSetup:{complete:true}});return;}
    const read=await connectLeetCode(chrome,()=>{status.textContent='Reconnecting through a fresh LeetCode tab…';});
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
      await scopedStorage.set({retentionSetup:{snapshot}});
    }
    const result=await api('/imports/recent',snapshot);
    await scopedStorage.set({retentionSetup:{complete:true,username:snapshot.username,count:snapshot.submissions.length,added:result.added,alreadyPresent:result.alreadyPresent,excluded:result.excluded,completedAt:new Date().toISOString()}});
  });await report('complete');}catch(error){status.textContent=error.message+' Your saved solves are available; retry recent dates when ready.';await report('error',error.message);}
  finally{busy=false;try{await render();}catch(error){button.hidden=true;status.textContent=error.message;}}
}
button.addEventListener('click',initialize);
document.addEventListener('legacy-completed',initialize);
document.addEventListener('legacy-skipped',()=>{void render().catch(error=>{button.hidden=true;status.textContent=error.message;});});
connection().then(render).then(async()=>{const stored=await scopedStorage.get(['legacySetup','retentionSetup']);if(stored.legacySetup?.decision==='complete'&&!stored.retentionSetup?.complete)await initialize();}).catch(error=>{status.textContent=error.message;});
