import test from 'node:test';
import assert from 'node:assert/strict';
import {readLocation,confirmedLocation} from '../apps/web/src/navigation.js';
import {authRedirect,initializedSession} from '../apps/web/src/auth-client.js';
import {accountDestination,needsGoalSetup,rememberDestination} from '../apps/web/src/auth-navigation.js';

const location=value=>new URL(value,'https://recall.test');

test('confirmation links enter a callback state instead of the login form',()=>{
  for(const value of ['/?auth=callback#/login','/?auth=callback&code=confirmation#/login','/?code=confirmation','/?auth=callback','/#access_token=token&refresh_token=refresh&type=signup']){
    assert.deepEqual(readLocation(location(value)),{page:'auth-callback',error:''});
  }
  assert.equal(readLocation(location('/#/login')).page,'login');
  assert.equal(readLocation(location('/#/signup')).page,'signup');
  assert.equal(readLocation(location('/?auth=callback#/dashboard')).page,'dashboard');
  assert.equal(readLocation(location('/?auth=callback#/home')).page,'home');
});

test('expired links show their error and password recovery stays on its own screen',()=>{
  const expired='/?auth=callback#error=access_denied&error_code=otp_expired&error_description=Email+link+has+expired';
  assert.deepEqual(readLocation(location(expired)),{page:'auth-callback',error:'Email link has expired'});
  assert.equal(readLocation(location('/?error=access_denied&error_description=Invalid+link')).error,'Invalid link');
  for(const value of ['/?auth=recovery&code=recovery#/reset-password','/?auth=recovery#/reset-password','/#access_token=token&type=recovery'])assert.equal(readLocation(location(value)).page,'reset-password');
  assert.equal(readLocation(location('/?auth=recovery#/dashboard')).page,'dashboard');
  assert.equal(readLocation(location('/?auth=recovery#/login')).page,'login');
  assert.equal(readLocation(location('/?auth=recovery#/home')).page,'home');
});

test('successful confirmation removes callback credentials and lands on the dashboard',()=>{
  const cleaned=confirmedLocation(location('/?auth=callback&code=secret&sb_flow_id=flow&error=old&error_code=old&error_description=old&campaign=welcome#/login'));
  assert.equal(cleaned,'/?campaign=welcome#/dashboard');
  assert.equal(readLocation(location(cleaned)).page,'dashboard');
  assert.equal(confirmedLocation(location('/?auth=callback#access_token=secret&refresh_token=secret')),'/#/dashboard');
});

test('confirmation takes unconfigured accounts through goal setup before the saved destination',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  rememberDestination('/patterns/graphs?q=dfs',storage);
  for(const setup of [null,{}, {completed:false,goal:{configured:false}},{completed:true,goal:{configured:false}}]){
    assert.equal(needsGoalSetup(setup),true);
    const cleaned=confirmedLocation(location('/?auth=callback&code=secret&campaign=welcome#/login'),accountDestination(setup,storage));
    assert.equal(cleaned,'/?campaign=welcome#/setup');assert.equal(readLocation(location(cleaned)).page,'setup');
  }
  assert.equal(needsGoalSetup({completed:false,goal:{configured:true}}),false);
  const destination=accountDestination({completed:true,goal:{configured:true,profile:'deep',target:500}},storage);
  assert.equal(destination,'/patterns/graphs?q=dfs');
  assert.equal(confirmedLocation(location('/?auth=callback&code=secret#/login'),destination),'/#/patterns/graphs?q=dfs');
  assert.equal(accountDestination({goal:{configured:true}},storage),'/dashboard');
});

test('existing email redirect allowlist URLs remain compatible',t=>{
  const previous=globalThis.window;
  globalThis.window={location:location('/')};
  t.after(()=>{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;});
  assert.equal(authRedirect(),'https://recall.test/?auth=callback#/login');
  assert.equal(authRedirect('recovery'),'https://recall.test/?auth=recovery#/reset-password');
});

test('session reads wait for the confirmation exchange to finish',async()=>{
  let finish;
  const pending=new Promise(resolve=>{finish=resolve;}),calls=[],session={user:{id:'confirmed'}};
  const client={auth:{initialize(){calls.push('exchange');return pending;},async getSession(){calls.push('session');return {data:{session},error:null};}}};
  const result=initializedSession(client,new AbortController().signal);
  assert.deepEqual(calls,['exchange']);
  finish({error:null});
  assert.equal(await result,session);
  assert.deepEqual(calls,['exchange','session']);
});

test('a failed confirmation cannot reuse a previous account session',async()=>{
  let sessionReads=0;
  const error=new Error('Confirmation link expired');
  const client={auth:{async initialize(){return {error};},async getSession(){sessionReads++;return {data:{session:{user:{id:'old-account'}}},error:null};}}};
  await assert.rejects(initializedSession(client,new AbortController().signal),error);
  assert.equal(sessionReads,0);
});

test('a code ignored because of a missing verifier cannot reuse a previous session',async t=>{
  const previous=globalThis.window;
  globalThis.window={location:location('/?auth=callback&code=unexchanged#/login')};
  t.after(()=>{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;});
  const client={auth:{async initialize(){return {error:null};},getSession(){throw new Error('Previous session must not be used');}}};
  await assert.rejects(initializedSession(client,new AbortController().signal),/browser where you signed up/);
});

test('confirmation initialization can be cancelled while the exchange is pending',async()=>{
  const controller=new AbortController(),error=new Error('Cancelled');
  const result=initializedSession({auth:{initialize:()=>new Promise(()=>{}),getSession(){throw new Error('Session read after cancellation');}}},controller.signal);
  controller.abort(error);
  await assert.rejects(result,error);
});
