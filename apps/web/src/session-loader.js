import {abortable} from './api.js';

// Login's explicit refresh and the SDK event can arrive together. Share only
// the pending verification; completed sessions are always checked again.
export function createSessionLoader(load){
  let pending=null;
  return (scope,signal)=>{
    if(pending&&pending.scope===scope&&!pending.signal?.aborted)return signal?abortable(pending.operation,signal):pending.operation;
    const current={scope,signal};
    current.operation=Promise.resolve().then(()=>load(scope,signal)).finally(()=>{if(pending===current)pending=null;});
    pending=current;return current.operation;
  };
}
