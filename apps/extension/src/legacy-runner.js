export async function runLegacyImport({state,scan,topics,writeBatch,saveState,onProgress=()=>{},onPhase=()=>{}}) {
  if(state.decision!=='pending') return state;
  onPhase({phase:'scanning'});const found=await scan();
  if(state.username&&state.username!==found.username) throw new Error('Sign back into '+state.username+' to resume.');
  if(!state.snapshot) {
    state={...state,username:found.username,snapshot:found.problems,offset:0};
    await saveState(state);
  }
  for(let offset=state.offset;offset<state.snapshot.length;offset+=10) {
    const slugs=state.snapshot.slice(offset,offset+10).map(p=>p.slug);
    onPhase({phase:'metadata',username:state.username,offset,total:state.snapshot.length});
    const problems=await topics(slugs,state.username);
    if(problems.length!==slugs.length) throw new Error('Incomplete problem metadata. Resume to retry.');
    onPhase({phase:'saving',username:state.username,offset,total:state.snapshot.length});const batch=await writeBatch({runId:state.installationId,username:state.username,problems,complete:false});
    state={...state,offset:offset+slugs.length,lastBatch:batch};
    await saveState(state);onProgress(state);
  }
  await writeBatch({runId:state.installationId,username:state.username,problems:[],complete:true});
  state={installationId:state.installationId,username:state.username,decision:'complete',count:state.snapshot.length,completedAt:new Date().toISOString()};
  await saveState(state);return state;
}
