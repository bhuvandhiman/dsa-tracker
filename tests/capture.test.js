import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { captureInput } from '../apps/api/src/domain.js';
const read = path => readFileSync(new URL('../apps/extension/src/'+path,import.meta.url),'utf8');
const problem={url:'https://leetcode.com/problems/two-sum/',platform:'leetcode',problemId:'two-sum'};
const payload={requestId:'00000000-0000-4000-8000-000000000001',url:problem.url,title:'Two Sum',topics:['Array','Hash Table'],selectedTopics:[],assistance:'hint',attemptedAt:'2025-01-01T00:00:00.000Z'};
function worker(fetcher,storage={}) {
  let listener;
  const context=vm.createContext({URL,AbortSignal,fetch:fetcher,chrome:{
    storage:{local:{async get(key){return {[key]:storage[key]};},async set(data){Object.assign(storage,data);},async remove(key){delete storage[key];}}},
    runtime:{id:'test',onMessage:{addListener(fn){listener=fn;}}},
  }});
  vm.runInContext(read('adapters/leetcode.js'),context);
  vm.runInContext(read('service-worker.js').replace(/^import .*;\r?$/gm,''),context);
  return {context,storage,send(message,sender={id:'test',frameId:0,tab:{id:1},url:problem.url}) {return new Promise(resolve=>listener(message,sender,resolve));}};
}
test('capture maps only problem topics; skipped selections use inferred defaults',()=>{
  const input=captureInput(payload);
  assert.deepEqual(input.attempt.patternSlugs,['arrays-hashing']);
  assert.equal(input.attempt.patternSource,'inferred');
  assert.equal(captureInput({...payload,selectedTopics:['Hash Table']}).attempt.patternSource,'explicit');
  assert.deepEqual(captureInput({...payload,topics:[]}).problem.patternSlugs,['uncategorized']);
  assert.throws(()=>captureInput({...payload,selectedTopics:['Trees']}),{status:400});
  assert.throws(()=>captureInput({...payload,url:'https://evil.test/'}),{status:400});
  assert.throws(()=>captureInput({...payload,assistance:''}),{status:400});
});
test('worker uses a fixed API destination and persists the exact draft before sending',async()=>{
  let ui;
  ui=worker(async(url,options)=>{
    assert.equal(url,'http://127.0.0.1:3001/api/capture');assert.equal(options.credentials,'omit');
    assert.deepEqual(ui.storage['recall-pending:'+problem.url],payload);
    return {ok:true,json:async()=>({attempt:{id:payload.requestId}})};
  });
  assert.equal((await ui.send({type:'SAVE_CAPTURE',problem,payload})).saved,true);
  assert.equal(Object.keys(ui.storage).length,0);
});
test('offline draft survives worker restart and retries without a new request ID',async()=>{
  const storage={};const failed=worker(async()=>{throw new Error('offline');},storage);
  assert.equal((await failed.send({type:'SAVE_CAPTURE',problem,payload})).saved,false);
  const restarted=worker(async(_url,options)=>{
    assert.equal(JSON.parse(options.body).requestId,payload.requestId);
    return {ok:true,json:async()=>({attempt:{id:payload.requestId}})};
  },storage);
  assert.equal((await restarted.send({type:'GET_PENDING_CAPTURE',problem})).pending.requestId,payload.requestId);
  const changed=await restarted.send({type:'SAVE_CAPTURE',problem,payload:{...payload,assistance:'solution'}});
  assert.equal(changed.saved,false);
  assert.equal((await restarted.send({type:'SAVE_CAPTURE',problem,payload})).saved,true);
});
test('invalid senders cannot read drafts or ask the worker to write',async()=>{
  const ui=worker(()=>assert.fail('No fetch expected'));
  for(const sender of [{},{id:'other',frameId:0,tab:{id:1},url:problem.url},{id:'test',frameId:1,tab:{id:1},url:problem.url},{id:'test',frameId:0,tab:{id:1},url:'https://leetcode.com/problems/3sum/'}]) {
    assert.equal((await ui.send({type:'SAVE_CAPTURE',problem,payload},sender)).saved,false);
  }
});
test('definitive validation failures unlock editing; uncertain failures retain the draft',async()=>{
  for(const status of [400,503,409]) {
    const ui=worker(async()=>({ok:false,status,json:async()=>({error:'test failure'})}));
    const result=await ui.send({type:'SAVE_CAPTURE',problem,payload});
    assert.equal(result.saved,false);assert.equal(Boolean(result.editable),status===400);
    assert.equal(Object.keys(ui.storage).length,status===400?0:1);
  }
});
test('topic extraction accepts LeetCode tag links only and deduplicates',()=>{
  const ui=worker(()=>{});const adapter=ui.context.DsaAdapters[0];
  const parentElement={firstElementChild:{textContent:'Topics'}};
  const doc={querySelectorAll:()=>[
    {href:'https://leetcode.com/tag/array/',textContent:'Array',parentElement},
    {href:'https://leetcode.com/tag/hash-table/',textContent:'Hash Table',parentElement},
    {href:'https://evil.test/tag/trees/',textContent:'Trees',parentElement},
    {href:'https://leetcode.com/tag/array/',textContent:'Array'},
  ]};
  assert.deepEqual(Array.from(adapter.getTopics(doc)),['Array','Hash Table']);
});
test('adapter recognizes Submit but excludes Run and repeated shortcuts',()=>{
  const adapter=worker(()=>{}).context.DsaAdapters[0];
  assert.equal(adapter.isSubmitShortcut({key:'Enter',ctrlKey:true}),true);
  assert.equal(adapter.isSubmitShortcut({key:'Enter',ctrlKey:true,repeat:true}),false);
  assert.equal(adapter.isSubmit({closest:()=>null}),false);
});
