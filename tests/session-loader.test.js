import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionLoader} from '../apps/web/src/session-loader.js';

test('concurrent login and auth events share verification; subsequent refresh verifies again',async()=>{
  let calls=0,finish;
  const read=createSessionLoader(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
  const first=read('alice'),second=read('alice');await Promise.resolve();assert.equal(calls,1);
  finish({user:{id:'alice'}});assert.equal(await first,await second);
  const refresh=read('alice');await Promise.resolve();assert.equal(calls,2);finish({user:{id:'alice'}});await refresh;
});

test('failed or cancelled startup can be retried and never shares verification across accounts',async()=>{
  let calls=0;const read=createSessionLoader(async scope=>{calls++;if(calls===1)throw new Error('Unavailable');return {scope};});
  await assert.rejects(read('alice'),/Unavailable/);assert.equal((await read('alice')).scope,'alice');
  const controller=new AbortController(),pending=createSessionLoader(async(scope,signal)=>{signal?.throwIfAborted();return {scope};});
  const cancelled=pending('alice',controller.signal);controller.abort();
  const retry=pending('alice');await assert.rejects(cancelled,{name:'AbortError'});assert.equal((await retry).scope,'alice');
  const [alice,bob]=await Promise.all([pending('alice'),pending('bob')]);assert.equal(alice.scope,'alice');assert.equal(bob.scope,'bob');
});
