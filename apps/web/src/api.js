let tokenProvider=null;
let workspaceScope=null,accountRevision=0;
export function setTokenProvider(provider){tokenProvider=provider;accountRevision++;}
export function setWorkspaceScope(scope){if(scope!==workspaceScope){workspaceScope=scope;accountRevision++;}}
export function abortable(operation,signal){
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(signal.reason);
    signal.addEventListener('abort',abort,{once:true});
    Promise.resolve(operation).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
}
export async function request(path, { signal, workspaceScope:expected=workspaceScope, ...options } = {}) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), path==='/account'&&options.method==='DELETE'?60000:12000);
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
      throw new Error(response.status >= 500 ? 'Recall is unavailable or waking up. Wait a moment and try again.' : 'Recall returned an unreadable response. Reload and try again.', {cause:error});
    }
    if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Recall returned an unreadable response. Reload and try again.');
    if (!response.ok) throw Object.assign(new Error(typeof body.error==='string'?body.error:`Request failed (${response.status}).`),{status:response.status});
    if(path!=='/auth/config'&&revision!==accountRevision)throw changed();
    return body;
  } catch (error) {
    if(signal?.aborted)throw signal.reason;
    if (timeout.signal.aborted && !signal?.aborted) throw new Error('The API took too long to respond. Please try again.', {cause:error});
    if (error instanceof TypeError) throw new Error('Cannot reach Recall. Check your connection and try again.', {cause:error});
    throw error;
  } finally { clearTimeout(timer); }
}
