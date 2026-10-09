export async function runLegacyImport({state,scan,verifyAccount,topics,writeBatch,saveState,onProgress=()=>{},onPhase=()=>{}}) {
  if(state.decision!=='pending') return state;
  const validSnapshot=rows=>Array.isArray(rows)&&rows.length<=10000&&rows.every(row=>typeof row?.slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)&&row.slug.length<=200)&&new Set(rows.map(row=>row.slug)).size===rows.length;
  const invalidCheckpoint=state.snapshot&&(!validSnapshot(state.snapshot)||!Number.isInteger(state.offset)||state.offset<0||state.offset>state.snapshot.length||state.offset!==state.snapshot.length&&state.offset%10!==0);
  onPhase({phase:'scanning'});const found=state.snapshot&&!invalidCheckpoint&&state.username&&verifyAccount?{...await verifyAccount(),problems:state.snapshot}:await scan();
  if(!found||typeof found.username!=='string'||!found.username||!validSnapshot(found.problems))throw new Error('LeetCode returned an incomplete problem list. Retry the import.');
  if(state.username&&state.username!==found.username) throw new Error('Sign back into '+state.username+' to resume.');
  // A corrupt checkpoint is rebuilt from a verified scan under the same run
  // ID. Replaying already-saved batches is idempotent; skipping them is not.
  if(!state.snapshot||invalidCheckpoint) {
    state={...state,username:found.username,snapshot:found.problems,offset:0};
    await saveState(state);
  }
  for(let offset=state.offset;offset<state.snapshot.length;offset+=10) {
    const slugs=state.snapshot.slice(offset,offset+10).map(p=>p.slug);
    onPhase({phase:'metadata',username:state.username,offset,total:state.snapshot.length});
    const problems=await topics(slugs,state.username);
    if(!Array.isArray(problems)||problems.length!==slugs.length||problems.some((problem,index)=>problem?.url!==`https://leetcode.com/problems/${slugs[index]}/`)) throw new Error('Incomplete problem metadata. Resume to retry.');
    onPhase({phase:'saving',username:state.username,offset,total:state.snapshot.length});const batch=await writeBatch({runId:state.installationId,username:state.username,problems,complete:false});
    state={...state,offset:offset+slugs.length,lastBatch:batch};
    await saveState(state);onProgress(state);
  }
  await writeBatch({runId:state.installationId,username:state.username,problems:[],complete:true});
  state={installationId:state.installationId,username:state.username,decision:'complete',count:state.snapshot.length,completedAt:new Date().toISOString()};
  await saveState(state);return state;
}
