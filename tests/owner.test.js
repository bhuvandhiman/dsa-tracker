import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {createApp} from '../apps/api/src/app.js';
import {createAuthenticator} from '../apps/api/src/auth.js';
import {OWNER_PERMISSIONS,contactReason,diagnosticInput,maskEmail,metricRoute,ownerPage,requireOwnerMfa} from '../apps/api/src/owner-policy.js';
import {createOwnerOperations} from '../apps/api/src/owner-operations.js';
import {createOwnerDirectory} from '../apps/api/src/owner-sync.js';
import express from 'express';
import {metricsMiddleware,timedStage} from '../apps/api/src/request-metrics.js';

const id=randomUUID(),settings={mode:'supabase',configured:true,url:'https://owner-fixture.supabase.co',key:'sb_publishable_fixture'};
const provider={id,email:'owner@example.test',created_at:new Date().toISOString(),email_confirmed_at:new Date().toISOString(),user_metadata:{full_name:'Fixture owner',role:'owner'},factors:[{id:randomUUID(),factor_type:'totp',status:'verified'}]};
function token(overrides={}){return `fixture.${Buffer.from(JSON.stringify({sub:id,iss:settings.url+'/auth/v1',aud:'authenticated',role:'authenticated',exp:Date.now()/1000+3600,aal:'aal2',amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)}],...overrides})).toString('base64url')}.signature`;}
test('owner APIs enforce provider verification, role, workspace, fresh MFA and origin on every read',async t=>{
  let enabled=true,contact=false,calls=0,providerFailure=false,hasFactor=true;const audits=[];
  const store={access:async userId=>{assert.equal(userId,id);return {enabled,permissions:[...OWNER_PERMISSIONS,...(contact?['contact:read']:[])]};},audit:async(...args)=>audits.push(args),overview:async()=>{calls++;return {totals:{registered:1}};},users:async()=>{calls++;return {users:[],total:0};},diagnostics:async()=>({events:[],total:0}),health:async()=>({database:{status:'connected'}}),activity:async()=>({events:audits}),user:async()=>({id,email:'o•••@example.test'}),contact:async(actor,target,reason)=>{assert.equal(actor,id);assert.equal(target,id);assert.equal(reason,'Responding to support request');return {email:'owner@example.test'};}};
  const authenticate=createAuthenticator(settings,async(_url,options)=>{
    if(providerFailure||options.headers.Authorization==='Bearer forged')return Response.json({},{status:401});
    return Response.json({...provider,factors:hasFactor?provider.factors:[]});
  });
  const server=createApp({auth:settings,authenticate,ownerStore:store}).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/owner`,headers=value=>({Authorization:'Bearer '+value,'Content-Type':'application/json','X-Recall-Workspace':id});
  assert.equal((await fetch(url+'/overview')).status,401);
  assert.equal((await fetch(url+'/overview',{headers:headers('forged')})).status,401);
  for(const bad of [token({aal:'aal1'}),token({sub:randomUUID()}),token({iss:'https://evil.test/auth/v1'}),token({amr:[]}),token({amr:[{method:'totp',timestamp:Date.now()/1000-1000}]}),token({amr:[{method:'totp',timestamp:Date.now()/1000+60}]}),token({exp:1})]){
    const response=await fetch(url+'/overview',{headers:headers(bad)});assert.equal(response.status,403);assert.equal((await response.json()).code,'OWNER_MFA_REQUIRED');
  }
  assert.equal(calls,0);hasFactor=false;assert.equal((await fetch(url+'/overview',{headers:headers(token())})).status,403);hasFactor=true;
  enabled=false;assert.equal((await fetch(url+'/overview',{headers:headers(token())})).status,403);assert.equal(calls,0);enabled=true;
  const wrong={...headers(token()),'X-Recall-Workspace':randomUUID()};assert.equal((await fetch(url+'/overview',{headers:wrong})).status,409);
  assert.equal((await fetch(url+'/overview',{headers:{...headers(token()),Origin:'chrome-extension://'+'a'.repeat(32)}})).status,403);
  for(const path of ['overview','users','extension','health','activity']){const response=await fetch(url+'/'+path,{headers:headers(token())});assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');}
  assert.equal((await fetch(url+'/health',{headers:headers(token({aud:['authenticated']}))})).status,200);
  assert.equal(calls,2);assert.ok(audits.some(row=>row[1]==='owner.users_read'));
  assert.equal((await fetch(url+`/users/${id}/contact`,{method:'POST',headers:headers(token()),body:JSON.stringify({reason:'Responding to support request'})})).status,403);
  contact=true;assert.equal((await fetch(url+`/users/${id}/contact`,{method:'POST',headers:headers(token()),body:JSON.stringify({reason:'short'})})).status,400);
  const reveal=await fetch(url+`/users/${id}/contact`,{method:'POST',headers:headers(token()),body:JSON.stringify({reason:'Responding to support request'})});assert.deepEqual(await reveal.json(),{email:'owner@example.test'});
  assert.equal((await fetch(url+'/users?limit=500',{headers:headers(token())})).status,400);
  enabled=false;assert.equal((await fetch(url+'/users',{headers:headers(token())})).status,403);assert.equal(calls,2);
  providerFailure=true;assert.equal((await fetch(url+'/activity',{headers:headers(token())})).status,401);
});
test('local mode and a custom authenticator without a provider-verified MFA attestation cannot open owner data',async t=>{
  assert.throws(()=>requireOwnerMfa({get:()=>token()},{id}),{publicCode:'OWNER_MFA_REQUIRED'});
  const server=createApp().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/owner/overview`)).status,403);
});
test('owner filters and reports accept bounded enums; raw messages, notes, metadata and secrets are rejected',()=>{
  assert.deepEqual(ownerPage({}),{limit:25,offset:0,q:'',status:'all'});
  for(const query of [{q:[]},{offset:-1},{limit:101},{status:'owner'},{sort:'email'}])assert.throws(()=>ownerPage(query),{status:400});
  assert.equal(maskEmail('person@example.test'),'p•••@example.test');assert.equal(maskEmail(''), 'Unavailable');
  for(const body of [{reason:'tiny'},{reason:'support request\nsecret'},{reason:'Valid support request',token:'secret'}])assert.throws(()=>contactReason(body),{status:400});
  const report={eventId:randomUUID(),operation:'import',code:'TIMEOUT',version:'0.15.0'};assert.equal(diagnosticInput(report).code,'TIMEOUT');
  for(const body of [{...report,message:'private note'},{...report,code:'anything'},{...report,version:'../secret'},{...report,eventId:'not-uuid'}])assert.throws(()=>diagnosticInput(body),{status:400});
  assert.equal(metricRoute('/api/problems/123/history'),'/problems/:id/history');assert.equal(metricRoute('/api/owner/users/'+id),'/owner/users/:id');assert.equal(metricRoute('/api/unknown?token=secret'),null);
});
test('operational collection coalesces summaries, excludes retries, batches metrics and isolates failures',async()=>{
  const events=[],metrics=[];let observes=0,summaries=0,activity=0;
  const store={observe:async()=>observes++,summary:async()=>summaries++,active:async()=>activity++,diagnostic:async event=>events.push(event),saveMetrics:async rows=>metrics.push(...rows),prune:async()=>{}};
  const operations=createOwnerOperations(store);
  operations.observe({id},{summary:true});operations.observe({id},{summary:true,active:true});
  operations.outcome({id},'/capture',200,{created:false});operations.outcome({id},'/capture',201,{created:true});
  operations.outcome({id},'/imports/legacy',200,{added:0});operations.outcome({id},'/imports/legacy',200,{added:3});operations.outcome({id},'/imports/recent',503);
  for(let i=0;i<10;i++)operations.metric({route:'/retention',method:'GET',status:200,total:100,auth:20,database:30});
  await operations.flush();assert.equal(observes,1);assert.equal(summaries,1);assert.equal(activity,1);assert.equal(events.length,3);assert.equal(metrics.length,1);assert.equal(metrics[0].count,10);assert.equal(metrics[0].total,1000);
  const failing=createOwnerOperations({...store,observe:async()=>{throw new Error('private database credentials');}});failing.observe({id});await failing.flush();assert.equal(failing.dropped().failures,1);
});
test('directory sync paginates, includes unverified accounts and never trusts metadata for owner roles',async()=>{
  const pages=[],observed=[],summaries=[];let complete=0;
  const directory=createOwnerDirectory(settings,'sb_secret_fixture',async(url,options)=>{
    assert.equal(options.headers.apikey,'sb_secret_fixture');pages.push(url);
    return Response.json({users:pages.length===1?Array.from({length:100},()=>({...provider,id:randomUUID()})):[{...provider,id:randomUUID(),email_confirmed_at:null}]});
  });
  const store={observe:async user=>observed.push(user),summary:async id=>summaries.push(id),synchronized:async()=>complete++,audit:async()=>{}};
  assert.equal(await directory.sync(store),101);assert.equal(pages.length,2);assert.equal(complete,1);assert.equal(observed.at(-1).emailVerified,false);assert.equal('role' in observed[0],false);assert.equal(summaries.length,101);
  const failing=createOwnerDirectory(settings,'sb_secret_fixture',async()=>Response.json({},{status:503}));await assert.rejects(failing.sync(store));assert.equal(complete,1);
});
test('client diagnostics validate payloads and rate-limit without initializing a private workspace',async t=>{
  const reports=[];let workspaceReads=0;
  const server=createApp({auth:settings,authenticate:async()=>({id}),ownerStore:{isErased:async()=>false,diagnostic:async report=>reports.push(report)},repositoryForUser:async()=>{workspaceReads++;throw new Error('Must not initialize a workspace for telemetry');}}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/diagnostics`,options=body=>({method:'POST',headers:{'Content-Type':'application/json','X-Recall-Workspace':id},body:JSON.stringify(body)});
  const report={eventId:randomUUID(),operation:'capture',code:'TIMEOUT'};
  assert.equal((await fetch(url,options({...report,note:'PRIVATE NOTE'}))).status,400);
  assert.equal((await fetch(url,options(report))).status,200);
  assert.equal((await fetch(url,options({...report,eventId:randomUUID()}))).status,429);
  assert.equal(reports.length,1);assert.equal(reports[0].source,'client');assert.equal(workspaceReads,0);
});
test('API diagnostics record initialization failures and include the response correlation ID',async t=>{
  const outcomes=[],metrics=[];
  const operations={observe:()=>{},outcome:(...args)=>outcomes.push(args),metric:value=>metrics.push(value)};
  const server=createApp({auth:settings,authenticate:async()=>({id}),operations,repositoryForUser:async()=>{throw Object.assign(new Error('Storage unavailable'),{status:503});}}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/capture`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(response.status,500);await response.json();assert.equal(outcomes.length,1);assert.equal(outcomes[0][1],'/capture');assert.equal(outcomes[0][4],response.headers.get('X-Recall-Request-ID'));assert.equal(metrics[0].route,'/capture');
});
test('busy operational collection cannot block owner reads indefinitely',async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const operations=createOwnerOperations({observe:()=>pending,saveMetrics:async()=>{},prune:async()=>{}});operations.observe({id});
  await operations.flush({deadlineMs:10});assert.equal(operations.dropped().failures,0);release();await operations.flush();
});
test('timing reports elapsed database time without double-counting parallel queries',async t=>{
  const metrics=[],app=express();app.use(metricsMiddleware({metric:value=>metrics.push(value)}));
  app.get('/api/ready',async(_req,res)=>{await Promise.all([1,2].map(()=>timedStage('database',()=>new Promise(resolve=>setTimeout(resolve,30)))));res.json({ready:true});});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  await (await fetch(`http://127.0.0.1:${server.address().port}/api/ready`)).json();
  assert.equal(metrics.length,1);assert.ok(metrics[0].database<=metrics[0].total+1);assert.ok(metrics[0].database>=20);
});
