// Return only onboarding summaries, never tokens, full snapshots or drafts.
export async function connectionAction({action,owner,account,chromeApi,importer}){
  const scope=await account.assertScope(owner);
  if(action==='START_IMPORT')return importer.start(scope);
  if(action==='PAUSE_IMPORT')return importer.pause(scope);
  if(action==='OPEN_IMPORT'){
    const base=chromeApi.runtime.getURL('setup.html');
    const tabs=await chromeApi.tabs.query({});
    const tab=tabs.find(item=>item.url?.split('#')[0]===base);
    await account.assertScope(scope);
    const url=base+'#start-import-'+Date.now();
    if(tab)await chromeApi.tabs.update(tab.id,{active:true,url});else await chromeApi.tabs.create({url});
    return {opened:true};
  }
  if(action==='CHECK_LEETCODE'){
    const tabs=await chromeApi.tabs.query({url:'https://leetcode.com/*'});
    const tab=tabs.find(item=>item.active)||tabs[0];
    if(!tab)throw new Error('Open LeetCode in this Chrome profile and sign in, then check again.');
    let result;try{result=await chromeApi.tabs.sendMessage(tab.id,{type:'GET_ACCOUNT_STATUS'});}catch{throw new Error('Refresh your LeetCode tab, then check again.');}
    if(!result?.username)throw new Error(result?.error||'Sign in to LeetCode, then check again.');
    await account.assertScope(scope);
    return {username:result.username};
  }
  if(action!=='STATUS')throw new Error('Unknown connection action.');
  const keys=['legacySetup','retentionSetup','importProgress'].map(name=>account.key(scope,name));
  const stored=await chromeApi.storage.local.get(keys);
  await account.assertScope(scope);
  const legacy=stored[keys[0]],recent=stored[keys[1]],progress=stored[keys[2]];
  const running=importer?.running(scope)===true,pausing=importer?.pausing(scope)===true;
  const phase=progress?.phase==='error'||progress?.phase==='paused'||running?progress?.phase:null;
  return {connected:true,scope,import:{decision:legacy?.decision||'pending',saved:legacy?.count??legacy?.offset??(legacy?.decision==='complete'?null:0),total:legacy?.count??legacy?.snapshot?.length??null,datesComplete:recent?.complete===true,running,pausing,phase,error:phase==='error'?progress.error||'':'',message:running?progress?.message||'':''}};
}

export async function openRecallWebsite(chromeApi,origin){
  const tabs=await chromeApi.tabs.query({url:origin+'/*'});
  const tab=tabs.find(item=>{try{return new URL(item.url).origin===origin;}catch{return false;}});
  if(tab){await chromeApi.tabs.update(tab.id,{active:true,url:origin+'/#/connect'});if(chromeApi.windows&&tab.windowId!==undefined)await chromeApi.windows.update(tab.windowId,{focused:true});}
  else await chromeApi.tabs.create({url:origin+'/#/connect'});
  return {opened:true};
}
