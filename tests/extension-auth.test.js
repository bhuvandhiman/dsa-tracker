import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createExtensionAuth } from '../apps/api/src/extension-auth.js';
import { createApp } from '../apps/api/src/app.js';
import { createAccountClient, workspaceKey } from '../apps/extension/src/account-client.js';

const owner='fa631c58-72ad-4a67-89d8-f6a4ae5d1641',other='ea631c58-72ad-4a67-89d8-f6a4ae5d1642';
const config={mode:'supabase',configured:true,url:'https://example.supabase.co',key:'sb_publishable_fixture'};
const user={id:owner,email:'fixture@example.test',email_confirmed_at:'2026-10-03T00:00:00Z'};
const saved=(id=owner,expiresAt=1000000)=>({user:{id,email:user.email},accessToken:'access-'+id,refreshToken:'refresh-'+id,expiresAt,project:config.url});
function clientFixture(handler,{mode='supabase',initial,clock=()=>1000}={}){
  const session={},local={};if(initial)session['recall-account-session']=initial;
  const client=createAccountClient({storage:{local,session:{async get(key){return {[key]:session[key]};},async set(values){Object.assign(session,values);},async remove(key){delete session[key];}}}},async(url,options)=>url.endsWith('/auth/config')?Response.json({...config,mode}):handler(url,options),clock);
  return {client,session,local};
}

