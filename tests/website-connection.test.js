import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createExtensionAuth } from '../apps/api/src/extension-auth.js';
import { createApp } from '../apps/api/src/app.js';
import { createAccountClient } from '../apps/extension/src/account-client.js';
import { connectWebsiteExtension } from '../apps/web/src/extension-bridge.js';
import { connectionAction, openRecallWebsite } from '../apps/extension/src/connection-flow.js';

const owner='fa631c58-72ad-4a67-89d8-f6a4ae5d1641',other='ea631c58-72ad-4a67-89d8-f6a4ae5d1642';
const config={mode:'supabase',configured:true,url:'https://fixture.supabase.co',key:'sb_publishable_fixture'};
const user={id:owner,email:'fixture@example.test',email_confirmed_at:'2026-10-03T00:00:00Z'};
const key='recall-account-session',channel='recall-website-auth-v1';
const jwt=(sub=owner,exp=Math.floor(Date.now()/1000)+3600)=>`e30.${Buffer.from(JSON.stringify({sub,exp})).toString('base64url')}.fixture`;
const saved=(id=owner,expiresAt=100000,accessToken='access')=>({source:'website',user:{id,email:user.email},project:config.url,expiresAt,accessToken});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function account(handler,{initial,clock=()=>1000}={}){
  const session=initial?{[key]:initial}:{},local={draft:'kept'};
  const client=createAccountClient({storage:{session:{async get(name){return {[name]:session[name]};},async set(values){Object.assign(session,values);},async remove(name){delete session[name];}},local}},async(url,options)=>url.endsWith('/auth/config')?Response.json(config):handler(url,options),clock);
  return {client,session,local};
}
function fakeWindow(){
  const listeners=new Map(),messages=[];
  const target={location:{origin:'https://recall.test'},messages,addEventListener(type,listener){listeners.set(type,listener);},removeEventListener(type){listeners.delete(type);},postMessage(data,origin){messages.push({data,origin});},dispatch(data,extra={}){listeners.get('message')?.({source:target,origin:target.location.origin,data,...extra});}};
  target.top=target;return target;
}

