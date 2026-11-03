// Only this isolated content script can forward website messages. The worker
// independently checks the exact origin, top frame and Supabase identity.
(() => {
  if(window!==window.top)return;
  const nonce=crypto.randomUUID(),channel='recall-website-auth-v1',identity=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const hello=()=>window.postMessage({channel,type:'HELLO',nonce,protocol:4},location.origin);
  const token=value=>typeof value==='string'&&value.length>0&&value.length<=8192;
  chrome.runtime.onMessage.addListener((message,sender)=>{
    if(sender.id!==chrome.runtime.id||!(message?.type==='RECALL_PRACTICE_CHANGED'||message?.type==='RECALL_SESSION_ROTATED')||!(message.owner==='local'||identity.test(message.owner||'')))return;
    if(message.type==='RECALL_PRACTICE_CHANGED'){
      if(!identity.test(message.changeId||''))return;
      window.postMessage({channel,type:'PRACTICE_CHANGED',nonce,owner:message.owner,changeId:message.changeId},location.origin);return;
    }
    // Rotation: the page adopts the new refresh credential so one token family
    // serves both sides and no rotated token is ever reused.
    if(!token(message.accessToken)||!token(message.refreshToken))return;
    window.postMessage({channel,type:'SESSION_ROTATED',nonce,owner:message.owner,accessToken:message.accessToken,refreshToken:message.refreshToken},location.origin);
  });
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!==channel)return;
    if(event.data.type==='READY'){hello();return;}
    if(event.data.type==='REQUEST'&&event.data.nonce===nonce&&typeof event.data.requestId==='string'&&event.data.requestId.length<=40&&['STATUS','OPEN_IMPORT','START_IMPORT','PAUSE_IMPORT','CHECK_LEETCODE'].includes(event.data.action)){
      const {requestId,action,owner}=event.data;
      void chrome.runtime.sendMessage({type:'RECALL_WEBSITE_ACTION',action,owner}).then(result=>window.postMessage({channel,type:'RESULT',nonce,requestId,data:result?.data,error:result?.error},location.origin)).catch(()=>window.postMessage({channel,type:'RESULT',nonce,requestId,error:'Reload Recall in Chrome Extensions, then refresh this website tab.'},location.origin));
      return;
    }
    if(event.data.type!=='SESSION'||event.data.nonce!==nonce)return;
    const {accessToken,owner,refreshToken,sessionRevision}=event.data;
    if(!identity.test(owner||'')||!(accessToken===null||token(accessToken))||(refreshToken!==undefined&&!token(refreshToken)))return;
    void chrome.runtime.sendMessage({type:'RECALL_WEBSITE_SESSION',accessToken,owner,...(refreshToken?{refreshToken}:{})}).then(result=>window.postMessage({channel,type:'CONNECTED',nonce,owner,sessionRevision,connected:result?.connected===true,error:result?.error},location.origin)).catch(()=>window.postMessage({channel,type:'CONNECTED',nonce,owner,sessionRevision,connected:false,error:'Reload Recall in Chrome Extensions, then refresh this website tab.'},location.origin));
  });
  hello();
})();
