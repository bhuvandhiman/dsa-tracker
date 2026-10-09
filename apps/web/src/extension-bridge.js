const channel='recall-website-auth-v1';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// Transfer short-lived access only, never passwords or refresh credentials.
// The extension validates the token with Supabase before trusting its owner.
export function connectWebsiteExtension(client,target=window,onState=()=>{}){
  let active=true,nonce=null,lastOwner=null,signedOutOwner=null,revision=0;
  const pending=new Map();
  let sessionRevision=null;
  const report=value=>{if(active)onState(value);};
  function publish(session){
    if(!active||!uuid.test(session?.user?.id||'')||typeof session.access_token!=='string'||!session.access_token||session.access_token.length>8192)return;
    lastOwner=session.user.id;signedOutOwner=null;
    if(!nonce)return;
    sessionRevision=crypto.randomUUID();
    target.postMessage({channel,type:'SESSION',nonce,owner:lastOwner,accessToken:session.access_token,sessionRevision},target.location.origin);
  }
  const subscription=client?.auth.onAuthStateChange((event,session)=>{
    revision++;
    if(event==='SIGNED_OUT'&&lastOwner){signedOutOwner=lastOwner;lastOwner=null;report({detected:Boolean(nonce),connected:false});if(nonce)target.postMessage({channel,type:'SESSION',nonce,owner:signedOutOwner,accessToken:null},target.location.origin);}
    else publish(session);
  }).data.subscription;
  function receive(event){
    if(event.source!==target||event.origin!==target.location.origin||event.data?.channel!==channel)return;
    if(event.data.type==='RESULT'&&nonce&&event.data.nonce===nonce){
      const entry=pending.get(event.data.requestId);
      if(entry){pending.delete(event.data.requestId);clearTimeout(entry.timer);event.data.error?entry.reject(new Error(event.data.error)):entry.resolve(event.data.data);}
      return;
    }
    if(event.data.type==='CONNECTED'&&nonce&&event.data.nonce===nonce&&event.data.owner===lastOwner&&event.data.sessionRevision===sessionRevision){report({detected:true,connected:!event.data.error&&event.data.connected===true,error:event.data.error||''});return;}
    if(event.data.type!=='HELLO'||!uuid.test(event.data.nonce||''))return;
    nonce=event.data.nonce;
    report({detected:true,connected:false,outdated:event.data.protocol!==3});
    if(signedOutOwner)target.postMessage({channel,type:'SESSION',nonce,owner:signedOutOwner,accessToken:null},target.location.origin);
    const current=++revision;
    if(!client)return;
    // Run outside SDK auth callbacks; a stale getSession must not undo sign-out.
    void client.auth.getSession().then(({data,error})=>{if(active&&current===revision&&!error)publish(data.session);}).catch(()=>{});
  }
  target.addEventListener('message',receive);
  target.postMessage({channel,type:'READY'},target.location.origin);
  const stop=()=>{active=false;revision++;subscription?.unsubscribe();target.removeEventListener('message',receive);for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(new Error('Connection closed.'));}pending.clear();};
  stop.request=(action)=>new Promise((resolve,reject)=>{
    if(!active||!nonce)return reject(new Error('Extension not detected. Install or reload Recall, then refresh this website tab.'));
    if(!['STATUS','OPEN_IMPORT','START_IMPORT','PAUSE_IMPORT','CHECK_LEETCODE'].includes(action))return reject(new Error('Unknown connection action.'));
    const requestId=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('The extension did not respond. Reload it in Chrome Extensions, then refresh this website tab.'));},20000);
    pending.set(requestId,{resolve,reject,timer});
    target.postMessage({channel,type:'REQUEST',nonce,requestId,action,owner:lastOwner||(!client?'local':null)},target.location.origin);
  });
  return stop;
}
