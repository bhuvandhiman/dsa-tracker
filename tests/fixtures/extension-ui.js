/* QA-only Chrome and API simulation. These pages never contact LeetCode or PostgreSQL. */
const fixtureChanges=new Set();
const initialSetup={installationId:'00000000-0000-4000-8000-000000000001',decision:'pending',offset:0};
const fixtureStorage={
  async get(keys){const result={};for(const key of Array.isArray(keys)?keys:[keys]){const raw=localStorage.getItem(key);result[key]=raw?JSON.parse(raw):key==='legacySetup'?initialSetup:undefined;}return result;},
  async set(values){for(const [key,value] of Object.entries(values)){localStorage.setItem(key,JSON.stringify(value));for(const listener of fixtureChanges)listener({[key]:{newValue:value}},'local');}},
  async remove(key){localStorage.removeItem(key);},
};
globalThis.chrome={storage:{local:fixtureStorage,onChanged:{addListener:listener=>fixtureChanges.add(listener),removeListener:listener=>fixtureChanges.delete(listener)}},
  runtime:{getURL:path=>location.origin+'/'+path,async sendMessage(message){
    if(message.type==='PING')return {status:'worker-ready',version:'UI fixture'};
    const account=JSON.parse(sessionStorage.getItem('fixture-account')||'null');
    if(message.type==='RECALL_ACCOUNT_STATUS')return {mode:'supabase',connected:Boolean(account),scope:account?.id||null,email:account?.email||''};
    if(message.type==='RECALL_OPEN_WEBSITE'){
      const next={id:'fa631c58-72ad-4a67-89d8-f6a4ae5d1641',email:'fixture@example.test'};
      sessionStorage.setItem('fixture-account',JSON.stringify(next));
      setTimeout(()=>{for(const listener of fixtureChanges)listener({'recall-account-session':{newValue:{user:next}}},'session');},0);return {opened:true};
    }
    if(message.type==='RECALL_SIGN_IN'){
      if(message.password!=='fixture-password')return {error:'Check your email and password, and confirm your email before signing in.'};
      sessionStorage.setItem('fixture-account',JSON.stringify({id:message.email.startsWith('other')?'ea631c58-72ad-4a67-89d8-f6a4ae5d1642':'fa631c58-72ad-4a67-89d8-f6a4ae5d1641',email:message.email}));return {connected:true};
    }
    if(message.type==='RECALL_SIGN_OUT'){sessionStorage.removeItem('fixture-account');return {signedOut:true};}
    if(!account)return {error:'Sign into your Recall account in extension Settings, then retry.'};
    if(message.workspaceScope!==undefined&&message.workspaceScope!==account.id)return {error:'Recall account changed. Refresh this page.'};
    const key=name=>'fixture-user:'+account.id+':'+name;
    if(message.type==='LEGACY_SETUP_STATE'){const stored=(await fixtureStorage.get(key('legacySetup')))[key('legacySetup')];if(!stored)await fixtureStorage.set({[key('legacySetup')]:initialSetup});return {...stored||initialSetup,workspaceScope:account.id};}
    if(message.type==='RECALL_STATE_GET'){const names=message.names,values=await fixtureStorage.get(names.map(key));return {data:Object.fromEntries(names.map(name=>[name,values[key(name)]]))};}
    if(message.type==='RECALL_STATE_SET'){await fixtureStorage.set(Object.fromEntries(Object.entries(message.values).map(([name,value])=>[key(name),value])));return {kept:true};}
    if(message.type==='RECALL_STATE_REMOVE'){for(const name of message.names)await fixtureStorage.remove(key(name));return {kept:true};}
    if(message.type==='RECALL_API')return {data:message.path==='/ready'?{status:'ready',account:'fixture-account'}:message.method==='POST'?{completed:message.path==='/imports/recent'||message.body.complete===true,added:1,alreadyPresent:0,excluded:0}:{completed:false}};
    if(message.type==='LIST_RECORDINGS')return {records:[]};
    return {};
  }},
  tabs:{async query(){return [{id:1,active:true}];},async create({url}){location.href=url;},async sendMessage(_id,message){
    if(message.type==='GET_CURRENT_PROBLEM')return {status:'content-script-ready',problem:{platform:'leetcode',problemId:'two-sum',url:'https://leetcode.com/problems/two-sum/',title:'Two Sum'}};
    if(message.type==='READ_IMPORT_ACCOUNT')return {data:{username:'fixture-account'}};
    if(message.type==='GET_ACCOUNT_STATUS')return {username:'fixture-account'};
    if(message.type==='SHOW_RECORDER')return {opened:true};
    if(message.type==='SCAN_LEGACY_PROBLEMS')return {data:{username:'fixture-account',problems:[{slug:'two-sum'}]}};
    if(message.type==='READ_LEGACY_TOPICS')return {data:[{url:'https://leetcode.com/problems/two-sum/',title:'Two Sum',difficulty:'easy',topics:['Array','Hash Table']}]};
    if(message.type==='READ_RECENT_SUBMISSIONS')return {data:{username:'fixture-account',submissions:[]}};
    return {};
  }},
};
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url,location.href).pathname;
  let data={completed:false};
  if(path.endsWith('/ready'))data={status:'ready',account:'fixture-account'};
  if(options.method==='POST')data={added:1,alreadyPresent:0,excluded:0};
  return {ok:true,json:async()=>data};
};
