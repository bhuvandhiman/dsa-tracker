import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectLeetCode} from '../apps/extension/src/leetcode-connection.js';

test('a stale receiver reconnects once in a fresh tab and reuses it for metadata',async()=>{
  const created=[],sent=[];let notices=0;
  const chromeApi={tabs:{
    query:async()=>[{id:1,active:true}],
    create:async options=>{created.push(options);return {id:2,status:'complete'};},
    sendMessage:async(id,message)=>{sent.push({id,message});if(id===1)throw new Error('Receiving end does not exist');return {data:{username:'alice'}};},
  }};
  const read=await connectLeetCode(chromeApi,()=>notices++);
  assert.deepEqual(await read('SCAN_LEGACY_PROBLEMS'),{username:'alice'});
  await read('READ_LEGACY_TOPICS',{slugs:['two-sum'],username:'alice'});
  assert.deepEqual(created,[{url:'https://leetcode.com/problemset/',active:false}]);
  assert.equal(notices,1);
  assert.deepEqual(sent.map(item=>item.id),[1,2,2]);
  assert.deepEqual(sent[2].message,{type:'READ_LEGACY_TOPICS',slugs:['two-sum'],username:'alice'});
});

test('provider errors and malformed replies do not create replacement tabs',async()=>{
  for(const reply of [{error:'Sign back into alice to resume.'},{}]) {
    let created=0;
    const read=await connectLeetCode({tabs:{query:async()=>[{id:1}],create:async()=>created++,sendMessage:async()=>reply}});
    await assert.rejects(read('SCAN_LEGACY_PROBLEMS'),/Sign back|expected data/);
    assert.equal(created,0);
  }
  await assert.rejects(connectLeetCode({tabs:{query:async()=>[]}}),/Open LeetCode/);
});

test('recovery waits for the fresh tab and removes its load listener',async()=>{
  const listeners=new Set();let freshReady=false;
  const read=await connectLeetCode({tabs:{
    query:async()=>[{id:1}],create:async()=>({id:2,status:'loading'}),
    onUpdated:{addListener:listener=>listeners.add(listener),removeListener:listener=>listeners.delete(listener)},
    get:async()=>{freshReady=true;for(const listener of listeners)listener(2,{status:'complete'});return {status:'complete'};},
    sendMessage:async id=>{if(id===1)throw new Error('stale');assert.equal(freshReady,true);return {data:[]};},
  }});
  assert.deepEqual(await read('READ_LEGACY_TOPICS'),[]);
  assert.equal(listeners.size,0);
});

test('a failed tab creation gives actionable recovery instructions',async()=>{
  const read=await connectLeetCode({tabs:{query:async()=>[{id:1}],sendMessage:async()=>{throw new Error('stale');},create:async()=>{throw new Error('blocked');}}});
  await assert.rejects(read('SCAN_LEGACY_PROBLEMS'),/Allow Recall access.*checkpoint is saved/);
});
