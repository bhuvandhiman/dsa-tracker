// Only this isolated content script can forward website messages. The worker
// independently checks the exact origin, top frame and Supabase identity.
(() => {
  if(window!==window.top)return;
  const nonce=crypto.randomUUID(),channel='recall-website-auth-v1';
  const hello=()=>window.postMessage({channel,type:'HELLO',nonce},location.origin);
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!==channel)return;
    if(event.data.type==='READY'){hello();return;}
    if(event.data.type!=='SESSION'||event.data.nonce!==nonce)return;
    const {accessToken,owner}=event.data;
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner||'')||!(accessToken===null||typeof accessToken==='string'&&accessToken.length>0&&accessToken.length<=8192))return;
    void chrome.runtime.sendMessage({type:'RECALL_WEBSITE_SESSION',accessToken,owner}).catch(()=>{/* Reloading the extension requires refreshing this website tab. */});
  });
  hello();
})();
