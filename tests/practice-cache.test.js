import test from 'node:test';
import assert from 'node:assert/strict';
import {createPracticeCache,practiceCache} from '../apps/web/src/practice-cache.js';
import {request,setWorkspaceScope,setTokenProvider} from '../apps/web/src/api.js';
const snapshot=owner=>({categories:[],owner});

test('practice reads deduplicate pending loads and reuse snapshots until practice changes',async()=>{
  let time=0,calls=0,finish;
  const cache=createPracticeCache({now:()=>time});
  const load=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};
  const first=cache.load(load),second=cache.load(load);await Promise.resolve();
  assert.equal(calls,1);finish(snapshot('alice'));
  assert.equal(await first,await second);
  await cache.load(()=>assert.fail('Fresh page navigation must not refetch'));
  time=86400000;
  await cache.load(()=>assert.fail('Time passing must not trigger another read'));
  cache.invalidate();
  await cache.load(async()=>{calls++;return snapshot('alice refreshed');});
  assert.equal(calls,2);assert.equal(cache.read().owner,'alice refreshed');
});

test('confirmed extension changes invalidate pending reads and notify mounted subscribers once',async()=>{
  const cache=createPracticeCache();await cache.load(async()=>snapshot('old'));
  let finish,notifications=0;
  const stop=cache.subscribe(()=>{notifications++;});
  const pending=cache.load(()=>new Promise(resolve=>{finish=resolve;}),{force:true});await Promise.resolve();
  cache.changed();assert.equal(notifications,1);
  await cache.load(async()=>snapshot('saved'));
  finish(snapshot('before save'));await assert.rejects(pending,{status:409});
  assert.equal(cache.read().owner,'saved');
  stop();cache.changed();assert.equal(notifications,1);
});

test('manual refresh bypasses age and failed refresh retains the last successful snapshot',async()=>{
  const cache=createPracticeCache();await cache.load(async()=>snapshot('original'));
  await cache.load(async()=>snapshot('updated'),{force:true});
  await assert.rejects(cache.load(async()=>{throw new Error('offline');},{force:true}),/offline/);
  assert.equal(cache.read().owner,'updated');
  await assert.rejects(cache.load(async()=>({}),{force:true}),/incomplete/);
  assert.equal(cache.read().owner,'updated');
});

test('writes invalidate snapshots and late reads cannot overwrite newer practice',async()=>{
  const cache=createPracticeCache();await cache.load(async()=>snapshot('old'));
  let finish;const pending=cache.load(()=>new Promise(resolve=>{finish=resolve;}),{force:true});await Promise.resolve();
  cache.invalidate();assert.equal(cache.read().owner,'old');
  await cache.load(async()=>snapshot('after write'));
  finish(snapshot('before write'));await assert.rejects(pending,{status:409});
  assert.equal(cache.read().owner,'after write');
});

test('logout clears private snapshots and discards pending results from the previous account',async()=>{
  const cache=createPracticeCache();await cache.load(async()=>snapshot('alice'));
  let finish;const pending=cache.load(()=>new Promise(resolve=>{finish=resolve;}),{force:true});await Promise.resolve();
  cache.clear();assert.equal(cache.read(),null);
  await cache.load(async()=>snapshot('bob'));
  finish(snapshot('alice'));await assert.rejects(pending,{status:409});
  assert.equal(cache.read().owner,'bob');
});

test('API account changes clear cache; successful writes invalidate it but failed writes preserve it',async t=>{
  t.after(()=>{setWorkspaceScope(null);setTokenProvider(null);});
  setWorkspaceScope('alice');setTokenProvider(async()=>({token:'fixture',scope:'alice'}));
  await practiceCache.load(async()=>snapshot('alice'));
  t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Failed'},{status:400}));
  await assert.rejects(request('/goal',{method:'PUT'}),{status:400});
  await practiceCache.load(()=>assert.fail('Failed write should preserve fresh snapshot'));
  t.mock.method(globalThis,'fetch',async()=>Response.json({saved:true}));
  await request('/goal',{method:'PUT'});
  await practiceCache.load(async()=>snapshot('updated'));
  assert.equal(practiceCache.read().owner,'updated');
  setWorkspaceScope('bob');assert.equal(practiceCache.read(),null);
  await practiceCache.load(async()=>snapshot('bob'));
  setTokenProvider(null);assert.equal(practiceCache.read(),null);
});
