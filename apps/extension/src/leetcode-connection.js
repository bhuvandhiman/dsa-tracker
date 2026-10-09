const connectionError = () => new Error('Recall could not connect to LeetCode. Allow Recall access to leetcode.com in Chrome extension settings, reload Recall, then retry. Your import checkpoint is saved.');

function waitForLoad(tabs, id) {
  return new Promise((resolve,reject) => {
    const finish=error=>{clearTimeout(timer);tabs.onUpdated.removeListener(updated);error?reject(error):resolve();};
    const updated=(tabId,change)=>{if(tabId===id&&change.status==='complete')finish();};
    const timer=setTimeout(()=>finish(connectionError()),25000);
    tabs.onUpdated.addListener(updated);
    tabs.get(id).then(tab=>{if(tab.status==='complete')finish();},()=>finish(connectionError()));
  });
}

// Reloading the extension invalidates receivers in existing tabs. A fresh tab
// loads current scripts without refreshing an editor with unfinished work.
export async function connectLeetCode(chromeApi,onReconnect=()=>{}) {
  const tabs=await chromeApi.tabs.query({url:'https://leetcode.com/*'});
  let tab=tabs.find(item=>item.active)||tabs[0];
  if(!tab)throw new Error('Open LeetCode in Chrome and sign in, then retry.');
  let recovered=false;
  return async function read(type,extra={}) {
    const message={type,...extra};
    let result;
    try {result=await chromeApi.tabs.sendMessage(tab.id,message);}
    catch {
      if(recovered)throw connectionError();
      recovered=true;onReconnect();
      try {
        tab=await chromeApi.tabs.create({url:'https://leetcode.com/problemset/',active:false});
        if(tab.status!=='complete')await waitForLoad(chromeApi.tabs,tab.id);
        // document_idle can follow the load event by a brief interval.
        for(let attempt=0;attempt<10;attempt++) {
          try {result=await chromeApi.tabs.sendMessage(tab.id,message);break;}
          catch {if(attempt===9)throw connectionError();await new Promise(resolve=>setTimeout(resolve,100));}
        }
      }catch {throw connectionError();}
    }
    if(result?.error)throw Object.assign(new Error(result.error),{code:result.code,retryable:result.retryable===true,retryAfter:result.retryAfter||0});
    if(!result?.data)throw new Error('LeetCode did not provide the expected data. Retry when the page is available.');
    return result.data;
  };
}
