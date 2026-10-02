import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { captureInput } from '../apps/api/src/domain.js';
const read = path => readFileSync(new URL('../apps/extension/src/'+path,import.meta.url),'utf8');
const problem={url:'https://leetcode.com/problems/two-sum/',platform:'leetcode',problemId:'two-sum'};
const payload={requestId:'00000000-0000-4000-8000-000000000001',url:problem.url,title:'Two Sum',difficulty:'easy',topics:['Array','Hash Table'],selectedTopics:[],assistance:'hint',attemptedAt:'2025-01-01T00:00:00.000Z'};
function worker(fetcher,storage={},account) {
  let listener;
  const context=vm.createContext({URL,AbortSignal,fetch:fetcher,trustedPage:sender=>sender.id==='test',recallAccount:account||{scope:async()=>'local',assertScope:async()=>'local',key:(_scope,key)=>key,request:(path,options)=>fetcher('http://127.0.0.1:3001/api'+path,options)},chrome:{
    storage:{local:{async get(key){return key===null?{...storage}:Object.fromEntries((Array.isArray(key)?key:[key]).map(k=>[k,storage[k]]));},async set(data){Object.assign(storage,data);},async remove(key){delete storage[key];}}},
    runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener(fn){listener=fn;}}},
  }});
  vm.runInContext(read('adapters/leetcode.js'),context);
  vm.runInContext(read('service-worker.js').replace(/^import .*;\r?$/gm,''),context);
  return {context,storage,send(message,sender={id:'test',frameId:0,tab:{id:1},url:problem.url}) {return new Promise(resolve=>listener(message,sender,resolve));}};
}
test('worker isolates pending recordings and rejects stale account captures',async()=>{
  let scope='a';let requests=0;const storage={['recall-pending:'+problem.url]:payload};
  const account={scope:async()=>scope,assertScope:async expected=>{if(expected!==scope)throw new Error('Account changed');return scope;},key:(owner,key)=>`recall-user:${owner}:${key}`,request:async()=>{requests++;throw new Error('offline');}};
  const ui=worker(()=>assert.fail('Unexpected request'),storage,account);
  await ui.send({type:'SAVE_CAPTURE',problem,payload,workspaceScope:'a'});
  assert.equal(requests,1);assert.equal((await ui.send({type:'GET_PENDING_CAPTURE',problem})).pending.requestId,payload.requestId);
  scope='b';assert.equal((await ui.send({type:'GET_PENDING_CAPTURE',problem})).pending,null);
  assert.match((await ui.send({type:'SAVE_CAPTURE',problem,payload,workspaceScope:'a'})).error,/account changed/i);assert.equal(requests,1);
  const page={id:'test',url:'chrome-extension://test/setup.html'};
  assert.equal((await ui.send({type:'LIST_RECORDINGS'},page)).records.length,0);
  scope='a';assert.equal((await ui.send({type:'LIST_RECORDINGS'},page)).records.length,1);
  assert.ok(storage['recall-pending:'+problem.url]);
});
test('capture maps only problem topics; skipped selections use inferred defaults',()=>{
  const input=captureInput(payload);
  assert.deepEqual(input.providerTopics,['Array','Hash Table']);
  assert.deepEqual(input.attempt.patternSlugs,['arrays-hashing','hash-table']);
  assert.equal(input.attempt.patternSource,'inferred');
  assert.equal(input.problem.difficulty,'easy');
  const selectedHash=captureInput({...payload,selectedTopics:['Hash Table']});
  assert.equal(selectedHash.attempt.patternSource,'explicit');
  assert.deepEqual(selectedHash.attempt.patternSlugs,['hash-table']);
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
test('editable choices and distinct Accepted events persist across worker restarts',async()=>{
  const storage={},ui=worker(()=>assert.fail('Drafts do not use the network'),storage);
  const draft={assistance:'hint',practiceUnit:'hashing',attemptedAt:payload.attemptedAt};
  assert.equal((await ui.send({type:'SAVE_EDITABLE_DRAFT',problem,draft})).kept,true);
  const evidence={captureSource:'accepted',eventId:'123',submissionId:'123',attemptedAt:payload.attemptedAt};
  await ui.send({type:'QUEUE_CAPTURE',problem,evidence});await ui.send({type:'QUEUE_CAPTURE',problem,evidence});
  await ui.send({type:'QUEUE_CAPTURE',problem,evidence:{...evidence,eventId:'124',submissionId:'124'}});
  const restarted=worker(()=>assert.fail('No network'),storage),state=await restarted.send({type:'GET_PENDING_CAPTURE',problem});
  assert.equal(state.draft.assistance,'hint');assert.equal(state.queue.length,2);
  assert.equal((await restarted.send({type:'SHIFT_CAPTURE',problem})).queue[0].submissionId,'124');
});
test('reconciliation clears only a confirmed identical saved request',async()=>{
  for(const status of ['saved','conflict','removed','missing']){
    const storage={['recall-pending:'+problem.url]:payload};
    const ui=worker(async(url)=>{assert.equal(url,'http://127.0.0.1:3001/api/capture/reconcile');return {ok:true,json:async()=>({status})};},storage);
    assert.equal((await ui.send({type:'RECONCILE_CAPTURE',problem})).status,status);
    assert.equal(Boolean(storage['recall-pending:'+problem.url]),status!=='saved');
  }
});
test('starting a separate recording requires a confirmed conflict and retains the old choices',async()=>{
  for(const status of ['saved','missing','conflict']){
    const storage={['recall-pending:'+problem.url]:payload};
    const ui=worker(async()=>({ok:true,json:async()=>({status})}),storage);
    const result=await ui.send({type:'RELEASE_CONFLICT',problem});
    assert.equal(Boolean(result.released),status==='conflict');
    assert.equal(Boolean(storage['recall-conflict:'+payload.requestId]),status==='conflict');
    assert.equal(Boolean(storage['recall-pending:'+problem.url]),status!=='conflict');
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


test('required topic classification chooses specialized tags and preserves provider evidence',()=>{
  const classified=captureInput({...payload,classification:{mode:'topics'},selectedTopics:['Array','Hash Table']});
  assert.equal(classified.problem.placementOverride,'hashing');
  assert.equal(classified.attempt.practiceUnit,'hashing');
  assert.equal(classified.attempt.approachSource,'confirmed');
  assert.deepEqual(classified.providerTopics,['Array','Hash Table']);
  assert.throws(()=>captureInput({...payload,classification:{mode:'topics'},selectedTopics:[]}),{status:400});
  assert.throws(()=>captureInput({...payload,classification:{mode:'topics'},selectedTopics:['Hash Table'],practiceUnit:'two-pointers'}),{status:400});
  assert.throws(()=>captureInput({...payload,topics:['Unrecognized Topic'],selectedTopics:['Unrecognized Topic'],classification:{mode:'topics'}}),{status:400});
});
test('selected traversals keep Tree context and disambiguate Graph techniques',()=>{
  const base={...payload,url:'https://leetcode.com/problems/classification-fixture/',classification:{mode:'topics'}};
  assert.equal(captureInput({...base,topics:['Tree','Depth-First Search','Breadth-First Search'],selectedTopics:['Depth-First Search']}).attempt.practiceUnit,'tree-dfs');
  assert.equal(captureInput({...base,topics:['Graph','Depth-First Search','Breadth-First Search'],selectedTopics:['Depth-First Search']}).attempt.practiceUnit,'graph-dfs');
  assert.equal(captureInput({...base,topics:['Graph','Depth-First Search','Breadth-First Search'],selectedTopics:['Breadth-First Search']}).attempt.practiceUnit,'graph-bfs');
  assert.equal(captureInput({...base,topics:['Graph','Depth-First Search','Breadth-First Search'],selectedTopics:['Depth-First Search','Breadth-First Search']}).attempt.practiceUnit,'graphs-general');
});
test('Other allows any learning pattern but rejects nonexistent and unclassified choices',()=>{
  const manual=captureInput({...payload,classification:{mode:'manual',unit:'interval-dp'},selectedTopics:[]});
  assert.equal(manual.problem.placementOverride,'interval-dp');
  assert.equal(manual.attempt.practiceUnit,'interval-dp');
  assert.equal(manual.attempt.patternSource,'explicit');
  for(const unit of ['other','not-a-pattern',null,''])assert.throws(()=>captureInput({...payload,classification:{mode:'manual',unit}}),{status:400});
  assert.throws(()=>captureInput({...payload,classification:{mode:'topics',unit:'hashing'},selectedTopics:['Hash Table']}),{status:400});
});
