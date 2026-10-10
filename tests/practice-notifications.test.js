import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {notifyPracticeChanged} from '../apps/extension/src/practice-notifications.js';
import {recallRuntime} from '../apps/extension/src/runtime-config.js';
import {connectWebsiteExtension} from '../apps/web/src/extension-bridge.js';

const owner='fa631c58-72ad-4a67-89d8-f6a4ae5d1641',other='ea631c58-72ad-4a67-89d8-f6a4ae5d1642',nonce='00000000-0000-4000-8000-000000000001';
const channel='recall-website-auth-v1';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function target(){
  let listener;const messages=[];
  const window={location:{origin:recallRuntime.websiteOrigin},messages,addEventListener(_name,fn){listener=fn;},removeEventListener(){listener=null;},postMessage(data,origin){messages.push({data,origin});},dispatch(data,extra={}){listener?.({source:window,origin:window.location.origin,data,...extra});}};
  window.top=window;return window;
}

test('confirmed writes notify only configured website tabs and tolerate closed tabs',async()=>{
  const calls=[];
  const chrome={tabs:{async query(filter){assert.equal(filter.url,recallRuntime.websiteOrigin+'/*');return [{id:1,url:recallRuntime.websiteOrigin+'/#/dashboard'},{id:2,url:recallRuntime.websiteOrigin+'/#/patterns'},{id:3,url:'https://leetcode.com/problems/two-sum/'},{id:4,url:recallRuntime.websiteOrigin+'.evil.test/'},{id:5}];},async sendMessage(id,message,options){calls.push({id,message,options});if(id===2)throw new Error('Tab closed');}}};
  await notifyPracticeChanged(chrome,owner,nonce);
  assert.deepEqual(calls.map(call=>call.id),[1,2]);
  assert.deepEqual(calls[0],{id:1,message:{type:'RECALL_PRACTICE_CHANGED',owner,changeId:nonce},options:{frameId:0}});
  await notifyPracticeChanged({tabs:{async query(){throw new Error('Browser unavailable');}}},owner,nonce);
});

test('isolated content script forwards valid worker notifications without private practice data',()=>{
  const window=target();let receive;
  vm.runInNewContext(readFileSync(new URL('../apps/extension/src/website-bridge.js',import.meta.url),'utf8'),{window,location:window.location,crypto:{randomUUID:()=>nonce},chrome:{runtime:{id:'recall',onMessage:{addListener(fn){receive=fn;}}}}});
  assert.equal(window.messages[0].data.protocol,4);
  const message={type:'RECALL_PRACTICE_CHANGED',owner,changeId:other,accessToken:'never-transfer',problems:['private']};
  receive(message,{id:'foreign'});receive({...message,owner:'bad'},{id:'recall'});receive({...message,changeId:'bad'},{id:'recall'});
  assert.equal(window.messages.length,1);
  receive(message,{id:'recall'});
  assert.deepEqual(JSON.parse(JSON.stringify(window.messages[1])),{data:{channel,type:'PRACTICE_CHANGED',nonce,owner,changeId:other},origin:recallRuntime.websiteOrigin});
});

test('website refreshes once per change for its current account and rejects stale or foreign notifications',async()=>{
  const window=target();let change,reads=0;
  const stop=connectWebsiteExtension({auth:{onAuthStateChange(fn){change=fn;return {data:{subscription:{unsubscribe(){}}}};},async getSession(){return {data:{session:{user:{id:owner},access_token:'fixture'}}};}}},window,()=>{},()=>{reads++;});
  window.dispatch({channel,type:'HELLO',nonce,protocol:4});await tick();
  const message={channel,type:'PRACTICE_CHANGED',nonce,owner,changeId:other};
  window.dispatch(message,{origin:'https://evil.test'});window.dispatch(message,{source:{}});window.dispatch({...message,nonce:other});window.dispatch({...message,owner:other});window.dispatch({...message,changeId:'invalid'});
  assert.equal(reads,0);
  window.dispatch(message);window.dispatch(message);assert.equal(reads,1);
  change('SIGNED_OUT',null);window.dispatch({...message,changeId:owner});assert.equal(reads,1);
  stop();window.dispatch({...message,changeId:owner});assert.equal(reads,1);
});

test('local website accepts only local practice notifications',()=>{
  const window=target();let reads=0;
  const stop=connectWebsiteExtension(null,window,()=>{},()=>{reads++;});
  window.dispatch({channel,type:'HELLO',nonce,protocol:4});
  window.dispatch({channel,type:'PRACTICE_CHANGED',nonce,owner,changeId:other});assert.equal(reads,0);
  window.dispatch({channel,type:'PRACTICE_CHANGED',nonce,owner:'local',changeId:other});assert.equal(reads,1);stop();
});
