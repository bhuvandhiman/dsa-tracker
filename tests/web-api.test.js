import test from 'node:test';
import assert from 'node:assert/strict';
import { request,setTokenProvider,setWorkspaceScope } from '../apps/web/src/api.js';
import {authFetch} from '../apps/web/src/auth-client.js';

test('dashboard client surfaces actionable API errors', async t => {
  t.mock.method(globalThis,'fetch',async () => ({ok:false,status:503,json:async () => ({error:'Apply database migrations first.'})}));
  await assert.rejects(request('/retention'),/Apply database migrations first/);
});
test('dashboard client preserves cancellation and reports connection failures', async t => {
  const controller = new AbortController(); controller.abort();
  t.mock.method(globalThis,'fetch',async (_url,options) => { throw options.signal.reason; });
  await assert.rejects(request('/retention',{signal:controller.signal}),{name:'AbortError'});
  t.mock.method(globalThis,'fetch',async () => {throw new TypeError('Failed to fetch');});
  await assert.rejects(request('/retention'),/Cannot reach Recall/);
});


test('proxy failures and invalid responses produce useful messages instead of JSON parser errors',async t=>{
  t.mock.method(globalThis,'fetch',async()=>({ok:false,status:502,json:async()=>{throw new SyntaxError('Unexpected end of JSON input');}}));
  await assert.rejects(request('/retention'),/Recall is unavailable or waking up/);
  t.mock.method(globalThis,'fetch',async()=>({ok:true,status:200,json:async()=>{throw new SyntaxError('Unexpected token');}}));
  await assert.rejects(request('/retention'),/unreadable response/);
});

test('private requests reject stale forms, changed tokens and late responses from another account',async t=>{
  t.after(()=>{setTokenProvider(null);setWorkspaceScope(null);});
  setWorkspaceScope('alice');setTokenProvider(async()=>({token:'alice-token',scope:'alice'}));
  let calls=0;t.mock.method(globalThis,'fetch',async(_url,options)=>{calls++;assert.equal(options.headers.get('X-Recall-Workspace'),'alice');assert.equal(options.headers.get('Authorization'),'Bearer alice-token');return Response.json({ok:true});});
  await request('/ready',{workspaceScope:'alice'});assert.equal(calls,1);
  await assert.rejects(request('/ready',{workspaceScope:'bob'}),{status:409});assert.equal(calls,1);
  setTokenProvider(async()=>({token:'bob-token',scope:'bob'}));await assert.rejects(request('/ready'),{status:409});assert.equal(calls,1);
  setTokenProvider(async()=>{setWorkspaceScope('bob');return {token:'alice-token',scope:'alice'};});await assert.rejects(request('/ready'),{status:409});assert.equal(calls,1);
  setWorkspaceScope('alice');setTokenProvider(async()=>({token:'alice-token',scope:'alice'}));
  t.mock.method(globalThis,'fetch',async()=>{setWorkspaceScope('bob');return Response.json({privateData:'alice'});});
  await assert.rejects(request('/ready'),{status:409});
});
test('cancelling a request interrupts a pending token lookup before any API write',async t=>{
  t.after(()=>{setTokenProvider(null);setWorkspaceScope(null);});
  const controller=new AbortController();let started;const began=new Promise(resolve=>{started=resolve;});
  setTokenProvider(()=>{started();return new Promise(()=>{});});
  t.mock.method(globalThis,'fetch',()=>assert.fail('Cancelled request must not fetch'));
  const operation=request('/goal',{method:'PUT',signal:controller.signal});await began;controller.abort();await assert.rejects(operation,{name:'AbortError'});
});
test('SDK fetch preserves cancellation and malformed API bodies fail safely',async t=>{
  const controller=new AbortController();
  t.mock.method(globalThis,'fetch',async(_url,options)=>{assert.notEqual(options.signal,controller.signal);controller.abort();options.signal.throwIfAborted();});
  await assert.rejects(authFetch('https://fixture.test',{signal:controller.signal}),{name:'AbortError'});
  for(const data of [null,[],42]){t.mock.method(globalThis,'fetch',async()=>Response.json(data));await assert.rejects(request('/ready'),/unreadable response/);}
});
