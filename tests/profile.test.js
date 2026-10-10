import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthenticator} from '../apps/api/src/auth.js';
import {accountInitials} from '../apps/web/src/profile-model.js';
import {profileInput,profileSetup,createProfileUpdater} from '../apps/api/src/account-profile.js';
import {createApp} from '../apps/api/src/app.js';
import {DomainError} from '../apps/api/src/domain.js';
import {needsWorkspaceSetup,rememberDestination,accountDestination} from '../apps/web/src/auth-navigation.js';

test('profile details use verified provider fields without exposing account metadata',async()=>{
  const provider={id:'fa631c58-72ad-4a67-89d8-f6a4ae5d1641',email:'person@example.test',email_confirmed_at:'2026-10-03T00:00:00Z',created_at:'2026-10-01T12:00:00Z',user_metadata:{full_name:'Ada Lovelace',secret:'private'},app_metadata:{role:'admin'}};
  const read=record=>createAuthenticator({url:'https://fixture.supabase.co',key:'fixture'},async()=>Response.json(record))({get:()=> 'Bearer fixture'});
  assert.deepEqual(await read(provider),{id:provider.id,email:provider.email,name:'Ada Lovelace',emailVerified:true,createdAt:'2026-10-01T12:00:00.000Z'});
  assert.equal((await read({...provider,created_at:'invalid'})).createdAt,null);
  assert.equal((await read({...provider,user_metadata:{full_name:'a'.repeat(120)}})).name.length,100);
  await assert.rejects(read({...provider,email_confirmed_at:null}),{status:401});
});

test('account avatar handles missing names, email fallback and unicode',()=>{
  assert.equal(accountInitials({name:' Ada Lovelace ',email:'ignored@example.test'}),'AL');
  assert.equal(accountInitials({email:'person.name@example.test'}),'PN');
  assert.equal(accountInitials({name:'李 小龙'}),'李小');
  assert.equal(accountInitials({name:'  ',email:'person@example.test'}),'P');
  assert.equal(accountInitials(null),'R');
});

test('profile names support mononyms and unicode, normalize spacing, and reject invalid names or account fields',()=>{
  assert.deepEqual(profileInput({name:'  Ada   Lovelace  '}),{name:'Ada Lovelace'});
  for(const name of ['Prince','李 小龙',"Anne-Marie O’Neill"]){assert.equal(profileInput({name}).name,name);assert.equal(profileSetup({}, {name}).profileConfigured,true);}
  for(const body of [null,[],{}, {name:''},{name:'   '},{name:10},{name:'a'.repeat(101)},{name:'a\nname'},{name:'a\u0000name'},{name:'\ud800'},{name:'Ada',userId:'someone-else'},{name:'Ada',email:'changed@example.test'},{name:'Ada',password:'changed'}])assert.throws(()=>profileInput(body),{status:400});
  assert.equal(profileSetup({completed:true,goal:{configured:true}},{}).profileConfigured,false);
});

const settings={mode:'supabase',configured:true,url:'https://fixture.supabase.co',key:'sb_publishable_fixture'};
const provider={id:'fa631c58-72ad-4a67-89d8-f6a4ae5d1641',email:'fixture@example.test',email_confirmed_at:'2026-10-03T00:00:00Z',user_metadata:{full_name:'Ada Lovelace'}};
const owner={id:provider.id,email:provider.email,name:''};
const request={get:()=> 'Bearer fixture'};

