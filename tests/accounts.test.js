import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authSettings, createAuthenticator } from '../apps/api/src/auth.js';
import { workspaceSchema, scopedPool, readWorkspaceSetup } from '../apps/api/src/user-workspaces.js';
import { installationLink } from '../apps/web/src/installation-model.js';
import { createApp } from '../apps/api/src/app.js';
import { DomainError } from '../apps/api/src/domain.js';

const user={id:'fa631c58-72ad-4a67-89d8-f6a4ae5d1641',email:'fixture@example.test',email_confirmed_at:'2026-10-03T00:00:00Z'};
const settings={mode:'supabase',configured:true,url:'https://example.supabase.co',key:'sb_publishable_example'};

test('workspace startup reads onboarding and optional goal in a single database checkout',async()=>{
  let calls=0;
  const pool={query:async sql=>{calls++;assert.match(sql,/LEFT JOIN workspace_goal/);return {rows:[{extensionAcknowledged:false,completed:false,profile:null,target:null}]};}};
  const first=await readWorkspaceSetup(pool);assert.equal(calls,1);
  assert.equal(first.completed,false);assert.equal(first.goal.configured,false);assert.ok(first.goal.targets.length);
  pool.query=async()=>{calls++;return {rows:[{extensionAcknowledged:true,completed:true,profile:'interview',target:300,policyVersion:1,updatedAt:'2026-10-09'}]};};
  assert.deepEqual(await readWorkspaceSetup(pool),{extensionAcknowledged:true,completed:true,goal:{configured:true,profile:'interview',target:300,policyVersion:1,updatedAt:'2026-10-09'}});assert.equal(calls,2);
});
test('provider failures distinguish rate limits and reject malformed account records',async()=>{
  for(const payload of [null,[],{}, {...user,id:7}])await assert.rejects(createAuthenticator(settings,async()=>Response.json(payload))({get:()=> 'Bearer fixture'}),{status:503});
  await assert.rejects(createAuthenticator(settings,async()=>Response.json({},{status:429}))({get:()=> 'Bearer fixture'}),{status:429});
  assert.equal((await createAuthenticator(settings,async()=>Response.json({...user,email:{bad:true}}))({get:()=> 'Bearer fixture'})).email,'');
  assert.throws(()=>authSettings({AUTH_MODE:'supabase',SUPABASE_URL:settings.url,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_ key'}));
});
test('account configuration fails closed and never exposes secret keys',()=>{
  assert.deepEqual(authSettings({}),{mode:'local',configured:false});
  assert.deepEqual(authSettings({AUTH_MODE:'supabase',SUPABASE_URL:settings.url,SUPABASE_PUBLISHABLE_KEY:settings.key}),settings);
  for(const env of [{AUTH_MODE:'invalid'},{AUTH_MODE:'supabase'},{AUTH_MODE:'supabase',SUPABASE_URL:'http://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:settings.key},{AUTH_MODE:'supabase',SUPABASE_URL:settings.url,SUPABASE_PUBLISHABLE_KEY:'sb_secret_example'},{AUTH_MODE:'supabase',SUPABASE_URL:'https://example.supabase.co/path',SUPABASE_PUBLISHABLE_KEY:settings.key}])assert.throws(()=>authSettings(env));
  const service=`eyJ.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.sig`;
  assert.throws(()=>authSettings({AUTH_MODE:'supabase',SUPABASE_URL:settings.url,SUPABASE_PUBLISHABLE_KEY:service}));
});
test('API authenticates with Auth server, rejecting missing, revoked and unverified sessions',async()=>{
  let calls=0;
  const authenticate=createAuthenticator(settings,async(url,options)=>{calls++;assert.equal(url,`${settings.url}/auth/v1/user`);assert.equal(options.headers.Authorization,'Bearer valid-token');assert.equal(options.headers.apikey,settings.key);return Response.json(user);});
  const req=token=>({get:()=>token});
  assert.equal((await authenticate(req('Bearer valid-token'))).id,user.id);
  for(const value of [undefined,'Basic token','Bearer','Bearer two tokens'])await assert.rejects(authenticate(req(value)),{status:401});
  assert.equal(calls,1);
  await assert.rejects(createAuthenticator(settings,async()=>Response.json({error:'expired'},{status:401}))(req('Bearer expired')),{status:401});
  await assert.rejects(createAuthenticator(settings,async()=>Response.json({...user,email_confirmed_at:null}))(req('Bearer unverified')),{status:401});
  await assert.rejects(createAuthenticator(settings,async()=>{throw new Error('network');})(req('Bearer offline')),{status:503});
});
test('schema identity rejects injection and checkout resets before reuse',async()=>{
  assert.equal(workspaceSchema(user.id),'recall_user_fa631c5872ad4a6789d8f6a4ae5d1641');
  assert.throws(()=>workspaceSchema('public; DROP TABLE problems'));
  assert.throws(()=>workspaceSchema(user.id,'public."'));
  const log=[];const pool=scopedPool({async connect(){return {async query(sql){log.push(sql);return {rows:[]};},release(){log.push('release');}};}},workspaceSchema(user.id));
  await pool.query('SELECT 1');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(log,[`SET search_path TO "${workspaceSchema(user.id)}"`,'SELECT 1','RESET search_path','release']);
  assert.throws(()=>scopedPool({},'public, other'));
});
test('installation routes accept safe video/download URLs and restrict store links',()=>{
  assert.equal(installationLink('/downloads/recall-extension.zip'),'/downloads/recall-extension.zip');
  assert.equal(installationLink('https://chromewebstore.google.com/detail/recall/example',{store:true}),'https://chromewebstore.google.com/detail/recall/example');
  for(const value of ['javascript:alert(1)','http://example.com/video.mp4','//evil.test/video','https://user:pass@example.com/video'])assert.equal(installationLink(value),null);
  assert.equal(installationLink('https://example.com/extension',{store:true}),null);
});
test('private API uses only verified owner, including backup/import routes and setup validation',async t=>{
  const routes=[];
  const server=createApp({auth:settings,authenticate:async req=>{if(req.get('Authorization')!=='Bearer good')throw new DomainError(401,'Sign in');return {id:user.id,email:user.email};},repositoryForUser:async verified=>{assert.equal(verified.id,user.id);return {setup:async()=>({completed:false}),saveSetup:async body=>body,backup:async()=>({owner:verified.id}),legacyStatus:async()=>({owner:verified.id})};}}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`;
  for(const path of ['/api/goal','/api/workspace/backup','/api/imports/legacy/32654ad6-8299-4ed1-a472-77ab7e26b275','/api/session','/api/setup']){const response=await fetch(origin+path);assert.equal(response.status,401);routes.push(path);}
  assert.equal(routes.length,5);
  assert.equal((await (await fetch(`${origin}/api/workspace/backup`,{headers:{Authorization:'Bearer good'}})).json()).owner,user.id);
  const deferred=await fetch(`${origin}/api/setup`,{method:'PUT',headers:{Authorization:'Bearer good','Content-Type':'application/json'},body:JSON.stringify({completed:true})});assert.equal(deferred.status,200);assert.deepEqual(await deferred.json(),{completed:true});
  const invalid=await fetch(`${origin}/api/setup`,{method:'PUT',headers:{Authorization:'Bearer good','Content-Type':'application/json'},body:JSON.stringify({completed:'yes'})});assert.equal(invalid.status,400);
  const foreign=await fetch(`${origin}/api/setup`,{method:'PUT',headers:{Authorization:'Bearer good','Content-Type':'application/json'},body:JSON.stringify({userId:'someone-else',profile:'interview',target:300})});assert.equal(foreign.status,400);
  const config=await (await fetch(`${origin}/api/auth/config`)).json();assert.equal(config.key,settings.key);
});
