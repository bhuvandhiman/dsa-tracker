import { recallRuntime } from './runtime-config.js';
import { requestError, readRecallResponse } from './import-request.js';
const api=recallRuntime.apiOrigin+'/api',sessionKey='recall-account-session';
const unavailable=recallRuntime.apiOrigin.startsWith('https:')?'Recall may be waking up or unavailable. Open the website and retry shortly. Your saved drafts are kept.':'Start the Recall API, then retry. Your saved drafts are kept.';
export function workspaceKey(scope,key){
  if(scope==='local')return key;
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(scope||''))throw new Error('Open the Recall website to connect your account.');
  return `recall-user:${scope}:${key}`;
}
export function createAccountClient(chromeApi,fetchImpl=fetch,now=Date.now){
  let config,configAt=0,configLoading=null,refreshing=null,revision=0,pendingWebsite=null,writes=Promise.resolve();
  const diagnosticAt=new Map();
  async function reportDiagnostic(operation,code,owner){
    if(owner==='local')return;
    const saved=await session();if(!valid(saved,config?.url)||saved.user.id!==owner||saved.expiresAt<=now())return;
    const key=owner+operation;if((diagnosticAt.get(key)||0)>now()-30000)return;
    diagnosticAt.set(key,now());if(diagnosticAt.size>100)diagnosticAt.delete(diagnosticAt.keys().next().value);
    try{const version=chromeApi.runtime?.getManifest?.().version;await request('/diagnostics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,code,eventId:crypto.randomUUID(),...(version?{version}:{})}),signal:AbortSignal.timeout(5000)},owner);}catch{/* Diagnostics never alter capture or import recovery. */}
  }
  function store(work){const next=writes.then(work);writes=next.catch(()=>{});return next;}
  async function raw(path,options={}){
    const budget=Number.isFinite(options.timeoutMs)&&options.timeoutMs>=1000&&options.timeoutMs<=120000?options.timeoutMs:25000;
    const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(budget)]):AbortSignal.timeout(budget);
    signal.throwIfAborted();
    try{return await fetchImpl(api+path,{...options,credentials:'omit',redirect:'error',signal});}catch{if(options.signal?.aborted)throw options.signal.reason;throw requestError(signal.aborted?'Recall took too long to respond. Your checkpoint is kept; retry to resume.':unavailable,{code:signal.aborted?'TIMEOUT':'NETWORK',retryable:true});}
  }
  async function json(path,body){
    return readRecallResponse(await raw(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
  }
  async function settings(){
    if(!config||now()-configAt>60000){
      if(!configLoading)configLoading=(async()=>{const next=await readRecallResponse(await raw('/auth/config'));if(!['local','supabase'].includes(next.mode))throw requestError('Recall configuration is unavailable. Retry shortly.',{retryable:true});config=next;configAt=now();})().finally(()=>{configLoading=null;});
      await configLoading;
    }
    return config;
  }
  let migratedSession=false;
  async function session(){
    // Sessions live in durable extension storage so a browser restart never
    // signs the recorder out. Anything written by older versions migrates once.
    const durable=(await chromeApi.storage.local.get(sessionKey))[sessionKey];
    if(durable||migratedSession)return durable;
    migratedSession=true;
    if(!chromeApi.storage.session?.get)return durable;
    return store(async()=>{
      const current=(await chromeApi.storage.local.get(sessionKey))[sessionKey];
      if(current)return current;
      const legacy=(await chromeApi.storage.session.get(sessionKey))[sessionKey];
      if(legacy){
        await chromeApi.storage.local.set({[sessionKey]:legacy});
        await chromeApi.storage.session.remove?.(sessionKey);
      }
      return legacy;
    });
  }
  function valid(value,project){return typeof project==='string'&&value?.project===project&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.user?.id||'')&&typeof value.user.email==='string'&&(value.source==='website'?[value.accessToken,...(typeof value.refreshToken==='string'?[value.refreshToken]:[])]:[value.accessToken,value.refreshToken]).every(token=>typeof token==='string'&&token.length>0&&token.length<=8192)&&Number.isFinite(value.expiresAt)&&value.expiresAt>0;}
  async function status(){const options=await settings(),saved=options.mode==='supabase'?await session():null,known=valid(saved,options.url),connected=known&&(saved.source!=='website'||saved.expiresAt>now()+5000||typeof saved.refreshToken==='string');return {mode:options.mode,connected:options.mode==='local'||connected,scope:options.mode==='local'?'local':known?saved.user.id:null,email:known?saved.user.email:''};}
  async function scope(){const state=await status();if(!state.connected)throw new Error('Sign into Recall on the website, then use Connect through Recall in extension Settings.');return state.scope;}
  async function assertScope(expected){const current=await scope();if(expected!==undefined&&expected!==current)throw new Error('Recall account changed. Refresh this page before continuing.');return current;}
  async function localScope(expected){
    // Local checkpoints/drafts must survive API outages and expired access.
    // This identity is NEVER used to authorize a remote request.
    const saved=await session();let current;
    if(config?.mode==='local')current='local';
    else if(valid(saved,config?.url||saved?.project))current=saved.user.id;
    else if(!config&&(await settings()).mode==='local')current='local';
    else throw new Error('Sign into Recall on the website to access your saved drafts.');
    if(expected!==undefined&&expected!==current)throw new Error('Recall account changed. Refresh this page before continuing.');
    return current;
  }
  async function signIn(email,password){
    const current=++revision,options=await settings();if(options.mode!=='supabase')throw new Error('Recall is using its local workspace.');
    const saved=await json('/auth/extension/login',{email,password});
    if(!valid(saved,options.url))throw new Error('Recall returned an invalid account session.');
    if(current!==revision)throw new Error('Sign-in was cancelled. Try again.');
    await store(async()=>{if(current!==revision)throw new Error('Sign-in was cancelled. Try again.');await chromeApi.storage.local.set({[sessionKey]:saved});});return status();
  }
  async function signOut(){revision++;pendingWebsite=null;await store(()=>chromeApi.storage.local.remove(sessionKey));}
  async function announceRotation(next){
    // A rotated website session must reach any open dashboard tab so its SDK
    // keeps the same refresh-token family instead of reusing a rotated one.
    try{
      const tabs=(await chromeApi.tabs?.query?.({url:recallRuntime.websiteOrigin+'/*'}))||[];
      await Promise.allSettled(tabs.filter(tab=>Number.isInteger(tab?.id)).map(tab=>chromeApi.tabs.sendMessage(tab.id,{type:'RECALL_SESSION_ROTATED',owner:next.user.id,accessToken:next.accessToken,refreshToken:next.refreshToken},{frameId:0})));
    }catch{/* Best effort; the website re-pushes its session on its next refresh. */}
  }
  async function connectWebsite(accessToken,owner,refreshToken=''){
    if(typeof accessToken!=='string'||!accessToken||accessToken.length>8192||typeof refreshToken!=='string'||refreshToken.length>8192||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner||''))throw new Error('Invalid website connection.');
    const current=++revision;pendingWebsite=owner;
    try{
      const options=await settings();if(options.mode!=='supabase')return status();
      const previous=await session();
      if(valid(previous,options.url)&&previous.source==='website'&&previous.accessToken===accessToken&&previous.refreshToken===refreshToken&&previous.user.id===owner)return status();
      const version=chromeApi.runtime?.getManifest?.().version;
      const next=await json('/auth/extension/connect',{accessToken,...(version?{version}:{})});
      // The API never sees the refresh credential; only the website bridge may
      // hand one over, and the extension stores it only so saves can refresh
      // while the dashboard stays closed for months.
      if(!valid(next,options.url)||next.source!=='website'||next.refreshToken!==undefined||next.user.id!==owner||next.expiresAt<=now()+5000)throw new Error('Open Recall and sign in to reconnect.');
      const durable={...next,...(refreshToken?{refreshToken}:{})};
      await store(async()=>{
        if(current!==revision)throw new Error('Website connection changed. Reopen Recall to reconnect.');
        const saved=await session();
        if(saved?.source==='website'&&saved.user.id===owner&&saved.expiresAt>durable.expiresAt)return;
        await chromeApi.storage.local.set({[sessionKey]:durable});
      });return status();
    }finally{if(current===revision)pendingWebsite=null;}
  }
  async function disconnectWebsite(owner){
    // A late sign-out from another account must not disconnect this account.
    const saved=await session();if(pendingWebsite!==owner&&(saved?.source!=='website'||saved.user.id!==owner))return {signedOut:false};
    const current=++revision;pendingWebsite=null;
    await store(async()=>{if(current!==revision)return;const latest=await session();if(latest?.source==='website'&&latest.user.id===owner)await chromeApi.storage.local.remove(sessionKey);});return {signedOut:true};
  }
  async function token(expected){
    const options=await settings();await assertScope(expected);if(options.mode==='local')return null;
    let saved=await session();
    if(!valid(saved,options.url))throw new Error('Open the Recall website to reconnect, then retry.');
    if(saved.expiresAt<=now()+60000&&saved.refreshToken){
      if(!refreshing||refreshing.revision!==revision||refreshing.owner!==saved.user.id){
        const current=revision,owner=saved.user.id,refreshToken=saved.refreshToken,website=saved.source==='website';
        const entry={revision:current,owner};
        entry.promise=json('/auth/extension/refresh',{refreshToken}).then(async next=>{
          if(current!==revision||(await session())?.user.id!==owner)throw new Error('Recall account changed. Refresh this page.');
          if(!valid(next,options.url)||next.user.id!==owner){await signOut();throw new Error('Your session changed. Open the Recall website to reconnect.');}
          await store(async()=>{if(current!==revision)throw new Error('Recall account changed. Refresh this page.');await chromeApi.storage.local.set({[sessionKey]:next});});
          if(website)void announceRotation(next);
          return next;
        }).catch(async error=>{if(current===revision&&error.status===401)await signOut();throw error;}).finally(()=>{if(refreshing===entry)refreshing=null;});
        refreshing=entry;
      }
      saved=await refreshing.promise;
    }
    const owner=await assertScope(expected);if(saved.user.id!==owner)throw new Error('Recall account changed. Refresh this page.');return saved.accessToken;
  }
  async function request(path,options={},expected){
    const reportOperation=path==='/capture'?'capture':/^\/imports\/(recent|legacy)$/.test(path)?'import':null;
    const budget=Number.isFinite(options.timeoutMs)&&options.timeoutMs>=1000&&options.timeoutMs<=120000?options.timeoutMs:25000;
    const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(budget)]):AbortSignal.timeout(budget);signal.throwIfAborted();
    const operation=(async()=>{const owner=await assertScope(expected),access=await token(owner);signal.throwIfAborted();return raw(path,{...options,signal,headers:{...options.headers,'X-Recall-Workspace':owner,...(access?{Authorization:`Bearer ${access}`}:{})}});})();
    try{return await new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});operation.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});}
    catch(error){if(signal.aborted&&(!options.signal?.aborted||options.signal.reason?.name==='TimeoutError')){if(reportOperation)void reportDiagnostic(reportOperation,'TIMEOUT',expected);throw requestError('Recall took too long to respond. Your checkpoint is kept; retry to resume.',{code:'TIMEOUT',retryable:true});}if(reportOperation&&error.code==='NETWORK')void reportDiagnostic(reportOperation,'NETWORK',expected);throw error;}
  }
  return {status,scope,assertScope,localScope,signIn,signOut,connectWebsite,disconnectWebsite,request,reportDiagnostic,key:workspaceKey};
}
