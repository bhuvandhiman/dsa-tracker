import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/extension/src/setup-retention.js',import.meta.url),'utf8');
function setup({fail=false,wrongAccount=false}={}) {
  const button={addEventListener(_event,fn){this.click=fn;},hidden:true},status={textContent:''};
  const storage={legacySetup:{installationId:'11111111-1111-4111-8111-111111111111',decision:'complete',username:'alice'}};
  let completed=false,writes=0,reads=0;
  const context=vm.createContext({URL,AbortSignal,document:{querySelector:s=>s==='#initialize-retention'?button:status,addEventListener(){}},navigator:{locks:{request:async(_name,_options,fn)=>fn({})}},chrome:{storage:{local:{get:async()=>storage,set:async data=>Object.assign(storage,data)}},tabs:{query:async()=>[{id:1}],sendMessage:async(_id,message)=>{reads++;return {data:message.type==='READ_RECENT_SUBMISSIONS'?{username:wrongAccount?'bob':'alice',submissions:[{submissionId:'123',slug:'coin-change',submittedAt:'2025-01-01T00:00:00.000Z'}]}:[{url:'https://leetcode.com/problems/coin-change/',title:'Coin Change',topics:['Dynamic Programming']}]};}}},fetch:async(_url,options)=>{
    if(options.method==='POST'){writes++;completed=true;if(fail)throw new Error('Lost response');}
    return {ok:true,json:async()=>({completed})};
  }});
  vm.runInContext(source,context);
  return {button,status,storage,get writes(){return writes;},get reads(){return reads;}};
}
test('existing installs initialize once, preserve a lost-response snapshot, and recover without rewriting',async()=>{
  const test=setup({fail:true});await Promise.resolve();await test.button.click();
  assert.equal(test.writes,1);assert.equal(test.storage.retentionSetup.complete,undefined);assert.equal(test.storage.retentionSetup.snapshot.submissions.length,1);
  const reads=test.reads;await test.button.click();assert.equal(test.storage.retentionSetup.complete,true);assert.equal(test.writes,1);assert.equal(test.reads,reads);assert.equal(test.button.hidden,true);
});
test('initialization rejects account changes before storing dated evidence',async()=>{
  const test=setup({wrongAccount:true});await test.button.click();assert.equal(test.writes,0);assert.match(test.status.textContent,/same LeetCode account/);
});
