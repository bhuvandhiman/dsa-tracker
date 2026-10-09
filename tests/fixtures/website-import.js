/* QA-only website bridge. Uses the real import controller with simulated data. */
import {createImportController} from '../../apps/extension/src/import-controller.js';
import {connectionAction} from '../../apps/extension/src/connection-flow.js';
const variant=new URLSearchParams(location.search).get('fixture'),channel='recall-website-auth-v1',nonce=crypto.randomUUID();
const namespace='website-import-fixture:',delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const storage={async get(names){return Object.fromEntries(names.map(name=>[name,JSON.parse(localStorage.getItem(namespace+name)||'null')]));},async set(values){for(const [name,value] of Object.entries(values))localStorage.setItem(namespace+name,JSON.stringify(value));}};
const account={key:(scope,name)=>scope+':'+name,async assertScope(owner){if(owner!=='local')throw new Error('Fixture account changed');return owner;},async localScope(owner){return this.assertScope(owner);},async request(path,options){await delay(1000);const body=options.body?JSON.parse(options.body):null;return Response.json({completed:body?path==='/imports/recent'||body.complete===true:false});}};
const chromeApi={storage:{local:storage}};
const connect=async()=>async(type,extra)=>{
  await delay(1000);if(variant==='failed')throw new Error('Open LeetCode in Chrome and sign in, then retry.');
  if(type==='READ_IMPORT_ACCOUNT')return {username:'fixture-account'};
  if(type==='SCAN_LEGACY_PROBLEMS')return {username:'fixture-account',problems:Array.from({length:23},(_,index)=>({slug:'fixture-problem-'+(index+1)}))};
  if(type==='READ_LEGACY_TOPICS')return extra.slugs.map(slug=>({url:`https://leetcode.com/problems/${slug}/`,title:slug,difficulty:'easy',topics:['Array']}));
  return {username:'fixture-account',submissions:[]};
};
const importer=createImportController({account,chromeApi,connect,retry:operation=>operation()});
function post(value){window.postMessage({channel,nonce,...value},location.origin);}
window.addEventListener('message',async event=>{
  const message=event.data;
  if(event.source!==window||event.origin!==location.origin||message?.channel!==channel||variant==='missing')return;
  if(message.type==='READY'){post({type:'HELLO',protocol:variant==='outdated'?2:3});return;}
  if(message.type!=='REQUEST'||message.nonce!==nonce)return;
  try{
    const data=message.action==='CHECK_LEETCODE'?{username:'fixture-account'}:await connectionAction({action:message.action,owner:message.owner,account,chromeApi,importer});
    post({type:'RESULT',requestId:message.requestId,data});
  }catch(error){post({type:'RESULT',requestId:message.requestId,error:error.message});}
});
if(variant!=='missing')post({type:'HELLO',protocol:variant==='outdated'?2:3});