test('website connection verifies Supabase identity without issuing or copying a refresh token',async()=>{
  const token=jwt(),calls=[];
  const connect=createExtensionAuth(config,async(url,options)=>{calls.push(url);assert.equal(url,config.url+'/auth/v1/user');assert.equal(options.headers.Authorization,'Bearer '+token);return Response.json(user);});
  const result=await connect('connect',{accessToken:token});
  assert.equal(result.user.id,owner);assert.equal(result.source,'website');assert.equal(result.accessToken,token);assert.ok(result.expiresAt>Date.now());assert.ok(!('refreshToken' in result));assert.equal(calls.length,1);
  for(const body of [{},{accessToken:token,refreshToken:'never-share'},{accessToken:'a'.repeat(8193)}])await assert.rejects(connect('connect',body),{status:400});
});
test('website connection refuses invalid, expired, unconfirmed and mismatched bearer identities',async()=>{
  for(const token of ['bad',jwt(other),jwt(owner,1),jwt(owner,'future')])await assert.rejects(createExtensionAuth(config,async()=>Response.json(user))('connect',{accessToken:token}),{status:401});
  for(const response of [Response.json(user,{status:401}),Response.json({...user,email_confirmed_at:null})])await assert.rejects(createExtensionAuth(config,async()=>response)('connect',{accessToken:jwt()}),{status:401});
});
test('website connection endpoint is uncached and requires proof even without a database',async t=>{
  const server=createApp({auth:config,extensionAuth:createExtensionAuth(config,async(_url,options)=>options.headers.Authorization==='Bearer '+jwt(owner,9999999999)?Response.json(user):Response.json({}, {status:401}))}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const send=body=>fetch(`http://127.0.0.1:${server.address().port}/api/auth/extension/connect`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const good=await send({accessToken:jwt(owner,9999999999)});assert.equal(good.status,200);assert.equal(good.headers.get('Cache-Control'),'no-store');assert.equal((await good.json()).user.id,owner);
  assert.equal((await send({accessToken:jwt(other)})).status,401);
});
test('extension uses website access only, blocks expired requests and reconnects to the same owner',async()=>{
  let clock=1000,calls=0;
  const {client,session,local}=account(async(url,options)=>{
    calls++;if(url.endsWith('/connect'))return Response.json(saved(owner,100000,'renewed'));
    assert.ok(!url.endsWith('/refresh'));assert.equal(options.headers.Authorization,'Bearer access');return Response.json({ok:true});
  },{initial:saved(owner,20000),clock:()=>clock});
  await client.request('/ready',{},owner);clock=20000;assert.equal((await client.status()).connected,false);
  await assert.rejects(client.request('/capture',{method:'POST'},owner),/website/);assert.equal(calls,1);
  const state=await client.connectWebsite('renewed',owner);assert.equal(state.connected,true);assert.ok(!('accessToken' in state));assert.ok(!('refreshToken' in session[key]));assert.deepEqual(local,{draft:'kept'});
});
test('website account changes reject stale pages and older tokens cannot replace a newer connection',async()=>{
  const {client,session}=account(async(_url,options)=>Response.json(JSON.parse(options.body).accessToken==='older'?saved(other,80000,'older'):saved(other,100000,'new-owner')),{initial:saved()});
  await client.connectWebsite('new-owner',other);await assert.rejects(client.request('/ready',{},owner),/account changed/i);
  await client.connectWebsite('older',other);assert.equal(session[key].accessToken,'new-owner');
  await client.disconnectWebsite(owner);assert.equal(session[key].user.id,other);
  await client.disconnectWebsite(other);assert.deepEqual(session,{});
});
test('website sign-out cancels an unfinished connection and cannot resurrect credentials',async()=>{
  let release,began;const waiting=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{began=resolve;});
  const {client,session}=account(async()=>{began();await waiting;return Response.json(saved());});
  const pending=client.connectWebsite('access',owner),rejected=assert.rejects(pending,/connection changed/i);await started;await client.disconnectWebsite(owner);release();await rejected;assert.deepEqual(session,{});
});
test('website sign-out leaves separate password sessions alone and malformed connections do not overwrite them',async()=>{
  const initial={...saved(),source:undefined,refreshToken:'legacy-refresh'};
  const {client,session}=account(async()=>Response.json({...saved(other),refreshToken:'must-not-copy'}),{initial});
  await client.disconnectWebsite(owner);assert.deepEqual(session[key],initial);
  await assert.rejects(client.connectWebsite('access',owner),/reconnect/);assert.deepEqual(session[key],initial);
  await assert.rejects(client.connectWebsite('access','local'),/Invalid/);
});
test('website bridge synchronizes login, renewal and sign-out, sends no passwords or refresh tokens',async()=>{
  const target=fakeWindow();let change,unsubscribed=false;
  const session={user,access_token:'access',refresh_token:'must-never-transfer'};
  const client={auth:{onAuthStateChange(fn){change=fn;return {data:{subscription:{unsubscribe(){unsubscribed=true;}}}};},async getSession(){return {data:{session}};}}};
  const stop=connectWebsiteExtension(client,target);assert.equal(target.messages[0].data.type,'READY');
  const hello={channel,type:'HELLO',nonce:other};
  target.dispatch(hello,{origin:'https://evil.test'});target.dispatch(hello,{source:{}});target.dispatch({...hello,nonce:'bad'});await tick();assert.equal(target.messages.length,1);
  target.dispatch(hello);await tick();assert.equal(target.messages.at(-1).data.accessToken,'access');
  change('TOKEN_REFRESHED',{...session,access_token:'renewed'});assert.equal(target.messages.at(-1).data.accessToken,'renewed');
  change('SIGNED_OUT',null);assert.equal(target.messages.at(-1).data.accessToken,null);assert.equal(target.messages.at(-1).data.owner,owner);
  assert.ok(!JSON.stringify(target.messages).includes('must-never-transfer'));assert.ok(target.messages.every(message=>message.origin===target.location.origin));
  const count=target.messages.length;stop();change('SIGNED_IN',session);assert.equal(target.messages.length,count);assert.equal(unsubscribed,true);
});
test('a delayed website session read cannot reconnect after sign-out or teardown',async()=>{
  let release,change;const pending=new Promise(resolve=>{release=resolve;}),target=fakeWindow();
  const stop=connectWebsiteExtension({auth:{onAuthStateChange(fn){change=fn;return {data:{subscription:{unsubscribe(){}}}};},getSession:()=>pending}},target);
  target.dispatch({channel,type:'HELLO',nonce:other});change('SIGNED_OUT',null);release({data:{session:{user,access_token:'stale'}}});await tick();assert.equal(target.messages.length,1);stop();
});
test('sign-out before the content bridge is ready still disconnects the recorded website owner',async()=>{
  const target=fakeWindow();let change;
  const stop=connectWebsiteExtension({auth:{onAuthStateChange(fn){change=fn;return {data:{subscription:{unsubscribe(){}}}};},async getSession(){return {data:{session:null}};}}},target);
  change('INITIAL_SESSION',{user,access_token:'access'});change('SIGNED_OUT',null);assert.equal(target.messages.length,1);
  target.dispatch({channel,type:'HELLO',nonce:other});await tick();assert.equal(target.messages.at(-1).data.accessToken,null);assert.equal(target.messages.at(-1).data.owner,owner);stop();
});
test('isolated content bridge rejects foreign frames, origins, sources and nonces',async()=>{
  const target=fakeWindow(),calls=[];
  vm.runInNewContext(readFileSync(new URL('../apps/extension/src/website-bridge.js',import.meta.url),'utf8'),{window:target,location:target.location,crypto:{randomUUID:()=>other},chrome:{runtime:{sendMessage:async message=>{calls.push(message);return {};}}}});
  const message={channel,type:'SESSION',nonce:other,owner,accessToken:'access',refreshToken:'never-copy'};
  target.dispatch(message,{origin:'https://evil.test'});target.dispatch(message,{source:{}});target.dispatch({...message,nonce:owner});target.dispatch({...message,owner:'local'});assert.equal(calls.length,0);
  target.dispatch(message);target.dispatch({...message,accessToken:null});await tick();assert.equal(calls.length,2);assert.equal(calls[0].type,'RECALL_WEBSITE_SESSION');assert.ok(!JSON.stringify(calls).includes('never-copy'));
  const framed=fakeWindow();framed.top={};vm.runInNewContext(readFileSync(new URL('../apps/extension/src/website-bridge.js',import.meta.url),'utf8'),{window:framed});assert.equal(framed.messages.length,0);
});
test('worker grants the bridge only to the exact configured website top frame and opens a fixed login URL',async()=>{
  let listener;const calls=[],opened=[],account={connectWebsite:async(...args)=>{calls.push(args);return {connected:true,scope:owner};},disconnectWebsite:async()=>({signedOut:true})};
  const chrome={runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener(fn){listener=fn;}}},tabs:{async query(){return [];},async create(value){opened.push(value);}}};
  const source=readFileSync(new URL('../apps/extension/src/account-worker.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace(/^export /gm,'');
  vm.runInNewContext(source,{chrome,URL,connectionAction,openRecallWebsite,recallRuntime:{websiteOrigin:'http://127.0.0.1:5173'},createAccountClient:()=>account});
  const sender={id:'test',frameId:0,tab:{id:1},url:'http://127.0.0.1:5173/#/dashboard'},message={type:'RECALL_WEBSITE_SESSION',accessToken:'access',owner};
  const send=(message,sender)=>new Promise(resolve=>listener(message,sender,resolve));
  for(const bad of [{...sender,url:'https://leetcode.com/'},{...sender,url:'http://127.0.0.1:3001/'},{...sender,url:'http://127.0.0.1:5173.evil.test/'},{...sender,frameId:1},{...sender,id:'foreign'},{...sender,tab:undefined}])assert.match((await send(message,bad)).error,/configured/);
  assert.equal(calls.length,0);assert.equal((await send(message,sender)).scope,owner);assert.equal(calls.length,1);
  assert.match((await send({type:'RECALL_OPEN_WEBSITE'},sender)).error,/Settings/);
  assert.equal((await send({type:'RECALL_OPEN_WEBSITE',url:'https://evil.test'},{id:'test',url:'chrome-extension://test/setup.html'})).opened,true);assert.deepEqual(opened.map(value=>value.url),['http://127.0.0.1:5173/#/connect']);
});
test('account panel connects through the website and renewals do not interrupt imports',async()=>{
  let storageChange,reloads=0,clicked;const sent=[],button={hidden:true,addEventListener(_name,fn){clicked=fn;}},status={after(){}};
  const chrome={runtime:{async sendMessage(message){sent.push(message);return {opened:true};}},storage:{onChanged:{addListener(fn){storageChange=fn;}}}};
  const source=readFileSync(new URL('../apps/extension/src/account-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'');
  vm.runInNewContext(source,{chrome,connection:async()=>({mode:'supabase',connected:true,scope:owner,email:user.email}),document:{querySelector:name=>name==='#recall-account-status'?status:button,createElement:()=>({addEventListener(){}})},location:{reload(){reloads++;}}});
  await tick();assert.equal(button.textContent,'Open Recall');await clicked();assert.equal(sent[0].type,'RECALL_OPEN_WEBSITE');
  storageChange({[key]:{newValue:saved()}},'session');assert.equal(reloads,0);
  storageChange({[key]:{newValue:saved(other)}},'session');assert.equal(reloads,1);
  storageChange({[key]:{}},'session');assert.equal(reloads,2);
});

test('connection acknowledgement ignores stale renewal results and reports old extensions',async()=>{
  const target=fakeWindow(),states=[];let change;
  const session={user,access_token:'access'};
  const stop=connectWebsiteExtension({auth:{onAuthStateChange(fn){change=fn;return {data:{subscription:{unsubscribe(){}}}};},async getSession(){return {data:{session}};}}},target,value=>states.push(value));
  target.dispatch({channel,type:'HELLO',nonce:other});await tick();assert.equal(states.at(-1).outdated,true);
  target.dispatch({channel,type:'HELLO',nonce:other,protocol:2});await tick();assert.equal(states.at(-1).outdated,false);
  const old=target.messages.at(-1).data.sessionRevision;change('TOKEN_REFRESHED',{...session,access_token:'renewed'});const current=target.messages.at(-1).data.sessionRevision;
  target.dispatch({channel,type:'CONNECTED',nonce:other,owner,sessionRevision:current,connected:true});assert.equal(states.at(-1).connected,true);
  target.dispatch({channel,type:'CONNECTED',nonce:other,owner,sessionRevision:old,error:'stale'});assert.equal(states.at(-1).connected,true);
  stop();
});

test('connection requests require matching nonce, request ID and origin; teardown cancels outstanding work',async()=>{
  const target=fakeWindow();const stop=connectWebsiteExtension(null,target);
  await assert.rejects(stop.request('STATUS'),/not detected/);
  target.dispatch({channel,type:'HELLO',nonce:other,protocol:2});
  const pending=stop.request('STATUS'),message=target.messages.at(-1).data;
  assert.equal(message.owner,'local');let resolved=false;pending.then(()=>{resolved=true;});
  const response={channel,type:'RESULT',nonce:other,requestId:message.requestId,data:{connected:true}};
  target.dispatch(response,{origin:'https://evil.test'});target.dispatch({...response,nonce:owner});target.dispatch({...response,requestId:'wrong'});await tick();assert.equal(resolved,false);
  target.dispatch(response);assert.deepEqual(await pending,{connected:true});
  const cancelled=stop.request('OPEN_IMPORT'),rejected=assert.rejects(cancelled,/closed/);stop();await rejected;
});
