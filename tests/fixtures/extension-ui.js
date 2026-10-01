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
    if(message.type==='LEGACY_SETUP_STATE')return (await fixtureStorage.get('legacySetup')).legacySetup;
    if(message.type==='LIST_RECORDINGS')return {records:[{kind:'draft',url:'https://leetcode.com/problems/two-sum/',value:{}},{kind:'queue',url:'https://leetcode.com/problems/3sum/',value:[{},{}]}]};
    return {};
  }},
  tabs:{async query(){return [{id:1,active:true}];},async create({url}){location.href=url;},async sendMessage(_id,message){
    if(message.type==='GET_CURRENT_PROBLEM')return {status:'content-script-ready',problem:{platform:'leetcode',problemId:'two-sum',url:'https://leetcode.com/problems/two-sum/',title:'Two Sum'}};
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
