import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createApp } from '../apps/api/src/app.js';
import { DomainError } from '../apps/api/src/domain.js';
import { accountAdminKey, createAccountAdmin, deletionInput } from '../apps/api/src/account-lifecycle.js';
import { deploymentSettings } from '../apps/api/src/deployment.js';
import { databaseOptions } from '../apps/api/src/db.js';
import { readLocation } from '../apps/web/src/navigation.js';
const user={id:'fa631c58-72ad-4a67-89d8-f6a4ae5d1641',email:'fixture@example.test'},other='ea631c58-72ad-4a67-89d8-f6a4ae5d1642';
const auth={mode:'supabase',configured:true,url:'https://fixture.supabase.co',key:'sb_publishable_fixture'};
async function serverFor(t,options){const server=createApp(options).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));return `http://127.0.0.1:${server.address().port}`;}
test('hosted settings fail closed, require verified accounts and never accept insecure origins',()=>{
  assert.deepEqual(deploymentSettings({}),{mode:'local',origin:null});
  const env={DEPLOYMENT_MODE:'hosted',AUTH_MODE:'supabase',DATABASE_URL:'postgresql://fixture',RENDER_EXTERNAL_URL:'https://recall-fixture.onrender.com'};
  assert.equal(deploymentSettings(env).origin,env.RENDER_EXTERNAL_URL);
  for(const value of ['http://recall.test','https://user:password@recall.test','https://recall.test/path','https://recall.test/?secret=value'])assert.throws(()=>deploymentSettings({...env,APP_ORIGIN:value}));
  assert.throws(()=>deploymentSettings({...env,AUTH_MODE:'local'}));assert.throws(()=>deploymentSettings({...env,DATABASE_URL:''}));assert.throws(()=>createApp({deployment:{mode:'hosted',origin:env.RENDER_EXTERNAL_URL}}));
});
test('remote database connections verify TLS and refuse Supabase transaction pooling',()=>{
  assert.throws(()=>databaseOptions('postgresql://postgres:[password]@localhost:5432/recall',{}),/placeholder brackets/);
  assert.ok(databaseOptions('postgresql://postgres:actual%5Bpassword%5D@localhost:5432/recall',{}).connectionString);
  assert.equal(databaseOptions('postgresql://postgres:fixture@localhost:5432/recall',{}).ssl,undefined);
  const remote=databaseOptions('postgresql://postgres:fixture@aws-0-fixture.pooler.supabase.com:5432/postgres?sslmode=no-verify',{DATABASE_CA_CERT:'fixture\\ncertificate'});
  assert.equal(remote.ssl.rejectUnauthorized,true);assert.equal(remote.ssl.ca,'fixture\ncertificate');assert.ok(!remote.connectionString.includes('sslmode'));
  assert.throws(()=>databaseOptions('postgresql://postgres:fixture@aws-0-fixture.pooler.supabase.com:6543/postgres',{}),/session pooler/);
  assert.equal(databaseOptions('postgresql://postgres:fixture@localhost:5432/recall',{DEPLOYMENT_MODE:'hosted'}).ssl.rejectUnauthorized,true);
  assert.throws(()=>databaseOptions('https://wrong.test',{}));
});
test('server-only deletion keys and confirmation reject public keys and supplied identities',()=>{
  assert.equal(accountAdminKey({}),'');assert.equal(accountAdminKey({SUPABASE_SECRET_KEY:'sb_secret_fixture'}),'sb_secret_fixture');
  for(const key of ['sb_publishable_fixture','anon-key','sb_secret_fixture\n'])assert.throws(()=>accountAdminKey({SUPABASE_SECRET_KEY:key}));
  assert.equal(deletionInput({password:'fixture-password',confirmation:'DELETE'}),'fixture-password');
  for(const body of [{password:'',confirmation:'DELETE'},{password:'fixture-password',confirmation:'delete'},{password:'fixture-password',confirmation:'DELETE',userId:other}])assert.throws(()=>deletionInput(body),{status:400});
});
test('admin deletion fixes its destination and accepts only confirmed deletion or a missing user',async()=>{
  const remove=createAccountAdmin(auth,'sb_secret_fixture',async(url,options)=>{assert.equal(url,auth.url+'/auth/v1/admin/users/'+user.id);assert.equal(options.method,'DELETE');assert.equal(options.redirect,'error');assert.equal(options.headers.apikey,'sb_secret_fixture');assert.deepEqual(JSON.parse(options.body),{should_soft_delete:false});return Response.json({});});await remove(user.id);await assert.rejects(remove('../another-user'));
  await createAccountAdmin(auth,'sb_secret_fixture',async()=>new Response(null,{status:204}))(user.id);
  for(const [status,data,success] of [[404,{code:'user_not_found'},true],[404,{error:'Not a valid route'},false],[401,{error:'fixture-secret'},false],[500,{error:'fixture-secret'},false]]){const fn=createAccountAdmin(auth,'sb_secret_fixture',async()=>Response.json(data,{status}));if(success)await fn(user.id);else await assert.rejects(fn(user.id),error=>error.status===503&&!error.message.includes('fixture-secret'));}
});
test('export and deletion use only verified identity; fresh password proof must match the owner',async t=>{
  let deletes=0,identity=other;
  const origin=await serverFor(t,{auth,authenticate:async req=>{if(req.get('Authorization')!=='Bearer fixture')throw new DomainError(401,'Sign in');return user;},repositoryForUser:async verified=>{assert.equal(verified.id,user.id);return {exportAccount:async()=>({setup:{completed:true},workspace:{format:'recall-backup',tables:{}}})};},accountLifecycle:{enabled:true,remove:async verified=>{assert.equal(verified.id,user.id);deletes++;return {deleted:true,pending:false};}},extensionAuth:async(_kind,body)=>{assert.equal(body.email,user.email);if(body.password!=='fixture-password')throw new DomainError(401,'Incorrect password');return {user:{id:identity}};}});
  assert.equal((await fetch(origin+'/api/account/export')).status,401);
  const headers={Authorization:'Bearer fixture','Content-Type':'application/json'};
  const exported=await(await fetch(origin+'/api/account/export',{headers})).json();assert.equal(exported.account.id,user.id);assert.equal(exported.workspace.format,'recall-backup');assert.ok(!JSON.stringify(exported).includes('sb_secret'));
  const remove=body=>fetch(origin+'/api/account',{method:'DELETE',headers,body:JSON.stringify(body)});
  assert.equal((await remove({password:'fixture-password',confirmation:'DELETE',userId:other})).status,400);
  assert.equal((await remove({password:'wrong',confirmation:'DELETE'})).status,401);
  assert.equal((await remove({password:'fixture-password',confirmation:'DELETE'})).status,403);assert.equal(deletes,0);
  identity=user.id;assert.equal((await remove({password:'fixture-password',confirmation:'DELETE'})).status,200);assert.equal(deletes,1);
});
test('hosted app serves clean public routes and rejects foreign hosts, origins and unknown API fallbacks',async t=>{
  const directory=await mkdtemp(path.join(tmpdir(),'recall-launch-'));await writeFile(path.join(directory,'index.html'),'<h1>Recall fixture</h1>');assert.equal(path.dirname(directory),path.resolve(tmpdir()));assert.ok(path.basename(directory).startsWith('recall-launch-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const origin=await serverFor(t,{auth,deployment:{mode:'hosted',origin:'https://recall-fixture.onrender.com'},webRoot:directory,authenticate:async()=>{throw new DomainError(401,'Sign in');}});
  const headers={Host:'recall-fixture.onrender.com',Origin:'https://recall-fixture.onrender.com'};
  // Node fetch replaces Host. Use HTTP to exercise production host validation.
  const get=(route,values=headers)=>new Promise((resolve,reject)=>{http.get(origin+route,{headers:values},response=>{let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body}));}).on('error',reject);});
  for(const route of ['/','/home','/about','/privacy','/signup','/login','/forgot-password','/reset-password','/install-extension','/connect','/profile','/history','/dashboard','/patterns','/patterns/arrays-hashing','/settings','/setup']){const response=await get(route);assert.equal(response.status,200,route);assert.ok(response.body.includes('Recall fixture'));assert.equal(response.headers['cache-control'],'no-store');assert.ok(response.headers['content-security-policy'].includes("frame-ancestors 'none'"));}
  assert.equal((await get('/api/ready')).status,401);assert.equal((await get('/api/unknown')).status,404);
  for(const route of ['/unknown','/assets/missing.js','/.env','/patterns/graphs/missing']){const response=await get(route);assert.equal(response.status,404,route);assert.deepEqual(JSON.parse(response.body),{error:'Route not found.'});}
  assert.equal((await get('/privacy',{...headers,Origin:'https://evil.test'})).status,403);
  assert.equal((await get('/privacy',{...headers,Host:'evil.test'})).status,403);
  assert.equal((await fetch(origin+'/api/health')).status,200);
});
test('clean public URLs and existing workspace hashes select the correct route',()=>{
  assert.equal(readLocation({hash:'',pathname:'/privacy',search:''}).page,'privacy');
  assert.equal(readLocation({hash:'',pathname:'/about',search:''}).page,'about');
  for(const page of ['dashboard','patterns','settings','setup'])assert.equal(readLocation({hash:'',pathname:'/'+page,search:''}).page,page);
  assert.equal(readLocation({hash:'',pathname:'/patterns/arrays-hashing',search:''}).slug,'arrays-hashing');
  assert.equal(readLocation({hash:'#/patterns/graphs',pathname:'/about',search:''}).slug,'graphs');
  assert.equal(readLocation({hash:'#/login?account=deleted',pathname:'/',search:''}).account,'deleted');
});
