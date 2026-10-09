// One in-memory snapshot; never persist private practice data across accounts.
export function createPracticeCache({now=Date.now,maxAge=45000}={}){
  let snapshot=null,updatedAt=-Infinity,pending=null,revision=0;
  return {
    read:()=>snapshot,
    async load(fetchSnapshot,{force=false}={}){
      if(pending)return pending;
      if(!force&&snapshot&&now()-updatedAt<maxAge)return snapshot;
      const current=revision;
      const operation=Promise.resolve().then(fetchSnapshot).then(result=>{
        if(current!==revision)throw Object.assign(new Error('Practice changed while loading. Refresh to see the latest data.'),{status:409});
        if(!Array.isArray(result.categories))throw new Error('The dashboard response is incomplete. Please refresh.');
        snapshot=result;updatedAt=now();return result;
      }).finally(()=>{if(pending===operation)pending=null;});
      pending=operation;return operation;
    },
    invalidate(){revision++;updatedAt=-Infinity;pending=null;},
    clear(){this.invalidate();snapshot=null;},
  };
}
export const practiceCache=createPracticeCache();