test('profile writes use the verified account token and only permitted display metadata',async()=>{
  let calls=0;
  const update=createProfileUpdater(settings,async(url,options)=>{
    calls++;assert.equal(url,settings.url+'/auth/v1/user');assert.equal(options.method,'PUT');assert.equal(options.redirect,'error');
    assert.equal(options.headers.Authorization,'Bearer fixture');assert.equal(options.headers.apikey,settings.key);
    assert.deepEqual(JSON.parse(options.body),{data:{full_name:'Ada Lovelace'}});
    return Response.json(provider);
  });
  assert.equal((await update(request,owner,profileInput({name:'Ada Lovelace'}))).name,'Ada Lovelace');
  await assert.rejects(update({get:()=>null},owner,{name:'Ada'}),{status:401});assert.equal(calls,1);
  const foreign=createProfileUpdater(settings,async()=>Response.json({...provider,id:'ea631c58-72ad-4a67-89d8-f6a4ae5d1642'}));
  await assert.rejects(foreign(request,owner,{name:'Ada Lovelace'}),{status:503});
  const unchanged=createProfileUpdater(settings,async()=>Response.json({...provider,user_metadata:{full_name:'Old name'}}));
  await assert.rejects(unchanged(request,owner,{name:'Ada Lovelace'}),{status:503});
});

test('profile failures stay retryable without leaking provider responses',async()=>{
  for(const [status,expected] of [[400,400],[401,401],[403,401],[429,429],[500,503]]){
    const update=createProfileUpdater(settings,async()=>Response.json({error:'private provider data'},{status}));
    await assert.rejects(update(request,owner,{name:'Ada'}),error=>error.status===expected&&!error.message.includes('private'));
  }
  for(const read of [async()=>{throw new Error('private network detail');},async()=>Response.json(null),async()=>new Response('invalid JSON')]){
    await assert.rejects(createProfileUpdater(settings,read)(request,owner,{name:'Ada'}),error=>error.status===503&&!error.message.includes('private'));
  }
});

test('a saved goal cannot bypass missing profile setup, and the intended destination survives both steps',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  rememberDestination('/history',storage);
  assert.equal(needsWorkspaceSetup({completed:true,goal:{configured:true},profileConfigured:false}),true);
  assert.equal(accountDestination({goal:{configured:true},profileConfigured:false},storage),'/setup');
  assert.equal(accountDestination({goal:{configured:false},profileConfigured:true},storage),'/setup');
  assert.equal(accountDestination({goal:{configured:true},profileConfigured:true},storage),'/history');
  assert.equal(needsWorkspaceSetup({goal:{configured:true},profileConfigured:true}),false);
});

test('profile API isolates accounts and completion requires a persisted name',async t=>{
  let user={...owner},writes=0,saves=0;
  const setup={completed:true,goal:{configured:true,profile:'deep',target:500}};
  const server=createApp({auth:settings,authenticate:async req=>{if(req.get('Authorization')!=='Bearer fixture')throw new DomainError(401,'Sign in');return user;},repositoryForUser:async()=>({setup:async()=>setup,saveSetup:async input=>{saves++;return {...setup,...input};}}),updateProfile:async(req,verified,input)=>{writes++;assert.equal(verified.id,owner.id);assert.equal(req.get('Authorization'),'Bearer fixture');user={...user,name:input.name};return user;}}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}/api`,headers={Authorization:'Bearer fixture','Content-Type':'application/json'};
  const put=(path,body,values=headers)=>fetch(base+path,{method:'PUT',headers:values,body:JSON.stringify(body)});
  assert.equal((await(await fetch(base+'/session',{headers})).json()).setup.profileConfigured,false);
  assert.equal((await put('/setup',{completed:true})).status,400);assert.equal(saves,0);
  assert.equal((await put('/account/profile',{name:'Ada'},{})).status,401);
  assert.equal((await put('/account/profile',{name:'Ada'},{...headers,'X-Recall-Workspace':'another-owner'})).status,409);
  assert.equal((await put('/account/profile',{name:'Ada',userId:'another-owner'})).status,400);assert.equal(writes,0);
  assert.equal((await put('/account/profile',{name:'  Ada   Lovelace  '})).status,200);assert.equal(writes,1);
  const session=await(await fetch(base+'/session',{headers})).json();
  assert.equal(session.user.name,'Ada Lovelace');assert.equal(session.setup.profileConfigured,true);assert.deepEqual(session.setup.goal,setup.goal);
  assert.equal((await put('/setup',{completed:true})).status,200);assert.equal(saves,1);
});
