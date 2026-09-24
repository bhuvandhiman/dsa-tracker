export async function runLegacyImport({state,scan,topics,writeBatch,saveState,onProgress=()=>{}}) {
  if(state.decision!=='pending') return state;
  const found=await scan();
  if(state.username&&state.username!==found.username) throw new Error('Sign back into '+state.username+' to resume.');
  if(!state.snapshot) {
    state={...state,username:found.username,snapshot:found.problems,offset:0};
    await saveState(state);
  }
  for(let offset=state.offset;offset<state.snapshot.length;offset+=10) {
    const slugs=state.snapshot.slice(offset,offset+10).map(p=>p.slug);
    const problems=await topics(slugs,state.username);
    if(problems.length!==slugs.length) throw new Error('Incomplete problem metadata. Resume to retry.');
    await writeBatch({runId:state.installationId,username:state.username,problems,complete:false});
    state={...state,offset:offset+slugs.length};
    await saveState(state);onProgress(state);
  }
  await writeBatch({runId:state.installationId,username:state.username,problems:[],complete:true});
  state={installationId:state.installationId,username:state.username,decision:'complete',count:state.snapshot.length};
  await saveState(state);return state;
}
