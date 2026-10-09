// Only this isolated content script can forward website messages. The worker
// independently checks the exact origin, top frame and Supabase identity.
(() => {
  if(window!==window.top)return;
  const nonce=crypto.randomUUID(),channel='recall-website-auth-v1';
  const hello=()=>window.postMessage({channel,type:'HELLO',nonce,protocol:3},location.origin);
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!==channel)return;
    if(event.data.type==='READY'){hello();return;}
    if(event.data.type==='REQUEST'&&event.data.nonce===nonce&&typeof event.data.requestId==='string'&&event.data.requestId.length<=40&&['STATUS','OPEN_IMPORT','START_IMPORT','PAUSE_IMPORT','CHECK_LEETCODE'].includes(event.data.action)){
      const {requestId,action,owner}=event.data;
      void chrome.runtime.sendMessage({type:'RECALL_WEBSITE_ACTION',action,owner}).then(result=>window.postMessage({channel,type:'RESULT',nonce,requestId,data:result?.data,error:result?.error},location.origin)).catch(()=>window.postMessage({channel,type:'RESULT',nonce,requestId,error:'Reload Recall in Chrome Extensions, then refresh this website tab.'},location.origin));
      return;
    }
    if(event.data.type!=='SESSION'||event.data.nonce!==nonce)return;
    const {accessToken,owner,sessionRevision}=event.data;
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner||'')||!(accessToken===null||typeof accessToken==='string'&&accessToken.length>0&&accessToken.length<=8192))return;
    void chrome.runtime.sendMessage({type:'RECALL_WEBSITE_SESSION',accessToken,owner}).then(result=>window.postMessage({channel,type:'CONNECTED',nonce,owner,sessionRevision,connected:result?.connected===true,error:result?.error},location.origin)).catch(()=>window.postMessage({channel,type:'CONNECTED',nonce,owner,sessionRevision,connected:false,error:'Reload Recall in Chrome Extensions, then refresh this website tab.'},location.origin));
  });
  hello();
})();
