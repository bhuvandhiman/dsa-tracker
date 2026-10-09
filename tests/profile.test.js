import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthenticator} from '../apps/api/src/auth.js';
import {accountInitials} from '../apps/web/src/profile-model.js';

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
