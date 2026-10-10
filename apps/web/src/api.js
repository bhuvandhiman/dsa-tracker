import {practiceCache} from './practice-cache.js';
let tokenProvider=null;
let workspaceScope=null,accountRevision=0;
export function setTokenProvider(provider){tokenProvider=provider;accountRevision++;practiceCache.clear();}
export function setWorkspaceScope(scope){if(scope!==workspaceScope){workspaceScope=scope;accountRevision++;practiceCache.clear();}}
export function abortable(operation,signal){
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(signal.reason);
    signal.addEventListener('abort',abort,{once:true});
    Promise.resolve(operation).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
}
export async function request(path, { signal, timeoutMs, workspaceScope:expected=workspaceScope, ...options } = {}) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs??(path==='/account'&&options.method==='DELETE'?60000:12000));
  const combined=signal?AbortSignal.any([signal,timeout.signal]):timeout.signal;
  const revision=accountRevision;
  const changed=()=>Object.assign(new Error('Recall account changed. Refresh before continuing.'),{status:409});
  try {
    combined.throwIfAborted();
    const session=path==='/auth/config'?null:await abortable(Promise.resolve().then(()=>tokenProvider?.()),combined);
    const token=typeof session==='string'?session:session?.token;
    if(path!=='/auth/config'&&(revision!==accountRevision||expected!==workspaceScope||session?.scope&&session.scope!==expected))throw changed();
    const headers=new Headers(options.headers);
    if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');
    if(token)headers.set('Authorization',`Bearer ${token}`);
    if(path!=='/auth/config'&&expected)headers.set('X-Recall-Workspace',expected);
    const response = await fetch(`/api${path}`, { ...options, signal:combined, headers });
    let body;
    try { body = await response.json(); }
    catch (error) {
      if (signal?.aborted || timeout.signal.aborted) throw error;
      throw Object.assign(new Error(response.status >= 500 ? 'Recall is unavailable or waking up. Wait a moment and try again.' : 'Recall returned an unreadable response. Reload and try again.', {cause:error}),{status:response.status});
    }
    if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Recall returned an unreadable response. Reload and try again.');
    if (!response.ok) throw Object.assign(new Error(typeof body.error==='string'?body.error:`Request failed (${response.status}).`),{status:response.status});
    if(path!=='/auth/config'&&revision!==accountRevision)throw changed();
    if(options.method&&!['GET','HEAD'].includes(options.method.toUpperCase())&&path!=='/account/profile')practiceCache.invalidate();
    return body;
  } catch (error) {
    if(signal?.aborted)throw signal.reason;
    if (timeout.signal.aborted && !signal?.aborted) throw Object.assign(new Error('The API took too long to respond. Please try again.', {cause:error}),{code:'REQUEST_TIMEOUT'});
    if (error instanceof TypeError) throw Object.assign(new Error('Cannot reach Recall. Check your connection and try again.', {cause:error}),{code:'NETWORK_ERROR'});
    throw error;
  } finally { clearTimeout(timer); }
}

export async function requestStartup(path,{signal,workspaceScope:expected=workspaceScope}={}){
  if(!['/auth/config','/session'].includes(path))throw new Error('Only startup reads can be retried automatically.');
  // A sleeping host or first workspace migration can outlast the normal API
  // deadline. Retry one transient failure within a single minute-long budget.
  const budget=AbortSignal.timeout(60000),combined=signal?AbortSignal.any([signal,budget]):budget;
  const revision=accountRevision;
  try{
    for(let attempt=0;attempt<2;attempt++){
      if(revision!==accountRevision)throw Object.assign(new Error('Recall account changed. Refresh before continuing.'),{status:409});
      try{return await request(path,{signal:combined,timeoutMs:30000,workspaceScope:expected});}
      catch(error){
        if(combined.aborted||attempt===1||!([502,503,504].includes(error.status)||['REQUEST_TIMEOUT','NETWORK_ERROR'].includes(error.code)))throw error;
        await new Promise((resolve,reject)=>{
          const cancel=()=>{clearTimeout(timer);combined.removeEventListener('abort',cancel);reject(combined.reason);};
          const timer=setTimeout(()=>{combined.removeEventListener('abort',cancel);resolve();},500);
          combined.addEventListener('abort',cancel,{once:true});
          if(combined.aborted)cancel();
        });
      }
    }
  }catch(error){
    if(signal?.aborted)throw signal.reason;
    if(budget.aborted)throw Object.assign(new Error('Recall is taking longer than expected to start. Please try again.'),{code:'REQUEST_TIMEOUT'});
    throw error;
  }
}