test('extension password grant uses the configured project and verifies the returned owner',async()=>{
  const calls=[];
  const auth=createExtensionAuth(config,async(url,options)=>{
    calls.push(url);assert.equal(options.redirect,'error');assert.equal(options.headers.apikey,config.key);
    if(url.includes('/token?')){assert.equal(url,config.url+'/auth/v1/token?grant_type=password');assert.deepEqual(JSON.parse(options.body),{email:user.email,password:'fixture-password'});return Response.json({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:other}});}
    assert.equal(options.headers.Authorization,'Bearer fixture-access');return Response.json(user);
  });
  const result=await auth('login',{email:' '+user.email+' ',password:'fixture-password'});
  assert.equal(result.user.id,owner);assert.equal(result.project,config.url);assert.equal(result.accessToken,'fixture-access');assert.ok(!('password' in result));assert.equal(calls.length,2);
});
test('extension login and refresh reject invalid inputs, expired credentials and malformed providers safely',async()=>{
  for(const body of [{},{email:user.email,password:''},{email:user.email,password:'fixture-password',userId:other}])await assert.rejects(createExtensionAuth(config,()=>assert.fail('No request'))('login',body),{status:400});
  for(const [response,status] of [[Response.json({error:'fixture-password'},{status:401}),401],[Response.json({error:'fixture-password'},{status:429}),429],[Response.json({error:'fixture-password'},{status:500}),503],[Response.json(null),503],[Response.json({access_token:'a',refresh_token:'',expires_in:1}),503]]){
    await assert.rejects(createExtensionAuth(config,async()=>response)('login',{email:user.email,password:'fixture-password'}),error=>error.status===status&&!error.message.includes('fixture-password'));
  }
  await assert.rejects(createExtensionAuth(config,async()=>{throw new Error('fixture-password');})('refresh',{refreshToken:'fixture-refresh'}),{status:503});
  await assert.rejects(createExtensionAuth(config,async url=>url.includes('/token?')?Response.json({access_token:'a',refresh_token:'r',expires_in:60}):Response.json({...user,email_confirmed_at:null}))('login',{email:user.email,password:'fixture-password'}),{status:401});
  const refreshed=await createExtensionAuth(config,async(url,options)=>{if(url.includes('/token?')){assert.equal(url,config.url+'/auth/v1/token?grant_type=refresh_token');assert.deepEqual(JSON.parse(options.body),{refresh_token:'fixture-refresh'});return Response.json({access_token:'a',refresh_token:'r',expires_in:60});}return Response.json(user);})('refresh',{refreshToken:'fixture-refresh'});
  assert.equal(refreshed.user.id,owner);
});
test('extension keeps credentials only in session storage and sends scoped Bearer requests',async()=>{
  const {client,session,local}=clientFixture(async(url,options)=>{
    if(url.endsWith('/login')){assert.deepEqual(JSON.parse(options.body),{email:user.email,password:'fixture-password'});return Response.json(saved());}
    assert.equal(url,'http://127.0.0.1:3001/api/imports/legacy');assert.equal(options.headers.Authorization,'Bearer access-'+owner);assert.equal(options.headers['X-Recall-Workspace'],owner);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return Response.json({added:1});
  });
  assert.equal((await client.status()).connected,false);
  const state=await client.signIn(user.email,'fixture-password');assert.equal(state.scope,owner);assert.ok(!('accessToken' in state));assert.deepEqual(local,{});assert.ok(!JSON.stringify(session).includes('fixture-password'));
  await client.request('/imports/legacy',{method:'POST'},owner);await client.signOut();assert.deepEqual(session,{});
  await assert.rejects(client.request('/imports/legacy',{},owner),/Sign into/);
});
test('concurrent extension requests refresh once and use the renewed token',async()=>{
  let refreshes=0,requests=0;
  const {client}=clientFixture(async(url,options)=>{
    if(url.endsWith('/refresh')){refreshes++;await new Promise(resolve=>setTimeout(resolve,10));return Response.json({...saved(),accessToken:'renewed'});}
    requests++;assert.equal(options.headers.Authorization,'Bearer renewed');return Response.json({ok:true});
  },{initial:saved(owner,2000)});
  await Promise.all([client.request('/ready',{},owner),client.request('/ready',{},owner)]);assert.equal(refreshes,1);assert.equal(requests,2);
});
test('logout during refresh cannot resurrect a session or send an old request',async()=>{
  let release,started;const pending=new Promise(resolve=>{release=resolve;});const begun=new Promise(resolve=>{started=resolve;});
  const {client,session}=clientFixture(async url=>{assert.ok(url.endsWith('/refresh'));started();await pending;return Response.json(saved());},{initial:saved(owner,2000)});
  const request=client.request('/ready',{},owner);await begun;await client.signOut();release();await assert.rejects(request,/account changed/i);assert.deepEqual(session,{});
});
test('invalid refresh clears credentials; network failures keep them; foreign refresh owners are rejected',async()=>{
  for(const status of [401,503]){
    const {client,session}=clientFixture(async()=>Response.json({error:'Refresh failed'},{status}),{initial:saved(owner,2000)});
    await assert.rejects(client.request('/ready',{},owner),/Refresh failed/);assert.equal(Boolean(session['recall-account-session']),status===503);
  }
  const {client,session}=clientFixture(async()=>Response.json(saved(other)),{initial:saved(owner,2000)});
  await assert.rejects(client.request('/ready',{},owner),/session changed/i);assert.deepEqual(session,{});
});
test('account switches reject stale pages and preserve separate namespaces including old local data',async()=>{
  const {client}=clientFixture(async()=>Response.json(saved(other)),{initial:saved()});
  await client.signIn(user.email,'fixture-password');await assert.rejects(client.request('/imports/legacy',{},owner),/account changed/i);
  assert.notEqual(workspaceKey(owner,'legacySetup'),workspaceKey(other,'legacySetup'));assert.equal(workspaceKey('local','legacySetup'),'legacySetup');assert.throws(()=>workspaceKey('bad-owner','legacySetup'));
  const changed=clientFixture(()=>assert.fail('No request'),{initial:{...saved(),project:'https://other.supabase.co'}});assert.equal((await changed.client.status()).connected,false);
  const local=clientFixture(async(_url,options)=>{assert.equal(options.headers.Authorization,undefined);assert.equal(options.headers['X-Recall-Workspace'],'local');return Response.json({ok:true});},{mode:'local'});await local.client.request('/ready',{},'local');
});
test('trusted extension messages expose no tokens and refuse content-script auth or arbitrary API paths',async()=>{
  let listener,calls=0;const account={status:async()=>({connected:true,scope:owner}),assertScope:async()=>owner,request:async()=>{calls++;return Response.json({ok:true});},key:workspaceKey};
  const context=vm.createContext({chrome:{runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener(fn){listener=fn;}}}},createAccountClient:()=>account});
  const source=readFileSync(new URL('../apps/extension/src/account-worker.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace(/^export /gm,'');vm.runInContext(source,context);
  const send=(message,sender)=>new Promise(resolve=>listener(message,sender,resolve)),page={id:'test',url:'chrome-extension://test/setup.html'};
  for(const type of ['RECALL_ACCOUNT_STATUS','RECALL_SIGN_IN','RECALL_API','RECALL_STATE_GET'])assert.match((await send({type},{id:'test',url:'https://leetcode.com/problems/two-sum/'})).error,/Settings/);
  assert.equal((await send({type:'RECALL_ACCOUNT_STATUS'},page)).scope,owner);
  for(const path of ['https://evil.test/','/workspace/restore','/auth/extension/login','/imports/legacy/../capture'])assert.match((await send({type:'RECALL_API',path,method:'POST',workspaceScope:owner},page)).error,/Invalid/);
  assert.equal(calls,0);assert.ok((await send({type:'RECALL_API',path:'/ready',method:'GET',workspaceScope:owner},page)).data.ok);assert.equal(calls,1);
});
test('API auth routes do not cache credentials and stale account scopes cannot write to local or foreign workspaces',async t=>{
  let writes=0;const server=createApp({auth:config,authenticate:async()=>({id:owner}),extensionAuth:async(kind,body)=>{assert.equal(kind,'login');assert.equal(body.password,'fixture-password');return saved();},repositoryForUser:async()=>{writes++;return {setup:async()=>({completed:false})};}}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const origin=`http://127.0.0.1:${server.address().port}`;
  const login=await fetch(origin+'/api/auth/extension/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:'fixture-password'})});assert.equal(login.status,200);assert.equal(login.headers.get('Cache-Control'),'no-store');
  const mismatch=await fetch(origin+'/api/session',{headers:{'X-Recall-Workspace':other}});assert.equal(mismatch.status,409);assert.equal(writes,0);
  const local=createApp().listen(0,'127.0.0.1');await new Promise(resolve=>local.once('listening',resolve));t.after(()=>new Promise(resolve=>local.close(resolve)));
  assert.equal((await fetch(`http://127.0.0.1:${local.address().port}/api/ready`,{headers:{'X-Recall-Workspace':owner}})).status,409);
});

test('extension preserves caller cancellation and rejects corrupt stored sessions',async()=>{
  const controller=new AbortController();let began;const started=new Promise(resolve=>{began=resolve;});
  const {client}=clientFixture(async(_url,options)=>{began();return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));},{initial:saved()});
  const pending=client.request('/ready',{signal:controller.signal},owner);await started;controller.abort();await assert.rejects(pending,{name:'AbortError'});
  for(const initial of [{...saved(),accessToken:''},{...saved(),refreshToken:''},{...saved(),expiresAt:-1},{...saved(),user:{id:owner,email:{bad:true}}}])assert.equal((await clientFixture(()=>assert.fail('No request'),{initial}).client.status()).connected,false);
});
test('new-account requests do not share the old account refresh promise',async()=>{
  let release,began;const blocked=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{began=resolve;});
  const {client}=clientFixture(async(url,options)=>{
    if(url.endsWith('/login'))return Response.json(saved(other,2000));
    if(url.endsWith('/refresh')){const data=JSON.parse(options.body);if(data.refreshToken==='refresh-'+owner){began();await blocked;return Response.json(saved());}return Response.json({...saved(other),accessToken:'new-owner-token'});}
    assert.equal(options.headers.Authorization,'Bearer new-owner-token');return Response.json({ok:true});
  },{initial:saved(owner,2000)});
  const old=client.request('/ready',{},owner);const rejected=assert.rejects(old,/account changed/i);await started;
  await client.signIn(user.email,'fixture-password');await client.request('/ready',{},other);release();await rejected;
});
test('logout waits for an in-flight session write and removes its late result',async()=>{
  let release,began;const blocked=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{began=resolve;}),session={};
  const client=createAccountClient({storage:{session:{async get(key){return {[key]:session[key]};},async set(values){began();await blocked;Object.assign(session,values);},async remove(key){delete session[key];}}}},async url=>Response.json(url.endsWith('/auth/config')?config:saved()),()=>1000);
  const login=client.signIn(user.email,'fixture-password');await started;const logout=client.signOut();release();await Promise.all([login,logout]);assert.deepEqual(session,{});
});
test('cancelling during token refresh ends the request without a later API write',async()=>{
  let release,began;const blocked=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{began=resolve;});const controller=new AbortController();
  const {client}=clientFixture(async url=>{assert.ok(url.endsWith('/refresh'),'Cancelled request must not reach the data API');began();await blocked;return Response.json(saved());},{initial:saved(owner,2000)});
  const pending=client.request('/capture',{method:'POST',signal:controller.signal},owner);await started;controller.abort();await assert.rejects(pending,{name:'AbortError'});release();await new Promise(resolve=>setImmediate(resolve));
});
