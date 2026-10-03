const channel='recall-website-auth-v1';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// Transfer short-lived access only, never passwords or refresh credentials.
// The extension validates the token with Supabase before trusting its owner.
export function connectWebsiteExtension(client,target=window){
  let active=true,nonce=null,lastOwner=null,signedOutOwner=null,revision=0;
  function publish(session){
    if(!active||!uuid.test(session?.user?.id||'')||typeof session.access_token!=='string'||!session.access_token||session.access_token.length>8192)return;
    lastOwner=session.user.id;signedOutOwner=null;
    if(!nonce)return;
    target.postMessage({channel,type:'SESSION',nonce,owner:lastOwner,accessToken:session.access_token},target.location.origin);
  }
  const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
    revision++;
    if(event==='SIGNED_OUT'&&lastOwner){signedOutOwner=lastOwner;lastOwner=null;if(nonce)target.postMessage({channel,type:'SESSION',nonce,owner:signedOutOwner,accessToken:null},target.location.origin);}
    else publish(session);
  });
  function receive(event){
    if(event.source!==target||event.origin!==target.location.origin||event.data?.channel!==channel||event.data.type!=='HELLO'||!uuid.test(event.data.nonce||''))return;
    nonce=event.data.nonce;
    if(signedOutOwner)target.postMessage({channel,type:'SESSION',nonce,owner:signedOutOwner,accessToken:null},target.location.origin);
    const current=++revision;
    // Run outside SDK auth callbacks; a stale getSession must not undo sign-out.
    void client.auth.getSession().then(({data,error})=>{if(active&&current===revision&&!error)publish(data.session);}).catch(()=>{});
  }
  target.addEventListener('message',receive);
  target.postMessage({channel,type:'READY'},target.location.origin);
  return ()=>{active=false;revision++;subscription.unsubscribe();target.removeEventListener('message',receive);};
}
