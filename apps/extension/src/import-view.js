const phases={connecting:'Checking your connection…',scanning:'Finding accepted problems…',metadata:'Reading topics and difficulty…',saving:'Organizing your patterns…',dates:'Checking available practice dates…',paused:'Import paused. Your progress is saved.',complete:'Import finished.'};
export function importView(progress={}){
  const complete=progress.decision==='complete',ready=complete&&progress.datesComplete===true,running=progress.running===true;
  const imported=progress.saved==null?'Accepted problems':`${progress.saved} accepted problems`;
  const summary=ready?`${imported} imported. Available recent dates are included.`:complete?`${imported} are ready. Recent practice dates are still pending.`:Number.isInteger(progress.total)?`${progress.saved||0} of ${progress.total} problems saved.`:'Import your accepted problems to organize your first personal pattern queue.';
  return {complete,ready,running,pausing:progress.pausing===true,total:progress.total,saved:progress.saved||0,summary,error:progress.error||'',phaseText:progress.message||phases[progress.phase]||'',actionLabel:running?'Importing…':ready?'Check for new solves':complete?'Retry recent dates':progress.phase==='paused'||Number.isInteger(progress.total)?'Resume import':'Import my solves'};
}
