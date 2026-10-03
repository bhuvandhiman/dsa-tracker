import { recallRuntime } from './runtime-config.js';
const api=recallRuntime.apiOrigin+'/api',sessionKey='recall-account-session';
const unavailable=recallRuntime.apiOrigin.startsWith('https:')?'Recall may be waking up or unavailable. Open the website and retry shortly. Your saved drafts are kept.':'Start the Recall API, then retry. Your saved drafts are kept.';
export function workspaceKey(scope,key){
  if(scope==='local')return key;
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(scope||''))throw new Error('Sign into Recall in extension Settings.');
  return `recall-user:${scope}:${key}`;
}
export function createAccountClient(chromeApi,fetchImpl=fetch,now=Date.now){
  let config,configAt=0,refreshing=null,revision=0,pendingWebsite=null,writes=Promise.resolve();
  function store(work){const next=writes.then(work);writes=next.catch(()=>{});return next;}
  async function raw(path,options={}){
    const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
    signal.throwIfAborted();
    try{return await fetchImpl(api+path,{...options,credentials:'omit',redirect:'error',signal});}catch{if(options.signal?.aborted)throw options.signal.reason;throw new Error(unavailable);}
  }
  async function json(path,body){
    const response=await raw(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let data;try{data=await response.json();}catch{throw new Error(unavailable);}
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error(unavailable);
    if(!response.ok){const error=new Error(typeof data.error==='string'?data.error:'Recall sign-in failed.');error.status=response.status;throw error;}
    return data;
  }
  async function settings(){
    if(!config||now()-configAt>5000){const response=await raw('/auth/config');if(!response.ok)throw new Error(unavailable);let next;try{next=await response.json();}catch{throw new Error(unavailable);}if(!next||!['local','supabase'].includes(next.mode))throw new Error(unavailable);config=next;configAt=now();}
    return config;
  }
  async function session(){return (await chromeApi.storage.session.get(sessionKey))[sessionKey];}
  function valid(value,project){return typeof project==='string'&&value?.project===project&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.user?.id||'')&&typeof value.user.email==='string'&&(value.source==='website'?[value.accessToken]:[value.accessToken,value.refreshToken]).every(token=>typeof token==='string'&&token.length>0&&token.length<=8192)&&Number.isFinite(value.expiresAt)&&value.expiresAt>0;}
  async function status(){const options=await settings(),saved=options.mode==='supabase'?await session():null,known=valid(saved,options.url),connected=known&&(saved.source!=='website'||saved.expiresAt>now()+5000);return {mode:options.mode,connected:options.mode==='local'||connected,scope:options.mode==='local'?'local':known?saved.user.id:null,email:known?saved.user.email:''};}
  async function scope(){const state=await status();if(!state.connected)throw new Error('Sign into Recall on the website, then use Connect through Recall in extension Settings.');return state.scope;}
  async function assertScope(expected){const current=await scope();if(expected!==undefined&&expected!==current)throw new Error('Recall account changed. Refresh this page before continuing.');return current;}
  async function signIn(email,password){
    const current=++revision,options=await settings();if(options.mode!=='supabase')throw new Error('Recall is using its local workspace.');
    const saved=await json('/auth/extension/login',{email,password});
    if(!valid(saved,options.url))throw new Error('Recall returned an invalid account session.');
    if(current!==revision)throw new Error('Sign-in was cancelled. Try again.');
    await store(async()=>{if(current!==revision)throw new Error('Sign-in was cancelled. Try again.');await chromeApi.storage.session.set({[sessionKey]:saved});});return status();
  }
  async function signOut(){revision++;pendingWebsite=null;await store(()=>chromeApi.storage.session.remove(sessionKey));}
  async function connectWebsite(accessToken,owner){
    if(typeof accessToken!=='string'||!accessToken||accessToken.length>8192||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner||''))throw new Error('Invalid website connection.');
    const current=++revision;pendingWebsite=owner;
    try{
      const options=await settings();if(options.mode!=='supabase')return status();
      const previous=await session();
      if(valid(previous,options.url)&&previous.source==='website'&&previous.accessToken===accessToken&&previous.user.id===owner)return status();
      const next=await json('/auth/extension/connect',{accessToken});
      if(!valid(next,options.url)||next.source!=='website'||next.refreshToken!==undefined||next.user.id!==owner||next.expiresAt<=now()+5000)throw new Error('Open Recall and sign in to reconnect.');
      await store(async()=>{
        if(current!==revision)throw new Error('Website connection changed. Reopen Recall to reconnect.');
        const saved=await session();
        if(saved?.source==='website'&&saved.user.id===owner&&saved.expiresAt>next.expiresAt)return;
        await chromeApi.storage.session.set({[sessionKey]:next});
      });return status();
    }finally{if(current===revision)pendingWebsite=null;}
  }
  async function disconnectWebsite(owner){
    // A late sign-out from another account must not disconnect this account.
    const saved=await session();if(pendingWebsite!==owner&&(saved?.source!=='website'||saved.user.id!==owner))return {signedOut:false};
    const current=++revision;pendingWebsite=null;
    await store(async()=>{if(current!==revision)return;const latest=await session();if(latest?.source==='website'&&latest.user.id===owner)await chromeApi.storage.session.remove(sessionKey);});return {signedOut:true};
  }
  async function token(expected){
    const options=await settings();await assertScope(expected);if(options.mode==='local')return null;
    let saved=await session();
    if(!valid(saved,options.url))throw new Error('Sign into your Recall account in extension Settings, then retry.');
    if(saved.expiresAt<=now()+60000&&saved.source!=='website'){
      if(!refreshing||refreshing.revision!==revision||refreshing.owner!==saved.user.id){
        const current=revision,owner=saved.user.id,refreshToken=saved.refreshToken;
        const entry={revision:current,owner};
        entry.promise=json('/auth/extension/refresh',{refreshToken}).then(async next=>{
          if(current!==revision||(await session())?.user.id!==owner)throw new Error('Recall account changed. Refresh this page.');
          if(!valid(next,options.url)||next.user.id!==owner){await signOut();throw new Error('Your session changed. Sign in again in Settings.');}
          await store(async()=>{if(current!==revision)throw new Error('Recall account changed. Refresh this page.');await chromeApi.storage.session.set({[sessionKey]:next});});return next;
        }).catch(async error=>{if(current===revision&&error.status===401)await signOut();throw error;}).finally(()=>{if(refreshing===entry)refreshing=null;});
        refreshing=entry;
      }
      saved=await refreshing.promise;
    }
    const owner=await assertScope(expected);if(saved.user.id!==owner)throw new Error('Recall account changed. Refresh this page.');return saved.accessToken;
  }
  async function request(path,options={},expected){
    const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);signal.throwIfAborted();
    const operation=(async()=>{const owner=await assertScope(expected),access=await token(owner);signal.throwIfAborted();return raw(path,{...options,signal,headers:{...options.headers,'X-Recall-Workspace':owner,...(access?{Authorization:`Bearer ${access}`}:{})}});})();
    try{return await new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});operation.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});}
    catch(error){if(signal.aborted&&!options.signal?.aborted)throw new Error(unavailable,{cause:error});throw error;}
  }
  return {status,scope,assertScope,signIn,signOut,connectWebsite,disconnectWebsite,request,key:workspaceKey};
}
